import type { Alert, Incident } from '../types/nexus';

type EventHandler<T> = (data: T) => void;

class NexusSocketService {
  private localListeners: { [event: string]: Set<EventHandler<unknown>> } = {};
  private isConnected = false;

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
    this.dispatchLocal('alert-created', alert);
  }

  public emitIncidentUpdated(incident: Incident) {
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
