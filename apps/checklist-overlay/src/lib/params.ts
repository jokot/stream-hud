export interface OverlayConfig {
  scale: number;
  title: string;
  theme: 'dark' | 'light';
  showProgress: boolean;
  compact: boolean;
  notifications: boolean;
}

export function getOverlayConfig(): OverlayConfig {
  const params = new URLSearchParams(window.location.search);
  
  const scale = Math.max(0.5, Math.min(2.0, parseFloat(params.get('scale') || '1.0')));
  const title = params.get('title') || 'Checklist';
  const theme = params.get('theme') === 'light' ? 'light' : 'dark';
  const showProgress = params.get('showProgress') !== '0';
  const compact = params.get('compact') === '1';
  const notifications = params.get('notifications') === '1';

  return {
    scale,
    title,
    theme,
    showProgress,
    compact,
    notifications
  };
}

export function applyTheme(theme: 'dark' | 'light') {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function applyScale(scale: number) {
  const root = document.getElementById('root');
  if (root) {
    root.style.transform = `scale(${scale})`;
    root.style.transformOrigin = 'top left';
  }
}