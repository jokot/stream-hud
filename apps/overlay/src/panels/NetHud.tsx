import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NetHudData, PanelProps } from '../core/types';
import { NetHudWSClient } from '../lib/ws';
import { formatBytes, formatBitrate, formatLatency, formatUptime } from '../lib/format';

interface AlertLevel {
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

export function NetHud({ config }: PanelProps) {
  const [data, setData] = useState<NetHudData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [source, setSource] = useState<'websocket' | 'polling'>('polling');
  const [wsClient, setWsClient] = useState<NetHudWSClient | null>(null);
  const [alerts, setAlerts] = useState<AlertLevel[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const handleData = useCallback((newData: NetHudData) => {
    setData(newData);
    setLastUpdate(Date.now());
    
    // Check for redline conditions and generate alerts
    if (newData) {
      const newAlerts: AlertLevel[] = [];
      
      // Check upload/download thresholds
      if (newData.upload && newData.upload.current > (newData.upload.redline || Infinity)) {
        newAlerts.push({
          level: 'error',
          message: `Upload exceeds redline: ${formatBitrate(newData.upload.current)}`,
          timestamp: Date.now()
        });
      }
      
      if (newData.download && newData.download.current > (newData.download.redline || Infinity)) {
        newAlerts.push({
          level: 'error',
          message: `Download exceeds redline: ${formatBitrate(newData.download.current)}`,
          timestamp: Date.now()
        });
      }
      
      // Check latency threshold
      if (newData.latency && newData.latency.current > (newData.latency.redline || Infinity)) {
        newAlerts.push({
          level: 'error',
          message: `Latency exceeds redline: ${formatLatency(newData.latency.current)}`,
          timestamp: Date.now()
        });
      }
      
      // Check packet loss threshold
      if (newData.packetLoss && newData.packetLoss.current > (newData.packetLoss.redline || Infinity)) {
        newAlerts.push({
          level: 'error',
          message: `Packet loss exceeds redline: ${newData.packetLoss.current.toFixed(1)}%`,
          timestamp: Date.now()
        });
      }
      
      // Add new alerts and keep only recent ones (last 10)
      if (newAlerts.length > 0) {
        setAlerts(prev => [...newAlerts, ...prev].slice(0, 10));
      }
    }
  }, []);

  const handleStatus = useCallback((status: string) => {
    setIsConnected(status === 'connected');
    // Map status to source type for display
    if (status === 'connected' && wsClient?.getConnection() === 'websocket') {
      setSource('websocket');
    } else if (status === 'connected' && wsClient?.getConnection() === 'polling') {
      setSource('polling');
    }
  }, [wsClient]);

  useEffect(() => {
    const client = new NetHudWSClient(handleData, handleStatus);
    setWsClient(client);
    client.start();

    return () => {
      client.destroy();
    };
  }, []); // Remove dependencies to prevent infinite loop

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r') {
        wsClient?.forceReload();
      } else if (event.key.toLowerCase() === 'c') {
        // Clear alerts
        setAlerts([]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [wsClient]);

  // Get display configuration
  const showTitle = config.title !== false;
  const compact = config.compact === true;
  const title = typeof config.title === 'string' ? config.title : 'Network HUD';

  const getMetricColor = (current: number, redline?: number) => {
    if (!redline) return 'text-gray-900 dark:text-white';
    
    const ratio = current / redline;
    if (ratio >= 1) return 'text-red-500 dark:text-red-400';
    if (ratio >= 0.8) return 'text-yellow-500 dark:text-yellow-400';
    return 'text-green-500 dark:text-green-400';
  };

  const getProgressColor = (current: number, redline?: number) => {
    if (!redline) return 'bg-blue-500';
    
    const ratio = current / redline;
    if (ratio >= 1) return 'bg-red-500';
    if (ratio >= 0.8) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getProgressWidth = (current: number, redline?: number) => {
    if (!redline) return Math.min((current / 1000000) * 100, 100); // Fallback scale
    return Math.min((current / redline) * 100, 100);
  };

  return (
    <div className="p-4 w-fit max-w-sm">
      <motion.div
        className="overlay-card p-4 space-y-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        {!compact && showTitle && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <div className="flex items-center space-x-2">
              <span className={`status-chip ${
                source === 'websocket' ? 'status-ws' : 'status-poll'
              }`}>
                {source === 'websocket' ? 'WS' : 'POLL'}
              </span>
            </div>
          </div>
        )}

        {/* Network Metrics */}
        {data && (
          <div className="space-y-3">
            {/* Upload */}
            {data.upload && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Upload
                  </span>
                  <span className={`text-sm font-mono ${getMetricColor(data.upload.current, data.upload.redline)}`}>
                    {formatBitrate(data.upload.current)}
                  </span>
                </div>
                {data.upload.redline && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${getProgressColor(data.upload.current, data.upload.redline)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${getProgressWidth(data.upload.current, data.upload.redline)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Download */}
            {data.download && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Download
                  </span>
                  <span className={`text-sm font-mono ${getMetricColor(data.download.current, data.download.redline)}`}>
                    {formatBitrate(data.download.current)}
                  </span>
                </div>
                {data.download.redline && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${getProgressColor(data.download.current, data.download.redline)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${getProgressWidth(data.download.current, data.download.redline)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Latency */}
            {data.latency && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Latency
                </span>
                <span className={`text-sm font-mono ${getMetricColor(data.latency.current, data.latency.redline)}`}>
                  {formatLatency(data.latency.current)}
                </span>
              </div>
            )}

            {/* Packet Loss */}
            {data.packetLoss && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Packet Loss
                </span>
                <span className={`text-sm font-mono ${getMetricColor(data.packetLoss.current, data.packetLoss.redline)}`}>
                  {data.packetLoss.current.toFixed(1)}%
                </span>
              </div>
            )}

            {/* Connection Info */}
            {data.connection && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                  <span>Connection</span>
                  <span>{data.connection.type || 'Unknown'}</span>
                </div>
                {data.connection.uptime && (
                  <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                    <span>Uptime</span>
                    <span>{formatUptime(data.connection.uptime)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Alerts
              </h3>
              <button
                onClick={() => setAlerts([])}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              <AnimatePresence>
                {alerts.slice(0, 5).map((alert, index) => (
                  <motion.div
                    key={`${alert.timestamp}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className={`p-2 rounded text-xs ${
                      alert.level === 'error'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                        : alert.level === 'warning'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                    }`}
                  >
                    {alert.message}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!data && (
          <div className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              {isConnected ? 'Waiting for network data...' : 'Connecting...'}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default NetHud;