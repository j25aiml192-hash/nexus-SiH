import { io, Socket } from 'socket.io-client';
import type { Alert, Incident } from '../../types/nexus';
import type { IRealtimeClient } from './IRealtimeClient';

export class SocketRealtimeClient implements IRealtimeClient {
  private socket: Socket;
  private connected = false;

  constructor(serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000') {
    this.socket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 5000,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('[SocketRealtimeClient] Connected to websocket mesh:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.warn('[SocketRealtimeClient] Websocket disconnected');
    });
  }

  onAlertCreated(callback: (alert: Alert) => void): () => void {
    this.socket.on('alert-created', callback);
    return () => {
      this.socket.off('alert-created', callback);
    };
  }

  onIncidentUpdated(callback: (incident: Incident) => void): () => void {
    this.socket.on('incident-updated', callback);
    return () => {
      this.socket.off('incident-updated', callback);
    };
  }

  emitAlertCreated(alert: Alert): void {
    this.socket.emit('alert-created', alert);
  }

  emitIncidentUpdated(incident: Incident): void {
    this.socket.emit('incident-updated', incident);
  }

  emit(event: string, payload: unknown): void {
    this.socket.emit(event, payload);
  }

  isConnected(): boolean {
    return this.connected;
  }
}
