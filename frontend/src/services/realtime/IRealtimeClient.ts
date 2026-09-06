import type { Alert, Incident } from '../../types/nexus';

export interface IRealtimeClient {
  /**
   * Subscribe to real-time alert-created events
   * @returns Unsubscribe cleanup function
   */
  onAlertCreated(callback: (alert: Alert) => void): () => void;

  /**
   * Subscribe to real-time incident-updated events
   * @returns Unsubscribe cleanup function
   */
  onIncidentUpdated(callback: (incident: Incident) => void): () => void;

  /**
   * Emit an alert creation event
   */
  emitAlertCreated(alert: Alert): void;

  /**
   * Emit an incident update event
   */
  emitIncidentUpdated(incident: Incident): void;

  /**
   * Generic emit for extensible events
   */
  emit(event: string, payload: unknown): void;

  /**
   * Check connection status
   */
  isConnected(): boolean;
}
