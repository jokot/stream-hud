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
        // Serve tasks.json for checklist panel
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

        // Serve hud.config.json for overlay configuration
        server.middlewares.use('/configs/hud.config.json', (req, res, next) => {
          const configPath = resolve(__dirname, '../../configs/hud.config.json');
          try {
            const data = fs.readFileSync(configPath, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(data);
          } catch (error) {
            res.statusCode = 404;
            res.end('{}'); // Return empty config if file doesn't exist
          }
        });
      }
    }
  ],
  server: {
    port: 5174, // Different port from checklist-overlay
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  define: {
    // Expose WebSocket URLs as environment variables
    'import.meta.env.VITE_CHECKLIST_WS_URL': JSON.stringify(process.env.VITE_CHECKLIST_WS_URL || 'ws://localhost:7006/checklist'),
    'import.meta.env.VITE_NET_WS_URL': JSON.stringify(process.env.VITE_NET_WS_URL || 'ws://localhost:7007/net'),
    'import.meta.env.VITE_AI_WS_URL': JSON.stringify(process.env.VITE_AI_WS_URL || 'ws://localhost:7008/ai'),
  }
})