import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

export function swVersionPlugin() {
  return {
    name: 'vite-plugin-sw-version',

    async writeBundle(options) {
      const outDir = options.dir || 'dist'
      const swPath = join(outDir, 'service-worker.js')

      try {
        let content = await readFile(swPath, 'utf-8')
        const timestamp = new Date().toISOString()
        content = content.replace('__BUILD_TIMESTAMP__', timestamp)
        await writeFile(swPath, content)
        console.log(`[sw-version] Injected build timestamp: ${timestamp}`)
      } catch (e) {
        console.warn(`[sw-version] Could not update service-worker.js:`, e.message)
      }
    },
  }
}
