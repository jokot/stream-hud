import express from 'express';
import { getNetworkInterfaces } from '../net/os';

export interface StatsState {
  sessionBytes: number;
  currentInterface: string | null;
  sampleIntervalMs: number;
  reset: () => void;
}

export function createHttpRoutes(statsState: StatsState) {
  const router = express.Router();

  // Health check endpoint
  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      iface: statsState.currentInterface,
      sample_ms: statsState.sampleIntervalMs,
      timestamp: Date.now()
    });
  });

  // List available network interfaces
  router.get('/interfaces', async (_req, res) => {
    try {
      const interfaces = await getNetworkInterfaces();
      res.json(interfaces);
    } catch (error) {
      console.error('Error fetching interfaces:', error);
      res.status(500).json({ 
        error: 'Failed to fetch network interfaces',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Reset session statistics
  router.post('/reset', (_req, res) => {
    try {
      statsState.reset();
      res.json({ 
        ok: true,
        timestamp: Date.now(),
        message: 'Session statistics reset successfully'
      });
    } catch (error) {
      console.error('Error resetting stats:', error);
      res.status(500).json({ 
        error: 'Failed to reset statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}