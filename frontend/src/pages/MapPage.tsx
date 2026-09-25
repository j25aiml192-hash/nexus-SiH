import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection } from 'geojson';
import {
  Search,
  Globe,
  Maximize2,
  X,
  ExternalLink,
  Shield,
  Eye,
  EyeOff,
  Crosshair,
  ChevronDown,
} from 'lucide-react';
import { useMapData } from '../hooks/useNexusData';
import { useNexusStore } from '../store/useNexusStore';
import { useNavigate } from 'react-router-dom';

// MapTiler High-Resolution Vector Basemap (User API Key)
const MAPTILER_STYLE_URL = 'https://api.maptiler.com/maps/streets-v4/style.json?key=PzegCb1XWc7AEBZYRmB3';

const NATIONAL_DEFAULT_CENTER: [number, number] = [77.2090, 28.6139]; // Delhi NCR Focus
const NATIONAL_DEFAULT_ZOOM = 11;

// Transaction Flow Corridors GeoJSON
const TRANSACTION_CORRIDORS_GEOJSON: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.2090, 28.6139], // Delhi
          [77.3910, 28.5355], // Noida
          [77.6737, 27.4924], // Mathura
        ],
      },
      properties: {
        id: 'R-4112',
        title: 'Delhi-Noida-Mathura Intercept Line',
        risk: 'HIGH',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [86.6936, 24.4853], // Deoghar
          [86.3096, 24.1939], // Giridih
          [86.4304, 23.7957], // Dhanbad
        ],
      },
      properties: {
        id: 'R-7620',
        title: 'Deoghar-Giridih Corridor',
        risk: 'CRITICAL',
      },
    },
  ],
};

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const selectedComplaintId = useNexusStore((state) => state.selectedComplaintId);

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

  const [searchQuery, setSearchQuery] = useState('');
  const [is3DMode, setIs3DMode] = useState(false);
  const [showPredictions, setShowPredictions] = useState(true);
  const [showAtms, setShowAtms] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showCorridors, setShowCorridors] = useState(true);
  const [riskFilter, setRiskFilter] = useState<number>(0.4);
  const [focusedCase, setFocusedCase] = useState<string | null>('CMP-2026-9081');
  const [targetState, setTargetState] = useState<string>('National (All States)');

  // Filtered Predictions
  const filteredPredictions = useMemo(() => {
    return predictions.filter((p) => {
      const score = Number(p.risk_score || p.riskScore || 0.8);
      if (score < riskFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (p.complaint_id || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [predictions, riskFilter, searchQuery]);

  // GeoJSON data structures
  const predictionPointsGeoJson: FeatureCollection = useMemo(() => ({
    type: 'FeatureCollection',
    features: filteredPredictions
      .filter((p) => (p.predicted_lat || p.lat) && (p.predicted_lon || p.predicted_lng || p.lng))
      .map((p) => {
        const lat = Number(p.predicted_lat || p.lat);
        const lon = Number(p.predicted_lon || p.predicted_lng || p.lng);
        const score = Number(p.risk_score || p.riskScore || 0.85);
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon, lat] },
          properties: {
            id: p.prediction_id || p.id,
            complaint_id: p.complaint_id,
            risk_score: score,
            risk_level: p.risk_level || (score >= 0.75 ? 'CRITICAL' : 'HIGH'),
            color: score >= 0.75 ? '#EF4444' : score >= 0.5 ? '#F59E0B' : '#D97706',
          },
        };
      }),
  }), [filteredPredictions]);

  const atmGeoJson: FeatureCollection = useMemo(() => ({
    type: 'FeatureCollection',
    features: atmLocations.map((atm) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [atm.lng, atm.lat] },
      properties: {
        id: atm.id,
        bank: atm.bank || atm.bank_name || 'Bank ATM',
        name: atm.name || 'ATM Terminal',
        address: atm.address,
        district: atm.district,
        operationalStatus: atm.operationalStatus || 'Intercept Active',
      },
    })),
  }), [atmLocations]);

  const hotspotGeoJson: FeatureCollection = useMemo(() => ({
    type: 'FeatureCollection',
    features: historicalHotspots.map((h) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [h.lng, h.lat] },
      properties: {
        id: h.id,
        district: h.district,
        weight: h.risk_score || h.weight || 0.75,
      },
    })),
  }), [historicalHotspots]);

  // Initialize MapLibre with MapTiler Streets style
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAPTILER_STYLE_URL,
      center: NATIONAL_DEFAULT_CENTER,
      zoom: NATIONAL_DEFAULT_ZOOM,
      pitch: 0,
      bearing: 0,
      maxPitch: 65,
    });

    mapRef.current = map;

    map.on('load', () => {
      setMapLoaded(true);

      // Corridors Layer (Subtle Blue/Purple Line)
      map.addSource('corridors-source', {
        type: 'geojson',
        data: TRANSACTION_CORRIDORS_GEOJSON,
      });

      map.addLayer({
        id: 'corridors-line-layer',
        type: 'line',
        source: 'corridors-source',
        paint: {
          'line-color': '#4F46E5',
          'line-width': 3.5,
          'line-dasharray': [3, 3],
          'line-opacity': 0.85,
        },
      });

      // Hotspots Heatmap Layer
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
          'heatmap-intensity': 1.5,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(245, 158, 11, 0.3)',
            0.6, 'rgba(234, 88, 12, 0.65)',
            1.0, 'rgba(239, 68, 68, 0.95)',
          ],
          'heatmap-radius': 35,
          'heatmap-opacity': 0.6,
        },
      });

      // ATM Markers Layer
      map.addSource('atm-source', {
        type: 'geojson',
        data: atmGeoJson,
      });

      map.addLayer({
        id: 'atm-markers-layer',
        type: 'circle',
        source: 'atm-source',
        paint: {
          'circle-radius': 7.5,
          'circle-color': '#10B981',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // Prediction Markers Layer (Glowing Orange/Red)
      map.addSource('prediction-source', {
        type: 'geojson',
        data: predictionPointsGeoJson,
      });

      map.addLayer({
        id: 'prediction-halo-layer',
        type: 'circle',
        source: 'prediction-source',
        paint: {
          'circle-radius': 18,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.25,
        },
      });

      map.addLayer({
        id: 'prediction-markers-layer',
        type: 'circle',
        source: 'prediction-source',
        paint: {
          'circle-radius': 8.5,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // Click Handlers
      map.on('click', 'prediction-markers-layer', (e) => {
        if (!e.features || !e.features[0]) return;
        const feat = e.features[0];
        const props = feat.properties as any;
        setSelectedMapItem({
          type: 'h3',
          data: {
            id: props.id,
            complaint_id: props.complaint_id,
            probability: props.risk_score,
            risk_level: props.risk_level,
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
            name: props.name,
            address: props.address,
            district: props.district,
            operationalStatus: props.operationalStatus,
          },
        });
      });

      // Pointer Cursors
      ['prediction-markers-layer', 'atm-markers-layer', 'corridors-line-layer'].forEach((l) => {
        map.on('mouseenter', l, () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', l, () => (map.getCanvas().style.cursor = ''));
      });

      map.resize();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  // ResizeObserver for Map canvas
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.resize();
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update Data Sources
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const pSrc = mapRef.current.getSource('prediction-source') as maplibregl.GeoJSONSource;
    if (pSrc) pSrc.setData(predictionPointsGeoJson);

    const aSrc = mapRef.current.getSource('atm-source') as maplibregl.GeoJSONSource;
    if (aSrc) aSrc.setData(atmGeoJson);

    const hSrc = mapRef.current.getSource('hotspot-source') as maplibregl.GeoJSONSource;
    if (hSrc) hSrc.setData(hotspotGeoJson);
  }, [predictionPointsGeoJson, atmGeoJson, hotspotGeoJson, mapLoaded]);

  // Layer Visibilities
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
    if (map.getLayer('corridors-line-layer')) {
      map.setLayoutProperty('corridors-line-layer', 'visibility', showCorridors ? 'visible' : 'none');
    }
  }, [showPredictions, showAtms, showHotspots, showCorridors, mapLoaded]);

  const flyToCluster = (coords: [number, number]) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: coords,
      zoom: 12.5,
      duration: 1200,
    });
  };

  const handleResetNationalView = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: NATIONAL_DEFAULT_CENTER,
      zoom: NATIONAL_DEFAULT_ZOOM,
      pitch: 0,
      bearing: 0,
      duration: 1200,
    });
  };

  const toggle3D = () => {
    if (!mapRef.current) return;
    const next = !is3DMode;
    setIs3DMode(next);
    mapRef.current.easeTo({ pitch: next ? 45 : 0, duration: 800 });
  };

  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 76px)', overflow: 'hidden', backgroundColor: '#F5F8FC', fontFamily: "'Inter', sans-serif" }}>
      
      {/* 1. FULL-SCREEN MAP CANVAS */}
      <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }} />

      {/* FLOATING CAMERA CONTROLS (BOTTOM-LEFT WITH ULTRA-TRANSPARENT FROSTED GLASS EFFECT) */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        left: '16px',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.20)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.45)',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)'
      }}>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            color: '#0F172A',
            fontWeight: 'bold',
            fontSize: '15px',
            border: '1px solid rgba(255, 255, 255, 0.45)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            color: '#0F172A',
            fontWeight: 'bold',
            fontSize: '15px',
            border: '1px solid rgba(255, 255, 255, 0.45)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={toggle3D}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            fontSize: '11px',
            backgroundColor: is3DMode ? '#2563EB' : 'rgba(255, 255, 255, 0.25)',
            color: is3DMode ? '#FFFFFF' : '#0F172A',
            border: '1px solid rgba(255, 255, 255, 0.45)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Toggle 3D Pitch"
        >
          3D
        </button>
      </div>

      {/* 2. RIGHT-SIDE GEOSPATIAL INTELLIGENCE PANEL (HIGHLY TRANSPARENT / TRANSLUCENT FROSTED GLASS BACKDROP BLUR) */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        bottom: '16px',
        zIndex: 500,
        width: '360px',
        maxHeight: 'calc(100% - 32px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: '18px',
        border: '1px solid rgba(255, 255, 255, 0.50)',
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        overflow: 'hidden',
        color: '#0F172A',
        padding: '12px 14px'
      }}>
        
        {/* PANEL HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(15, 23, 42, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '7px', backgroundColor: 'rgba(239, 246, 255, 0.45)', border: '1px solid rgba(191, 219, 254, 0.6)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield size={14} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#0F172A' }}>
              GEOSPATIAL INTELLIGENCE
            </span>
          </div>
          <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '9.5px', fontFamily: 'monospace', fontWeight: 700, backgroundColor: 'rgba(239, 246, 255, 0.50)', color: '#1D4ED8', border: '1px solid rgba(191, 219, 254, 0.65)', textTransform: 'uppercase', flexShrink: 0 }}>
            8 ACTIVE CASES
          </span>
        </div>

        {/* EMBEDDED MAP SEARCH & TOOLBAR CONTROLS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '8px', borderBottom: '1px solid rgba(15, 23, 42, 0.1)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.20)',
            border: '1px solid rgba(255, 255, 255, 0.45)',
            borderRadius: '8px',
            padding: '0 10px',
            height: '32px'
          }}>
            <Search size={13} style={{ color: '#64748B', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search location or case..."
              style={{
                width: '100%',
                fontSize: '11px',
                fontWeight: 600,
                color: '#0F172A',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
            <button
              onClick={() => flyToCluster([77.2090, 28.6139])}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                height: '28px',
                borderRadius: '6px',
                fontSize: '10.5px',
                fontWeight: 600,
                color: '#0F172A',
                backgroundColor: 'rgba(255, 255, 255, 0.20)',
                border: '1px solid rgba(255, 255, 255, 0.45)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Crosshair size={12} style={{ color: '#2563EB', flexShrink: 0 }} />
              <span>Locate Me</span>
            </button>

            <button
              onClick={handleResetNationalView}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                height: '28px',
                borderRadius: '6px',
                fontSize: '10.5px',
                fontWeight: 600,
                color: '#0F172A',
                backgroundColor: 'rgba(255, 255, 255, 0.20)',
                border: '1px solid rgba(255, 255, 255, 0.45)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Globe size={12} style={{ color: '#2563EB', flexShrink: 0 }} />
              <span>Reset</span>
            </button>

            <button
              onClick={toggleFullscreen}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                height: '28px',
                borderRadius: '6px',
                fontSize: '10.5px',
                fontWeight: 600,
                color: '#0F172A',
                backgroundColor: 'rgba(255, 255, 255, 0.20)',
                border: '1px solid rgba(255, 255, 255, 0.45)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Maximize2 size={12} style={{ color: '#2563EB', flexShrink: 0 }} />
              <span>Full</span>
            </button>
          </div>
        </div>

        {/* FOCUSED CASE CARD */}
        {focusedCase && (
          <div style={{ backgroundColor: 'rgba(254, 242, 242, 0.25)', border: '1px solid rgba(254, 202, 202, 0.6)', backdropFilter: 'blur(8px)', borderRadius: '10px', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#DC2626' }}>
                FOCUSED CASE
              </span>
              <button
                onClick={() => setFocusedCase(null)}
                style={{ fontSize: '11px', color: '#475569', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', marginLeft: 'auto' }}
              >
                <X size={11} />
                <span>Clear Focus</span>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12.5px', color: '#0F172A' }}>{focusedCase}</span>
              <span style={{ padding: '1px 6px', fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, borderRadius: '4px', backgroundColor: '#DC2626', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.04em', marginLeft: 'auto' }}>
                HIGH RISK
              </span>
            </div>
          </div>
        )}

        {/* GEO-INTELLIGENCE SUMMARY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '8px', borderBottom: '1px solid rgba(15, 23, 42, 0.1)' }}>
          <div style={{ fontSize: '9.5px', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
            GEO-INTELLIGENCE
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '10px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TARGET STATE
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={targetState}
                onChange={(e) => setTargetState(e.target.value)}
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 28px 0 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#0F172A',
                  backgroundColor: 'rgba(255, 255, 255, 0.20)',
                  border: '1px solid rgba(255, 255, 255, 0.45)',
                  borderRadius: '8px',
                  appearance: 'none',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="National (All States)">National (All States)</option>
                <option value="Delhi NCR">Delhi NCR</option>
                <option value="Jharkhand">Jharkhand</option>
                <option value="Haryana">Haryana</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '10px', color: '#475569', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* 3 Metrics: Complaints, Pending, Districts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', textAlign: 'center' }}>
            <div style={{ padding: '5px 4px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.18)', border: '1px solid rgba(255, 255, 255, 0.40)' }}>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>Complaints</div>
              <div style={{ fontSize: '12.5px', fontWeight: 800, fontFamily: 'monospace', color: '#0F172A', marginTop: '1px' }}>0</div>
            </div>
            <div style={{ padding: '5px 4px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.18)', border: '1px solid rgba(255, 255, 255, 0.40)' }}>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>Pending</div>
              <div style={{ fontSize: '12.5px', fontWeight: 800, fontFamily: 'monospace', color: '#0F172A', marginTop: '1px' }}>0</div>
            </div>
            <div style={{ padding: '5px 4px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.18)', border: '1px solid rgba(255, 255, 255, 0.40)' }}>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>Districts</div>
              <div style={{ fontSize: '12.5px', fontWeight: 800, fontFamily: 'monospace', color: '#0F172A', marginTop: '1px' }}>0</div>
            </div>
          </div>
        </div>

        {/* LAYER CONTROLS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingBottom: '8px', borderBottom: '1px solid rgba(15, 23, 42, 0.1)' }}>
          <div style={{ fontSize: '9.5px', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
            LAYER CONTROLS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => setShowPredictions(!showPredictions)}
              style={{
                width: '100%',
                height: '32px',
                padding: '0 10px',
                borderRadius: '8px',
                border: showPredictions ? '1px solid rgba(191, 219, 254, 0.8)' : '1px solid rgba(255, 255, 255, 0.40)',
                backgroundColor: showPredictions ? 'rgba(239, 246, 255, 0.40)' : 'rgba(255, 255, 255, 0.15)',
                color: '#0F172A',
                fontSize: '11px',
                fontWeight: showPredictions ? 600 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {showPredictions ? <Eye size={13} style={{ color: '#2563EB', flexShrink: 0 }} /> : <EyeOff size={13} style={{ color: '#64748B', flexShrink: 0 }} />}
                <span>Predicted Cashout Hotspots</span>
              </div>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444', flexShrink: 0 }} />
            </button>

            <button
              onClick={() => setShowAtms(!showAtms)}
              style={{
                width: '100%',
                height: '32px',
                padding: '0 10px',
                borderRadius: '8px',
                border: showAtms ? '1px solid rgba(191, 219, 254, 0.8)' : '1px solid rgba(255, 255, 255, 0.40)',
                backgroundColor: showAtms ? 'rgba(239, 246, 255, 0.40)' : 'rgba(255, 255, 255, 0.15)',
                color: '#0F172A',
                fontSize: '11px',
                fontWeight: showAtms ? 600 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {showAtms ? <Eye size={13} style={{ color: '#2563EB', flexShrink: 0 }} /> : <EyeOff size={13} style={{ color: '#64748B', flexShrink: 0 }} />}
                <span>ATM Surveillance Intercepts</span>
              </div>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', flexShrink: 0 }} />
            </button>

            <button
              onClick={() => setShowHotspots(!showHotspots)}
              style={{
                width: '100%',
                height: '32px',
                padding: '0 10px',
                borderRadius: '8px',
                border: showHotspots ? '1px solid rgba(191, 219, 254, 0.8)' : '1px solid rgba(255, 255, 255, 0.40)',
                backgroundColor: showHotspots ? 'rgba(239, 246, 255, 0.40)' : 'rgba(255, 255, 255, 0.15)',
                color: '#0F172A',
                fontSize: '11px',
                fontWeight: showHotspots ? 600 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {showHotspots ? <Eye size={13} style={{ color: '#2563EB', flexShrink: 0 }} /> : <EyeOff size={13} style={{ color: '#64748B', flexShrink: 0 }} />}
                <span>Historical Cluster Density</span>
              </div>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B', flexShrink: 0 }} />
            </button>

            <button
              onClick={() => setShowCorridors(!showCorridors)}
              style={{
                width: '100%',
                height: '32px',
                padding: '0 10px',
                borderRadius: '8px',
                border: showCorridors ? '1px solid rgba(191, 219, 254, 0.8)' : '1px solid rgba(255, 255, 255, 0.40)',
                backgroundColor: showCorridors ? 'rgba(239, 246, 255, 0.40)' : 'rgba(255, 255, 255, 0.15)',
                color: '#0F172A',
                fontSize: '11px',
                fontWeight: showCorridors ? 600 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {showCorridors ? <Eye size={13} style={{ color: '#2563EB', flexShrink: 0 }} /> : <EyeOff size={13} style={{ color: '#64748B', flexShrink: 0 }} />}
                <span>Transaction Corridors</span>
              </div>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4F46E5', flexShrink: 0 }} />
            </button>
          </div>
        </div>

        {/* RISK FILTER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '8px', borderBottom: '1px solid rgba(15, 23, 42, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '9.5px', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
              RISK FILTER
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#2563EB', marginLeft: 'auto' }}>{(riskFilter * 100).toFixed(0)}%+</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.9"
            step="0.05"
            value={riskFilter}
            onChange={(e) => setRiskFilter(parseFloat(e.target.value))}
            style={{ width: '100%', height: '5px', backgroundColor: 'rgba(203, 213, 225, 0.7)', borderRadius: '4px', cursor: 'pointer', accentColor: '#2563EB' }}
          />
        </div>

        {/* ACTIVE SPATIAL CLUSTERS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ fontSize: '9.5px', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
            ACTIVE SPATIAL CLUSTERS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              style={{ padding: '6px 8px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.18)', border: '1px solid rgba(255, 255, 255, 0.40)', textAlign: 'left', cursor: 'pointer' }}
              onClick={() => flyToCluster([77.2090, 28.6139])}
            >
              <div style={{ fontWeight: 700, fontSize: '11px', color: '#0F172A' }}>Delhi NCR</div>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>8 linked accounts</div>
            </button>
            <button
              style={{ padding: '6px 8px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.18)', border: '1px solid rgba(255, 255, 255, 0.40)', textAlign: 'left', cursor: 'pointer' }}
              onClick={() => flyToCluster([77.3910, 28.5355])}
            >
              <div style={{ fontWeight: 700, fontSize: '11px', color: '#0F172A' }}>Noida</div>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>5 linked accounts</div>
            </button>
            <button
              style={{ padding: '6px 8px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.18)', border: '1px solid rgba(255, 255, 255, 0.40)', textAlign: 'left', cursor: 'pointer' }}
              onClick={() => flyToCluster([77.4538, 28.6692])}
            >
              <div style={{ fontWeight: 700, fontSize: '11px', color: '#0F172A' }}>Ghaziabad</div>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>4 linked accounts</div>
            </button>
            <button
              style={{ padding: '6px 8px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.18)', border: '1px solid rgba(255, 255, 255, 0.40)', textAlign: 'left', cursor: 'pointer' }}
              onClick={() => flyToCluster([80.9462, 26.8467])}
            >
              <div style={{ fontWeight: 700, fontSize: '11px', color: '#0F172A' }}>Lucknow</div>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>3 linked accounts</div>
            </button>
          </div>
        </div>

      </div>

      {/* Floating Node Inspector Drawer */}
      {selectedMapItem && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          zIndex: 600,
          width: '320px',
          backgroundColor: 'rgba(255, 255, 255, 0.22)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          color: '#0F172A',
          padding: '14px',
          borderRadius: '14px',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.50)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid rgba(15, 23, 42, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
              <span style={{ fontFamily: 'monospace', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em', color: '#2563EB', textTransform: 'uppercase' }}>
                {selectedMapItem.type === 'h3' ? 'CASHOUT CORRIDOR NODE' : 'ATM SURVEILLANCE NODE'}
              </span>
            </div>
            <button
              onClick={() => setSelectedMapItem(null)}
              style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'monospace', fontSize: '11px' }}>
            {selectedMapItem.type === 'h3' && (
              <>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: 'sans-serif' }}>
                  {(selectedMapItem.data as any).complaint_id || 'CMP-2026-9081'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                  <span style={{ color: '#475569' }}>Risk Score:</span>
                  <span style={{ color: '#DC2626', fontWeight: 800, fontSize: '13px' }}>
                    {Math.round(((selectedMapItem.data as any).probability || 0.88) * 100)}%
                  </span>
                </div>

                <button
                  onClick={() =>
                    navigate(
                      `/prediction/${(selectedMapItem.data as any).complaint_id || 'CMP-2026-9081'}`
                    )
                  }
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    padding: '7px 10px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontFamily: 'sans-serif',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>VIEW DOSSIER DETAIL</span>
                  <ExternalLink size={12} />
                </button>
              </>
            )}

            {selectedMapItem.type === 'atm' && (
              <>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: 'sans-serif' }}>
                  {(selectedMapItem.data as any).bank} - {(selectedMapItem.data as any).name || 'ATM Node'}
                </div>
                <div style={{ fontSize: '10.5px', color: '#475569', fontFamily: 'sans-serif' }}>
                  {(selectedMapItem.data as any).address || (selectedMapItem.data as any).district}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                  <span style={{ color: '#475569' }}>Status:</span>
                  <span style={{ color: '#10B981', fontWeight: 700, textTransform: 'uppercase', fontSize: '10.5px' }}>
                    {(selectedMapItem.data as any).operationalStatus || 'INTERCEPT ACTIVE'}
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
