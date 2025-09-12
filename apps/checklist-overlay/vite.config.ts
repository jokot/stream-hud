import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-configs',
      configureServer(server) {
        server.middlewares.use('/configs/tasks.json', (req, res, next) => {
          const tasksPath = resolve(__dirname, '../../configs/tasks.json');
          try {
            const data = fs.readFileSync(tasksPath, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(data);
          } catch (error) {
            res.statusCode = 404;
            res.end('Not found');
          }
        });
      }
    }
  ],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})