import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// This machine often exhausts fs.inotify.max_user_instances (Cursor, zsh, node).
// Polling avoids fs.watch / inotify_init EMFILE on `npm run dev`.
const watchPolling = { usePolling: true, interval: 300 }

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      watch: { chokidar: watchPolling }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      watch: { chokidar: watchPolling }
    }
  },
  renderer: {
    server: {
      watch: watchPolling
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html'),
          overlay: resolve('src/renderer/overlay.html'),
          sticker: resolve('src/renderer/sticker.html')
        }
      }
    }
  }
})
