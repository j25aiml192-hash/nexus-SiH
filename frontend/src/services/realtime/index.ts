import type { IRealtimeClient } from './IRealtimeClient';
import { MockRealtimeClient } from './mockRealtimeClient';
import { SocketRealtimeClient } from './socketRealtimeClient';

export * from './IRealtimeClient';

/**
 * Factory function injecting realtime client implementation based on environment flag
 */
export function createRealtimeClient(): IRealtimeClient {
  const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';
  const dataSourceMode = import.meta.env.VITE_DATA_SOURCE;

  // In production, enforce real websocket client. Explicit mock mode only in development.
  if (isProduction || dataSourceMode === 'api') {
    return new SocketRealtimeClient();
  }

  return new MockRealtimeClient();
}

export const realtimeClient = createRealtimeClient();
