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
// The guide's markdown, bundled as a string by the Text rule in wrangler.jsonc.
import guide from '../../../docs/vj-mcp-guide.md'
import { createRoomHub, routeMessage, siteShaders, displayOriginAllowed, decodeRoom, roomSecretControl, RELAY_VENUE } from './room.js'
import { createDisplayLock } from './secret.js'
import { VIEW_ID, roomCounts, viewersFull } from './mirror.js'
import { authorize, mcpError } from './access.js'

export class RelayRoom extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env)
        // Rebuilt after every hibernation; the display registry lives in socket attachments.
        this.hub = createRoomHub(ctx)
        // The room's display secret, hashed in this object's storage (secret.js). Signals that
        // beat their socket's hello wait in `held`; hibernation may forget them, which is fine.
        this.lock = createDisplayLock(ctx.storage)
        this.held = new WeakMap()
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

    broadcastStatus(leaving) {
        const sockets = this.ctx.getWebSockets().filter((ws) => ws !== leaving)
        // Board mirrors (mirror.js) are counted apart: a controller's "N connected" means pages
        // that can be steered, and a display starts its mirror feed only while `viewers` > 0.
        const status = JSON.stringify({ type: 'status', data: roomCounts(this.ctx, leaving) })
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

        // A board mirror joins at /view/<view id> (mirror.js): a viewer, never a display.
        // Otherwise: whether this socket may register as a display, decided once from its page's Origin.
        const viewer = new URL(request.url).pathname.startsWith('/view/')
        if (viewer && viewersFull(this.ctx)) return new Response('this room has all the mirrors it takes\n', { status: 429 })

        const [client, server] = Object.values(new WebSocketPair())
        this.ctx.acceptWebSocket(server)
        server.serializeAttachment(viewer ? { viewer: true, mayDisplay: false } : { mayDisplay: displayOriginAllowed(request.headers.get('Origin')) })
        this.broadcastStatus()

        return new Response(null, { status: 101, webSocket: client })
    }

    async webSocketMessage(ws, message) {
        // Match the dev server: validate, then relay the ORIGINAL text, so we
        // never reserialize and subtly change a payload in transit. Hub types
        // (display-hello, inspect-reply, inspect, ...) are never relayed.
        await routeMessage({ ctx: this.ctx, hub: this.hub, ws, message, lock: this.lock, held: this.held })
    }

    async webSocketClose(ws) {
        this.hub.onClose(ws)
        // workerd may still list the closing socket here, so it is left out by hand: the count
        // this broadcasts is the post-departure one.
        this.broadcastStatus(ws)
    }

    async webSocketError(ws) {
        this.hub.onClose(ws)
        this.broadcastStatus(ws)
    }

    /**
     * One MCP request (stateless streamable HTTP, JSON replies), called by the
     * Worker over RPC only after Access said who is asking. `who` is logged
     * with every tool call. The request arrives as plain data, already read
     * and stripped of Access headers and cookies by the Worker.
     */
    async mcp({ url, method, headers, body }, who) {
        const request = new Request(url, { method, headers, body })
        const { host, pathname } = new URL(url)
        const server = createVjMcpServer({
            hub: this.hub,
            shaders: siteShaders({ hub: this.hub, env: this.env }),
            venue: RELAY_VENUE,
            guide,
            displaySecret: roomSecretControl({
                ctx: this.ctx,
                hub: this.hub,
                lock: this.lock,
                held: this.held,
                room: decodeRoom(pathname.split('/')[2]),
                relayHost: host,
                site: this.env.SITE_ORIGIN || undefined,
            }),
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
    if (!roomPart) return mcpError(404, 'VJ MCP: put the room in the path, /mcp/<room>, the same room as the display page\'s ?room=')
    const room = decodeRoom(roomPart)
    if (!room) return mcpError(400, 'VJ MCP: the room in the path is not valid percent-encoding')
    const body = await request.text()
    const headers = [...request.headers].filter(([k]) => !k.toLowerCase().startsWith('cf-access-') && k.toLowerCase() !== 'cookie')
    return env.ROOM.getByName(room).mcp({ url: request.url, method: request.method, headers, body }, who)
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url)
        const mcp = url.pathname.match(/^\/mcp(?:\/([^/]+))?\/?$/)
        if (mcp) return handleMcp(request, env, mcp[1])

        // A board mirror (docs/board-mirror.md): /view/<view id> is the room's Durable Object id,
        // which names the room without revealing it; /view-key/<room> turns a room into one.
        const view = url.pathname.match(/^\/view\/([^/]+)$/)
        if (view) {
            if (!VIEW_ID.test(view[1])) return new Response('bad view id\n', { status: 400 })
            let id
            try { id = env.ROOM.idFromString(view[1]) } catch { return new Response('bad view id\n', { status: 400 }) }
            return env.ROOM.get(id).fetch(request)
        }
        const viewKey = url.pathname.match(/^\/view-key\/(.+)$/)
        if (viewKey) {
            const room = decodeRoom(viewKey[1])
            if (!room) return new Response('bad room name: not valid percent-encoding\n', { status: 400 })
            return Response.json({ view: env.ROOM.idFromName(room).toString() }, { headers: { 'cache-control': 'no-store' } })
        }

        const match = url.pathname.match(/^\/ws\/(.+)$/)

        if (!match) {
            // A plain GET is how a human checks the relay is alive, so answer
            // it usefully instead of 404ing.
            return new Response('paper-cranes remote relay — connect a websocket to /ws/<room>; the VJ MCP is POST /mcp/<room>\n', {
                status: 200,
                headers: { 'content-type': 'text/plain; charset=utf-8' },
            })
        }

        const room = decodeRoom(match[1])
        if (!room) return new Response('bad room name: not valid percent-encoding\n', { status: 400 })
        return env.ROOM.getByName(room).fetch(request)
    },
}
