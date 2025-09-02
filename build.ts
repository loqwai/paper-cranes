import { join } from 'path'
import { readdir, stat, mkdir, rm, writeFile } from 'fs/promises'
import { relative } from 'path'
import * as esbuild from 'esbuild'

interface ShaderMetadata {
  name: string
  fileUrl: string
  visualizerUrl: string
}

const generateShadersJson = async (shaderFiles: string[]): Promise<void> => {
  const shaders: ShaderMetadata[] = shaderFiles.sort().map(file => {
    const relativePath = relative('shaders', file)
    return {
      name: relativePath.replace(/\\\\/g, '/').replace('.frag', ''),
      fileUrl: `shaders/${relativePath}`,
      visualizerUrl: `/?shader=${relativePath.replace(/\\\\/g, '/').replace('.frag', '')}`
    }
  })

  await writeFile(
    join('dist', 'shaders.json'),
    JSON.stringify(shaders, null, 2)
  )
}

export const ensureDistDirectory = async (): Promise<void> => {
  try {
    await rm('dist', { recursive: true })
  } catch {
    // Directory doesn't exist, that's fine
  }
  await mkdir('dist', { recursive: true })
}

export const findFiles = async (dir: string, extensions: string[] = ['.js', '.css', '.html']): Promise<string[]> => {
  let fileList: string[] = []
  
  try {
    const files = await readdir(dir, { withFileTypes: true })

    await Promise.all(
      files.map(async (file) => {
        const filePath = join(dir, file.name)
        const fileStat = await stat(filePath)

        if (fileStat.isDirectory()) {
          const subDirFiles = await findFiles(filePath, extensions)
          fileList = fileList.concat(subDirFiles)
        } else if (fileStat.isFile() && extensions.some((ext) => file.name.endsWith(ext))) {
          fileList.push(filePath)
        }
      })
    )
  } catch (err) {
    throw new Error(`Failed to find files in ${dir}: ${err}`)
  }
  
  return fileList
}

export const createBuildOptions = (isDev = false) => {
  const cacheName = isDev ? 'development' : new Date().toISOString()
  
  const sharedOptions: esbuild.BuildOptions = {
    format: 'esm',
    minify: !isDev,
    sourcemap: true,
    target: 'es2022',
    define: {
      CACHE_NAME: `"${cacheName}"`,
      'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
      'process.env.LIVE_RELOAD': isDev ? 'true' : 'false',
    },
    loader: {
      '.ttf': 'copy',
      '.woff': 'file',
      '.woff2': 'file',
      '.html': 'copy',
      '.png': 'copy',
      '.svg': 'file',
      '.frag': 'copy',
      '.ico': 'copy',
      '.jpeg': 'copy',
      '.jpg': 'copy',
    },
    logLevel: 'info',
    metafile: true,
  }

  return async function getConfigs() {
    const baseDir = './src'
    const shaderDir = './shaders'
    const imgDir = './images'
    const controllerDir = './controllers'

    // Find TypeScript and JavaScript files
    const tsFiles = await findFiles(baseDir, ['.ts'])
    const jsFiles = await findFiles(baseDir, ['.js'])
    const otherFiles = await findFiles(baseDir, ['.css', '.html', '.ttf', '.png', '.svg'])
    const shaderFiles = await findFiles(shaderDir, ['.frag'])
    const imgFiles = await findFiles(imgDir, ['.png', '.jpg', '.jpeg'])
    const controllerFiles = await findFiles(controllerDir, ['.js'])

    await generateShadersJson(shaderFiles)

    const bundleEntrypoints = [
      'src/index.ts',
      'analyze.js',
      'edit.js',
      'list.js',
      'service-worker.js',
      ...tsFiles,
      ...jsFiles,
      ...controllerFiles,
    ]

    const copyEntrypoints = [
      'analyze.css',
      'analyze.html',
      'edit.css',
      'edit.html',
      'index.css',
      'index.html',
      'list.html',
      'BarGraph.css',
      'favicon.ico',
      ...otherFiles,
      ...shaderFiles,
      ...imgFiles,
    ]

    return {
      copyOptions: {
        ...sharedOptions,
        entryPoints: copyEntrypoints,
        outdir: join(process.cwd(), 'dist'),
        outbase: '.',
        bundle: false,
        format: undefined,
      } as esbuild.BuildOptions,
      
      bundleOptions: {
        ...sharedOptions,
        entryPoints: bundleEntrypoints,
        outdir: join(process.cwd(), 'dist'),
        outbase: '.',
        bundle: true,
        treeShaking: true,
        splitting: true,
        external: ['twgl-base.js'],
      } as esbuild.BuildOptions
    }
  }
}

// Main build function
export const build = async (isDev = false): Promise<void> => {
  console.log(`🚀 Starting ${isDev ? 'development' : 'production'} build...`)
  
  try {
    await ensureDistDirectory()
    
    const getConfigs = createBuildOptions(isDev)
    const { copyOptions, bundleOptions } = await getConfigs()
    
    // Run copy and bundle operations in parallel
    const [copyResult, bundleResult] = await Promise.all([
      esbuild.build(copyOptions),
      esbuild.build(bundleOptions)
    ])
    
    console.log('✅ Build completed successfully!')
    
    if (!isDev) {
      // Output bundle analysis for production builds
      console.log('📊 Bundle analysis:')
      if (bundleResult.metafile) {
        const analysis = await esbuild.analyzeMetafile(bundleResult.metafile)
        console.log(analysis)
      }
    }
    
  } catch (err) {
    console.error('❌ Build failed:', err)
    process.exit(1)
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const isDev = process.argv.includes('--dev')
  build(isDev)
}