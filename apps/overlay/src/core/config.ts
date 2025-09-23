import { OverlayConfig, PanelConfig } from './types';
import { parseUrlParams } from '../lib/params';

// Default configuration
const DEFAULT_CONFIG: OverlayConfig = {
  layout: 'row',
  gap: 16,
  scale: 1.0,
  theme: 'dark',
  panels: [
    { id: 'checklist', enabled: true, size: 'md' },
  ],
};

// Cache for loaded config
let cachedHudConfig: Partial<OverlayConfig> | null = null;

// Load hud.config.json from server
async function loadHudConfig(): Promise<Partial<OverlayConfig>> {
  if (cachedHudConfig !== null) {
    return cachedHudConfig;
  }
  
  try {
    const response = await fetch('/configs/hud.config.json');
    if (response.ok) {
      const config = await response.json();
      cachedHudConfig = config;
      return config;
    }
  } catch (error) {
    console.debug('Failed to load hud.config.json:', error);
  }
  
  cachedHudConfig = {};
  return {};
}

// Merge configurations with precedence: URL params > hud.config.json > defaults
export async function getOverlayConfig(): Promise<OverlayConfig> {
  const urlConfig = parseUrlParams();
  const hudConfig = await loadHudConfig();
  
  // Merge configurations
  const merged: OverlayConfig = {
    ...DEFAULT_CONFIG,
    ...hudConfig,
    ...urlConfig,
  };
  
  // Ensure panels array is valid
  if (!merged.panels || merged.panels.length === 0) {
    merged.panels = DEFAULT_CONFIG.panels;
  }
  
  // Filter out disabled panels
  merged.panels = merged.panels.filter(panel => panel.enabled);
  
  return merged;
}

// Get configuration synchronously (for cases where async is not possible)
// This will use cached hud.config.json if available, otherwise defaults + URL params
export function getOverlayConfigSync(): OverlayConfig {
  const urlConfig = parseUrlParams();
  const hudConfig = cachedHudConfig || {};
  
  const merged: OverlayConfig = {
    ...DEFAULT_CONFIG,
    ...hudConfig,
    ...urlConfig,
  };
  
  if (!merged.panels || merged.panels.length === 0) {
    merged.panels = DEFAULT_CONFIG.panels;
  }
  
  merged.panels = merged.panels.filter(panel => panel.enabled);
  
  return merged;
}

// Preload hud.config.json (call this early in app lifecycle)
export async function preloadHudConfig(): Promise<void> {
  await loadHudConfig();
}

// Clear cached config (useful for development/testing)
export function clearConfigCache(): void {
  cachedHudConfig = null;
}