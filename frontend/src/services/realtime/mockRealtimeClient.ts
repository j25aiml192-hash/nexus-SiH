import type { Alert, Incident } from '../../types/nexus';
import type { IRealtimeClient } from './IRealtimeClient';

type Handler<T> = (data: T) => void;

export class MockRealtimeClient implements IRealtimeClient {
  private alertListeners = new Set<Handler<Alert>>();
  private incidentListeners = new Set<Handler<Incident>>();
  private genericListeners = new Map<string, Set<Handler<unknown>>>();

  onAlertCreated(callback: (alert: Alert) => void): () => void {
    this.alertListeners.add(callback);
    return () => {
      this.alertListeners.delete(callback);
    };
  }

  onIncidentUpdated(callback: (incident: Incident) => void): () => void {
    this.incidentListeners.add(callback);
    return () => {
      this.incidentListeners.delete(callback);
    };
  }

  emitAlertCreated(alert: Alert): void {
    this.alertListeners.forEach((fn) => {
      try {
        fn(alert);
      } catch (err) {
        console.error('[MockRealtimeClient] Error handling alert-created:', err);
      }
    });
  }

  emitIncidentUpdated(incident: Incident): void {
    this.incidentListeners.forEach((fn) => {
      try {
        fn(incident);
      } catch (err) {
        console.error('[MockRealtimeClient] Error handling incident-updated:', err);
      }
    });
  }

  emit(event: string, payload: unknown): void {
    if (event === 'alert-created') {
      this.emitAlertCreated(payload as Alert);
      return;
    }
    if (event === 'incident-updated') {
      this.emitIncidentUpdated(payload as Incident);
      return;
    }
    const handlers = this.genericListeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => fn(payload));
    }
  }

  isConnected(): boolean {
    return true;
  }
}
