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
    const dynamicFiles = await findFiles(baseDir, ['.js', '.css', '.html', '.ttf', '.png', '.svg'])

    // Specifically find shaders in the shaders folder
    const shaderFiles = await findFiles(shaderDir, ['.frag'])
    const rootEntrypoints = [
        'index.js',

        'service-worker.js',

        'analyze.js',
        'analyze.css',
        'analyze.html',


        'edit.js',
        'edit.css',
        'edit.html',

        'favicon.ico',
    ]
    const sharedOptions = {
        format: 'esm',
        minify: true,
        sourcemap: true,
        treeShaking: true,
        define: {
            CACHE_NAME: '"cranes-cache-v2"',
            'process.env.NODE_ENV': process.env.NODE_ENV ?? '"development"',
        },
        loader: {
            '.ttf': 'file',
            '.woff': 'file',
            '.woff2': 'file',
            '.html': 'file',
            '.png': 'file',
            '.svg': 'file',
            '.frag': 'file',
            '.ico': 'file', // Treat shaders as plain text
        }
    }

    const individualFileOptions = {
        ...sharedOptions,
        entryPoints: [...dynamicFiles, ...shaderFiles,], // Include shaders and other files
        outdir: join(process.cwd(), 'dist'),
        bundle: false, // Process files individually
    }

    const bundleOptions = {
        ...sharedOptions,
        entryPoints: rootEntrypoints, // Bundle main entry points
        outdir: join(process.cwd(), 'dist/bundle'),
        bundle: true,
    }

    const isDevelopment = process.env.NODE_ENV !== 'production'

    if (isDevelopment) {
        // Development: Watch and serve
        const ctxIndividual = await context(individualFileOptions)
        const ctxBundle = await context(bundleOptions)

        await ctxIndividual.watch()
        await ctxBundle.watch()

        await ctxBundle.serve({
            servedir: 'dist',
            port: 6969,
        })
        return
    }
        // Production: Build both configurations
        await Promise.all([
            build(individualFileOptions),
            build(bundleOptions),
        ])
}

main().catch(console.error)
