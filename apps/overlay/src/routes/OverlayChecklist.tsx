import React, { useEffect, useState } from 'react';
import { getOverlayConfigSync } from '../core/config';
import { applyTheme, applyScale } from '../lib/params';
import Checklist from '../panels/Checklist';

export default function OverlayChecklist() {
  const [isVisible, setIsVisible] = useState<boolean>(true);

  useEffect(() => {
    // Get configuration and apply theme/scale
    const config = getOverlayConfigSync();
    applyTheme(config.theme || 'dark');
    applyScale(config.scale || 1.0);
  }, []);

  // Keyboard shortcut and IPC listeners for visibility toggle
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    const handleIpcMessage = () => {
      setIsVisible(prev => !prev);
    };

    window.addEventListener('keydown', handleKeyPress);
    
    if (window.electronAPI) {
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
        console.debug('OverlayChecklist: Failed to poll visibility endpoint:', error);
      }
    };

    pollVisibility();
    const interval = setInterval(pollVisibility, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      {isVisible && <Checklist size="md" />}
    </div>
  );
}