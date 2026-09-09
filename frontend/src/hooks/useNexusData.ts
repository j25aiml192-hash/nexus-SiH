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
import type { IncidentDetailResult } from '../services/dataSource';

export function usePrediction(accountId?: string) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = useCallback(async () => {
    if (!accountId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const pred = await dataSource.getPrediction(accountId);
      const acc = await dataSource.getAccountById(accountId);
      if (!pred) {
        setError(`Target account "${accountId}" not found in graph inference cluster.`);
      } else {
        setPrediction(pred);
        setAccount(acc);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inference lookup failed.');
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  return { prediction, account, isLoading, error, refetch: fetchPrediction };
}

export function useEscalateAlert() {
  const [isEscalating, setIsEscalating] = useState(false);
  const [createdAlert, setCreatedAlert] = useState<Alert | null>(null);

  const escalate = async (params: {
    predictionId: string;
    h3Cell: string;
    atmId?: string;
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

  // Derive riskLevel from prediction and sort: highest riskLevel first, then newest
  const sortedAndFilteredAlerts = alertsList
    .map((alert) => {
      const pred = predictions.find((p) => p.id === alert.predictionId);
      const riskLevel = pred ? pred.riskLevel : 'medium';
      return {
        ...alert,
        derivedRisk: riskLevel,
        linkedAccountId: pred?.accountId || 'UNKNOWN',
      };
    })
    .filter((alert) => {
      if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
      if (riskFilter !== 'all' && alert.derivedRisk !== riskFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAlert = alert.id.toLowerCase().includes(q);
        const matchesAccount = alert.linkedAccountId.toLowerCase().includes(q);
        const matchesCell = alert.h3Cell.toLowerCase().includes(q);
        const matchesAtm = alert.atmId ? alert.atmId.toLowerCase().includes(q) : false;
        if (!matchesAlert && !matchesAccount && !matchesCell && !matchesAtm) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const scoreA = riskOrder[a.derivedRisk] || 0;
      const scoreB = riskOrder[b.derivedRisk] || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      // Secondary sort: newest first
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

  // Subscribe to realtime incident events
  useEffect(() => {
    const unsubscribe = realtimeClient.onIncidentUpdated((updatedInc) => {
      setIncidents((prev) => {
        const index = prev.findIndex((i) => i.id === updatedInc.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = updatedInc;
          return next;
        }
        return [updatedInc, ...prev];
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesInc = inc.id.toLowerCase().includes(q);
      const matchesAlert = inc.alertId.toLowerCase().includes(q);
      if (!matchesInc && !matchesAlert) return false;
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

  // Realtime updates for the current incident
  useEffect(() => {
    if (!incidentId) return;
    const unsubscribe = realtimeClient.onIncidentUpdated((updatedInc) => {
      if (updatedInc.id === incidentId) {
        setData((prev) => (prev ? { ...prev, incident: updatedInc } : prev));
      }
    });
    return () => unsubscribe();
  }, [incidentId]);

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'filed' | 'analyzing' | 'alerted' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadComplaints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await dataSource.getComplaints();
      setComplaints(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load complaints.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesId = c.id.toLowerCase().includes(q);
      const matchesAccount = c.linkedAccountId.toLowerCase().includes(q);
      const matchesVictim = c.victimInfo.name.toLowerCase().includes(q);
      const matchesContact = c.victimInfo.contact.toLowerCase().includes(q);
      if (!matchesId && !matchesAccount && !matchesVictim && !matchesContact) return false;
    }
    return true;
  });

  return {
    complaints: filteredComplaints,
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

export function useDashboardStats() {
  const [stats, setStats] = useState({
    totalComplaints: 0,
    totalLossReported: 0,
    activeAlertsCount: 0,
    highRiskAlertsCount: 0,
    openIncidentsCount: 0,
    authorizedIncidentsCount: 0,
    recentAlerts: [] as Alert[],
    recentIncidents: [] as Incident[],
    recentComplaints: [] as Complaint[],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [complaints, alerts, incidents] = await Promise.all([
        dataSource.getComplaints(),
        dataSource.getAlerts(),
        dataSource.getIncidents(),
      ]);

      const totalLossReported = complaints.reduce((sum, c) => sum + (c.amount || 0), 0);
      const activeAlertsCount = alerts.filter((a) => a.status === 'new').length;
      const openIncidentsCount = incidents.filter((i) => i.status === 'open').length;
      const authorizedIncidentsCount = incidents.filter((i) => i.status === 'authorized').length;

      setStats({
        totalComplaints: complaints.length,
        totalLossReported,
        activeAlertsCount,
        highRiskAlertsCount: alerts.length,
        openIncidentsCount,
        authorizedIncidentsCount,
        recentAlerts: alerts.slice(0, 5),
        recentIncidents: incidents.slice(0, 5),
        recentComplaints: complaints.slice(0, 5),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to aggregate intelligence metrics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Re-sync on realtime events
  useEffect(() => {
    const unsubAlert = realtimeClient.onAlertCreated(() => {
      loadDashboard();
    });
    const unsubInc = realtimeClient.onIncidentUpdated(() => {
      loadDashboard();
    });

    return () => {
      unsubAlert();
      unsubInc();
    };
  }, [loadDashboard]);

  return { stats, isLoading, error, refetch: loadDashboard };
}

export function useMapData() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [atmLocations, setAtmLocations] = useState<AtmLocation[]>([]);
  const [historicalHotspots, setHistoricalHotspots] = useState<HotspotPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state stored in local Zustand store
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
      setPredictions(preds);
      setAtmLocations(atms);
      setHistoricalHotspots(hotspots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve map geospatial telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
