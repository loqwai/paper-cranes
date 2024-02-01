const esbuild = require('esbuild')
const path = require('path')
const ncp = require('ncp').ncp
const fs = require('fs')
// Define your entry points
const entryPoints = ['index.js', 'service-worker.js']
// add all files in src/ as entry points
fs.readdirSync('./src', { recursive: true }).forEach((file) => {
    if (file.endsWith('.js')) {
        entryPoints.push(`src/${file}`)
    }
})
// esbuild configuration for tree-shaking
esbuild
    .build({
        entryPoints: entryPoints,
        format: 'esm',
        bundle: true,
        minify: true,
        sourcemap: true,
        outdir: path.join(__dirname, 'dist'),
        treeShaking: true, // The essence of your quest,
        define: {
            CACHE_NAME: `"cache_${Date.now()}"`,
        },
    })
    .then(() => {
        return Promise.all([
            ncp('index.html', 'dist/index.html'),
            ncp('index.css', 'dist/index.css'),
            ncp('favicon.ico', 'dist/favicon.ico'),
            ncp('shaders', 'dist/shaders'),
            ncp('images', 'dist/images'),
        ])
    })
    .catch(console.error)
