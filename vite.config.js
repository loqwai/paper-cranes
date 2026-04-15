import { defineConfig } from 'vite'
import { resolve } from 'path'
import { execSync } from 'child_process'
import { shaderPlugin } from './vite-plugins/shader-plugin.js'
import { remoteWsPlugin } from './vite-plugins/remote-ws-plugin.js'
import { editorSyncPlugin } from './vite-plugins/editor-sync-plugin.js'


const branchToPort = (branch) => {
  if (branch === 'main') return 6969
  let hash = 0
  for (const ch of branch) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
  return 1024 + (Math.abs(hash) % 64511) // 1024–65534
}

const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()

export default defineConfig({
  server: {
    port: parseInt(process.env.PORT) || branchToPort(gitBranch),
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
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        edit: resolve(import.meta.dirname, 'edit.html'),
        jam: resolve(import.meta.dirname, 'jam.html'),
        list: resolve(import.meta.dirname, 'list.html'),
        analyze: resolve(import.meta.dirname, 'analyze.html'),
        playlist: resolve(import.meta.dirname, 'playlist.html'),
      },
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
  plugins: [shaderPlugin(), remoteWsPlugin(), editorSyncPlugin()],
})
