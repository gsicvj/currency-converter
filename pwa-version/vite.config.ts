import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from "nitro/vite"
import path from 'path'
import { serviceWorkerPlugin } from './scripts/serviceWorkerPlugin'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'src'
    }),
    viteReact(),
    serviceWorkerPlugin(),
    nitro()
  ]
})
