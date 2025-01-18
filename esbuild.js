import { build } from 'esbuild'
import { join, relative } from 'path'
import { readdir, stat, mkdir, writeFile } from 'fs/promises'
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
    return fileList
}

async function getEntryPoints(dir) {
    let entryPoints = []
    const files = await readdir(dir, { withFileTypes: true })
    await Promise.all(
        files.map(async (file) => {
            const filePath = join(dir, file.name)
            if (file.isDirectory()) {
                const subDirEntries = await getEntryPoints(filePath)
                entryPoints = entryPoints.concat(subDirEntries)
            } else if (file.isFile() && file.name.endsWith('.js')) {
                entryPoints.push(filePath)
            }
        }),
    )
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

    const entryPoints = ['index.js', 'edit.js', 'service-worker.js', 'analyze.js']
    const srcEntryPoints = await getEntryPoints('./src')
    entryPoints.push(...srcEntryPoints)

    const shaderDir = 'shaders'
    const shaderFiles = await getShaderFiles(shaderDir)

    // Set up development server with live reload
    if (process.env.NODE_ENV !== 'production') {
        const browserSync = (await import('browser-sync')).default.create()
        const chokidar = (await import('chokidar')).default

        // Start BrowserSync server
        browserSync.init({
            server: 'dist',
            files: 'dist/**/*.*',
            open: true,
            notify: true,
            port: 6969,
        })

        // Watch source files and rebuild on changes
        const watcher = chokidar.watch([
            'src/**/*',
            'shaders/**/*',
            '*.html',
            '*.css'
        ], {
            ignored: /(^|[\/\\])\..|node_modules|.git/, // Ignore dotfiles and node_modules
            persistent: true
        })

        watcher.on('change', async (path) => {
            console.log(`File ${path} changed. Rebuilding...`)
            try {
                // Regenerate HTML if a shader file changed
                if (path.endsWith('.frag')) {
                    const updatedShaderFiles = await getShaderFiles(shaderDir)
                    await generateHTML(updatedShaderFiles)
                    console.log('Shader list updated')

                    // Copy only the changed shader file
                    const relativePath = relative(process.cwd(), path)
                    const destPath = join('dist', relativePath)
                    await ncpAsync(path, destPath)
                    console.log(`Copied ${relativePath} to dist`)

                    // Get shader path for URL
                    const shaderPath = relative('shaders', path)
                        .replace(/\\/g, '/')
                        .replace('.frag', '')

                    // Reload with specific shader
                    browserSync.reload(`/?shader=${shaderPath}`)
                } else {
                    browserSync.reload()
                }

                // Re-run build steps
                await build({
                    entryPoints,
                    format: 'esm',
                    bundle: true,
                    minify: true,
                    sourcemap: true,
                    outdir: join(process.cwd(), 'dist'),
                    treeShaking: true,
                    define: {
                        CACHE_NAME: '"cranes-cache-v2"',
                        'process.env.NODE_ENV': process.env.NODE_ENV ?? '"development"',
                    },
                    loader: {
                        '.ttf': 'file',
                        '.woff': 'file',
                        '.woff2': 'file',
                    }
                })

                console.log('Rebuild complete')
            } catch (error) {
                console.error('Build failed:', error)
            }
        })
    }

    await generateHTML(shaderFiles)

    await build({
        entryPoints,
        format: 'esm',
        bundle: true,
        minify: true,
        sourcemap: true,
        outdir: join(process.cwd(), 'dist'),
        treeShaking: true,
        define: {
            CACHE_NAME: '"cranes-cache-v2"',
            'process.env.NODE_ENV': process.env.NODE_ENV ?? '"development"',
        },
        loader: {
            '.ttf': 'file',
            '.woff': 'file',
            '.woff2': 'file',
        }
    })

    // Copy Monaco's files separately
    await ncpAsync(
        'node_modules/monaco-editor/min/vs',
        'dist/vs'
    )

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

main().catch(console.error)
