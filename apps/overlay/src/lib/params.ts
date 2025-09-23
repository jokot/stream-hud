import { OverlayConfig, PanelConfig, PanelId, PanelSize, LayoutType, ThemeType } from '../core/types';
import { isValidPanelId } from '../core/PanelRegistry';

// Parse panels parameter: "checklist(md),net(lg),ai(sm)"
export function parsePanelsParam(panelsParam: string): PanelConfig[] {
  if (!panelsParam) return [];
  
  const panels: PanelConfig[] = [];
  const panelSpecs = panelsParam.split(',');
  
  for (const spec of panelSpecs) {
    const match = spec.trim().match(/^(\w+)(?:\((\w+)\))?$/);
    if (!match) continue;
    
    const [, id, size] = match;
    if (!isValidPanelId(id)) continue;
    
    panels.push({
      id: id as PanelId,
      enabled: true,
      size: (size as PanelSize) || 'md',
    });
  }
  
  return panels;
}

// Parse URL parameters into overlay config
export function parseUrlParams(): Partial<OverlayConfig> {
  const params = new URLSearchParams(window.location.search);
  const config: Partial<OverlayConfig> = {};
  
  // Layout
  const layout = params.get('layout');
  if (layout && ['row', 'column', 'grid2', 'stack'].includes(layout)) {
    config.layout = layout as LayoutType;
  }
  
  // Gap
  const gap = params.get('gap');
  if (gap) {
    const gapNum = parseInt(gap, 10);
    if (!isNaN(gapNum) && gapNum >= 0) {
      config.gap = gapNum;
    }
  }
  
  // Scale
  const scale = params.get('scale');
  if (scale) {
    const scaleNum = parseFloat(scale);
    if (!isNaN(scaleNum) && scaleNum >= 0.5 && scaleNum <= 2.0) {
      config.scale = scaleNum;
    }
  }
  
  // Theme
  const theme = params.get('theme');
  if (theme && ['dark', 'light'].includes(theme)) {
    config.theme = theme as ThemeType;
  }
  
  // Panels
  const panels = params.get('panels');
  if (panels) {
    config.panels = parsePanelsParam(panels);
  }
  
  return config;
}

// Get individual URL parameters for panel-specific options
export function getUrlParam(key: string, defaultValue?: string): string | undefined {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || defaultValue;
}

// Get numeric URL parameter
export function getUrlParamNumber(key: string, defaultValue?: number): number | undefined {
  const value = getUrlParam(key);
  if (value === undefined) return defaultValue;
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

// Get boolean URL parameter
export function getUrlParamBoolean(key: string, defaultValue?: boolean): boolean | undefined {
  const value = getUrlParam(key);
  if (value === undefined) return defaultValue;
  return value === '1' || value.toLowerCase() === 'true';
}

// Apply theme to document
export function applyTheme(theme: ThemeType) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Apply scale to root element
export function applyScale(scale: number) {
  const root = document.getElementById('root');
  if (root) {
    root.style.transform = `scale(${scale})`;
    root.style.transformOrigin = 'top left';
  }
}