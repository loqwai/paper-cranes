/**
 * paper-cranes remote relay.
 *
 * WHY THIS EXISTS: src/remote/WebSocketClient.js has always referenced
 * `paper-cranes-remote.redaphid.workers.dev` as the relay used when a `?room=`
 * param is present — but the hostname did not resolve, so that whole code path
 * was dead. This is that worker.
 *
 * It matters at a venue: the phone controller and the laptop display normally
 * find each other over the LAN, which fails the moment the wifi has client
 * isolation on (most hotel and venue networks). Routing both out to a relay on
 * the public internet sidesteps the LAN entirely, and lets the display stay on
 * http://localhost — the only origin where the browser will grant the
 * microphone, since a bare LAN IP is not a secure context.
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
 * shows on the same worker cannot hear each other.
 */

export class RelayRoom {
    constructor(state, env) {
        this.state = state
        this.env = env
        // In-memory is correct here: the DO stays alive as long as any socket is
        // open, and a room with no sockets has no state worth persisting.
        this.sockets = new Set()
    }

    broadcastStatus() {
        const status = JSON.stringify({
            type: 'status',
            data: { connectedClients: this.sockets.size },
        })
        for (const ws of this.sockets) {
            try {
                ws.send(status)
            } catch {
                // A socket that is already gone is not an error worth failing a join over.
            }
        }
    }

    async fetch(request) {
        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('expected a websocket upgrade', { status: 426 })
        }

        const pair = new WebSocketPair()
        const [client, server] = Object.values(pair)
        server.accept()
        this.sockets.add(server)
        this.broadcastStatus()

        server.addEventListener('message', (event) => {
            if (typeof event.data !== 'string') return
            // Match the dev server: validate, then relay the ORIGINAL text so we
            // never reserialize and subtly change a payload in transit.
            try {
                JSON.parse(event.data)
            } catch {
                return
            }
            for (const ws of this.sockets) {
                if (ws === server) continue
                try {
                    ws.send(event.data)
                } catch {
                    // Ignore: the close handler will reap it.
                }
            }
        })

        const drop = () => {
            if (!this.sockets.delete(server)) return
            this.broadcastStatus()
        }
        server.addEventListener('close', drop)
        server.addEventListener('error', drop)

        return new Response(null, { status: 101, webSocket: client })
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url)
        const match = url.pathname.match(/^\/ws\/(.+)$/)

        if (!match) {
            // A plain GET is how a human checks the relay is alive, so answer it
            // usefully instead of 404ing.
            return new Response('paper-cranes remote relay — connect a websocket to /ws/<room>\n', {
                status: 200,
                headers: { 'content-type': 'text/plain; charset=utf-8' },
            })
        }

        const room = decodeURIComponent(match[1])
        const id = env.ROOM.idFromName(room)
        return env.ROOM.get(id).fetch(request)
    },
}
