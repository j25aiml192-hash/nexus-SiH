import { useState, useEffect, useCallback } from 'react';
import { dataSource } from '../services/dataSource';
import { realtimeClient } from '../services/realtime';
import { useNexusStore } from '../store/useNexusStore';
import type {
  Prediction,
  Alert,
  Incident,
  Account,
  Complaint,
  AtmLocation,
  HotspotPoint,
} from '../types/nexus';
import type { IncidentDetailResult, DashboardStatsResult } from '../services/dataSource';

export function usePrediction(complaintId?: string) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = useCallback(async () => {
    if (!complaintId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const pred = await dataSource.getPrediction(complaintId);
      if (!pred) {
        setError(`Complaint "${complaintId}" has no predictive telemetry.`);
      } else {
        setPrediction(pred);
        setAccount({
          id: pred.accountId || complaintId,
          riskScore: pred.riskScore || 88,
          txnHistory: [],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inference lookup failed.');
    } finally {
      setIsLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  return { prediction, account, isLoading, error, refetch: fetchPrediction };
}

export function useEscalateAlert() {
  const [isEscalating, setIsEscalating] = useState(false);
  const [createdAlert, setCreatedAlert] = useState<Alert | null>(null);

  const escalate = async (params: {
    predictionId?: string;
    complaintId?: string;
    h3Cell?: string;
    atmId?: string;
    message?: string;
    severity?: string;
  }) => {
    setIsEscalating(true);
    try {
      const alert = await dataSource.createAlert(params);
      setCreatedAlert(alert);
      return alert;
    } finally {
      setIsEscalating(false);
    }
  };

  return { escalate, isEscalating, createdAlert };
}

export function useAlerts() {
  const [alertsList, setAlertsList] = useState<Alert[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'assigned' | 'actioned'>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedAlerts, fetchedPredictions] = await Promise.all([
        dataSource.getAlerts(),
        dataSource.getAllPredictions(),
      ]);
      setAlertsList(fetchedAlerts);
      setPredictions(fetchedPredictions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Subscribe to realtime socket events for 'alert-created'
  useEffect(() => {
    const unsubscribe = realtimeClient.onAlertCreated((newAlert) => {
      setAlertsList((prev) => {
        const exists = prev.some((a) => a.id === newAlert.id);
        if (exists) return prev;
        return [newAlert, ...prev];
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const riskOrder: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const sortedAndFilteredAlerts = alertsList
    .map((alert) => {
      const pred = predictions.find((p) => p.id === alert.predictionId || p.complaint_id === alert.complaintId);
      const sev = (alert.severity || '').toLowerCase();
      const derivedRisk = sev.includes('crit') ? 'critical' : sev.includes('high') ? 'high' : sev.includes('med') ? 'medium' : 'low';
      return {
        ...alert,
        derivedRisk,
        linkedAccountId: alert.complaintId || pred?.complaint_id || 'UNKNOWN',
      };
    })
    .filter((alert) => {
      if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
      if (riskFilter !== 'all' && alert.derivedRisk !== riskFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAlert = alert.id.toLowerCase().includes(q);
        const matchesComplaint = (alert.complaintId || '').toLowerCase().includes(q);
        const matchesMsg = (alert.message || '').toLowerCase().includes(q);
        const matchesOfficer = (alert.assigned_officer || '').toLowerCase().includes(q);
        if (!matchesAlert && !matchesComplaint && !matchesMsg && !matchesOfficer) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const scoreA = riskOrder[a.derivedRisk] || 0;
      const scoreB = riskOrder[b.derivedRisk] || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

  return {
    alerts: sortedAndFilteredAlerts,
    allAlertsCount: alertsList.length,
    isLoading,
    error,
    refetch: loadAlerts,
    statusFilter,
    setStatusFilter,
    riskFilter,
    setRiskFilter,
    searchQuery,
    setSearchQuery,
  };
}

export function useAssignOfficer() {
  const [isAssigning, setIsAssigning] = useState(false);

  const assign = async (alertId: string, officerId: string) => {
    setIsAssigning(true);
    try {
      return await dataSource.assignOfficer(alertId, officerId);
    } finally {
      setIsAssigning(false);
    }
  };

  return { assign, isAssigning };
}

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'authorized' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadIncidents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedIncidents, fetchedAlerts, fetchedPredictions] = await Promise.all([
        dataSource.getIncidents(),
        dataSource.getAlerts(),
        dataSource.getAllPredictions(),
      ]);
      setIncidents(fetchedIncidents);
      setAlerts(fetchedAlerts);
      setPredictions(fetchedPredictions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incidents.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesInc = inc.id.toLowerCase().includes(q);
      const matchesAlert = (inc.alertId || '').toLowerCase().includes(q);
      const matchesComp = (inc.complaint_id || '').toLowerCase().includes(q);
      const matchesAction = (inc.action_taken || '').toLowerCase().includes(q);
      if (!matchesInc && !matchesAlert && !matchesComp && !matchesAction) return false;
    }
    return true;
  });

  return {
    incidents: filteredIncidents,
    alerts,
    predictions,
    totalCount: incidents.length,
    isLoading,
    error,
    refetch: loadIncidents,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
  };
}

export function useIncidentDetail(incidentId?: string) {
  const [data, setData] = useState<IncidentDetailResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!incidentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await dataSource.getIncidentDetail(incidentId);
      if (!result) {
        setError(`Incident dossier "${incidentId}" not found.`);
      } else {
        setData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve dossier.');
    } finally {
      setIsLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const addNote = async (note: string) => {
    if (!incidentId) return;
    const updated = await dataSource.addOfficerNote(incidentId, note);
    setData((prev) => (prev ? { ...prev, incident: updated } : prev));
  };

  const authorize = async () => {
    if (!incidentId) return;
    const updated = await dataSource.authorizeIncident(incidentId);
    setData((prev) => (prev ? { ...prev, incident: updated } : prev));
  };

  return { data, isLoading, error, addNote, authorize, refetch: fetchDetail };
}

export function useComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'flagged' | 'filed' | 'analyzing' | 'alerted' | 'resolved' | string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const loadComplaints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await dataSource.getComplaints(searchQuery, statusFilter);
      setComplaints(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load complaints from NEXUS backend.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  return {
    complaints,
    allComplaintsCount: complaints.length,
    isLoading,
    error,
    refetch: loadComplaints,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
  };
}

export function useDashboardStats(timeframe: string = '24h') {
  const [stats, setStats] = useState<DashboardStatsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await dataSource.getDashboardStats(timeframe);
      setStats(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live dashboard statistics.');
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return { stats, isLoading, error, refetch: loadDashboard };
}

export function useMapData(selectedComplaintId?: string | null) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [atmLocations, setAtmLocations] = useState<AtmLocation[]>([]);
  const [historicalHotspots, setHistoricalHotspots] = useState<HotspotPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapFocusTarget = useNexusStore((state) => state.mapFocusTarget);
  const setMapFocus = useNexusStore((state) => state.setMapFocus);
  const selectedMapItem = useNexusStore((state) => state.selectedMapItem);
  const setSelectedMapItem = useNexusStore((state) => state.setSelectedMapItem);

  const loadMapData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [preds, atms, hotspots] = await Promise.all([
        dataSource.getAllPredictions(),
        dataSource.getAtmLocations(),
        dataSource.getHistoricalHotspots(),
      ]);

      if (selectedComplaintId) {
        // If a complaint is selected, prioritize its prediction and candidate ATMs
        try {
          const singlePred = await dataSource.getPrediction(selectedComplaintId);
          if (singlePred) {
            setPredictions([singlePred]);
            if (singlePred.nearest_atms && singlePred.nearest_atms.length > 0) {
              setAtmLocations(singlePred.nearest_atms);
            } else {
              setAtmLocations(atms);
            }
            setHistoricalHotspots(hotspots);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn(`Complaint ${selectedComplaintId} specific prediction not found, showing all.`);
        }
      }

      setPredictions(preds);
      setAtmLocations(atms);
      setHistoricalHotspots(hotspots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve map geospatial telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedComplaintId]);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  return {
    predictions,
    atmLocations,
    historicalHotspots,
    isLoading,
    error,
    refetch: loadMapData,
    mapFocusTarget,
    setMapFocus,
    selectedMapItem,
    setSelectedMapItem,
  };
}
