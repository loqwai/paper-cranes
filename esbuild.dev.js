#!/usr/bin/env node
/**
 * @typedef {import('esbuild').Plugin} Plugin
 * @typedef {import('esbuild').BuildOptions} BuildOptions
 * @typedef {import('esbuild').BuildResult} BuildResult
 * @typedef {import('esbuild').BuildContext} BuildContext
 */

import { context } from 'esbuild'
import { join, relative } from 'path'
import { readdir, stat, mkdir, writeFile, readFile } from 'fs/promises'
import ncp from 'ncp'
import { promisify } from 'util'

const ncpAsync = promisify(ncp)

const copyShaders = {
    name: 'copy-to-dist',
    setup(build) {
        // Handle shader imports
        build.onResolve({ filter: /\.frag$/ }, (args) => {
            console.log('resolving shader', args.path)
            const absolutePath = join(process.cwd(), args.path)
            return {
                path: absolutePath,
                namespace: 'shader-loader'
            }
        })
    }
}

async function ensureDistDirectory() {
    await mkdir('dist', { recursive: true })
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

    await generateHTML(shaderFiles)

    // Create build context for watching
    const ctx = await context({
        entryPoints,
        format: 'esm',
        bundle: true,
        minify: false,
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
            '.frag': 'copy',
            '.html': 'copy'
        },
        plugins: [copyShaders]
    })

    // Watch all files including shaders
    await ctx.watch()

    // Add custom middleware to handle shader requests
await ctx.serve({
    servedir: 'dist',
    port: 6969,
    onRequest: async (args) => {
        if (args.path === '/' || args.path.endsWith('.html')) {
            console.log('HTML requested:', args.path)
            const htmlPath = args.path === '/' ? 'index.html' : args.path.slice(1)
            const fullPath = join(process.cwd(), 'dist', htmlPath)
            console.log('Reading from:', fullPath)
            try {
                const contents = await readFile(fullPath, 'utf8')
                const injectedScript = `
                    <script>
                        console.log('Reload script loaded');
                        new EventSource('/esbuild').addEventListener('change', (event) => {
                            const currentShader = new URLSearchParams(window.location.search).get('shader')
                            if (currentShader && event.data.includes('.frag')) {
                                window.location.reload()
                            }
                        });
                    </script>
                `
                const updatedContents = contents.replace('</head>', `${injectedScript}</head>`)
                console.log('Updated contents:', updatedContents)
                return new Response(updatedContents, {
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Cache-Control': 'no-store',
                    },
                    body: contents,
                })
            } catch (error) {
                console.error('Error processing HTML:', error)
                return new Response('Not Found', { status: 404 })
            }
        }

        // Handle shader files dynamically
        if (args.path.endsWith('.frag')) {
            console.log('Shader requested:', args.path)
            const shaderPath = join(process.cwd(), args.path)
            try {
                const content = await readFile(shaderPath, 'utf8')
                return new Response(content, {
                    headers: {
                        'Content-Type': 'text/plain',
                    },
                })
            } catch (error) {
                console.error('Error processing shader file:', error)
                return new Response('Not Found', { status: 404 })
            }
        }

        // Fallback to esbuild's default handler for other files
        return undefined
    },
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
