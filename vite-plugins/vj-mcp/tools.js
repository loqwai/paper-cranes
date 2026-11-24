// The dev server's VJ MCP: server.js with shaders read from and written to disk.
// The relay Worker builds the same server with shaders fetched from the site (workers/remote-relay).
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { readShader, saveShader } from '../shader-files.js'
import { createVjMcpServer as createServer } from './server.js'

export const createVjMcpServer = ({ hub, root, port }) =>
  createServer({
    hub,
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
