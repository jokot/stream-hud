import React from 'react';
import { OverlayConfig, PanelConfig, PanelSize } from './types';
import { getPanelComponent } from './PanelRegistry';

interface LayoutProps {
  config: OverlayConfig;
}

// Get CSS classes for panel size
function getPanelSizeClasses(size: PanelSize): string {
  switch (size) {
    case 'sm':
      return 'w-64 h-32';
    case 'lg':
      return 'w-96 h-64';
    case 'md':
    default:
      return 'w-80 h-48';
  }
}

// Get layout container classes
function getLayoutClasses(config: OverlayConfig): string {
  const { layout, gap = 16 } = config;
  const gapClass = `gap-${Math.min(gap / 4, 16)}`; // Tailwind gap classes
  
  switch (layout) {
    case 'column':
      return `flex flex-col ${gapClass}`;
    case 'grid2':
      return `grid grid-cols-2 ${gapClass}`;
    case 'stack':
      return `flex flex-col ${gapClass}`;
    case 'row':
    default:
      return `flex flex-row ${gapClass}`;
  }
}

// Render individual panel
function renderPanel(panelConfig: PanelConfig, index: number) {
  const PanelComponent = getPanelComponent(panelConfig.id);
  
  console.log(`Rendering panel ${index}: ${panelConfig.id}`, panelConfig);
  
  if (!PanelComponent) {
    console.warn(`Panel component not found for ID: ${panelConfig.id}`);
    return (
      <div key={`${panelConfig.id}-${index}`} className="p-4 bg-red-500/20 border border-red-500 rounded">
        <div className="text-red-400 text-sm">Panel not found: {panelConfig.id}</div>
      </div>
    );
  }
  
  const sizeClasses = getPanelSizeClasses(panelConfig.size || 'md');
  
  return (
    <div
      key={`${panelConfig.id}-${index}`}
      className={`${sizeClasses} flex-shrink-0`}
      style={{ position: 'relative' }}
    >
      <PanelComponent
        config={panelConfig}
      />
    </div>
  );
}

export default function Layout({ config }: LayoutProps) {
  const { scale = 1.0, gap = 16 } = config;
  const layoutClasses = getLayoutClasses(config);
  
  console.log('Layout rendering with config:', config);
  console.log('Panels to render:', config.panels);
  console.log('Layout classes applied:', layoutClasses);
  
  // Apply custom gap if not using standard Tailwind values
  const customStyle: React.CSSProperties = {};
  if (gap > 64) { // Beyond Tailwind's gap-16
    customStyle.gap = `${gap}px`;
  }
  
  return (
    <div
      className={`${layoutClasses} items-start`}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        ...customStyle,
      }}
    >
      {config.panels.map((panel, index) => renderPanel(panel, index))}
    </div>
  );
}