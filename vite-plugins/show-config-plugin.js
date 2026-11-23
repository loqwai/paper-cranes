import { readFileSync, existsSync } from 'fs'

// Inlines show.json (a show repo's config: shader, controllers, params, MIDI profiles) into
// <script type="application/json" id="show-config"> in every page that has one, at dev and build
// time. src/show/boot.js reads it synchronously, before index.js reads the URL. On main there is
// no show.json and the block stays `{}`. See docs/show-repos.md.

const SHOW_FILE = 'show.json'
const BLOCK = /(<script type="application\/json" id="show-config">)[\s\S]*?(<\/script>)/

/** The page with its show-config block holding `config`; pages without the block are untouched. */
export const injectShowConfig = (html, config) => {
    if (!BLOCK.test(html)) return html
    // `<` escaped so no string in the config can close the script element early
    const json = JSON.stringify(config ?? {}).replace(/</g, '\\u003c')
    return html.replace(BLOCK, (_, open, close) => `${open}${json}${close}`)
}

const readShowConfig = (root) => {
    const path = `${root}/${SHOW_FILE}`
    if (!existsSync(path)) return null
    return JSON.parse(readFileSync(path, 'utf-8'))
}

export function showConfigPlugin() {
    let root = process.cwd()
    return {
        name: 'vite-plugin-show-config',
        configResolved(config) {
            root = config.root
        },
        configureServer(server) {
            server.watcher.add(`${root}/${SHOW_FILE}`)
            server.watcher.on('change', (path) => {
                if (path.endsWith(`/${SHOW_FILE}`)) server.ws.send({ type: 'full-reload' })
            })
        },
        transformIndexHtml(html) {
            return injectShowConfig(html, readShowConfig(root))
        },
    }
}
