import { build } from 'esbuild'
import { join } from 'path'
import { readdirSync } from 'fs'
import * as ncp from 'ncp'

const entryPoints = ['index.js', 'edit.js', 'service-worker.js']
readdirSync('./src', { recursive: true }).forEach((file) => {
    if (file.endsWith('.js')) {
        entryPoints.push(`src/${file}`)
    }
})

build({
    entryPoints: entryPoints,
    format: 'esm',
    bundle: true,
    minify: true,
    sourcemap: !process.env.NODE_ENV,
    outdir: join(process.cwd(), 'dist'),
    treeShaking: true,
    define: {
        CACHE_NAME: '"cranes-cache-v1"',
    },
})
    .then(() =>
        Promise.all([
            ncp('index.html', 'dist/index.html'),
            ncp('index.css', 'dist/index.css'),
            ncp('edit.html', 'dist/edit.html'),
            ncp('edit.css', 'dist/edit.css'),
            ncp('favicon.ico', 'dist/favicon.ico'),
            ncp('images', 'dist/images'),
            ncp('shaders', 'dist/shaders'),
        ]),
    )
    .catch(console.error)
