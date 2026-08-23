import axios from 'axios';
import { supabase } from './supabase';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data?.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});

export async function submitComplaint(data: Record<string, unknown>) {
  return api.post('/complaints/ingest', data);
}

export async function ingestComplaintBackend(complaintId: string) {
  return api.post('/complaints/ingest', { complaint_id: complaintId });
}

export async function generateNarrative(complaintId: string) {
  return api.post('/predictions/generate-narrative', { complaint_id: complaintId });
}

export async function getPrediction(complaintId: string) {
  return api.get(`/predictions/${complaintId}`);
}

export async function getHeatmapData() {
  return api.get('/predictions/heatmap');
}

export async function sendAlert(predictionId: string) {
  return api.post('/alerts/send', { prediction_id: predictionId });
}

export async function submitIncidentReport(data: Record<string, unknown>) {
  return api.post('/incidents/report', data);
}

export async function getTodayBrief() {
  return api.get('/briefs/today');
}

export const generateBrief = () => api.post('/briefs/generate');

export default api;
