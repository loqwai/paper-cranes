// mcp-client — the VJ MCP from a script: `const vj = await connectVj(); await vj.call('get_state', {})`.
// call() parses the tool's JSON text and throws on a tool error; image content comes back as `images`.
// MCP_URL overrides the endpoint (default http://localhost:$PORT/mcp, PORT default 6969).
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

export const connectVj = async ({ name = 'vj-script', url = process.env.MCP_URL || `http://localhost:${process.env.PORT || 6969}/mcp` } = {}) => {
  const client = new Client({ name, version: '0.1.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(url)))
  const call = async (tool, args = {}) => {
    const res = await client.callTool({ name: tool, arguments: args }, undefined, { timeout: 70_000 })
    const text = res.content.find((c) => c.type === 'text')?.text ?? '{}'
    if (res.isError) throw new Error(`${tool}: ${text}`)
    let out
    try { out = JSON.parse(text) } catch { out = { text } }
    const images = res.content.filter((c) => c.type === 'image')
    return images.length ? { ...out, images } : out
  }
  return { call, close: () => client.close() }
}
