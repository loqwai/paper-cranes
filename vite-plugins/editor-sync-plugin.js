import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const SHADER_DIR = 'shaders'

export function editorSyncPlugin() {
  return {
    name: 'vite-plugin-editor-sync',

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'POST' || req.url !== '/__save-shader') return next()

        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', async () => {
          try {
            const { shader, code } = JSON.parse(body)
            if (!shader || !code) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              return res.end(JSON.stringify({ error: 'Missing shader or code' }))
            }

            const normalized = shader.replace(/\.\./g, '').replace(/^\//, '')
            const filePath = join(SHADER_DIR, `${normalized}.frag`)

            await writeFile(filePath, code, 'utf-8')
            console.log(`[editor-sync] Saved ${filePath}`)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, path: filePath }))
          } catch (e) {
            console.error('[editor-sync] Save failed:', e.message)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: e.message }))
          }
        })
      })

      server.watcher.on('change', async (filePath) => {
        if (!filePath.endsWith('.frag')) return

        const projectRoot = server.config.root
        const relative = filePath.startsWith(projectRoot)
          ? filePath.slice(projectRoot.length + 1)
          : filePath

        if (!relative.startsWith(SHADER_DIR + '/')) return

        const shaderName = relative
          .slice(SHADER_DIR.length + 1)
          .replace(/\.frag$/, '')

        try {
          const code = await readFile(filePath, 'utf-8')
          server.ws.send({
            type: 'custom',
            event: 'shader-update',
            data: { shader: shaderName, code },
          })
          console.log(`[editor-sync] Pushed ${shaderName} to editor`)
        } catch (e) {
          console.error(`[editor-sync] Failed to read ${filePath}:`, e.message)
        }
      })

      console.log('[editor-sync] Bidirectional shader sync enabled')
    },
  }
}
