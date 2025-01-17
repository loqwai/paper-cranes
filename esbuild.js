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

    await generateHTML(shaderFiles)

    await build({
        entryPoints,
        format: 'esm',
        bundle: true,
        minify: true,
        sourcemap: !process.env.NODE_ENV,
        outdir: join(process.cwd(), 'dist'),
        treeShaking: true,
        define: {
            CACHE_NAME: '"cranes-cache-v1"',
            'process.env.NODE_ENV': '"production"'
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
