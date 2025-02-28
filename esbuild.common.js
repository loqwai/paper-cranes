import { join } from 'path'
import { readdir, stat, mkdir, rm } from 'fs/promises'
import { writeFile } from 'fs/promises'
import { relative } from 'path'

const generateShadersJson = async (shaderFiles) => {
    const shaders = shaderFiles.sort().map(file => {
        const relativePath = relative('shaders', file)
        return {
            name: relativePath.replace(/\\/g, '/').replace('.frag', ''),
            fileUrl: `shaders/${relativePath}`,
            visualizerUrl: `/?shader=${relativePath.replace(/\\/g, '/').replace('.frag', '')}`
        }
    })

    await writeFile(
        join('dist', 'shaders.json'),
        JSON.stringify(shaders, null, 2)
    )
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
        sourcemap: true,
        define: {
            CACHE_NAME: '"2025-02-28T06:30:11.340Z"',
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
            '.ico': 'copy',
            '.jpeg': 'copy',
            '.jpg': 'copy',
            '.png': 'copy',
        },
    }

    return async function getConfigs() {
        const baseDir = './src'
        const shaderDir = './shaders'
        const imgDir = './images'

        const jsFiles = await findFiles(baseDir, ['.js'])
        const otherFiles = await findFiles(baseDir, ['.css', '.html', '.ttf', '.png', '.svg'])
        const shaderFiles = await findFiles(shaderDir, ['.frag'])
        const imgFiles = await findFiles(imgDir, ['.png', '.jpg', '.jpeg'])

        await generateShadersJson(shaderFiles)

        const bundleEntrypoints = [
            'index.js',
            'analyze.js',
            'edit.js',
            'list.js',
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
            'list.html',
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
