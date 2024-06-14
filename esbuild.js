import { build } from 'esbuild'
import { join, relative } from 'path'
import { readdir, stat, mkdir, writeFile } from 'fs/promises'
import ncp from 'ncp'
import { promisify } from 'util'

const ncpAsync = promisify(ncp)

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
                if (!['private', 'wip', 'knobs', 'utils', 'practice'].includes(file)) {
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

async function generateHTML(shaderFiles) {
    let htmlContent = '<!DOCTYPE html>\n<html>\n<head>\n<title>Shaders</title>\n</head>\n<body>\n<ul>\n'
    shaderFiles.forEach((file) => {
        const relativePath = relative('shaders', file)
        const queryParam = relativePath.replace(/\\/g, '/').replace('.frag', '')
        htmlContent += `<li><a href="/?shader=${queryParam}">${queryParam}</a></li>\n`
    })
    htmlContent += '</ul>\n</body>\n</html>'

    await writeFile(join('dist', 'shaders.html'), htmlContent)
}

async function main() {
    await ensureDistDirectory()

    const entryPoints = ['index.js', 'edit.js', 'service-worker.js']
    const srcFiles = await readdir('./src', { withFileTypes: true })
    srcFiles.forEach((file) => {
        if (file.isFile() && file.name.endsWith('.js')) {
            entryPoints.push(`src/${file.name}`)
        }
    })

    const shaderDir = 'shaders'
    const shaderFiles = await getShaderFiles(shaderDir)

    await generateHTML(shaderFiles)

    await build({
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

    await Promise.all([
        ncpAsync('index.html', 'dist/index.html'),
        ncpAsync('index.css', 'dist/index.css'),
        ncpAsync('edit.html', 'dist/edit.html'),
        ncpAsync('edit.css', 'dist/edit.css'),
        ncpAsync('favicon.ico', 'dist/favicon.ico'),
        ncpAsync('images', 'dist/images'),
        ncpAsync('shaders', 'dist/shaders'),
        ncpAsync('codicon.ttf', 'dist/codicon.ttf'),
    ])
}

main().catch(console.error)
