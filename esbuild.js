#!/usr/bin/env node

import { context, build } from 'esbuild'
import { join } from 'path'
import { readdir, stat, mkdir, rm } from 'fs/promises'

async function ensureDistDirectory() {
    // remove current dist dir
    try{
        await rm('dist', {recursive: true})
    } catch(e){}
    await mkdir('dist', { recursive: true })
}

/**
 * Recursively find all files with the specified extensions in a directory.
 * @param {string} dir - The directory to search in.
 * @param {string[]} extensions - The file extensions to include.
 * @returns {Promise<string[]>} - List of file paths.
 */
async function findFiles(dir, extensions = ['.js', '.css', '.html']) {
    let fileList = []
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
        }),
    )
    return fileList
}

async function main() {
    await ensureDistDirectory()

    const baseDir = './src'
    const shaderDir = './shaders'
    const imgDir = './images'

    // Find all JS files to bundle
    const jsFiles = await findFiles(baseDir, ['.js'])

    // Find other assets to copy
    const otherFiles = await findFiles(baseDir, ['.css', '.html', '.ttf', '.png', '.svg'])
    const shaderFiles = await findFiles(shaderDir, ['.frag', '.vert'])
    const imgFiles = await findFiles(imgDir, ['.png', '.jpg', '.jpeg'])

    // Files that should be bundled (all JavaScript)
    const bundleEntrypoints = [
        'index.js',
        'analyze.js',
        'edit.js',
        'service-worker.js',
        ...jsFiles,
    ]

    // Files that should be watched and copied
    const watchAndCopyEntrypoints = [
        'analyze.css',
        'analyze.html',
        'edit.css',
        'edit.html',
        'index.css',
        'index.html',
        'BarGraph.css',
        'favicon.ico',
        ...otherFiles,
        ...shaderFiles,  // Include shaders in both configs for watching
        ...imgFiles,
    ]

    const sharedOptions = {
        format: 'esm',
        minify: true,
        sourcemap: true,
        define: {
            CACHE_NAME: '"cranes-cache-v2"',
            'process.env.NODE_ENV': process.env.NODE_ENV ?? '"development"',
        },
        loader: {
            '.ttf': 'copy',
            '.woff': 'file',
            '.woff2': 'file',
            '.html': 'copy',
            '.png': 'copy',
            '.svg': 'file',
            '.frag': 'copy',
            '.vert': 'copy',
            '.ico': 'copy',
            '.jpeg': 'copy',
            '.jpg': 'copy',
            '.png': 'copy',
        }
    }

    const copyOptions = {
        ...sharedOptions,
        entryPoints: watchAndCopyEntrypoints,  // Renamed for clarity
        outdir: join(process.cwd(), 'dist'),
        outbase: '.',
        bundle: false,
        format: undefined,
    }

    const bundleOptions = {
        ...sharedOptions,
        entryPoints: [...bundleEntrypoints, ...shaderFiles],  // Add shaders here too
        outdir: join(process.cwd(), 'dist'),
        outbase: '.',
        bundle: true,
        treeShaking: true,
    }

    const isDevelopment = process.env.NODE_ENV !== 'production'

    if (isDevelopment) {
        // Development: Watch and serve
        const ctxCopy = await context(copyOptions)
        const ctxBundle = await context(bundleOptions)

        await ctxCopy.watch()
        await ctxBundle.watch()

        await ctxBundle.serve({
            servedir: 'dist',
            port: 6969,
        })
        return
    }

    // Production: Build both configurations
    await Promise.all([
        build(copyOptions),
        build(bundleOptions),
    ])
}

main()
