import { join, relative } from 'path'
import { readdir, readFile, writeFile, mkdir, cp } from 'fs/promises'
import chokidar from 'chokidar'
import { extractMetadata } from '../scripts/shader-utils.js'

const SHADER_DIR = 'shaders'
const OUTPUT_FILE = 'shaders.json'
const MANIFESTS_DIR = 'manifests'

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
      const shaderPath = relativePath.replace(/\\/g, '/').replace('.frag', '')
      return {
        name: shaderPath,
        fileUrl: `shaders/${relativePath.replace(/\\/g, '/')}`,
        visualizerUrl: `/?shader=${shaderPath}`,
        ...meta,
        // Preserve the path-based name; move @name metadata to displayName
        ...(meta.name ? { displayName: meta.name, name: shaderPath } : {}),
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

function prettifyShaderName(name) {
  // "melted-satin/1" -> "Melted Satin 1", "wip/claude/my-shader" -> "My Shader"
  const lastPart = name.includes('/') ? name.split('/').pop() : name
  return lastPart
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function shaderNameToFilename(name) {
  // "melted-satin/1" -> "melted-satin--1"
  return name.replace(/\//g, '--')
}

function makeManifest({ name, shortName, startUrl }) {
  return {
    name,
    short_name: shortName.slice(0, 12),
    start_url: startUrl,
    display: 'fullscreen',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

async function generateManifests(outputDir = null) {
  const manifestsDir = outputDir ? join(outputDir, MANIFESTS_DIR) : MANIFESTS_DIR
  await mkdir(manifestsDir, { recursive: true })

  // Read shaders.json to generate per-shader manifests
  const shadersPath = outputDir ? join(outputDir, OUTPUT_FILE) : OUTPUT_FILE
  let shaders
  try {
    shaders = JSON.parse(await readFile(shadersPath, 'utf-8'))
  } catch {
    console.warn('[shaders] Could not read shaders.json for manifest generation')
    return 0
  }

  for (const shader of shaders) {
    const displayName = shader.displayName || prettifyShaderName(shader.name)
    const fullName = `Paper Cranes - ${displayName}`
    const filename = shaderNameToFilename(shader.name)
    const manifest = makeManifest({
      name: fullName,
      shortName: displayName,
      startUrl: `/?shader=${shader.name}&fullscreen=true`,
    })
    await writeFile(join(manifestsDir, `${filename}.json`), JSON.stringify(manifest, null, 2))
  }

  // Default manifest (written last to avoid being overwritten by a shader named "default")
  const defaultManifest = makeManifest({
    name: 'Paper Cranes',
    shortName: 'Paper Cranes',
    startUrl: '/',
  })
  await writeFile(join(manifestsDir, 'default.json'), JSON.stringify(defaultManifest, null, 2))

  return shaders.length
}

export function shaderPlugin() {
  let watcher = null

  return {
    name: 'vite-plugin-shaders',

    async configResolved(config) {
      // Generate initial shaders.json and manifests
      const count = await generateShadersJson()
      console.log(`[shaders] Generated shaders.json with ${count} shaders`)
      const manifestCount = await generateManifests()
      console.log(`[shaders] Generated ${manifestCount} PWA manifests`)
    },

    configureServer(server) {
      // Watch shader directory for changes
      // NOTE: chokidar v4 on macOS doesn't detect events with glob patterns,
      // so we watch the directory and filter for .frag files in the callback.
      watcher = chokidar.watch(SHADER_DIR, {
        ignoreInitial: true,
      })

      const regenerate = async (eventType, path) => {
        if (!path.endsWith('.frag')) return
        const count = await generateShadersJson()
        await generateManifests()
        console.log(`[shaders] ${eventType}: ${path} (${count} total)`)

        server.ws.send({ type: 'full-reload' })
      }

      watcher.on('add', (path) => regenerate('added', path))
      watcher.on('change', (path) => regenerate('changed', path))
      watcher.on('unlink', (path) => regenerate('removed', path))
    },

    async writeBundle(options) {
      // Copy shaders directory and generate shaders.json + manifests after build
      const outDir = options.dir || 'dist'
      await cp(SHADER_DIR, join(outDir, SHADER_DIR), { recursive: true })
      console.log(`[shaders] Copied ${SHADER_DIR}/ to ${outDir}/`)
      const count = await generateShadersJson(outDir)
      console.log(`[shaders] Generated ${outDir}/shaders.json with ${count} shaders`)
      const manifestCount = await generateManifests(outDir)
      console.log(`[shaders] Generated ${manifestCount} PWA manifests in ${outDir}/`)
    },

    closeBundle() {
      watcher?.close()
    },
  }
}
