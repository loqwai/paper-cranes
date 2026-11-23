import { defineConfig } from 'vite'
import { resolve } from 'path'
import { shaderPlugin } from './vite-plugins/shader-plugin.js'
import { remoteWsPlugin } from './vite-plugins/remote-ws-plugin.js'
import { editorSyncPlugin } from './vite-plugins/editor-sync-plugin.js'
import { vjSignalPlugin } from './vite-plugins/vj-signal-plugin.js'
import { showConfigPlugin } from './vite-plugins/show-config-plugin.js'
import { getPort } from './scripts/dev-port.js'
import { existsSync } from 'fs'

const port = getPort()

// Every page the site can build. Only the ones present are built, so a show repo
// (scripts/show-repo/create.js deletes edit.html, list.html, ...) builds without editing this file.
const PAGES = ['index', 'show', 'edit', 'jam', 'list', 'analyze', 'playlist', 'nfc-writer', 'midi', 'vj', 'vjpad']
const pageInputs = () => Object.fromEntries(
  PAGES
    .map((page) => [page === 'index' ? 'main' : page, resolve(import.meta.dirname, `${page}.html`)])
    .filter(([, path]) => existsSync(path)),
)

export default defineConfig({
  server: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
    watch: {
      // Ignore files that our plugins regenerate on .frag changes.
      // Without this, Vite sees these writes and triggers a full page reload.
      // The plugins handle updates via custom HMR events instead.
      ignored: ['**/shaders.json', '**/manifests/**', '**/shaders/**', '**/controllers/**'],
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: pageInputs(),
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  resolve: {
    alias: {
      'hypnosound': 'https://esm.sh/hypnosound@1.10.2',
      'twgl-base.js': 'https://esm.sh/twgl-base.js@5.5.3',
    },
  },
  worker: {
    format: 'es',
    rollupOptions: {
      external: (id) => id.startsWith('https://'),
    },
  },
  plugins: [shaderPlugin(), remoteWsPlugin(), editorSyncPlugin(), vjSignalPlugin(), showConfigPlugin()],
})
