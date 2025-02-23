import { join } from 'path'
import { readdir, stat, mkdir, rm } from 'fs/promises'
import { writeFile } from 'fs/promises'
import { relative } from 'path'


 const shaderHtmlFromFiles = async (shaderFiles) => {
    let htmlContent = '<!DOCTYPE html>\n<html>\n<head>\n<title>Shaders</title>\n</head>\n<body>\n<ul>\n'
    shaderFiles.sort().forEach((file) => {
        const relativePath = relative('shaders', file)
        const queryParam = relativePath.replace(/\\/g, '/').replace('.frag', '')
        htmlContent += `<li><a href="/?shader=${queryParam}">${queryParam}</a></li>\n`
    })
    htmlContent += '</ul>\n</body>\n</html>'
    await writeFile(join('dist', 'shaders.html'), htmlContent)
}

export async function ensureDistDirectory() {
    try{
        await rm('dist', {recursive: true})
    } catch(e){}
    await mkdir('dist', { recursive: true })
}

export async function findFiles(dir, extensions = ['.js', '.css', '.html']) {
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

export function createBuildOptions(isDev = false) {

    const sharedOptions = {
        format: 'esm',
        minify: !isDev,
        sourcemap: true ,
        define: {
            CACHE_NAME: '"2025-02-22:22:01"',
            'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
            'process.env.LIVE_RELOAD': isDev ? 'true' : 'false',
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

    return async function getConfigs() {
        const baseDir = './src'
        const shaderDir = './shaders'
        const imgDir = './images'

        const jsFiles = await findFiles(baseDir, ['.js'])
        const otherFiles = await findFiles(baseDir, ['.css', '.html', '.ttf', '.png', '.svg'])
        const shaderFiles = await findFiles(shaderDir, ['.frag', '.vert'])
        const imgFiles = await findFiles(imgDir, ['.png', '.jpg', '.jpeg'])

        await shaderHtmlFromFiles(shaderFiles)

        const bundleEntrypoints = [
            'index.js',
            'analyze.js',
            'edit.js',
            'service-worker.js',
            ...jsFiles,
        ]

        const copyEntrypoints = [
            'analyze.css',
            'analyze.html',
            'edit.css',
            'edit.html',
            'index.css',
            'index.html',
            'BarGraph.css',
            'favicon.ico',
            ...otherFiles,
            ...shaderFiles,
            ...imgFiles,
        ]

        return {
            copyOptions: {
                ...sharedOptions,
                entryPoints: copyEntrypoints,
                outdir: join(process.cwd(), 'dist'),
                outbase: '.',
                bundle: false,
                format: undefined,
            },
            bundleOptions: {
                ...sharedOptions,
                entryPoints: [...bundleEntrypoints, ...shaderFiles],
                outdir: join(process.cwd(), 'dist'),
                outbase: '.',
                bundle: true,
                treeShaking: true,
            }
        }
    }
}
