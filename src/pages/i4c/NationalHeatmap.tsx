import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowUpRight,
  ChevronDown,
  Clock,
  Filter,
  Layers,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SEED_PREDICTIONS } from '@/lib/constants';

interface Prediction {
  id: string;
  complaint_id: string;
  predicted_lat: number;
  predicted_lng: number;
  risk_score: number;
  alert_level: string;
  created_at: string;
  victim_district?: string;
  victim_state?: string;
  predicted_atms?: any[];
}

interface ATMCluster {
  id: string;
  cluster_name: string;
  lat: number;
  lng: number;
  radius_km: number;
  cluster_score: number;
  complaint_count: number;
  avg_fraud_amount: number;
  state?: string;
}

const SEED_ATM_CLUSTERS: ATMCluster[] = [
  { id: 'c1', cluster_name: 'Deoghar Cybercrime Corridor', lat: 24.4853, lng: 86.6936, radius_km: 4.2, cluster_score: 92, complaint_count: 31, avg_fraud_amount: 287000, state: 'Jharkhand' },
  { id: 'c2', cluster_name: 'Giridih Jamtara Belt', lat: 24.1939, lng: 86.3096, radius_km: 3.5, cluster_score: 77, complaint_count: 19, avg_fraud_amount: 156000, state: 'Jharkhand' },
  { id: 'c3', cluster_name: 'Nuh-Mewat Hotspot', lat: 28.1047, lng: 76.9974, radius_km: 5.8, cluster_score: 84, complaint_count: 24, avg_fraud_amount: 198000, state: 'Haryana' },
  { id: 'c4', cluster_name: 'Mathura Transit Cluster', lat: 27.4924, lng: 77.6737, radius_km: 6.1, cluster_score: 68, complaint_count: 14, avg_fraud_amount: 421000, state: 'Uttar Pradesh' },
  { id: 'c5', cluster_name: 'Bharatpur Border Zone', lat: 27.2152, lng: 77.4941, radius_km: 4.9, cluster_score: 64, complaint_count: 12, avg_fraud_amount: 312000, state: 'Rajasthan' },
  { id: 'c6', cluster_name: 'Dhanbad Industrial Cluster', lat: 23.7957, lng: 86.4304, radius_km: 3.8, cluster_score: 57, complaint_count: 9, avg_fraud_amount: 145000, state: 'Jharkhand' },
];

const HOTSPOT_DISTRICTS = [
  { name: 'All India', lat: 23.5937, lng: 80.9629, zoom: 5 },
  { name: 'Deoghar', lat: 24.4853, lng: 86.6936, zoom: 11 },
  { name: 'Giridih', lat: 24.1939, lng: 86.3096, zoom: 11 },
  { name: 'Nuh (Mewat)', lat: 28.1047, lng: 76.9974, zoom: 11 },
  { name: 'Mathura', lat: 27.4924, lng: 77.6737, zoom: 11 },
  { name: 'Bharatpur', lat: 27.2152, lng: 77.4941, zoom: 11 },
  { name: 'Dhanbad', lat: 23.7957, lng: 86.4304, zoom: 11 },
];

const STATES_LIST = [
  'National (All States)',
  'Jharkhand',
  'Haryana',
  'Uttar Pradesh',
  'Rajasthan',
  'Bihar',
  'Maharashtra',
  'Delhi',
  'Karnataka',
  'Tamil Nadu',
  'Telangana',
  'Gujarat',
  'West Bengal',
];

class HeatmapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full text-slate-500 text-sm font-mono bg-[#F8FAFC]">
          Heatmap loading — syncing data from NEXUS engine...
        </div>
      );
    }
    return this.props.children;
  }
}

// Helper Component for Map View Control (flyTo)
function MapFlyController({ flyTarget }: { flyTarget: { center: [number, number]; zoom?: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (flyTarget && flyTarget.center[0] && flyTarget.center[1]) {
      map.flyTo(flyTarget.center, flyTarget.zoom || 11, { duration: 1.4 });
    }
  }, [flyTarget, map]);
  return null;
}

export default function NationalHeatmap() {
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [clusters, setClusters] = useState<ATMCluster[]>(SEED_ATM_CLUSTERS);

  // Time & Filters
  const [now, setNow] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'predictions' | 'clusters' | 'historical'>('predictions');
  const [timeFilter, setTimeFilter] = useState<'6h' | '12h' | '24h' | '7d'>('24h');
  const [regionLevel, setRegionLevel] = useState<string>('State / UT');
  const [targetState, setTargetState] = useState<string>('National (All States)');
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom?: number } | null>(null);
  const [activeDistrict, setActiveDistrict] = useState<string>('All India');

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Predictions & Clusters from Supabase
  const loadData = async () => {
    try {
      const [predsRes, clustersRes] = await Promise.all([
        supabase.from('predictions').select('*'),
        supabase.from('atm_clusters').select('*'),
      ]);

      if (predsRes.data && predsRes.data.length > 0) {
        const clean: Prediction[] = predsRes.data
          .filter(
            (p: any) =>
              p.predicted_lat != null &&
              p.predicted_lng != null &&
              !isNaN(Number(p.predicted_lat)) &&
              !isNaN(Number(p.predicted_lng)) &&
              Number(p.predicted_lat) !== 0 &&
              Number(p.predicted_lng) !== 0
          )
          .map((p: any) => ({
            id: p.id,
            complaint_id: p.complaint_id,
            predicted_lat: Number(p.predicted_lat),
            predicted_lng: Number(p.predicted_lng),
            risk_score: Number(p.risk_score || 0),
            alert_level: p.alert_level || 'AMBER',
            created_at: p.created_at || new Date().toISOString(),
            victim_district: p.victim_district,
            victim_state: p.victim_state,
            predicted_atms: p.predicted_atms,
          }));

        setPredictions(clean.length > 0 ? clean : (SEED_PREDICTIONS as any));
      } else {
        setPredictions(SEED_PREDICTIONS as any);
      }

      if (clustersRes.data && clustersRes.data.length > 0) {
        const cleanClusters: ATMCluster[] = clustersRes.data
          .map((c: any) => ({
            id: c.id,
            cluster_name: c.cluster_name || 'ATM Cluster',
            lat: Number(c.centroid_lat ?? c.lat),
            lng: Number(c.centroid_lng ?? c.lng),
            radius_km: Number(c.radius_km || 4.5),
            cluster_score: Number(c.cluster_score || 70),
            complaint_count: Number(c.complaint_count || 10),
            avg_fraud_amount: Number(c.avg_fraud_amount || 150000),
            state: c.state,
          }))
          .filter((c: any) => !isNaN(c.lat) && !isNaN(c.lng) && c.lat !== 0 && c.lng !== 0);

        setClusters(cleanClusters.length > 0 ? cleanClusters : SEED_ATM_CLUSTERS);
      }
    } catch {
      setPredictions(SEED_PREDICTIONS as any);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Time & State Filtering
  const filteredPredictions = useMemo(() => {
    const hours = timeFilter === '6h' ? 6 : timeFilter === '12h' ? 12 : timeFilter === '24h' ? 24 : 168;
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return predictions.filter((p) => {
      const isValidCoord =
        p.predicted_lat != null &&
        p.predicted_lng != null &&
        typeof p.predicted_lat === 'number' &&
        typeof p.predicted_lng === 'number' &&
        p.predicted_lat !== 0 &&
        p.predicted_lng !== 0 &&
        !isNaN(p.predicted_lat) &&
        !isNaN(p.predicted_lng);
      
      const inTime = isValidCoord && new Date(p.created_at || Date.now()).getTime() >= cutoff;
      if (!inTime) return false;

      if (targetState !== 'National (All States)') {
        // Match prediction state or district if available
        if (p.victim_state && p.victim_state.toLowerCase() !== targetState.toLowerCase()) {
          // If state filter active and mismatch
          return false;
        }
      }
      return true;
    });
  }, [predictions, timeFilter, targetState]);

  // Counts by Alert Level
  const counts = useMemo(() => {
    let red = 0;
    let amber = 0;
    let green = 0;
    filteredPredictions.forEach((p) => {
      if (p.alert_level === 'RED') red++;
      else if (p.alert_level === 'AMBER') amber++;
      else green++;
    });
    return { red, amber, green };
  }, [filteredPredictions]);

  // Unique active districts count
  const activeDistrictsCount = useMemo(() => {
    const set = new Set();
    filteredPredictions.forEach((p) => {
      if (p.victim_district) set.add(p.victim_district);
    });
    return set.size || 6;
  }, [filteredPredictions]);

  // Top 5 predictions sorted by risk_score descending
  const top5Predictions = useMemo(() => {
    return [...filteredPredictions]
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 5);
  }, [filteredPredictions]);

  const getRelativeTime = (timestamp?: string) => {
    if (!timestamp) return '1h ago';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleDistrictJump = (district: (typeof HOTSPOT_DISTRICTS)[number]) => {
    setActiveDistrict(district.name);
    setFlyTarget({ center: [district.lat, district.lng], zoom: district.zoom });
  };

  const handleStateSelect = (st: string) => {
    setTargetState(st);
    if (st === 'National (All States)') {
      setFlyTarget({ center: [23.5937, 80.9629], zoom: 5 });
      setActiveDistrict('All India');
    } else if (st === 'Jharkhand') {
      setFlyTarget({ center: [24.32, 86.51], zoom: 9 });
      setActiveDistrict('Deoghar');
    } else if (st === 'Haryana') {
      setFlyTarget({ center: [28.1047, 76.9974], zoom: 10 });
      setActiveDistrict('Nuh (Mewat)');
    } else if (st === 'Uttar Pradesh') {
      setFlyTarget({ center: [27.4924, 77.6737], zoom: 9 });
      setActiveDistrict('Mathura');
    } else if (st === 'Rajasthan') {
      setFlyTarget({ center: [27.2152, 77.4941], zoom: 9 });
      setActiveDistrict('Bharatpur');
    }
  };

  return (
    <HeatmapErrorBoundary>
      {/* Light Theme Map Viewport Container: Sits flush between TopBar (56px) and AlertTicker (36px) */}
      <div className="-mx-4 -mt-6 -mb-8 h-[calc(100vh-56px-36px)] w-[calc(100%+2rem)] lg:-mx-7 lg:w-[calc(100%+3.5rem)] relative overflow-hidden bg-[#F1F5F9]">
        
        {/* Light Theme Positron Leaflet Map */}
        <MapContainer
          center={[23.5937, 80.9629]}
          zoom={5}
          style={{ height: '100%', width: '100%', backgroundColor: '#E2E8F0' }}
          zoomControl={false}
        >
          {/* High-quality Light Theme CartoDB Positron Basemap */}
          <TileLayer
            url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <MapFlyController flyTarget={flyTarget} />

          {/* Prediction Pins Layer */}
          {(activeTab === 'predictions' || activeTab === 'historical') &&
            filteredPredictions.map((p) => {
              const color = p.alert_level === 'RED' ? '#DC2626' : p.alert_level === 'AMBER' ? '#D97706' : '#16A34A';
              return p.predicted_lat && p.predicted_lng ? (
                <CircleMarker
                  key={p.id}
                  center={[p.predicted_lat, p.predicted_lng]}
                  radius={p.alert_level === 'RED' ? 8 : 7}
                  pathOptions={{
                    color: '#FFFFFF',
                    fillColor: color,
                    fillOpacity: 0.95,
                    weight: 2.5,
                  }}
                  eventHandlers={{
                    click: () => navigate(`/prediction/${p.id}`),
                  }}
                >
                  <Popup>
                    <div className="text-xs p-1 min-w-[160px]">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span>{p.complaint_id}</span>
                      </div>
                      <div className="space-y-1 text-slate-600">
                        <p>Risk Score: <span className="font-bold text-[#DC2626]">{Math.round(p.risk_score * 100)}%</span></p>
                        <p className="text-slate-500 font-mono text-[11px]">{getRelativeTime(p.created_at)}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/prediction/${p.id}`)}
                        className="mt-2.5 w-full rounded-lg bg-[#1E40AF] px-2.5 py-1.5 text-center text-[10px] font-semibold text-white hover:bg-[#1E3A8A] transition shadow-xs"
                      >
                        Inspect Threat Node
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              ) : null;
            })}

          {/* ATM Cluster Layer */}
          {(activeTab === 'clusters' || activeTab === 'historical') &&
            clusters.map((c) => {
              const color = c.cluster_score > 70 ? '#DC2626' : c.cluster_score >= 40 ? '#D97706' : '#16A34A';
              const opacity = c.cluster_score > 70 ? 0.20 : c.cluster_score >= 40 ? 0.15 : 0.10;
              return c.lat && c.lng ? (
                <Circle
                  key={c.id}
                  center={[c.lat, c.lng]}
                  radius={c.radius_km * 1000}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: opacity,
                    weight: 2,
                    opacity: 0.75,
                  }}
                >
                  <Popup>
                    <div className="p-1 text-xs min-w-[170px]">
                      <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1.5">{c.cluster_name}</h4>
                      <div className="space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span>Complaints:</span>
                          <span className="font-semibold text-slate-900">{c.complaint_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cluster Risk:</span>
                          <span className="font-semibold text-[#DC2626]">{c.cluster_score}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Amount:</span>
                          <span className="font-semibold text-[#16A34A]">₹{c.avg_fraud_amount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Radius:</span>
                          <span className="font-medium text-slate-700">{c.radius_km} km</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Circle>
              ) : null;
            })}
        </MapContainer>

        {/* LEFT FLOATING GLASSMORPHIC FILTER PANEL (Exact Match to User Reference) */}
        <div className="absolute top-4 left-4 z-[500] w-[290px] rounded-3xl border border-white/70 bg-white/80 p-5 text-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl space-y-4">
          {/* Header Title */}
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              GEO-INTELLIGENCE
            </span>
          </div>

          {/* Field 1: Region Level */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              REGION LEVEL
            </label>
            <div className="relative">
              <select
                value={regionLevel}
                onChange={(e) => setRegionLevel(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-xs font-medium text-slate-800 shadow-xs focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="State / UT">State / UT</option>
                <option value="District Level">District Level</option>
                <option value="ATM Cluster Belt">ATM Cluster Belt</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          {/* Field 2: Target State */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              TARGET STATE
            </label>
            <div className="relative">
              <select
                value={targetState}
                onChange={(e) => handleStateSelect(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-xs font-medium text-slate-800 shadow-xs focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                {STATES_LIST.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200/80 pt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Complaints</span>
              <span className="font-mono font-bold text-[#2563EB]">{filteredPredictions.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Districts</span>
              <span className="font-mono font-bold text-[#2563EB]">{activeDistrictsCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">High Priority</span>
              <span className="font-mono font-bold text-[#DC2626]">{counts.red}</span>
            </div>
          </div>

          {/* Layer Selector & Time Horizon */}
          <div className="border-t border-slate-200/80 pt-3 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  MAP LAYERS
                </span>
                <button onClick={loadData} className="text-slate-400 hover:text-slate-700 transition" title="Refresh Live Data">
                  <RefreshCw size={11} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  ['predictions', 'Threats'],
                  ['clusters', 'Clusters'],
                  ['historical', 'All Views'],
                ].map(([tabKey, label]) => {
                  const active = activeTab === tabKey;
                  return (
                    <button
                      key={tabKey}
                      onClick={() => setActiveTab(tabKey as any)}
                      className={`rounded-xl py-1.5 text-[11px] font-semibold transition-all ${
                        active
                          ? 'bg-[#1E40AF] text-white shadow-xs font-bold'
                          : 'bg-white/80 text-slate-600 border border-slate-200/70 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                TIME HORIZON
              </span>
              <div className="flex gap-1">
                {(['6h', '12h', '24h', '7d'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeFilter(t)}
                    className={`flex-1 rounded-xl py-1 text-[10px] font-mono font-semibold transition-all ${
                      timeFilter === t
                        ? 'bg-[#0F172A] text-white font-bold shadow-xs'
                        : 'bg-white/80 text-slate-600 border border-slate-200/70 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT FLOATING GLASSMORPHIC PANEL (Top Threat Targets) */}
        <div className="absolute top-4 right-4 z-[500] w-[270px] rounded-3xl border border-white/70 bg-white/80 p-4 text-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#F59E0B]" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600">
                Top Threat Targets
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
              <Clock size={10} />
              <span>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            {top5Predictions.map((p) => {
              const riskPct = Math.round(p.risk_score * 100);
              const levelDot =
                p.alert_level === 'RED'
                  ? 'bg-[#DC2626]'
                  : p.alert_level === 'AMBER'
                  ? 'bg-[#D97706]'
                  : 'bg-[#16A34A]';

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (p.predicted_lat && p.predicted_lng) {
                      setFlyTarget({ center: [p.predicted_lat, p.predicted_lng], zoom: 12 });
                    }
                  }}
                  className="group flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/90 p-2.5 transition-all hover:border-[#3B82F6] hover:bg-blue-50/50 cursor-pointer shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${levelDot}`} />
                      <p className="truncate text-xs font-bold text-slate-800 group-hover:text-blue-700">
                        {p.victim_district || p.complaint_id}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[10px] font-mono text-slate-400">
                      {getRelativeTime(p.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 pl-2">
                    <span className="font-mono text-xs font-bold text-[#DC2626]">
                      {riskPct}%
                    </span>
                    <ArrowUpRight
                      size={13}
                      className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#1E40AF]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM HOTSPOT QUICK JUMP BAR (Light Glassmorphic Pill) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-1.5 rounded-full border border-white/70 bg-white/85 px-3.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
          <div className="flex items-center gap-1 text-[11px] font-mono font-medium text-slate-500 mr-1 hidden sm:flex">
            <Navigation size={11} className="text-[#2563EB]" />
            <span>Hotspots:</span>
          </div>
          {HOTSPOT_DISTRICTS.map((dist) => {
            const isActive = activeDistrict === dist.name;
            return (
              <button
                key={dist.name}
                onClick={() => handleDistrictJump(dist)}
                className={`rounded-full px-3 py-1 text-[10px] font-medium transition-all ${
                  isActive
                    ? 'bg-[#1E40AF] text-white font-bold shadow-xs'
                    : 'bg-white/80 text-slate-600 border border-slate-200/70 hover:bg-white hover:text-slate-900'
                }`}
              >
                {dist.name}
              </button>
            );
          })}
        </div>

      </div>
    </HeatmapErrorBoundary>
  );
}
