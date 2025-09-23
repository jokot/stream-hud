import React, { useEffect, useState } from 'react';
import { getOverlayConfig, preloadHudConfig } from '../core/config';
import { OverlayConfig } from '../core/types';
import { applyTheme } from '../lib/params';
import Layout from '../core/Layout';

export default function OverlayMain() {
  const [config, setConfig] = useState<OverlayConfig | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // Load configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        // Preload hud.config.json first
        await preloadHudConfig();
        
        // Get merged configuration
        const overlayConfig = await getOverlayConfig();
        setConfig(overlayConfig);
        
        // Apply theme
        applyTheme(overlayConfig.theme || 'dark');
      } catch (error) {
        console.error('Failed to load overlay configuration:', error);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  // Listen for URL parameter changes (for live updates during development)
  useEffect(() => {
    const handlePopState = async () => {
      const newConfig = await getOverlayConfig();
      setConfig(newConfig);
      applyTheme(newConfig.theme || 'dark');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Keyboard shortcut and IPC listeners for visibility toggle
  useEffect(() => {
    console.log('OverlayMain: Setting up keyboard and IPC listeners');
    
    // Keyboard shortcut to toggle panel visibility
    const handleKeyPress = (event: KeyboardEvent) => {
      // Toggle visibility with Alt+Shift+H
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'h') {
        console.log('OverlayMain: Alt+Shift+H detected, toggling panel visibility');
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    // Listen for IPC messages from the controller (if running in Electron)
    const handleIpcMessage = () => {
      console.log('OverlayMain: IPC message received, toggling panel visibility');
      setIsVisible(prev => !prev);
    };

    window.addEventListener('keydown', handleKeyPress);
    
    // Check if we're running in Electron and set up IPC listener
    if (window.electronAPI) {
      console.log('OverlayMain: Setting up IPC listener for toggle-panel-visibility');
      window.electronAPI.onTogglePanelVisibility(handleIpcMessage);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (window.electronAPI) {
        window.electronAPI.removeTogglePanelVisibilityListener(handleIpcMessage);
      }
    };
  }, []);

  // Poll visibility endpoint to sync with controller
  useEffect(() => {
    const pollVisibility = async () => {
      try {
        const response = await fetch('http://localhost:7006/panel/visibility');
        if (response.ok) {
          const data = await response.json();
          if (data.visible !== undefined) {
            setIsVisible(data.visible);
          }
        }
      } catch (error) {
        // Silently fail - the WebSocket server might not be running
        console.debug('OverlayMain: Failed to poll visibility endpoint:', error);
      }
    };

    // Poll immediately and then every 2 seconds
    pollVisibility();
    const interval = setInterval(pollVisibility, 2000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading overlay...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Failed to load overlay configuration</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      {isVisible && <Layout config={config} />}
    </div>
  );
}