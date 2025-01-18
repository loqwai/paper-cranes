import { build } from 'esbuild'
import { context } from 'esbuild'
import { join, relative } from 'path'
import { readdir, stat, mkdir, writeFile, rm, rename } from 'fs/promises'
import ncp from 'ncp'
import { promisify } from 'util'
import chokidar from 'chokidar'

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

async function copyWithTemp(src, dest) {
    const tempDest = `${dest}.tmp`
    try {
        // Copy to temp location first
        await ncpAsync(src, tempDest)
        // Then quickly swap the files
        try {
            await rm(dest, { force: true })
        } catch (err) {
            // Ignore if file doesn't exist
        }
        await rename(tempDest, dest)
    } catch (error) {
        console.error(`Error copying ${src}:`, error)
        // Clean up temp file if it exists
        try {
            await rm(tempDest, { force: true })
        } catch (err) {}
    }
}

async function watchShaders() {
    const watcher = chokidar.watch('shaders/**/*.{frag,vert}', {
        ignoreInitial: false,
        persistent: true,
        awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 100
        }
    });

    // Log all watcher events
    watcher.on('ready', () => console.log('Initial scan complete. Ready for changes...'));
    watcher.on('add', path => console.log(`File ${path} has been added`));
    watcher.on('change', path => console.log(`File ${path} has been changed`));
    watcher.on('unlink', path => console.log(`File ${path} has been removed`));
    watcher.on('error', error => console.log(`Watcher error: ${error}`));

    watcher.on('all', async (event, path) => {
        console.log(`Shader event: ${event} on path: ${path}`);
        try {
            const relativePath = relative('shaders', path);
            const destPath = join('dist/shaders', relativePath);
            await copyWithTemp(path, destPath);
            console.log(`Shader copied from ${path} to ${destPath}`);
        } catch (error) {
            console.error('Error copying shader:', error);
        }
    });

    return watcher;
}

async function main() {
    await ensureDistDirectory()

    const entryPoints = ['index.js', 'edit.js', 'service-worker.js', 'analyze.js']
    const srcEntryPoints = await getEntryPoints('./src')
    entryPoints.push(...srcEntryPoints)

    const shaderDir = 'shaders'
    const shaderFiles = await getShaderFiles(shaderDir)

    await generateHTML(shaderFiles)

    // Set up shader watching if in watch mode
    let shaderWatcher;
    if (process.env.NODE_ENV !== 'production') {
        shaderWatcher = await watchShaders();
    }

    const ctx = await context({
        entryPoints,
        format: 'esm',
        bundle: true,
        minify: process.env.NODE_ENV === 'production',
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

    // Initial copy of static files
    await Promise.all([
        ncpAsync('node_modules/monaco-editor/min/vs', 'dist/vs'),
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

    if (process.env.NODE_ENV !== 'production') {
        await ctx.watch()
        await ctx.serve({
            servedir: 'dist',
            port: 6969,
            host: 'localhost',
        })
        console.log('Development server running on http://localhost:6969')
        // Keep the process running
        await new Promise(() => {})
    } else {
        await ctx.rebuild()
        await ctx.dispose()
    }
}

main().catch(console.error)
