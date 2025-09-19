import React, { useEffect, useState } from 'react';
import { Checklist } from './panels/Checklist';
import { getOverlayConfig, applyTheme, applyScale, OverlayConfig } from './lib/params';

function App() {
  const [config, setConfig] = useState<OverlayConfig | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(true);

  useEffect(() => {
    // Get configuration from URL parameters
    const overlayConfig = getOverlayConfig();
    setConfig(overlayConfig);

    // Apply theme and scale
    applyTheme(overlayConfig.theme);
    applyScale(overlayConfig.scale);

    // Listen for URL parameter changes (for live updates during development)
    const handlePopState = () => {
      const newConfig = getOverlayConfig();
      setConfig(newConfig);
      applyTheme(newConfig.theme);
      applyScale(newConfig.scale);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    console.log('App.tsx: Setting up keyboard and IPC listeners');
    console.log('App.tsx: window.electronAPI available:', !!window.electronAPI);
    
    // Keyboard shortcut to toggle panel visibility
    const handleKeyPress = (event: KeyboardEvent) => {
      console.log('App.tsx: Key pressed:', {
        key: event.key,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey
      });
      
      // Toggle visibility with Alt+Shift+H
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'h') {
        console.log('App.tsx: Alt+Shift+H detected, toggling panel visibility');
        event.preventDefault();
        setIsVisible(prev => {
          console.log('App.tsx: Panel visibility changing from', prev, 'to', !prev);
          return !prev;
        });
      }
    };

    // Listen for IPC messages from the controller (if running in Electron)
    const handleIpcMessage = () => {
      console.log('App.tsx: IPC message received, toggling panel visibility');
      setIsVisible(prev => {
        console.log('App.tsx: Panel visibility changing via IPC from', prev, 'to', !prev);
        return !prev;
      });
    };

    window.addEventListener('keydown', handleKeyPress);
    
    // Check if we're running in Electron and set up IPC listener
    if (window.electronAPI) {
      console.log('App.tsx: Setting up IPC listener for toggle-panel-visibility');
      window.electronAPI.onTogglePanelVisibility(handleIpcMessage);
    } else {
      console.log('App.tsx: Running in browser mode, no IPC available');
    }

    return () => {
      console.log('App.tsx: Cleaning up listeners');
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
        console.debug('App.tsx: Failed to poll visibility endpoint:', error);
      }
    };

    // Poll immediately and then every 2 seconds
    pollVisibility();
    const interval = setInterval(pollVisibility, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      {isVisible && <Checklist config={config} />}
    </div>
  );
}

export default App;