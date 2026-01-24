import { join, relative } from 'path'
import { readdir, stat, readFile, writeFile, mkdir } from 'fs/promises'
import chokidar from 'chokidar'
import { extractMetadata } from '../scripts/shader-utils.js'

const SHADER_DIR = 'shaders'
const OUTPUT_FILE = 'shaders.json'

async function findShaderFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        await findShaderFiles(fullPath, files)
      } else if (entry.name.endsWith('.frag')) {
        files.push(fullPath)
      }
    })
  )
  return files
}

async function generateShadersJson(outputDir = null) {
  const shaderFiles = await findShaderFiles(SHADER_DIR)
  const shaders = await Promise.all(
    shaderFiles.sort().map(async (file) => {
      const relativePath = relative(SHADER_DIR, file)
      const content = await readFile(file, 'utf-8')
      const meta = extractMetadata(content)
      return {
        name: relativePath.replace(/\\/g, '/').replace('.frag', ''),
        fileUrl: `shaders/${relativePath.replace(/\\/g, '/')}`,
        visualizerUrl: `/?shader=${relativePath.replace(/\\/g, '/').replace('.frag', '')}`,
        ...meta,
      }
    })
  )

  const outputPath = outputDir ? join(outputDir, OUTPUT_FILE) : OUTPUT_FILE
  if (outputDir) {
    await mkdir(outputDir, { recursive: true })
  }
  await writeFile(outputPath, JSON.stringify(shaders, null, 2))
  return shaders.length
}

export function shaderPlugin() {
  let watcher = null

  return {
    name: 'vite-plugin-shaders',

    async configResolved(config) {
      // Generate initial shaders.json
      const count = await generateShadersJson()
      console.log(`[shaders] Generated shaders.json with ${count} shaders`)
    },

    configureServer(server) {
      // Watch shader directory for changes
      watcher = chokidar.watch(`${SHADER_DIR}/**/*.frag`, {
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
      })

      const regenerate = async (eventType, path) => {
        const count = await generateShadersJson()
        console.log(`[shaders] ${eventType}: ${path} (${count} total)`)

        // Send HMR event for shader updates
        server.ws.send({
          type: 'custom',
          event: 'shaders-updated',
          data: { count, path },
        })
      }

      watcher.on('add', (path) => regenerate('added', path))
      watcher.on('change', (path) => regenerate('changed', path))
      watcher.on('unlink', (path) => regenerate('removed', path))
    },

    async buildStart() {
      // Regenerate for production build
      await generateShadersJson('dist')
    },

    closeBundle() {
      watcher?.close()
    },
  }
}
