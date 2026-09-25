import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Feature } from 'geojson';
import {
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
    'carto-voyager-basemap': {
      type: 'raster',
      tiles: [
        `https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png${cartoKeyParam}`,
        `https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png${cartoKeyParam}`,
        `https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png${cartoKeyParam}`,
        `https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png${cartoKeyParam}`,
      ],
      tileSize: 256,
      attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'carto-voyager-layer',
      type: 'raster',
      source: 'carto-voyager-basemap',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-opacity': 0.96,
        'raster-saturation': -0.15,
      },
    },
  ],
};

const NATIONAL_DEFAULT_CENTER: [number, number] = [81.5, 23.5]; // Central India default
const NATIONAL_DEFAULT_ZOOM = 5.2;

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
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Convert Prediction Points to GeoJSON Points
  const predictionPointsGeoJson = useMemo<FeatureCollection>(() => {
    const features: Feature[] = [];
    predictions.forEach((pred) => {
      const lat = pred.predicted_lat || pred.lat;
      const lon = pred.predicted_lon || pred.predicted_lng || pred.lng;
      if (lat && lon) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lon, lat],
          },
          properties: {
            id: pred.id,
            complaint_id: pred.complaint_id,
            risk_score: pred.risk_score,
            risk_level: pred.risk_level,
            cashout_window_hours: pred.cashout_window_hours,
          },
        });
      }
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [predictions]);

  // Convert ATM locations to GeoJSON Points
  const atmGeoJson = useMemo<FeatureCollection>(() => {
    return {
      type: 'FeatureCollection',
      features: atmLocations.map((atm) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [atm.lng || atm.longitude || 0, atm.lat || atm.latitude || 0],
        },
        properties: {
          id: atm.id || atm.atm_id,
          name: atm.name,
          bank: atm.bank || atm.bank_name,
          address: atm.address,
          operationalStatus: atm.operationalStatus || 'surveillance_active',
        },
      })),
    };
  }, [atmLocations]);

  // Convert Hotspots to GeoJSON
  const hotspotGeoJson = useMemo<FeatureCollection>(() => {
    return {
      type: 'FeatureCollection',
      features: historicalHotspots.map((spot) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [spot.lng || spot.longitude || 0, spot.lat || spot.latitude || 0],
        },
        properties: {
          name: spot.name || spot.district,
          weight: spot.weight || spot.risk_score || 0.8,
        },
      })),
    };
  }, [historicalHotspots]);

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: LIGHT_MAP_STYLE,
      center: NATIONAL_DEFAULT_CENTER,
      zoom: NATIONAL_DEFAULT_ZOOM,
      pitch: 35,
      bearing: -5,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
    });
    popupRef.current = popup;

    map.on('load', () => {
      // 1. Hotspots Heatmap
      map.addSource('hotspot-source', {
        type: 'geojson',
        data: hotspotGeoJson,
      });

      map.addLayer({
        id: 'historical-hotspots-heatmap',
        type: 'heatmap',
        source: 'hotspot-source',
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': 1.2,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(255, 255, 255, 0)',
            0.2,
            'rgba(14, 165, 233, 0.4)',
            0.5,
            'rgba(245, 158, 11, 0.6)',
            0.8,
            'rgba(239, 68, 68, 0.8)',
            1,
            'rgba(185, 28, 28, 0.95)',
          ],
          'heatmap-radius': 40,
          'heatmap-opacity': 0.7,
        },
      });

      // 2. Active Predictions Layer
      map.addSource('prediction-source', {
        type: 'geojson',
        data: predictionPointsGeoJson,
      });

      map.addLayer({
        id: 'prediction-pulse-glow',
        type: 'circle',
        source: 'prediction-source',
        paint: {
          'circle-radius': 22,
          'circle-color': '#dc2626',
          'circle-opacity': 0.25,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ef4444',
          'circle-stroke-opacity': 0.6,
        },
      });

      map.addLayer({
        id: 'prediction-points-layer',
        type: 'circle',
        source: 'prediction-source',
        paint: {
          'circle-radius': 9,
          'circle-color': '#dc2626',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
        },
      });

      // 3. ATM Markers Layer
      map.addSource('atm-source', {
        type: 'geojson',
        data: atmGeoJson,
      });

      map.addLayer({
        id: 'atm-markers-layer',
        type: 'circle',
        source: 'atm-source',
        paint: {
          'circle-radius': 6.5,
          'circle-color': '#087f5b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Interactivity: Click Prediction
      map.on('click', 'prediction-points-layer', (e: maplibregl.MapLayerMouseEvent) => {
        if (e.features && e.features[0]) {
          const props = (e.features[0] as any).properties;
          setSelectedMapItem({ type: 'h3', data: props });
        }
      });

      // Hover Prediction
      map.on('mouseenter', 'prediction-points-layer', (e: maplibregl.MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features[0]) {
          const props = (e.features[0] as any).properties;
          popup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="nexus-map-popup" style="font-size:12px; font-family:monospace;">
                <strong style="color:#dc2626">PREDICTED CASHOUT POINT</strong><br/>
                Case: ${props.complaint_id}<br/>
                Risk: ${Math.round(props.risk_score * 100)}% (${props.risk_level})<br/>
                Window: ${props.cashout_window_hours}h
              </div>`
            )
            .addTo(map);
        }
      });

      map.on('mouseleave', 'prediction-points-layer', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      // Click ATM
      map.on('click', 'atm-markers-layer', (e: maplibregl.MapLayerMouseEvent) => {
        if (e.features && e.features[0]) {
          const id = (e.features[0] as any).properties?.id;
          const found = atmLocations.find((a) => a.id === id);
          if (found) {
            setSelectedMapItem({ type: 'atm', data: found });
          }
        }
      });

      // Hover ATM
      map.on('mouseenter', 'atm-markers-layer', (e: maplibregl.MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features[0]) {
          const props = (e.features[0] as any).properties;
          popup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="nexus-map-popup" style="font-size:12px; font-family:sans-serif;">
                <strong style="color:#087f5b">${props.name}</strong><br/>
                ${props.bank}<br/>
                Status: Verified Candidate ATM
              </div>`
            )
            .addTo(map);
        }
      });

      map.on('mouseleave', 'atm-markers-layer', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  // Update GeoJSON Sources when data changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const pSrc = mapRef.current.getSource('prediction-source') as maplibregl.GeoJSONSource | undefined;
    if (pSrc) pSrc.setData(predictionPointsGeoJson);

    const aSrc = mapRef.current.getSource('atm-source') as maplibregl.GeoJSONSource | undefined;
    if (aSrc) aSrc.setData(atmGeoJson);

    const hSrc = mapRef.current.getSource('hotspot-source') as maplibregl.GeoJSONSource | undefined;
    if (hSrc) hSrc.setData(hotspotGeoJson);
  }, [predictionPointsGeoJson, atmGeoJson, hotspotGeoJson, mapLoaded]);

  // Dynamic Camera Fit: Either focus selected complaint OR fit over all active national predictions
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    if (selectedComplaintId && predictions.length > 0) {
      const targetPred = predictions.find((p) => p.complaint_id === selectedComplaintId) || predictions[0];
      const lat = targetPred.predicted_lat || targetPred.lat;
      const lon = targetPred.predicted_lon || targetPred.predicted_lng || targetPred.lng;
      if (lat && lon) {
        map.flyTo({
          center: [lon, lat],
          zoom: 12.8,
          pitch: 45,
          bearing: -10,
          duration: 1500,
        });
      }
    } else if (predictions.length > 0) {
      // Natural extent over all predictions across India
      const bounds = new maplibregl.LngLatBounds();
      predictions.forEach((p) => {
        const lat = p.predicted_lat || p.lat;
        const lon = p.predicted_lon || p.predicted_lng || p.lng;
        if (lat && lon) bounds.extend([lon, lat]);
      });
      historicalHotspots.forEach((h) => {
        const lat = h.lat || h.latitude;
        const lon = h.lng || h.longitude;
        if (lat && lon) bounds.extend([lon, lat]);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 90, maxZoom: 11, duration: 1500 });
      }
    }
  }, [selectedComplaintId, predictions, historicalHotspots, mapLoaded]);

  const handlePanToCoordinate = (lat: number, lon: number) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [lon, lat],
      zoom: 12.5,
      pitch: 45,
      duration: 1200,
    });
  };

  return (
    <div className="nexus-map-wrapper relative w-full h-[calc(100vh-64px)]">
      {/* Mapbox Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Banner: Selected Case or National View */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-lg border border-[#E2E8E6] shadow-sm flex items-center gap-3">
        {selectedComplaintId ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
            <div>
              <span className="text-xs font-bold text-[#102A2A] font-mono block">
                FOCUSED CASE: {selectedComplaintId}
              </span>
              <span className="text-[11px] text-[#64748B]">Showing corridor &amp; candidate ATMs</span>
            </div>
            <button
              onClick={() => setSelectedComplaintId(null)}
              className="ml-2 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1"
            >
              <X size={12} /> Clear Focus (View All)
            </button>
          </>
        ) : (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <div>
              <span className="text-xs font-bold text-[#102A2A] font-mono block">
                NATIONAL PREDICTION GRID
              </span>
              <span className="text-[11px] text-[#64748B]">{predictions.length} active cashout predictions across India</span>
            </div>
          </>
        )}
      </div>

      {/* Floating Control Panel (Top-Right / Controls) */}
      <div className="absolute top-4 right-14 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-[#E2E8E6] shadow-sm space-y-3 max-w-[240px]">
        <div className="text-xs font-bold text-[#102A2A] uppercase font-mono tracking-wider">
          Active Cyber Corridors
        </div>

        {/* Real Quick-Pan Nodes from DB */}
        <div className="space-y-1.5">
          {historicalHotspots.slice(0, 4).map((spot) => {
            const lat = spot.latitude || spot.lat;
            const lon = spot.longitude || spot.lng;
            return (
              <button
                key={spot.id || spot.district}
                onClick={() => handlePanToCoordinate(lat, lon)}
                className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center justify-between border border-slate-100"
              >
                <span className="truncate">{spot.district || spot.name}</span>
                <Crosshair size={12} className="text-[#087F5B] flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Item Drawer */}
      {selectedMapItem && (
        <div className="absolute bottom-6 left-6 z-10 bg-white p-4 rounded-xl border border-[#E2E8E6] shadow-lg max-w-sm w-full space-y-2">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <span className="font-bold text-xs text-[#102A2A] uppercase font-mono">
              {selectedMapItem.type === 'atm' ? 'Candidate Cashout ATM' : 'Predicted Extraction Target'}
            </span>
            <button onClick={() => setSelectedMapItem(null)} className="text-slate-400 hover:text-slate-700">
              <X size={15} />
            </button>
          </div>

          {selectedMapItem.type === 'atm' ? (
            <div className="text-xs space-y-1 text-slate-700">
              <div className="font-bold text-sm text-[#102A2A]">{(selectedMapItem.data as any).name}</div>
              <div className="text-slate-500">{(selectedMapItem.data as any).address}</div>
              <div className="font-mono text-[#087F5B] font-semibold">Bank: {(selectedMapItem.data as any).bank}</div>
            </div>
          ) : (
            <div className="text-xs space-y-2 text-slate-700">
              <div>
                <span className="text-slate-500">Case Reference: </span>
                <span className="font-mono font-bold text-[#102A2A]">{(selectedMapItem.data as any).complaint_id}</span>
              </div>
              <div>
                <span className="text-slate-500">Computed Fraud Risk: </span>
                <span className="font-mono font-bold text-red-600">
                  {Math.round(((selectedMapItem.data as any).risk_score || 0.85) * 100)}%
                </span>
              </div>
              <button
                onClick={() => navigate(`/prediction/${(selectedMapItem.data as any).complaint_id}`)}
                className="w-full py-1.5 bg-[#087F5B] text-white rounded text-xs font-semibold hover:bg-[#076D4E] flex items-center justify-center gap-1 mt-2"
              >
                Open Full Case Prediction Dossier <ExternalLink size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
