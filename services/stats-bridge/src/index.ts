import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { getNetworkStats, selectBestInterface } from './net/os';
import { createEMASmooth } from './net/smooth';
import { createHttpRoutes, StatsState } from './routes/http';

// Load environment variables
dotenv.config();

// Configuration
const PORT = parseInt(process.env.STATS_PORT || '7007');
const BIND_ADDR = process.env.BIND_ADDR || '127.0.0.1';
const IFACE = process.env.IFACE || 'auto';
const SAMPLE_INTERVAL_MS = parseInt(process.env.SAMPLE_INTERVAL_MS || '1000');
const EMA_ALPHA = parseFloat(process.env.EMA_ALPHA || '0.3');
const TARGET_BITRATE_KBPS = parseInt(process.env.TARGET_BITRATE_KBPS || '3500');
const REDLINE_THRESHOLD = parseFloat(process.env.REDLINE_THRESHOLD || '0.7');

// WebSocket payload interface
interface NetPayload {
  v: number;
  ts: number;
  iface: string;
  upload_bps: number;
  download_bps: number;
  session_bytes: number;
  redline: boolean;
}

// Global state
let sessionBytes = 0;
let currentInterface: string | null = null;
let lastTxBytes = 0;
let lastRxBytes = 0;
let lastSampleTime = 0;

// EMA smoothers
const uploadEMA = createEMASmooth(EMA_ALPHA);
const downloadEMA = createEMASmooth(EMA_ALPHA);

// Stats state for HTTP routes
const statsState: StatsState = {
  sessionBytes: 0,
  currentInterface: null,
  sampleIntervalMs: SAMPLE_INTERVAL_MS,
  reset: () => {
    sessionBytes = 0;
    uploadEMA.reset();
    downloadEMA.reset();
    console.log('Session statistics reset');
  }
};

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/net'
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast to all connected WebSocket clients
function broadcast(payload: NetPayload) {
  const message = JSON.stringify(payload);
  
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('Error sending to WebSocket client:', error);
      }
    }
  });
}

// Network sampling loop
async function sampleNetwork() {
  try {
    // Auto-select interface if needed
    if (!currentInterface) {
      if (IFACE === 'auto') {
        currentInterface = await selectBestInterface();
      } else {
        currentInterface = IFACE;
      }
      
      if (!currentInterface) {
        console.error('No suitable network interface found');
        return;
      }
      
      console.log(`Using network interface: ${currentInterface}`);
      statsState.currentInterface = currentInterface;
    }

    // Get current network stats
    const stats = await getNetworkStats(currentInterface);
    if (!stats) {
      console.error('Failed to get network stats');
      return;
    }

    const now = Date.now();
    
    // Initialize on first run
    if (lastSampleTime === 0) {
      lastTxBytes = stats.tx_bytes;
      lastRxBytes = stats.rx_bytes;
      lastSampleTime = now;
      return;
    }

    // Calculate deltas
    const dtMs = now - lastSampleTime;
    const dtx = Math.max(0, stats.tx_bytes - lastTxBytes);
    const drx = Math.max(0, stats.rx_bytes - lastRxBytes);

    // Calculate bits per second
    const uploadBps = dtMs > 0 ? (dtx * 8 * 1000) / dtMs : 0;
    const downloadBps = dtMs > 0 ? (drx * 8 * 1000) / dtMs : 0;

    // Apply EMA smoothing
    const smoothedUpload = uploadEMA.update(uploadBps);
    const smoothedDownload = downloadEMA.update(downloadBps);

    // Update session bytes
    sessionBytes += dtx + drx;
    statsState.sessionBytes = sessionBytes;

    // Check redline condition
    const targetBps = TARGET_BITRATE_KBPS * 1000;
    const redlineThresholdBps = targetBps * REDLINE_THRESHOLD;
    const redline = smoothedUpload < redlineThresholdBps;

    // Create payload
    const payload: NetPayload = {
      v: 1,
      ts: Math.floor(now / 1000),
      iface: currentInterface,
      upload_bps: Math.round(smoothedUpload),
      download_bps: Math.round(smoothedDownload),
      session_bytes: sessionBytes,
      redline
    };

    // Broadcast to WebSocket clients
    broadcast(payload);

    // Update last values
    lastTxBytes = stats.tx_bytes;
    lastRxBytes = stats.rx_bytes;
    lastSampleTime = now;

  } catch (error) {
    console.error('Error in network sampling:', error);
  }
}

// Setup HTTP routes
app.use('/', createHttpRoutes(statsState));

// Heartbeat for WebSocket connections
setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      try {
        client.ping();
      } catch (error) {
        console.error('Error pinging WebSocket client:', error);
      }
    }
  });
}, 30000);

// Start sampling loop
setInterval(sampleNetwork, SAMPLE_INTERVAL_MS);

// Start server
server.listen(PORT, BIND_ADDR, () => {
  console.log(`Stats bridge server running on ${BIND_ADDR}:${PORT}`);
  console.log(`WebSocket endpoint: ws://${BIND_ADDR}:${PORT}/net`);
  console.log(`HTTP endpoints: http://${BIND_ADDR}:${PORT}/health, /interfaces, /reset`);
  console.log(`Sample interval: ${SAMPLE_INTERVAL_MS}ms`);
  console.log(`Target bitrate: ${TARGET_BITRATE_KBPS} kbps`);
  console.log(`Redline threshold: ${REDLINE_THRESHOLD * 100}%`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down stats bridge server...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Shutting down stats bridge server...');
  server.close(() => {
    process.exit(0);
  });
});