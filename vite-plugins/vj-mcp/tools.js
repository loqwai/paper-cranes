// The dev server's VJ MCP: server.js with shaders read from and written to disk.
// The relay Worker builds the same server with shaders fetched from the site (workers/remote-relay).
import { readFile } from 'fs/promises'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { readShader, saveShader } from '../shader-files.js'
import { createVjMcpServer as createServer } from './server.js'

// docs/vj-mcp-guide.md, read per request (a few KB) so an edit shows without a restart.
const readGuide = (root) => {
  try {
    return readFileSync(resolve(root, 'docs/vj-mcp-guide.md'), 'utf-8')
  } catch {
    return undefined
  }
}

export const createVjMcpServer = ({ hub, root, port }) =>
  createServer({
    hub,
    guide: readGuide(root),
    shaders: {
      index: async () => JSON.parse(await readFile(resolve(root, 'shaders.json'), 'utf-8')),
      read: (name) => readShader(root, name),
      write: (name, code) => saveShader(root, name, code),
    },
    venue: {
      displays: 'pages with ?remote=display on this dev server',
      where: 'Every display is a page with ?remote=display on this dev server.',
      noneHint: `none connected; open http://localhost:${port}/jam.html?shader=<path>&remote=display`,
    },
  })
