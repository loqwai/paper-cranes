import { join, relative } from 'path'
import { readdir, readFile, writeFile, mkdir, cp, stat } from 'fs/promises'
import chokidar from 'chokidar'
import { extractMetadata, extractPresets } from '../scripts/shader-utils.js'
import {
  resolveDates,
  gitDirtyFiles,
  distinctDateCount,
  writeBakedDates,
  DATES_FILE,
} from '../scripts/shader-dates.js'

const SHADER_DIR = 'shaders'
const CONTROLLER_DIR = 'controllers'
const IMAGE_DIR = join('public', 'images')
const OUTPUT_FILE = 'shaders.json'
const IMAGES_FILE = 'images.json'
const MANIFESTS_DIR = 'manifests'
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif)$/i

/**
 * Tags come from `// @tags: a, b`, but extractMetadata only splits on comma —
 * a single tag arrives as a bare string. Normalize so consumers never branch.
 * @param {unknown} tags
 * @returns {string[]}
 */
const normalizeTags = (tags) => {
  if (!tags) return []
  const list = Array.isArray(tags) ? tags : String(tags).split(',')
  return [...new Set(list.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))]
}

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
  const [{ dates: modifiedDates, source, live, usable }, dirtyFiles] = await Promise.all([
    resolveDates(),
    gitDirtyFiles(),
  ])

  // Keep the committed fallback current, but ONLY from real history — never let a
  // shallow CI clone overwrite it with 346 copies of the build timestamp.
  if (usable) await writeBakedDates(live)

  const shaders = await Promise.all(
    shaderFiles.sort().map(async (file) => {
      const relativePath = relative(SHADER_DIR, file)
      const content = await readFile(file, 'utf-8')
      const meta = extractMetadata(content)
      const shaderPath = relativePath.replace(/\\/g, '/').replace('.frag', '')
      const posixPath = file.replace(/\\/g, '/')

      // Uncommitted work really is the newest thing on disk, so mtime wins there.
      // Otherwise take the resolved history; a shader with no history at all is
      // one added since the last bake, so its checkout mtime is a fair estimate.
      // If we know nothing, emit null rather than inventing "today" — a fabricated
      // date silently lies about the sort order.
      const known = dirtyFiles.has(posixPath) ? null : modifiedDates.get(posixPath)
      const modified = known ?? (dirtyFiles.has(posixPath) || usable ? (await stat(file)).mtime.toISOString() : null)

      // Presets used to be discovered by the list page fetching all 345 .frag files
      // (6.5MB) on every load. They are static — read them here, once, at build time.
      const presets = extractPresets(content)
      const tags = normalizeTags(meta.tags)

      return {
        name: shaderPath,
        fileUrl: `shaders/${relativePath.replace(/\\/g, '/')}`,
        visualizerUrl: `/?shader=${shaderPath}`,
        ...meta,
        // Preserve the path-based name; move @name metadata to displayName
        ...(meta.name ? { displayName: meta.name, name: shaderPath } : {}),
        prettyName: meta.name || prettifyShaderName(shaderPath),
        modified,
        ...(tags.length ? { tags } : {}),
        ...(presets.length ? { presets } : {}),
      }
    })
  )

  // The check that would have caught the shallow-clone bug: every shader HAD a
  // date, so nothing looked wrong — but they were all the same date, so "newest"
  // sorted nothing. Presence is not correctness; assert the spread.
  const distinct = new Set(shaders.map((shader) => shader.modified).filter(Boolean)).size
  const dated = shaders.filter((shader) => shader.modified).length
  if (distinct > 1) {
    console.log(`[shaders] Dates from ${source}: ${dated}/${shaders.length} dated, ${distinct} distinct`)
  } else {
    console.warn(
      `[shaders] WARNING: only ${distinct} distinct modified date across ${shaders.length} shaders ` +
        `(source: ${source}). Sort-by-newest will be meaningless. ` +
        `Run \`npm run shader-dates\` from a full clone and commit ${DATES_FILE}.`
    )
  }

  const outputPath = outputDir ? join(outputDir, OUTPUT_FILE) : OUTPUT_FILE
  if (outputDir) {
    await mkdir(outputDir, { recursive: true })
  }
  await writeFile(outputPath, JSON.stringify(shaders, null, 2))
  return shaders.length
}

/**
 * Index of usable `?image=` textures so the list page can offer a picker
 * instead of requiring the URL to be edited by hand.
 * @param {string|null} outputDir
 * @returns {Promise<number>} number of images indexed
 */
async function generateImagesJson(outputDir = null) {
  let entries = []
  try {
    entries = await readdir(IMAGE_DIR, { withFileTypes: true })
  } catch {
    return 0 // no public/images — picker just renders empty
  }

  const images = entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.test(entry.name))
    .map((entry) => ({
      name: entry.name.replace(IMAGE_EXTENSIONS, '').replace(/[-_]/g, ' '),
      url: `images/${entry.name}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const outputPath = outputDir ? join(outputDir, IMAGES_FILE) : IMAGES_FILE
  if (outputDir) await mkdir(outputDir, { recursive: true })
  await writeFile(outputPath, JSON.stringify(images, null, 2))
  return images.length
}

function prettifyShaderName(name) {
  // "melted-satin/1" -> "Melted Satin 1", "wip/claude/my-shader" -> "My Shader"
  // "wooli/2" -> "Wooli 2" (include parent when last segment is short/numeric)
  if (name.includes('/')) {
    const parts = name.split('/')
    const last = parts[parts.length - 1]
    // If last segment is just a number or very short, include the parent folder
    if (/^\d+$/.test(last) || last.length <= 2) {
      const parent = parts[parts.length - 2]
      return `${parent} ${last}`
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toLowerCase())
    }
    return last
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toLowerCase())
  }
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toLowerCase())
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
    const startUrl = `/?shader=${shader.name}&fullscreen=true`
    const manifest = makeManifest({
      name: fullName,
      shortName: displayName,
      startUrl,
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
      const imageCount = await generateImagesJson()
      console.log(`[shaders] Indexed ${imageCount} images`)
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

        // Send a custom event instead of full-reload so the editor page
        // can handle shader changes without losing editor state.
        // Pages that need a full reload can listen for this event and reload themselves.
        server.ws.send({
          type: 'custom',
          event: 'shaders-changed',
          data: { path, eventType, count },
        })
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
      // Controllers are imported at runtime from /controllers/<name>.js (see jam.js / index.js).
      // Like shaders, they live in the repo root and Vite won't bundle them — copy to dist so
      // they exist on the deployed site. Without this, every controller 404s in production and
      // controllerFeatures is empty (all quietGate/wavelet-driven effects silently dead).
      await cp(CONTROLLER_DIR, join(outDir, CONTROLLER_DIR), { recursive: true })
      console.log(`[shaders] Copied ${CONTROLLER_DIR}/ to ${outDir}/`)
      const count = await generateShadersJson(outDir)
      console.log(`[shaders] Generated ${outDir}/shaders.json with ${count} shaders`)
      const manifestCount = await generateManifests(outDir)
      console.log(`[shaders] Generated ${manifestCount} PWA manifests in ${outDir}/`)
      const imageCount = await generateImagesJson(outDir)
      console.log(`[shaders] Indexed ${imageCount} images in ${outDir}/`)
    },

    closeBundle() {
      watcher?.close()
    },
  }
}
