import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: resolve(__dirname, 'electron/main.ts'),
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            outDir: resolve(__dirname, 'dist-electron'),
            lib: {
              entry: resolve(__dirname, 'electron/main.ts'),
              formats: ['cjs'],
              fileName: () => 'main.cjs'
            },
            rollupOptions: {
              external: ['electron', 'better-sqlite3', 'path', 'fs', 'fs/promises', 'child_process', 'url']
            }
          }
        }
      },
      {
        entry: resolve(__dirname, 'electron/preload.ts'),
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            outDir: resolve(__dirname, 'dist-electron'),
            lib: {
              entry: resolve(__dirname, 'electron/preload.ts'),
              formats: ['cjs'],
              fileName: () => 'preload.cjs'
            },
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './renderer'),
      '@electron': resolve(__dirname, './electron')
    }
  },
  root: resolve(__dirname, './renderer'),
  base: './',
  build: {
    outDir: resolve(__dirname, './dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'renderer/index.html')
      }
    }
  },
  server: {
    port: 5173
  }
})
