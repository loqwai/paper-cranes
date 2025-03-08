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
            visualizerUrl: `/?shader=${relativePath.replace(/\\/g, '/').replace('.frag', '')}`,
            visualizerQueryParam: relativePath.replace(/\\/g, '/')
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
            CACHE_NAME: '"2025-03-06T03:15:44.056Z"',
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
        resolveExtensions: ['.ts', '.js', '.css', '.json'],
    }

    return async function getConfigs() {
        // Define key directories
        const dirs = {
            pages: './src/pages',
            components: './src/components',
            audio: './src/audio',
            shaders: './shaders',
            images: './images',
            assets: './assets'
        }

        // Find all files in each directory
        const files = {
            pages: await findFiles(dirs.pages, ['.js', '.css', '.html']),
            components: await findFiles(dirs.components, ['.js', '.css']),
            audio: await findFiles(dirs.audio, ['.js']),
            shaders: await findFiles(dirs.shaders, ['.frag']),
            images: await findFiles(dirs.images, ['.png', '.jpg', '.jpeg']),
            assets: await findFiles(dirs.assets, ['.js', '.css', '.html', '.ttf', '.ico'])
        }

        await generateShadersJson(files.shaders)

        // Root files that need to be handled separately
        const rootFiles = [
            './index.js',
            './index.html',
            './index.css',
            './service-worker.js'
        ]

        // Separate JS files that need bundling from static files that just need copying
        const bundleEntrypoints = [
            ...rootFiles.filter(f => f.endsWith('.js')),
            ...files.pages.filter(f => f.endsWith('.js')),
            ...files.components.filter(f => f.endsWith('.js')),
            ...files.audio.filter(f => f.endsWith('.js')),
            ...files.assets.filter(f => f.endsWith('.js'))
        ]

        const copyEntrypoints = [
            ...rootFiles.filter(f => !f.endsWith('.js')),
            ...files.pages.filter(f => !f.endsWith('.js')),
            ...files.components.filter(f => !f.endsWith('.js')),
            ...files.shaders,
            ...files.images,
            ...files.assets.filter(f => !f.endsWith('.js'))
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
                entryPoints: [...bundleEntrypoints, ...files.shaders],
                outdir: join(process.cwd(), 'dist'),
                outbase: '.',
                bundle: true,
                treeShaking: true,
            }
        }
    }
}
