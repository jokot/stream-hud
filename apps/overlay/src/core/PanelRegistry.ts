import React from 'react';
import { PanelId, PanelProps } from './types';

// Import panel components (will be created later)
import Checklist from '../panels/Checklist';
import { NetHud } from '../panels/NetHud';
import AIChat from '../panels/AIChat';

// Panel component type
export type PanelComponent = React.ComponentType<PanelProps>;

// Registry mapping panel IDs to components
export const PANEL_REGISTRY: Record<PanelId, PanelComponent> = {
  checklist: Checklist,
  net: NetHud,
  ai: AIChat,
} as const;

// Helper function to get a panel component by ID
export function getPanelComponent(id: PanelId): PanelComponent | null {
  return PANEL_REGISTRY[id] || null;
}

// Helper function to get all available panel IDs
export function getAvailablePanelIds(): PanelId[] {
  return Object.keys(PANEL_REGISTRY) as PanelId[];
}

// Helper function to validate panel ID
export function isValidPanelId(id: string): id is PanelId {
  return id in PANEL_REGISTRY;
}