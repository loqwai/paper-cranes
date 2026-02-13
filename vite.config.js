import { defineConfig } from 'vite'
import { resolve } from 'path'
import { shaderPlugin } from './vite-plugins/shader-plugin.js'
import { remoteWsPlugin } from './vite-plugins/remote-ws-plugin.js'

export default defineConfig({
  server: {
    port: parseInt(process.env.PORT) || 6969,
    host: '0.0.0.0',
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        edit: resolve(import.meta.dirname, 'edit.html'),
        list: resolve(import.meta.dirname, 'list.html'),
        analyze: resolve(import.meta.dirname, 'analyze.html'),
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
  plugins: [shaderPlugin(), remoteWsPlugin()],
})
