import type { Alert, Incident } from '../../types/nexus';
import type { IRealtimeClient } from './IRealtimeClient';

/**
 * SocketRealtimeClient
 * FastAPI backend does not mount Socket.IO.
 * Automatic websocket connections are completely disabled to prevent /socket.io 404 polling.
 * Realtime synchronization will be connected to Supabase Realtime in future phase.
 */
export class SocketRealtimeClient implements IRealtimeClient {
  private connected = false;

  onAlertCreated(_callback: (alert: Alert) => void): () => void {
    return () => {};
  }

  onIncidentUpdated(_callback: (incident: Incident) => void): () => void {
    return () => {};
  }

  emitAlertCreated(_alert: Alert): void {}

  emitIncidentUpdated(_incident: Incident): void {}

  emit(_event: string, _payload: unknown): void {}

  isConnected(): boolean {
    return this.connected;
  }
}
