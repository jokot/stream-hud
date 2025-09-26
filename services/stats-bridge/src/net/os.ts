import si from 'systeminformation';

export interface NetworkInterface {
  iface: string;
  operstate: string;
  ip4: string;
  speed: number | null;
}

export interface NetworkStats {
  iface: string;
  rx_bytes: number;
  tx_bytes: number;
}

/**
 * Get list of available network interfaces
 */
export async function getNetworkInterfaces(): Promise<NetworkInterface[]> {
  try {
    const interfaces = await si.networkInterfaces();
    return interfaces
      .filter(iface => !iface.virtual && iface.operstate === 'up')
      .map(iface => ({
        iface: iface.iface,
        operstate: iface.operstate,
        ip4: iface.ip4 || '',
        speed: iface.speed || null
      }));
  } catch (error) {
    console.error('Error getting network interfaces:', error);
    return [];
  }
}

/**
 * Get network statistics for a specific interface
 */
export async function getNetworkStats(iface: string): Promise<NetworkStats | null> {
  try {
    const stats = await si.networkStats(iface);
    
    if (Array.isArray(stats) && stats.length > 0) {
      const stat = stats[0] as any;
      return {
        iface: stat.iface,
        rx_bytes: stat.rx_bytes || 0,
        tx_bytes: stat.tx_bytes || 0
      };
    } else if (!Array.isArray(stats)) {
      const stat = stats as any;
      return {
        iface: stat.iface,
        rx_bytes: stat.rx_bytes || 0,
        tx_bytes: stat.tx_bytes || 0
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting network stats:', error);
    return null;
  }
}

/**
 * Auto-select the best network interface
 */
export async function selectBestInterface(): Promise<string | null> {
  const interfaces = await getNetworkInterfaces();
  
  // Prefer ethernet, then wifi, then any other up interface
  const priorities = ['ethernet', 'wi-fi', 'wlan', 'eth', 'en'];
  
  for (const priority of priorities) {
    const found = interfaces.find(iface => 
      iface.iface.toLowerCase().includes(priority.toLowerCase()) && 
      iface.operstate === 'up'
    );
    if (found) return found.iface;
  }
  
  // Fallback to first available up interface
  const firstUp = interfaces.find(iface => iface.operstate === 'up');
  return firstUp?.iface || null;
}