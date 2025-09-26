# Stats Bridge Service

A local service that monitors network interface statistics and provides real-time data via WebSocket and HTTP endpoints.

## Features

- Real-time network upload/download speed monitoring
- Session usage tracking
- EMA smoothing for stable readings
- Redline alerts when upload speed drops below threshold
- WebSocket broadcasting for live updates
- HTTP endpoints for health checks and configuration

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```
STATS_PORT=7007
BIND_ADDR=127.0.0.1
IFACE=auto                 # or specific interface name
SAMPLE_INTERVAL_MS=1000
EMA_ALPHA=0.3
TARGET_BITRATE_KBPS=3500
REDLINE_THRESHOLD=0.7
```

## Running

Development mode:
```bash
pnpm dev
```

Production build:
```bash
pnpm build
pnpm start
```

## API Endpoints

### HTTP Endpoints

- `GET /health` - Service health check
- `GET /interfaces` - List available network interfaces
- `POST /reset` - Reset session statistics

### WebSocket

- `ws://localhost:7007/net` - Real-time network statistics

### WebSocket Payload Format

```json
{
  "v": 1,
  "ts": 1736567890,
  "iface": "en0",
  "upload_bps": 2987000,
  "download_bps": 512000,
  "session_bytes": 734003200,
  "redline": false
}
```

## Configuration

### Interface Selection

- `auto` - Automatically select the best available interface
- Specific name - Use a specific interface (e.g., "Wi-Fi", "Ethernet", "en0")

### EMA Smoothing

The service uses Exponential Moving Average (EMA) to smooth network readings:
- `EMA_ALPHA=0.3` - Higher values respond faster to changes, lower values are more stable

### Redline Detection

Redline alerts trigger when upload speed falls below the threshold:
- `TARGET_BITRATE_KBPS=3500` - Target streaming bitrate
- `REDLINE_THRESHOLD=0.7` - Alert when upload < 70% of target

## Troubleshooting

### No Network Interface Found

1. Check available interfaces: `GET /interfaces`
2. Set specific interface name in `IFACE` environment variable
3. Ensure the interface is up and has an IP address

### Permission Issues

The service uses system information APIs that don't require admin privileges on most systems.

### Firewall Issues

Ensure localhost connections are allowed on the configured port (default 7007).

### Docker Considerations

When running in Docker, network interface names may differ. Use the `/interfaces` endpoint to discover available interfaces.