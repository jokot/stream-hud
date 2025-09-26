import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NetHudData, PanelProps } from '../core/types';
import { WSClient } from '../lib/ws';
import { formatBytes, formatBitrate } from '../lib/format';
import { parseNetHudParams } from '../lib/params';

export function NetHud({ size = 'md' }: PanelProps) {
  const [data, setData] = useState<NetHudData | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [wsClient, setWsClient] = useState<WSClient<NetHudData> | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  
  // Parse URL parameters for Net HUD configuration
  const params = parseNetHudParams();

  const handleData = useCallback((newData: NetHudData) => {
    setData(newData);
    setLastUpdate(Date.now());
  }, []);

  const handleStatus = useCallback((newStatus: 'connecting' | 'connected' | 'disconnected' | 'error') => {
    setStatus(newStatus);
  }, []);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_NET_WS_URL || 'ws://localhost:7007/net';
    
    const client = new WSClient<NetHudData>(
      handleData,
      handleStatus,
      {
        url: wsUrl,
        maxReconnectAttempts: 10,
        reconnectDelay: 1000,
        maxReconnectDelay: 30000,
        pollInterval: 2000,
        enablePolling: false // Disable polling for real-time data
      }
    );

    setWsClient(client);
    client.start();

    return () => {
      client.destroy();
    };
  }, [handleData, handleStatus]);

  // Size-based styling
  const sizeClasses = {
    sm: 'text-xs p-2 gap-1',
    md: 'text-sm p-3 gap-2', 
    lg: 'text-base p-4 gap-3'
  };

  const tileClasses = {
    sm: 'p-2 min-w-[80px]',
    md: 'p-3 min-w-[100px]',
    lg: 'p-4 min-w-[120px]'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 ${sizeClasses[size]}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-white">Network</h3>
        <div className="flex items-center gap-2">
          {/* Status indicator */}
          <div className={`w-2 h-2 rounded-full ${
            status === 'connected' ? 'bg-green-400' : 
            status === 'connecting' ? 'bg-yellow-400' : 
            'bg-red-400'
          }`} />
          <span className={`text-xs font-mono ${
            status === 'connected' ? 'text-green-400' : 
            status === 'connecting' ? 'text-yellow-400' : 
            'text-red-400'
          }`}>
            {status === 'connected' ? 'UP' : status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Network Stats */}
      {data ? (
        <div className="space-y-2">
          {/* Upload/Download Row */}
          <div className="grid grid-cols-2 gap-2">
            {/* Upload */}
            <div className={`bg-white/5 rounded border border-white/10 ${tileClasses[size]}`}>
              <div className="text-xs text-white/60 mb-1">Upload</div>
              <div className="font-mono text-white">
                {formatBitrate(data.upload_bps)}
              </div>
            </div>

            {/* Download */}
            <div className={`bg-white/5 rounded border border-white/10 ${tileClasses[size]}`}>
              <div className="text-xs text-white/60 mb-1">Download</div>
              <div className="font-mono text-white">
                {formatBitrate(data.download_bps)}
              </div>
            </div>
          </div>

          {/* Session Usage */}
          <div className={`bg-white/5 rounded border border-white/10 ${tileClasses[size]}`}>
            <div className="text-xs text-white/60 mb-1">Session Usage</div>
            <div className="font-mono text-white">
              {formatBytes(data.session_bytes)}
            </div>
          </div>

          {/* Interface Info */}
          {data.iface && (
            <div className="text-xs text-white/40 font-mono">
              Interface: {data.iface}
            </div>
          )}

          {/* Redline Alert */}
          <AnimatePresence>
            {data.redline && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/20 border border-red-500/40 rounded p-2"
              >
                <div className="text-red-400 text-xs font-semibold mb-1">
                  ⚠️ Upload Below Threshold
                </div>
                <div className="text-red-300 text-xs">
                  Consider lowering bitrate (target: {params.bitrate} kbps)
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center text-white/40 py-4">
          {status === 'connecting' ? 'Connecting...' : 'No data available'}
        </div>
      )}

      {/* Last Update Timestamp */}
      {lastUpdate > 0 && (
        <div className="text-xs text-white/30 mt-2 font-mono">
          Last: {new Date(lastUpdate).toLocaleTimeString()}
        </div>
      )}
    </motion.div>
  );
}

export default NetHud;