import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowUpRight, Clock, Layers } from 'lucide-react';
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
}

const SEED_ATM_CLUSTERS: ATMCluster[] = [
  { id: 'c1', cluster_name: 'Deoghar Tower Chowk Cluster', lat: 24.482, lng: 86.702, radius_km: 3.5, cluster_score: 92, complaint_count: 34, avg_fraud_amount: 185000 },
  { id: 'c2', cluster_name: 'Giridih Station Corridor', lat: 24.190, lng: 86.300, radius_km: 4.2, cluster_score: 84, complaint_count: 22, avg_fraud_amount: 240000 },
  { id: 'c3', cluster_name: 'Nuh Town Center Cluster', lat: 28.100, lng: 77.010, radius_km: 2.8, cluster_score: 78, complaint_count: 19, avg_fraud_amount: 145000 },
  { id: 'c4', cluster_name: 'Mathura Highway Cluster', lat: 27.492, lng: 77.673, radius_km: 5.0, cluster_score: 65, complaint_count: 12, avg_fraud_amount: 98000 },
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
        <div className="flex items-center justify-center h-full text-neutral-400 text-sm font-mono bg-black">
          Heatmap loading — data syncing from engine...
        </div>
      );
    }
    return this.props.children;
  }
}

// Helper Component for Map View Control (flyTo)
function MapFlyController({ flyTarget }: { flyTarget: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (flyTarget && flyTarget[0] && flyTarget[1]) {
      map.flyTo(flyTarget, 10, { duration: 1.5 });
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
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Predictions & Clusters from Supabase
  useEffect(() => {
    async function loadData() {
      try {
        const [predsRes, clustersRes] = await Promise.all([
          supabase.from('predictions').select('*'),
          supabase.from('atm_clusters').select('*'),
        ]);

        if (predsRes.data && predsRes.data.length > 0) {
          const clean = predsRes.data.filter(
            (p: any) =>
              p.predicted_lat != null &&
              p.predicted_lng != null &&
              typeof p.predicted_lat === 'number' &&
              typeof p.predicted_lng === 'number' &&
              p.predicted_lat !== 0 &&
              p.predicted_lng !== 0 &&
              !isNaN(p.predicted_lat) &&
              !isNaN(p.predicted_lng)
          );
          setPredictions(clean.length > 0 ? clean : (SEED_PREDICTIONS as any));
        } else {
          setPredictions(SEED_PREDICTIONS as any);
        }

        if (clustersRes.data && clustersRes.data.length > 0) {
          const cleanClusters = clustersRes.data.filter(
            (c: any) =>
              c.lat != null &&
              c.lng != null &&
              typeof c.lat === 'number' &&
              typeof c.lng === 'number' &&
              c.lat !== 0 &&
              c.lng !== 0 &&
              !isNaN(c.lat) &&
              !isNaN(c.lng)
          );
          setClusters(cleanClusters.length > 0 ? cleanClusters : SEED_ATM_CLUSTERS);
        }
      } catch {
        setPredictions(SEED_PREDICTIONS as any);
      }
    }
    loadData();
  }, []);

  // Time Filtering
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
      return isValidCoord && new Date(p.created_at || Date.now()).getTime() >= cutoff;
    });
  }, [predictions, timeFilter]);

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
    return `${diffHours}h ago`;
  };

  return (
    <HeatmapErrorBoundary>
      <div className="-mx-4 -mt-20 -mb-8 h-[calc(100vh-36px)] w-[calc(100%+2rem)] lg:-mx-7 lg:w-[calc(100%+3.5rem)] relative overflow-hidden bg-black">
        {/* Full Page Leaflet Map */}
        <MapContainer
          center={[23.5937, 80.9629]}
          zoom={5}
          style={{ height: '100%', width: '100%', backgroundColor: '#000000' }}
          zoomControl={false}
        >
          <TileLayer url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png" />
          <MapFlyController flyTarget={flyTarget} />

          {/* Prediction Pins Layer */}
          {(activeTab === 'predictions' || activeTab === 'historical') &&
            filteredPredictions.map((p) => {
              const color = p.alert_level === 'RED' ? '#DC2626' : p.alert_level === 'AMBER' ? '#D97706' : '#16A34A';
              return p.predicted_lat && p.predicted_lng ? (
                <CircleMarker
                  key={p.id}
                  center={[p.predicted_lat, p.predicted_lng]}
                  radius={7}
                  pathOptions={{
                    color: '#FFFFFF',
                    fillColor: color,
                    fillOpacity: 0.9,
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: () => navigate(`/prediction/${p.id}`),
                  }}
                >
                  <Popup>
                    <div className="text-xs p-1">
                      <p className="font-bold text-black">{p.complaint_id}</p>
                      <p className="text-neutral-600">Risk Score: <span className="font-bold text-[#DC2626]">{Math.round(p.risk_score * 100)}%</span></p>
                    </div>
                  </Popup>
                </CircleMarker>
              ) : null;
            })}

          {/* ATM Cluster Layer */}
          {(activeTab === 'clusters' || activeTab === 'historical') &&
            clusters.map((c) => {
              const color = c.cluster_score > 70 ? '#DC2626' : c.cluster_score >= 40 ? '#D97706' : '#16A34A';
              const opacity = c.cluster_score > 70 ? 0.18 : c.cluster_score >= 40 ? 0.15 : 0.1;
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
                    opacity: 0.7,
                  }}
                >
                  <Popup>
                    <div className="p-1 text-xs">
                      <h4 className="font-bold text-black">{c.cluster_name}</h4>
                      <div className="mt-1 space-y-1 text-neutral-600">
                        <p>Complaints: <span className="font-semibold text-black">{c.complaint_count}</span></p>
                        <p>Cluster Risk: <span className="font-semibold text-[#DC2626]">{c.cluster_score}%</span></p>
                        <p>Avg Amount: <span className="font-semibold text-[#16A34A]">₹{c.avg_fraud_amount.toLocaleString('en-IN')}</span></p>
                      </div>
                    </div>
                  </Popup>
                </Circle>
              ) : null;
            })}
        </MapContainer>

        {/* LEFT FLOATING OVERLAY PANEL (Black & White Monochrome Theme) */}
        <div className="absolute top-18 left-4 z-[10] w-[280px] rounded-xl border border-neutral-800 bg-[#0A0A0A]/95 text-white p-4 shadow-2xl backdrop-blur-md space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Risk Intelligence
              </span>
              <div className="flex items-center gap-1 font-mono text-[10px] text-neutral-400">
                <Clock size={11} />
                <span>{now.toLocaleTimeString()}</span>
              </div>
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-400">Geospatial crime prediction matrix</p>
          </div>

          {/* Section 1: Alert count by level (Preserved Critical Red, Yellow/Amber, Green) */}
          <div className="space-y-2 border-t border-neutral-800 pt-3 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-red-950/40 border border-red-900/60 p-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#DC2626] animate-pulse" />
                <span className="font-medium text-red-400">Critical</span>
              </div>
              <span className="rounded-md bg-black px-2 py-0.5 font-mono font-bold text-[#DC2626] border border-red-900/80">
                {counts.red}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-amber-950/40 border border-amber-900/60 p-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#D97706]" />
                <span className="font-medium text-amber-400">High Risk</span>
              </div>
              <span className="rounded-md bg-black px-2 py-0.5 font-mono font-bold text-[#D97706] border border-amber-900/80">
                {counts.amber}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-emerald-950/40 border border-emerald-900/60 p-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
                <span className="font-medium text-emerald-400">Monitoring</span>
              </div>
              <span className="rounded-md bg-black px-2 py-0.5 font-mono font-bold text-[#16A34A] border border-emerald-900/80">
                {counts.green}
              </span>
            </div>
          </div>

          {/* Section 2: Layer Toggles (Strict Monochrome) */}
          <div className="border-t border-neutral-800 pt-3">
            <p className="mb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400">
              Map Layers
            </p>
            <div className="grid grid-cols-3 gap-1">
              {[
                ['predictions', 'Predictions'],
                ['clusters', 'Clusters'],
                ['historical', 'All Layers'],
              ].map(([tabKey, label]) => {
                const active = activeTab === tabKey;
                return (
                  <button
                    key={tabKey}
                    onClick={() => setActiveTab(tabKey as any)}
                    className={`rounded-lg py-1.5 text-[10px] font-semibold transition-all ${
                      active
                        ? 'bg-white text-black border border-white font-bold'
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Time Filters (Strict Monochrome) */}
          <div className="border-t border-neutral-800 pt-3">
            <p className="mb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400">
              Time Horizon
            </p>
            <div className="flex gap-1.5">
              {(['6h', '12h', '24h', '7d'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={`flex-1 rounded-full py-1 text-[10px] font-mono font-semibold transition-all ${
                    timeFilter === t
                      ? 'bg-white text-black font-bold'
                      : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT FLOATING OVERLAY PANEL (Top Risk Targets - Monochrome with Red Risk Code) */}
        <div className="absolute top-18 right-4 z-[10] w-[250px] rounded-xl border border-neutral-800 bg-[#0A0A0A]/95 text-white p-3.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white">
              Top Risk Targets
            </span>
            <Layers size={13} className="text-neutral-400" />
          </div>

          <div className="mt-3 space-y-2">
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
                  onClick={() => p.predicted_lat && p.predicted_lng && setFlyTarget([p.predicted_lat, p.predicted_lng])}
                  className="group flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/80 p-2.5 transition-all hover:border-neutral-500 hover:bg-neutral-800 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${levelDot}`} />
                      <p className="truncate text-xs font-bold text-white group-hover:text-neutral-100">
                        {p.victim_district || p.complaint_id}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[10px] font-mono text-neutral-400">
                      {getRelativeTime(p.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 pl-2">
                    {/* Red colour code on the top risk target part */}
                    <span className="font-mono text-xs font-bold text-[#DC2626]">
                      {riskPct}%
                    </span>
                    <ArrowUpRight
                      size={13}
                      className="text-neutral-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </HeatmapErrorBoundary>
  );
}
