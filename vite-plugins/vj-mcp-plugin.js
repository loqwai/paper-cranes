// VJ MCP: an MCP server at /mcp on the dev server, so any agent harness (Claude Code, Codex, a
// per-socket Claude, the claude.ai app) can VJ a running display. docs/vj-mcp.md.
//
// Transport: streamable HTTP, STATELESS, plain JSON responses (enableJsonResponse). Every POST
// gets a fresh McpServer bound to the shared hub, so there is no session to lose when Vite
// restarts. No SSE anywhere: GET (the optional server-push stream) is answered 405.
//
// Dev only (apply: 'serve'): the static production build has no /mcp, no /ws broker and no
// write path. Reachability is the dev server's: localhost, the LAN it binds on (same as the
// unauthenticated /__save-shader it already exposes), and the Cloudflare Access tunnel.

// A browser page may only call /mcp from a loopback origin, or one listed in VJ_MCP_ORIGINS
// (comma-separated hostnames). CLI clients send no Origin. This stops a web page you happen to
// have open, including a DNS-rebinding one, from driving the display or writing shaders.
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])
const originAllowed = (req) => {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    const host = new URL(origin).hostname
    const extra = (process.env.VJ_MCP_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    return LOOPBACK.has(host) || extra.includes(host)
  } catch {
    return false
  }
}

const jsonRpcError = (res, status, message) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message }, id: null }))
}

export const vjMcpPlugin = ({ hub }) => ({
  name: 'vj-mcp',
  apply: 'serve',
  // The SDK is loaded only when the dev server starts, so `vite build` never touches it.
  async configureServer(server) {
    const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js')
    const { createVjMcpServer } = await import('./vj-mcp/tools.js')
    const port = () => server.httpServer?.address()?.port ?? server.config.server.port
    server.middlewares.use('/mcp', async (req, res) => {
      if (!originAllowed(req)) return jsonRpcError(res, 403, `origin ${req.headers.origin} not allowed (VJ_MCP_ORIGINS)`)
      if (req.method !== 'POST') return jsonRpcError(res, 405, 'stateless streamable HTTP: POST only, no SSE stream')
      const mcp = createVjMcpServer({ hub, root: server.config.root, port: port() })
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
      res.on('close', () => {
        transport.close().catch(() => {})
        mcp.close().catch(() => {})
      })
      try {
        await mcp.connect(transport)
        await transport.handleRequest(req, res)
      } catch (e) {
        console.error('[vj-mcp]', e)
        if (!res.headersSent) jsonRpcError(res, 500, String(e?.message ?? e))
      }
    })
    console.log('[vj-mcp] MCP (streamable HTTP) at /mcp')
  },
})
