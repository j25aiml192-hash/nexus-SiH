import type { IRealtimeClient } from './IRealtimeClient';
import { MockRealtimeClient } from './mockRealtimeClient';
import { SocketRealtimeClient } from './socketRealtimeClient';

export * from './IRealtimeClient';

/**
 * Factory function injecting realtime client implementation based on environment flag
 */
export function createRealtimeClient(): IRealtimeClient {
  const dataSourceMode = import.meta.env.VITE_DATA_SOURCE || 'mock';

  if (dataSourceMode === 'api') {
    return new SocketRealtimeClient();
  }

  return new MockRealtimeClient();
}

export const realtimeClient = createRealtimeClient();
