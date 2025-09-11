import React, { useEffect, useState } from 'react';
import { Checklist } from './panels/Checklist';
import { getOverlayConfig, applyTheme, applyScale, OverlayConfig } from './lib/params';

function App() {
  const [config, setConfig] = useState<OverlayConfig | null>(null);

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

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Checklist config={config} />
    </div>
  );
}

export default App;