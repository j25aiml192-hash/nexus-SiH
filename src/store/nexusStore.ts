import { create } from 'zustand';

interface NexusUser {
  id: string;
  email: string;
  name: string;
  role: string;
  state: string | null;
  district: string | null;
  bank: string | null;
  phone: string | null;
}

interface Prediction {
  id: string;
  complaint_id: string;
  risk_score: number;
  predicted_lat: number;
  predicted_lng: number;
  predicted_radius_km: number;
  cashout_window_hours: number;
  alert_level: string;
  shap_features: Record<string, number>;
  llm_narrative: string;
  predicted_atms: unknown;
  status: string;
  recovery_score: number;
  created_at: string;
  updated_at: string;
}

interface Alert {
  id: string;
  prediction_id: string;
  complaint_id: string;
  message: string;
  alert_level: string;
  sent_at: string;
  status: string;
  recipient_role: string;
  acknowledged_at: string | null;
}

interface SystemStats {
  complaintsToday: number;
  activePredictions: number;
  alertsSent: number;
  fundsAtRisk: number;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface NexusStore {
  user: NexusUser | null;
  predictions: Prediction[];
  alerts: Alert[];
  heatmapData: unknown[];
  systemStats: SystemStats;
  selectedPrediction: Prediction | null;
  isLoading: boolean;
  lastLoopRun: string | null;
  toasts: ToastItem[];

  setUser: (user: NexusUser | null) => void;
  addPrediction: (prediction: Prediction) => void;
  updatePrediction: (id: string, updates: Partial<Prediction>) => void;
  setPredictions: (predictions: Prediction[]) => void;
  addAlert: (alert: Alert) => void;
  setAlerts: (alerts: Alert[]) => void;
  setHeatmapData: (data: unknown[]) => void;
  setSystemStats: (stats: SystemStats) => void;
  setSelectedPrediction: (prediction: Prediction | null) => void;
  setLoading: (loading: boolean) => void;
  setLastLoopRun: (timestamp: string) => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  clearStore: () => void;
}

export const useNexusStore = create<NexusStore>((set, get) => ({
  user: null,
  predictions: [],
  alerts: [],
  heatmapData: [],
  systemStats: { complaintsToday: 0, activePredictions: 0, alertsSent: 0, fundsAtRisk: 0 },
  selectedPrediction: null,
  isLoading: false,
  lastLoopRun: null,
  toasts: [],

  setUser: (user) => set({ user }),
  addPrediction: (prediction) =>
    set((state) => ({
      predictions: [prediction, ...state.predictions].slice(0, 100),
    })),
  updatePrediction: (id, updates) =>
    set((state) => ({
      predictions: state.predictions.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
      selectedPrediction:
        state.selectedPrediction?.id === id
          ? { ...state.selectedPrediction, ...updates }
          : state.selectedPrediction,
    })),
  setPredictions: (predictions) => set({ predictions }),
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 50),
    })),
  setAlerts: (alerts) => set({ alerts }),
  setHeatmapData: (data) => set({ heatmapData: data }),
  setSystemStats: (stats) => set({ systemStats: stats }),
  setSelectedPrediction: (prediction) => set({ selectedPrediction: prediction }),
  setLoading: (loading) => set({ isLoading: loading }),
  setLastLoopRun: (timestamp) => set({ lastLoopRun: timestamp }),
  addToast: (toastData) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const duration = toastData.duration || 4000;
    const newToast: ToastItem = { ...toastData, id, duration };
    set((state) => ({ toasts: [newToast, ...state.toasts].slice(0, 5) }));
    setTimeout(() => {
      get().removeToast(id);
    }, duration);
    return id;
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearStore: () =>
    set({
      user: null,
      predictions: [],
      alerts: [],
      heatmapData: [],
      systemStats: { complaintsToday: 0, activePredictions: 0, alertsSent: 0, fundsAtRisk: 0 },
      selectedPrediction: null,
      isLoading: false,
      lastLoopRun: null,
      toasts: [],
    }),
}));
