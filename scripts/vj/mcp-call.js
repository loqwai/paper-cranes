// mcp-call — call one VJ MCP tool from a shell, as an MCP client does (docs/vj-mcp.md).
//   node scripts/vj/mcp-call.js                          → list tools
//   node scripts/vj/mcp-call.js get_state '{"screenshot":true}'
//   node scripts/vj/mcp-call.js set_params '{"params":{"knob_12":0.8}}'
// Images in a result are written to $TMPDIR/vj-mcp-shot-<n>.jpg and their paths printed.
// MCP_URL overrides the endpoint (default http://localhost:$PORT/mcp, PORT default 6969).
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const url = process.env.MCP_URL || `http://localhost:${process.env.PORT || 6969}/mcp`
const [tool, rawArgs = '{}'] = process.argv.slice(2)

const client = new Client({ name: 'mcp-call', version: '0.1.0' })
await client.connect(new StreamableHTTPClientTransport(new URL(url)))
try {
  if (!tool) {
    const { tools } = await client.listTools()
    for (const t of tools) console.log(`${t.name}: ${t.description}`)
  } else {
    const res = await client.callTool({ name: tool, arguments: JSON.parse(rawArgs) }, undefined, { timeout: 70_000 })
    let n = 0
    for (const c of res.content) {
      if (c.type === 'text') console.log(c.text)
      if (c.type === 'image') {
        const out = join(tmpdir(), `vj-mcp-shot-${Date.now()}-${n++}.jpg`)
        writeFileSync(out, Buffer.from(c.data, 'base64'))
        console.log(`[image ${c.mimeType}] ${out}`)
      }
    }
    if (res.isError) process.exitCode = 1
  }
} finally {
  await client.close()
}
