import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: resolve(__dirname, 'src/main.ts')
      }
    }
  }
  // No preload or renderer needed for this tray app
})