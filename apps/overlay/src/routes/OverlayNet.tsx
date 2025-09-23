import React, { useEffect, useState } from 'react';
import { getOverlayConfigSync } from '../core/config';
import { applyTheme, applyScale } from '../lib/params';
import NetHud from '../panels/NetHud';

export default function OverlayNet() {
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

  return (
    <div className="min-h-screen bg-transparent">
      {isVisible && <NetHud size="md" />}
    </div>
  );
}