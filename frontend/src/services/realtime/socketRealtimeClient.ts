import { io, Socket } from 'socket.io-client';
import type { Alert, Incident } from '../../types/nexus';
import type { IRealtimeClient } from './IRealtimeClient';

export class SocketRealtimeClient implements IRealtimeClient {
  private socket: Socket | null = null;
  private connected = false;

  constructor() {
    // Current backend is FastAPI and does not mount a Socket.IO server.
    // Only attempt websocket connection if an explicit VITE_SOCKET_URL is provided.
    const socketUrl = import.meta.env.VITE_SOCKET_URL;
    if (socketUrl && typeof socketUrl === 'string' && socketUrl.trim().length > 0) {
      const serverUrl = socketUrl.trim().replace(/\/+$/, '');
      this.socket = io(serverUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 5000,
      });

      this.socket.on('connect', () => {
        this.connected = true;
        console.log('[SocketRealtimeClient] Connected to websocket mesh:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        console.warn('[SocketRealtimeClient] Websocket disconnected');
      });
    } else {
      // Backend does not support Socket.IO; keep client dormant to prevent 404 polling.
      // Realtime events will be wired via Supabase Realtime in future phase.
    }
  }

  onAlertCreated(callback: (alert: Alert) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('alert-created', callback);
    return () => {
      this.socket?.off('alert-created', callback);
    };
  }

  onIncidentUpdated(callback: (incident: Incident) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('incident-updated', callback);
    return () => {
      this.socket?.off('incident-updated', callback);
    };
  }

  emitAlertCreated(alert: Alert): void {
    this.socket?.emit('alert-created', alert);
  }

  emitIncidentUpdated(incident: Incident): void {
    this.socket?.emit('incident-updated', incident);
  }

  emit(event: string, payload: unknown): void {
    this.socket?.emit(event, payload);
  }

  isConnected(): boolean {
    return this.connected;
  }
}
