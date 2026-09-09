import { io, Socket } from 'socket.io-client';
import type { Alert, Incident } from '../types/nexus';

type EventHandler<T> = (data: T) => void;

class NexusSocketService {
  private socket: Socket | null = null;
  private localListeners: { [event: string]: Set<EventHandler<unknown>> } = {};
  private isConnected = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
      this.socket = io(socketUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 4000,
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('[NEXUS Socket] Connected to realtime mesh node:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        console.log('[NEXUS Socket] Realtime socket disconnected, fallback local bus active');
      });

      this.socket.on('alert-created', (alert: Alert) => {
        this.dispatchLocal('alert-created', alert);
      });

      this.socket.on('incident-updated', (incident: Incident) => {
        this.dispatchLocal('incident-updated', incident);
      });
    } catch (err) {
      console.warn('[NEXUS Socket] Realtime init warning (running in synthetic simulation mode):', err);
    }
  }

  public on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.localListeners[event]) {
      this.localListeners[event] = new Set();
    }
    this.localListeners[event].add(handler as EventHandler<unknown>);

    return () => {
      this.off(event, handler);
    };
  }

  public off<T = unknown>(event: string, handler: EventHandler<T>) {
    if (this.localListeners[event]) {
      this.localListeners[event].delete(handler as EventHandler<unknown>);
    }
  }

  public emitAlertCreated(alert: Alert) {
    if (this.socket && this.isConnected) {
      this.socket.emit('alert-created', alert);
    }
    // Also dispatch to local listeners so instant state updates occur even when disconnected
    this.dispatchLocal('alert-created', alert);
  }

  public emitIncidentUpdated(incident: Incident) {
    if (this.socket && this.isConnected) {
      this.socket.emit('incident-updated', incident);
    }
    this.dispatchLocal('incident-updated', incident);
  }

  private dispatchLocal(event: string, data: unknown) {
    const handlers = this.localListeners[event];
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (e) {
          console.error(`[NEXUS Socket] Error in handler for ${event}:`, e);
        }
      });
    }
  }

  public getConnectedStatus(): boolean {
    return this.isConnected;
  }
}

export const socketService = new NexusSocketService();
