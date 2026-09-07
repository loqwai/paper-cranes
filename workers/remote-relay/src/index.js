/**
 * paper-cranes remote relay.
 *
 * WHY THIS EXISTS: src/remote/WebSocketClient.js has always referenced a relay
 * used when a `?room=` param is present, but the hostname it named did not
 * resolve, so that whole code path was dead. This is that worker.
 *
 * It matters at a venue. The phone controller and the laptop display normally
 * find each other over the LAN, which fails the moment the wifi has client
 * isolation on — most hotel and venue networks. Routing both out to a relay on
 * the public internet sidesteps the LAN entirely.
 *
 * WHY THIS RATHER THAN A TUNNEL: a cloudflared tunnel to the dev server also
 * works, but it publishes the WHOLE dev server, including the unauthenticated
 * POST /__save-shader endpoint that writes .frag files to disk. The relay
 * carries control messages and nothing else — there is no path from it back to
 * the laptop's filesystem. It is also a stable hostname rather than a random
 * one that changes every time the tunnel restarts, and it keeps working when
 * the laptop moves to a different network.
 *
 * The display still runs on http://localhost, which is the only origin that
 * gets a microphone: a bare LAN IP is not a secure context.
 *
 * The protocol is deliberately identical to the dev-server WebSocket
 * (vite-plugins/remote-ws-plugin.js) so neither client needs to know which one
 * it is talking to:
 *   - a message from one client is relayed verbatim to every OTHER client in
 *     the room, never echoed back to the sender
 *   - non-JSON messages are dropped rather than relayed, matching dev
 *   - every join and leave broadcasts {type:'status',data:{connectedClients:N}}
 *
 * Rooms are isolated by Durable Object id derived from the room name, so two
 * shows on the same worker cannot hear each other. The room name is the only
 * thing keeping strangers out, so treat it as a password, not a label.
 */

import { DurableObject } from 'cloudflare:workers'

export class RelayRoom extends DurableObject {
    /**
     * Hibernation (ctx.acceptWebSocket) rather than server.accept(): a relay
     * spends almost all of its life idle with sockets open — soundcheck, the
     * set break, the walk to the venue. Hibernating evicts the object from
     * memory between messages without dropping the connections, and the
     * runtime re-runs this constructor on the next message. So there is
     * deliberately nothing to rebuild here: the socket list lives in
     * ctx.getWebSockets(), which survives eviction, rather than in a field
     * that would silently come back empty.
     */

    broadcastStatus() {
        const sockets = this.ctx.getWebSockets()
        const status = JSON.stringify({
            type: 'status',
            data: { connectedClients: sockets.length },
        })
        for (const ws of sockets) {
            try {
                ws.send(status)
            } catch {
                // A socket already gone is not worth failing a join over.
            }
        }
    }

    async fetch(request) {
        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('expected a websocket upgrade', { status: 426 })
        }

        const [client, server] = Object.values(new WebSocketPair())
        this.ctx.acceptWebSocket(server)
        this.broadcastStatus()

        return new Response(null, { status: 101, webSocket: client })
    }

    async webSocketMessage(ws, message) {
        if (typeof message !== 'string') return

        // Match the dev server: validate, then relay the ORIGINAL text, so we
        // never reserialize and subtly change a payload in transit.
        try {
            JSON.parse(message)
        } catch {
            return
        }

        for (const peer of this.ctx.getWebSockets()) {
            if (peer === ws) continue
            try {
                peer.send(message)
            } catch {
                // Ignore; the close handler reaps it.
            }
        }
    }

    async webSocketClose(ws) {
        // The socket is already out of ctx.getWebSockets() by the time this
        // runs, so the count this broadcasts is the post-departure one.
        this.broadcastStatus()
    }

    async webSocketError(ws) {
        this.broadcastStatus()
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url)
        const match = url.pathname.match(/^\/ws\/(.+)$/)

        if (!match) {
            // A plain GET is how a human checks the relay is alive, so answer
            // it usefully instead of 404ing.
            return new Response('paper-cranes remote relay — connect a websocket to /ws/<room>\n', {
                status: 200,
                headers: { 'content-type': 'text/plain; charset=utf-8' },
            })
        }

        return env.ROOM.getByName(decodeURIComponent(match[1])).fetch(request)
    },
}
