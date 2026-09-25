import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Feature } from 'geojson';
import {
  Layers,
  Eye,
  EyeOff,
  Crosshair,
  ExternalLink,
  X,
} from 'lucide-react';
import { useMapData } from '../hooks/useNexusData';
import { useNexusStore } from '../store/useNexusStore';
import { useNavigate } from 'react-router-dom';

const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY || '';
const cartoKeyParam = CARTO_API_KEY ? `?key=${CARTO_API_KEY}` : '';

const LIGHT_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-voyager': {
      type: 'raster',
      tiles: [
        `https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png${cartoKeyParam}`,
        `https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png${cartoKeyParam}`,
        `https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png${cartoKeyParam}`,
        `https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png${cartoKeyParam}`,
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'carto-voyager-layer',
      type: 'raster',
      source: 'carto-voyager',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

const NATIONAL_DEFAULT_CENTER: [number, number] = [78.9629, 22.5937]; // Geographical Center of India
const NATIONAL_DEFAULT_ZOOM = 4.8;

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const selectedComplaintId = useNexusStore((state) => state.selectedComplaintId);
  const setSelectedComplaintId = useNexusStore((state) => state.setSelectedComplaintId);

  const {
    predictions,
    atmLocations,
    historicalHotspots,
    selectedMapItem,
    setSelectedMapItem,
  } = useMapData(selectedComplaintId);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Layer Visibility
  const [showPredictions, setShowPredictions] = useState(true);
  const [showAtms, setShowAtms] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [riskThreshold, setRiskThreshold] = useState(0.4);

  // Filtered prediction points
  const filteredPredictions = useMemo(() => {
    return predictions.filter((p) => {
      const score = Number(p.risk_score || p.riskScore || 0.8);
      return score >= riskThreshold;
    });
  }, [predictions, riskThreshold]);

  // Prediction GeoJSON
  const predictionPointsGeoJson: FeatureCollection = useMemo(() => {
    const features: Feature[] = filteredPredictions
      .filter((p) => (p.predicted_lat || p.lat) && (p.predicted_lon || p.predicted_lng || p.lng))
      .map((p) => {
        const lat = Number(p.predicted_lat || p.lat);
        const lon = Number(p.predicted_lon || p.predicted_lng || p.lng);
        const score = Number(p.risk_score || p.riskScore || 0.85);
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lon, lat],
          },
          properties: {
            id: p.prediction_id || p.id,
            complaint_id: p.complaint_id,
            risk_score: score,
            risk_level: p.risk_level || (score >= 0.75 ? 'CRITICAL' : 'HIGH'),
            color: score >= 0.75 ? '#DC2626' : score >= 0.5 ? '#EA580C' : '#D97706',
          },
        };
      });
    return { type: 'FeatureCollection', features };
  }, [filteredPredictions]);

  // ATM GeoJSON
  const atmGeoJson: FeatureCollection = useMemo(() => {
    const features: Feature[] = atmLocations.map((atm) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [atm.lng, atm.lat],
      },
      properties: {
        id: atm.id,
        bank: atm.bank || atm.bank_name || 'Bank ATM',
        name: atm.name || 'ATM Node',
        address: atm.address,
        district: atm.district,
        operationalStatus: atm.operationalStatus || 'surveillance_active',
      },
    }));
    return { type: 'FeatureCollection', features };
  }, [atmLocations]);

  // Hotspot GeoJSON
  const hotspotGeoJson: FeatureCollection = useMemo(() => {
    const features: Feature[] = historicalHotspots.map((h) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [h.lng, h.lat],
      },
      properties: {
        id: h.id,
        district: h.district,
        weight: h.risk_score || h.weight || 0.75,
      },
    }));
    return { type: 'FeatureCollection', features };
  }, [historicalHotspots]);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: LIGHT_MAP_STYLE,
      center: NATIONAL_DEFAULT_CENTER,
      zoom: NATIONAL_DEFAULT_ZOOM,
      pitch: 35,
      bearing: 0,
      maxPitch: 65,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      setMapLoaded(true);

      // 1. Hotspot Heatmap
      map.addSource('hotspot-source', {
        type: 'geojson',
        data: hotspotGeoJson,
      });

      map.addLayer({
        id: 'historical-hotspots-heatmap',
        type: 'heatmap',
        source: 'hotspot-source',
        maxzoom: 14,
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 14, 3],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 0, 0)',
            0.2, 'rgba(217, 119, 6, 0.25)',
            0.5, 'rgba(234, 88, 12, 0.55)',
            0.8, 'rgba(220, 38, 38, 0.75)',
            1.0, 'rgba(185, 28, 28, 0.95)',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 12, 45],
          'heatmap-opacity': 0.7,
        },
      });

      // 2. ATM Markers
      map.addSource('atm-source', {
        type: 'geojson',
        data: atmGeoJson,
      });

      map.addLayer({
        id: 'atm-markers-layer',
        type: 'circle',
        source: 'atm-source',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 12, 8],
          'circle-color': '#087F5B',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
          'circle-opacity': 0.9,
        },
      });

      // 3. Prediction Risk Markers
      map.addSource('prediction-source', {
        type: 'geojson',
        data: predictionPointsGeoJson,
      });

      map.addLayer({
        id: 'prediction-halo-layer',
        type: 'circle',
        source: 'prediction-source',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 8, 12, 22],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.25,
        },
      });

      map.addLayer({
        id: 'prediction-markers-layer',
        type: 'circle',
        source: 'prediction-source',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 5, 12, 10],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // Interactive Clicks
      map.on('click', 'prediction-markers-layer', (e) => {
        if (!e.features || !e.features[0]) return;
        const feat = e.features[0];
        const props = feat.properties as any;
        setSelectedMapItem({
          type: 'h3',
          data: {
            cell: `CORRIDOR-${props.complaint_id}`,
            probability: props.risk_score,
            accountId: props.complaint_id,
            complaint_id: props.complaint_id,
          },
        });
      });

      map.on('click', 'atm-markers-layer', (e) => {
        if (!e.features || !e.features[0]) return;
        const feat = e.features[0];
        const props = feat.properties as any;
        setSelectedMapItem({
          type: 'atm',
          data: {
            id: props.id,
            bank: props.bank,
            address: props.address,
            district: props.district,
            operationalStatus: props.operationalStatus,
          },
        });
      });

      // Hover Pointer Cursor
      ['prediction-markers-layer', 'atm-markers-layer'].forEach((layer) => {
        map.on('mouseenter', layer, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = '';
        });
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  // Update GeoJSON Sources
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const pSrc = mapRef.current.getSource('prediction-source') as maplibregl.GeoJSONSource | undefined;
    if (pSrc) pSrc.setData(predictionPointsGeoJson);

    const aSrc = mapRef.current.getSource('atm-source') as maplibregl.GeoJSONSource | undefined;
    if (aSrc) aSrc.setData(atmGeoJson);

    const hSrc = mapRef.current.getSource('hotspot-source') as maplibregl.GeoJSONSource | undefined;
    if (hSrc) hSrc.setData(hotspotGeoJson);
  }, [predictionPointsGeoJson, atmGeoJson, hotspotGeoJson, mapLoaded]);

  // Layer Visibility
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    if (map.getLayer('prediction-markers-layer')) {
      map.setLayoutProperty('prediction-markers-layer', 'visibility', showPredictions ? 'visible' : 'none');
      map.setLayoutProperty('prediction-halo-layer', 'visibility', showPredictions ? 'visible' : 'none');
    }
    if (map.getLayer('atm-markers-layer')) {
      map.setLayoutProperty('atm-markers-layer', 'visibility', showAtms ? 'visible' : 'none');
    }
    if (map.getLayer('historical-hotspots-heatmap')) {
      map.setLayoutProperty('historical-hotspots-heatmap', 'visibility', showHotspots ? 'visible' : 'none');
    }
  }, [showPredictions, showAtms, showHotspots, mapLoaded]);

  // Camera Management
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    if (selectedComplaintId && predictions.length > 0) {
      const target = predictions.find((p) => p.complaint_id === selectedComplaintId) || predictions[0];
      const lat = Number(target.predicted_lat || target.lat);
      const lon = Number(target.predicted_lon || target.predicted_lng || target.lng);
      if (lat && lon) {
        map.flyTo({
          center: [lon, lat],
          zoom: 12.8,
          pitch: 45,
          duration: 1500,
        });
      }
    } else if (predictions.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      predictions.forEach((p) => {
        const lat = Number(p.predicted_lat || p.lat);
        const lon = Number(p.predicted_lon || p.predicted_lng || p.lng);
        if (lat && lon) bounds.extend([lon, lat]);
      });
      historicalHotspots.forEach((h) => {
        const lat = Number(h.lat || h.latitude);
        const lon = Number(h.lng || h.longitude);
        if (lat && lon) bounds.extend([lon, lat]);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 11, duration: 1500 });
      }
    }
  }, [selectedComplaintId, predictions, historicalHotspots, mapLoaded]);

  const handlePan = (lat: number, lon: number) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [lon, lat],
      zoom: 12.8,
      pitch: 45,
      duration: 1200,
    });
  };

  return (
    <div className="nexus-map-wrapper">
      {/* Mapbox / MapLibre Container */}
      <div className="nexus-deckgl-container">
        <div ref={mapContainerRef} className="nexus-mapbox-container" />
        <div className="map-grid-overlay" />
      </div>

      {/* Floating Control Panel */}
      <div className="map-floating-panel">
        <div className="map-panel-header">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-cyan-600" />
            <span className="font-mono font-bold text-sm text-slate-800">
              GEOSPATIAL INTELLIGENCE
            </span>
          </div>
          <span className="nexus-badge-tech">{predictions.length} ACTIVE CASES</span>
        </div>

        {/* Selected Complaint Status Bar */}
        {selectedComplaintId && (
          <div style={{ marginBottom: '12px', padding: '8px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px' }}>
            <div className="flex items-center justify-between">
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#DC2626' }}>
                FOCUSED: {selectedComplaintId}
              </div>
              <button
                onClick={() => setSelectedComplaintId(null)}
                style={{ fontSize: '10px', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={12} /> Clear Focus
              </button>
            </div>
            <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
              Corridor and candidate ATMs locked.
            </div>
          </div>
        )}

        {/* Layer Visibility Toggles */}
        <div className="map-control-section">
          <div className="text-[11px] font-mono text-slate-500 mb-2 uppercase">
            Layer Controls
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => setShowPredictions(!showPredictions)}
              className={`layer-toggle-btn ${showPredictions ? 'active' : ''}`}
            >
              <div className="flex items-center gap-2">
                {showPredictions ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>Predicted Cashout Hotspots</span>
              </div>
              <span className="layer-color-indicator h3-indicator" />
            </button>

            <button
              onClick={() => setShowAtms(!showAtms)}
              className={`layer-toggle-btn ${showAtms ? 'active' : ''}`}
            >
              <div className="flex items-center gap-2">
                {showAtms ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>ATM Surveillance Intercepts</span>
              </div>
              <span className="layer-color-indicator atm-indicator" />
            </button>

            <button
              onClick={() => setShowHotspots(!showHotspots)}
              className={`layer-toggle-btn ${showHotspots ? 'active' : ''}`}
            >
              <div className="flex items-center gap-2">
                {showHotspots ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>Historical Cluster Density</span>
              </div>
              <span className="layer-color-indicator heat-indicator" />
            </button>
          </div>
        </div>

        {/* Filter Controls: Risk Threshold */}
        <div className="map-control-section">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1.5 uppercase">
            <span>Risk Filter:</span>
            <span className="text-amber-600 font-bold">
              {(riskThreshold * 100).toFixed(0)}%+
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.95"
            step="0.05"
            value={riskThreshold}
            onChange={(e) => setRiskThreshold(parseFloat(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>

        {/* Quick Pan Presets */}
        <div className="map-control-section">
          <div className="text-[11px] font-mono text-slate-500 mb-1.5 uppercase">
            Active Spatial Clusters
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {historicalHotspots.slice(0, 4).map((h) => (
              <button
                key={h.id}
                onClick={() => handlePan(h.lat, h.lng)}
                className="nexus-pill-button text-xs truncate"
                style={{ textAlign: 'left', padding: '5px 8px' }}
              >
                <Crosshair size={11} className="inline mr-1 text-red-500" />
                {h.district || 'Cluster'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Item Detail Inspector Drawer */}
      {selectedMapItem && (
        <div className="map-inspector-drawer">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="nexus-status-dot" />
              <span className="font-mono text-xs font-bold text-slate-800">
                {selectedMapItem.type === 'h3'
                  ? 'SELECTED CASHOUT CORRIDOR'
                  : 'ATM TERMINAL SURVEILLANCE'}
              </span>
            </div>
            <button
              onClick={() => setSelectedMapItem(null)}
              className="text-xs text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200"
            >
              Close
            </button>
          </div>

          <div className="mt-3 space-y-2 font-mono text-xs">
            {selectedMapItem.type === 'h3' && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Case:</span>
                  <span className="text-cyan-700 font-bold">
                    {(selectedMapItem.data as any).complaint_id || (selectedMapItem.data as any).accountId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Risk Score:</span>
                  <span className="text-red-600 font-bold">
                    {Math.round(((selectedMapItem.data as any).probability || 0.88) * 100)}%
                  </span>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() =>
                      navigate(
                        `/prediction/${(selectedMapItem.data as any).complaint_id || (selectedMapItem.data as any).accountId}`
                      )
                    }
                    className="w-full nexus-pill-button justify-center text-xs py-1.5"
                  >
                    View Case Prediction Dossier <ExternalLink size={12} />
                  </button>
                </div>
              </>
            )}

            {selectedMapItem.type === 'atm' && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500">ATM ID:</span>
                  <span className="text-emerald-700 font-bold">
                    {(selectedMapItem.data as any).id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank Node:</span>
                  <span className="text-slate-700">
                    {(selectedMapItem.data as any).bank}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">District:</span>
                  <span className="text-slate-700 text-[11px] text-right">
                    {(selectedMapItem.data as any).district || (selectedMapItem.data as any).address}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-emerald-600 font-bold uppercase">
                    {(selectedMapItem.data as any).operationalStatus || 'Active Intercept'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default MapPage;
