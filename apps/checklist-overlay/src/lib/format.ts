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