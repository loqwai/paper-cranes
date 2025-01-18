import { build, context } from 'esbuild'
import { join, relative } from 'path'
import { readdir, stat, mkdir, writeFile, rm } from 'fs/promises'
import ncp from 'ncp'
import { promisify } from 'util'

const ncpAsync = promisify(ncp)

async function ensureDistDirectory() {
    try {
        await mkdir('dist', { recursive: true })
    } catch (err) {
        console.error('Error ensuring dist directory:', err)
    }
}

async function getShaderFiles(dir) {
    let fileList = []
    const files = await readdir(dir)
    await Promise.all(
        files.map(async (file) => {
            const filePath = join(dir, file)
            const stats = await stat(filePath)
            if (stats.isDirectory()) {
                if (!['private', 'knobs', 'utils', 'practice'].includes(file)) {
                    const subDirFiles = await getShaderFiles(filePath)
                    fileList = fileList.concat(subDirFiles)
                }
            } else if (file.endsWith('.frag')) {
                fileList.push(filePath)
            }
        }),
    )
    console.log('shader files', fileList.length)
    return fileList
}

async function getEntryPoints(...dirs) {
    let entryPoints = []
    for (const dir of dirs) {
        const files = await readdir(dir, { withFileTypes: true })
    await Promise.all(
        files.map(async (file) => {
            console.log('file', file)
            const filePath = join(dir, file.name)
            if (file.isDirectory()) {
                const subDirEntries = await getEntryPoints(filePath)
                entryPoints = entryPoints.concat(subDirEntries)
            } else if (file.isFile() && file.name.endsWith('.js')) {
                entryPoints.push(filePath)
                }
            }),
            )
    }
    return entryPoints
}

async function generateHTML(shaderFiles) {
    let htmlContent = '<!DOCTYPE html>\n<html>\n<head>\n<title>Shaders</title>\n</head>\n<body>\n<ul>\n'
    shaderFiles.forEach((file) => {
        const relativePath = relative('shaders', file)
        const queryParam = relativePath.replace(/\\/g, '/').replace('.frag', '')
        htmlContent += `<li><a href="/?shader=${queryParam}&fullscreen=true">${queryParam}</a></li>\n`
    })
    htmlContent += '</ul>\n</body>\n</html>'

    await writeFile(join('dist', 'shaders.html'), htmlContent)
}

async function main() {
    await ensureDistDirectory()

    const rootEntryPoints = ['index.js', 'edit.js', 'service-worker.js', 'analyze.js']
    const srcEntryPoints = await getEntryPoints('./src')
    const shaderFiles = await getShaderFiles('shaders')

    // Add shader files as entrypoints
    const entryPoints = [...rootEntryPoints, ...srcEntryPoints, ...shaderFiles]
    const buildOptions = {
        entryPoints,
        format: 'esm',
        bundle: true,
        minify: process.env.NODE_ENV === 'production',
        sourcemap: true,
        outdir: join(process.cwd(), 'dist'),
        treeShaking: true,
        define: {
            CACHE_NAME: '"cranes-cache-v3"',
            'process.env.NODE_ENV': process.env.NODE_ENV ?? '"development"',
        },
        loader: {
            '.ttf': 'file',
            '.woff': 'file',
            '.woff2': 'file',
            '.frag': 'file',
        },
        plugins: [{
            name: 'rebuild-logger',
            setup(build) {
                build.onEnd(async result => {
                    const timestamp = new Date().toLocaleTimeString()
                    console.log(`[${timestamp}] Build completed with:`)
                    console.log(`  ${result.errors.length} errors`)
                    console.log(`  ${result.warnings.length} warnings`)

                    await ncpAsync('shaders', 'dist/shaders')
                    const updatedShaderFiles = await getShaderFiles('shaders')
                    await generateHTML(updatedShaderFiles)
                    console.log('Shader files updated')
                })
            }
        },
        {
            name: 'selective-reload',
            setup(build) {
                build.onStart(() => {
                    console.log('Build starting...')
                })
                build.onResolve({ filter: /^index\.js$/ }, args => {
                    return { path: args.path, namespace: 'reload-namespace' }
                })
                build.onLoad({ filter: /index\.js$/, namespace: 'reload-namespace' }, () => ({
                    contents: '(() => new EventSource("/esbuild").onmessage = () => location.reload())();',
                    loader: 'js'
                }))
            }
        }]
    }
    if (process.env.NODE_ENV !== 'production') {
        const ctx = await context({
            ...buildOptions,
            outdir: 'dist',
            sourcemap: 'linked',
        })

        // Copy static files first
        await Promise.all([
            ncpAsync('index.html', 'dist/index.html'),
            ncpAsync('index.css', 'dist/index.css'),
            ncpAsync('edit.html', 'dist/edit.html'),
            ncpAsync('edit.css', 'dist/edit.css'),
            ncpAsync('BarGraph.css', 'dist/BarGraph.css'),
            ncpAsync('favicon.ico', 'dist/favicon.ico'),
            ncpAsync('images', 'dist/images'),
            ncpAsync('shaders', 'dist/shaders'),
            ncpAsync('codicon.ttf', 'dist/codicon.ttf'),
            ncpAsync('analyze.html', 'dist/analyze.html'),
            ncpAsync('analyze.css', 'dist/analyze.css'),
            ncpAsync('node_modules/monaco-editor/min/vs', 'dist/vs'),
        ])

        // Start watching with explicit paths
        await ctx.watch()

        const { host, port } = await ctx.serve({
            servedir: 'dist',
            port: 6969,
        })

        console.log(`Development server running at http://${host}:${port}`)

        // Handle graceful shutdown
        const cleanup = async () => {
            await ctx.dispose()
            //remove everything in dist
            await rm(join(process.cwd(), 'dist'), { recursive: true, force: true })
            process.exit(0)
        }

        process.on('SIGINT', cleanup)
        process.on('SIGTERM', cleanup)
    } else {
        // Production mode: just build once
        await build(buildOptions)

        // Copy static files
        await Promise.all([
            ncpAsync('index.html', 'dist/index.html'),
            ncpAsync('index.css', 'dist/index.css'),
            ncpAsync('edit.html', 'dist/edit.html'),
            ncpAsync('edit.css', 'dist/edit.css'),
            ncpAsync('BarGraph.css', 'dist/BarGraph.css'),
            ncpAsync('favicon.ico', 'dist/favicon.ico'),
            ncpAsync('images', 'dist/images'),
            ncpAsync('shaders', 'dist/shaders'),
            ncpAsync('codicon.ttf', 'dist/codicon.ttf'),
            ncpAsync('analyze.html', 'dist/analyze.html'),
            ncpAsync('analyze.css', 'dist/analyze.css'),
        ])
    }
}

main().catch(console.error)
