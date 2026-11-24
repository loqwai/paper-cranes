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
 * thing keeping strangers out of /ws, so treat it as a password, not a label.
 *
 * THE VJ MCP (docs/vj-mcp.md): each room's Durable Object is also the broker
 * the dev server's /ws is, so an agent can VJ a live show. A display page on
 * `?room=` says `display-hello`; the room keeps it in a registry and asks it
 * things point to point (`inspect`). Those hub types never reach peers, and
 * an `inspect` a client sends is dropped, so no peer can question a display.
 * The MCP itself is POST /mcp/<room>: Cloudflare Access (managed OAuth) in
 * front, the Access JWT verified again here, and the room name still needed.
 * Everything else a client sends is relayed exactly as before.
 */

import { DurableObject } from 'cloudflare:workers'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createVjMcpServer } from '../../../vite-plugins/vj-mcp/server.js'
import { createRoomHub, routeMessage, siteShaders, displayOriginAllowed, RELAY_VENUE } from './room.js'
import { authorize, mcpError } from './access.js'

export class RelayRoom extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env)
        // Rebuilt after every hibernation; the display registry lives in socket attachments.
        this.hub = createRoomHub(ctx)
    }

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
        // Whether this socket may register as a display: decided once, from its page's Origin.
        server.serializeAttachment({ mayDisplay: displayOriginAllowed(request.headers.get('Origin')) })
        this.broadcastStatus()

        return new Response(null, { status: 101, webSocket: client })
    }

    async webSocketMessage(ws, message) {
        // Match the dev server: validate, then relay the ORIGINAL text, so we
        // never reserialize and subtly change a payload in transit. Hub types
        // (display-hello, inspect-reply, inspect, ...) are never relayed.
        await routeMessage({ ctx: this.ctx, hub: this.hub, ws, message })
    }

    async webSocketClose(ws) {
        this.hub.onClose(ws)
        // The socket is already out of ctx.getWebSockets() by the time this
        // runs, so the count this broadcasts is the post-departure one.
        this.broadcastStatus()
    }

    async webSocketError(ws) {
        this.hub.onClose(ws)
        this.broadcastStatus()
    }

    /**
     * One MCP request (stateless streamable HTTP, JSON replies), called by the
     * Worker over RPC only after Access said who is asking. `who` is logged
     * with every tool call. The request arrives as plain data, already read
     * and stripped of Access headers and cookies by the Worker.
     */
    async mcp({ url, method, headers, body }, who) {
        const request = new Request(url, { method, headers, body })
        const server = createVjMcpServer({
            hub: this.hub,
            shaders: siteShaders({ hub: this.hub, env: this.env }),
            venue: RELAY_VENUE,
            onCall: (tool) => console.log(`[vj-mcp] ${who?.email ?? who?.id ?? who?.kind} ${tool}`),
        })
        const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
        try {
            await server.connect(transport)
            return await transport.handleRequest(request)
        } finally {
            transport.close().catch(() => {})
            server.close().catch(() => {})
        }
    }
}

const handleMcp = async (request, env, roomPart) => {
    const { who, refuse } = await authorize(request, env)
    if (refuse) return refuse
    // A web page in a signed-in browser must not drive a show: MCP clients send no Origin.
    if (request.headers.get('Origin')) return mcpError(403, 'VJ MCP: browser origins are refused')
    if (request.method !== 'POST') return mcpError(405, 'stateless streamable HTTP: POST only, no SSE stream', { allow: 'POST' })
    const room = roomPart ? decodeURIComponent(roomPart) : ''
    if (!room) return mcpError(404, 'VJ MCP: put the room in the path, /mcp/<room>, the same room as the display page\'s ?room=')
    const body = await request.text()
    const headers = [...request.headers].filter(([k]) => !k.toLowerCase().startsWith('cf-access-') && k.toLowerCase() !== 'cookie')
    return env.ROOM.getByName(room).mcp({ url: request.url, method: request.method, headers, body }, who)
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url)
        const mcp = url.pathname.match(/^\/mcp(?:\/([^/]+))?\/?$/)
        if (mcp) return handleMcp(request, env, mcp[1])

        const match = url.pathname.match(/^\/ws\/(.+)$/)

        if (!match) {
            // A plain GET is how a human checks the relay is alive, so answer
            // it usefully instead of 404ing.
            return new Response('paper-cranes remote relay — connect a websocket to /ws/<room>; the VJ MCP is POST /mcp/<room>\n', {
                status: 200,
                headers: { 'content-type': 'text/plain; charset=utf-8' },
            })
        }

        return env.ROOM.getByName(decodeURIComponent(match[1])).fetch(request)
    },
}
