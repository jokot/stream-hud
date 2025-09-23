export function formatPercent(completed: number, total: number): string {
  if (total === 0) return '0%';
  const percent = Math.round((completed / total) * 100);
  return `${percent}%`;
}

export function formatProgress(completed: number, total: number): string {
  return `${completed} / ${total} tasks`;
}

export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return (completed / total) * 100;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString();
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatBitrate(bps: number): string {
  if (bps === 0) return '0 bps';
  
  const k = 1000; // Use 1000 for network speeds
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
  const i = Math.floor(Math.log(bps) / Math.log(k));
  
  return `${parseFloat((bps / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatLatency(ms: number): string {
  if (ms < 1) return '<1ms';
  return `${Math.round(ms)}ms`;
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}