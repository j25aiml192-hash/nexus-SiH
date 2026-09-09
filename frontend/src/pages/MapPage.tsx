import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Feature } from 'geojson';
import { cellToLatLng, cellToBoundary } from 'h3-js';
import {
  Layers,
  Eye,
  EyeOff,
  Crosshair,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useMapData } from '../hooks/useNexusData';
import { useNavigate } from 'react-router-dom';

// Light architectural 3D perspective basemap style
const LIGHT_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-light-basemap': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'carto-light-layer',
      type: 'raster',
      source: 'carto-light-basemap',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-opacity': 0.96,
        'raster-saturation': -0.15,
      },
    },
  ],
};

const INITIAL_CENTER: [number, number] = [77.2185, 28.6242];
const INITIAL_ZOOM = 12.4;
const INITIAL_PITCH = 48;
const INITIAL_BEARING = -15;

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    predictions,
    atmLocations,
    historicalHotspots,
    mapFocusTarget,
    selectedMapItem,
    setSelectedMapItem,
  } = useMapData();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Layer Visibility Toggles
  const [showH3, setShowH3] = useState(true);
  const [showAtms, setShowAtms] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Filters
  const [riskThreshold, setRiskThreshold] = useState(0.5); // filter by probability >= threshold
  const [timeFilter, setTimeFilter] = useState<'all' | '6h' | '12h' | '24h'>('all');

  // Aggregate H3 cells across predictions with risk/time filtering
  const h3Data = useMemo(() => {
    const list: Array<{
      cell: string;
      probability: number;
      accountId: string;
      riskLevel: string;
      predictionId: string;
    }> = [];

    predictions.forEach((pred) => {
      if (timeFilter === '6h' && pred.riskLevel === 'low') return;
      if (timeFilter === '12h' && pred.riskLevel === 'low') return;

      pred.predictedH3Cells.forEach((c) => {
        if (c.probability >= riskThreshold) {
          list.push({
            cell: c.cell,
            probability: c.probability,
            accountId: pred.accountId,
            riskLevel: pred.riskLevel,
            predictionId: pred.id,
          });
        }
      });
    });

    return list;
  }, [predictions, riskThreshold, timeFilter]);

  // Convert H3 data to GeoJSON Polygons using cellToBoundary
  const h3GeoJson = useMemo<FeatureCollection>(() => {
    const features: Feature[] = [];

    h3Data.forEach((item) => {
      try {
        const boundary = cellToBoundary(item.cell, true);
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [boundary],
          },
          properties: {
            id: item.cell,
            cell: item.cell,
            probability: item.probability,
            riskLevel: item.riskLevel,
            accountId: item.accountId,
            predictionId: item.predictionId,
            // 3D extrusion height in meters driven by probability
            height: Math.max(220, item.probability * 1200),
          },
        });
      } catch (err) {
        console.warn('Error computing boundary for H3 cell:', item.cell, err);
      }
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [h3Data]);

  // Convert ATM locations to GeoJSON Points
  const atmGeoJson = useMemo<FeatureCollection>(() => {
    return {
      type: 'FeatureCollection',
      features: atmLocations.map((atm) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [atm.lng, atm.lat],
        },
        properties: {
          id: atm.id,
          name: atm.name,
          bank: atm.bank,
          address: atm.address,
          operationalStatus: atm.operationalStatus,
        },
      })),
    };
  }, [atmLocations]);

  // Convert historical hotspots to GeoJSON Points
  const hotspotGeoJson = useMemo<FeatureCollection>(() => {
    return {
      type: 'FeatureCollection',
      features: historicalHotspots.map((h, i) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [h.lng, h.lat],
        },
        properties: {
          id: `hotspot-${i}`,
          weight: h.weight,
        },
      })),
    };
  }, [historicalHotspots]);

  // Generate cybernetic intercept routes connecting ATM nodes (matching reference image)
  const cyberRoutesGeoJson = useMemo<FeatureCollection>(() => {
    if (atmLocations.length < 2) {
      return { type: 'FeatureCollection', features: [] };
    }

    const lines: Feature[] = [];
    for (let i = 0; i < atmLocations.length - 1; i++) {
      const p1 = atmLocations[i];
      const p2 = atmLocations[i + 1];
      // Intermediate step point to give an architectural grid look
      const midPoint: [number, number] = [p2.lng, p1.lat];
      lines.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [p1.lng, p1.lat],
            midPoint,
            [p2.lng, p2.lat],
          ],
        },
        properties: {
          id: `route-${p1.id}-${p2.id}`,
        },
      });
    }

    return {
      type: 'FeatureCollection',
      features: lines,
    };
  }, [atmLocations]);

  // Programmatic pan/zoom responder
  const programmaticPanZoom = useCallback(
    (cellOrAtmId?: string, lat?: number, lng?: number, zoom = 14) => {
      let targetLat = lat;
      let targetLng = lng;

      if (!targetLat || !targetLng) {
        if (cellOrAtmId) {
          const foundAtm = atmLocations.find((a) => a.id === cellOrAtmId);
          if (foundAtm) {
            targetLat = foundAtm.lat;
            targetLng = foundAtm.lng;
            setSelectedMapItem({ type: 'atm', data: foundAtm });
          } else {
            try {
              const coords = cellToLatLng(cellOrAtmId);
              targetLat = coords[0];
              targetLng = coords[1];
              setSelectedMapItem({
                type: 'h3',
                data: { cell: cellOrAtmId, probability: 0.942 },
              });
            } catch {
              console.warn('Could not parse H3 cell index:', cellOrAtmId);
            }
          }
        }
      }

      if (targetLat !== undefined && targetLng !== undefined && mapRef.current) {
        mapRef.current.flyTo({
          center: [targetLng, targetLat],
          zoom,
          pitch: 52,
          bearing: -10,
          essential: true,
          duration: 1200,
        });
      }
    },
    [atmLocations, setSelectedMapItem]
  );

  // Expose programmatic pan/zoom to global store target
  useEffect(() => {
    if (mapFocusTarget) {
      programmaticPanZoom(
        mapFocusTarget.cellOrAtmId,
        mapFocusTarget.lat,
        mapFocusTarget.lng,
        mapFocusTarget.zoom || 14.5
      );
    }
  }, [mapFocusTarget, programmaticPanZoom]);

  // Initialize Mapbox GL instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: LIGHT_MAP_STYLE,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      pitch: INITIAL_PITCH,
      bearing: INITIAL_BEARING,
    });

    // Add navigation controls (zoom, rotate, tilt)
    map.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
    });
    popupRef.current = popup;

    map.on('load', () => {
      // 1. Hotspots GeoJSON Source & Heatmap Layer
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
            0.45,
            'rgba(245, 158, 11, 0.6)',
            0.75,
            'rgba(239, 68, 68, 0.75)',
            1,
            'rgba(185, 28, 28, 0.85)',
          ],
          'heatmap-radius': 42,
          'heatmap-opacity': 0.65,
        },
      });

      // 2. Cyber Intercept Route Lines Source & Layers (matching reference image)
      map.addSource('cyber-routes-source', {
        type: 'geojson',
        data: cyberRoutesGeoJson,
      });

      map.addLayer({
        id: 'cyber-routes-glow',
        type: 'line',
        source: 'cyber-routes-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#0ea5e9',
          'line-width': 5,
          'line-opacity': 0.35,
        },
      });

      map.addLayer({
        id: 'cyber-routes-core',
        type: 'line',
        source: 'cyber-routes-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#0284c7',
          'line-width': 2.2,
          'line-dasharray': [3, 1.5],
          'line-opacity': 0.9,
        },
      });

      // 3. H3 Risk Zones Source & 3D Fill-Extrusion Layer
      map.addSource('h3-source', {
        type: 'geojson',
        data: h3GeoJson,
      });

      map.addLayer({
        id: 'h3-hexagons-extrusion',
        type: 'fill-extrusion',
        source: 'h3-source',
        paint: {
          'fill-extrusion-color': [
            'step',
            ['get', 'probability'],
            '#0284c7', // < 0.60 Blue Low
            0.6,
            '#eab308', // 0.60 - 0.75 Yellow Medium
            0.75,
            '#f97316', // 0.75 - 0.90 Orange High
            0.9,
            '#ef4444', // >= 0.90 Red Critical
          ],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.85,
        },
      });

      map.addLayer({
        id: 'h3-hexagons-outline',
        type: 'line',
        source: 'h3-source',
        paint: {
          'line-color': '#087f5b',
          'line-width': 1.5,
          'line-opacity': 0.5,
        },
      });

      // 4. ATM Locations Source & Layers (Radar halo + circle marker + symbol labels)
      map.addSource('atm-source', {
        type: 'geojson',
        data: atmGeoJson,
      });

      map.addLayer({
        id: 'atm-halo-layer',
        type: 'circle',
        source: 'atm-source',
        paint: {
          'circle-radius': 17,
          'circle-color': [
            'match',
            ['get', 'operationalStatus'],
            'dispenser_locked',
            '#ef4444',
            'surveillance_active',
            '#f59e0b',
            '#10b981',
          ],
          'circle-opacity': 0.22,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': [
            'match',
            ['get', 'operationalStatus'],
            'dispenser_locked',
            '#ef4444',
            'surveillance_active',
            '#f59e0b',
            '#10b981',
          ],
          'circle-stroke-opacity': 0.6,
        },
      });

      map.addLayer({
        id: 'atm-markers-layer',
        type: 'circle',
        source: 'atm-source',
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'match',
            ['get', 'operationalStatus'],
            'dispenser_locked',
            '#ef4444',
            'surveillance_active',
            '#f59e0b',
            '#10b981',
          ],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.addLayer({
        id: 'atm-labels-layer',
        type: 'symbol',
        source: 'atm-source',
        layout: {
          'text-field': ['get', 'id'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-offset': [1.3, -0.4],
          'text-anchor': 'left',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#0f172a',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        },
      });

      // Interactive Events
      // Click H3 Hexagon
      map.on('click', 'h3-hexagons-extrusion', (e: maplibregl.MapLayerMouseEvent) => {
        if (e.features && e.features[0]) {
          const props = (e.features[0] as any).properties;
          setSelectedMapItem({
            type: 'h3',
            data: {
              cell: props?.cell,
              probability: Number(props?.probability),
              accountId: props?.accountId,
              riskLevel: props?.riskLevel,
              predictionId: props?.predictionId,
            },
          });
        }
      });

      // Hover H3 Hexagon Tooltip
      map.on('mouseenter', 'h3-hexagons-extrusion', (e: maplibregl.MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features[0]) {
          const props = (e.features[0] as any).properties;
          popup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="nexus-map-popup">
                <strong style="color:#f97316">H3: ${props?.cell}</strong><br/>
                Probability: ${(Number(props?.probability) * 100).toFixed(1)}%<br/>
                Account: ${props?.accountId || 'ACC-89214'}
              </div>`
            )
            .addTo(map);
        }
      });

      map.on('mouseleave', 'h3-hexagons-extrusion', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      // Click ATM Marker
      map.on('click', 'atm-markers-layer', (e: maplibregl.MapLayerMouseEvent) => {
        if (e.features && e.features[0]) {
          const id = (e.features[0] as any).properties?.id;
          const found = atmLocations.find((a) => a.id === id);
          if (found) {
            setSelectedMapItem({ type: 'atm', data: found });
          }
        }
      });

      // Hover ATM Tooltip
      map.on('mouseenter', 'atm-markers-layer', (e: maplibregl.MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features[0]) {
          const props = (e.features[0] as any).properties;
          popup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="nexus-map-popup">
                <strong style="color:#10b981">${props?.id}: ${props?.name}</strong><br/>
                ${props?.bank}<br/>
                Status: ${props?.operationalStatus}
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
  }, []); // Run once on mount

  // Update H3 source data when filtered
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource('h3-source') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(h3GeoJson);
    }
  }, [h3GeoJson, mapLoaded]);

  // Update ATM source data when atmLocations change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource('atm-source') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(atmGeoJson);
    }
    const routeSource = mapRef.current.getSource('cyber-routes-source') as maplibregl.GeoJSONSource | undefined;
    if (routeSource) {
      routeSource.setData(cyberRoutesGeoJson);
    }
  }, [atmGeoJson, cyberRoutesGeoJson, mapLoaded]);

  // Update Hotspot source data when historicalHotspots change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource('hotspot-source') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(hotspotGeoJson);
    }
  }, [hotspotGeoJson, mapLoaded]);

  // Layer Visibility Toggles
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // H3 Hexagons
    if (map.getLayer('h3-hexagons-extrusion')) {
      map.setLayoutProperty('h3-hexagons-extrusion', 'visibility', showH3 ? 'visible' : 'none');
    }
    if (map.getLayer('h3-hexagons-outline')) {
      map.setLayoutProperty('h3-hexagons-outline', 'visibility', showH3 ? 'visible' : 'none');
    }
    if (map.getLayer('cyber-routes-glow')) {
      map.setLayoutProperty('cyber-routes-glow', 'visibility', showH3 ? 'visible' : 'none');
      map.setLayoutProperty('cyber-routes-core', 'visibility', showH3 ? 'visible' : 'none');
    }

    // ATM Markers
    if (map.getLayer('atm-markers-layer')) {
      map.setLayoutProperty('atm-markers-layer', 'visibility', showAtms ? 'visible' : 'none');
      map.setLayoutProperty('atm-halo-layer', 'visibility', showAtms ? 'visible' : 'none');
      map.setLayoutProperty('atm-labels-layer', 'visibility', showAtms ? 'visible' : 'none');
    }

    // Hotspot Heatmap
    if (map.getLayer('historical-hotspots-heatmap')) {
      map.setLayoutProperty(
        'historical-hotspots-heatmap',
        'visibility',
        showHeatmap ? 'visible' : 'none'
      );
    }
  }, [showH3, showAtms, showHeatmap, mapLoaded]);

  return (
    <div className="nexus-map-wrapper">
      {/* Mapbox GL Map Canvas */}
      <div className="nexus-deckgl-container">
        <div ref={mapContainerRef} className="nexus-mapbox-container" />
        {/* Map Grid / Cybernetic overlay background styling */}
        <div className="map-grid-overlay" />
      </div>

      {/* Floating Control Panel */}
      <div className="map-floating-panel">
        <div className="map-panel-header">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-cyan-600" />
            <span className="font-mono font-bold text-sm text-slate-800">
              GEOSPATIAL INTELLIGENCE 3D
            </span>
          </div>
          <span className="nexus-badge-tech">{h3Data.length} ACTIVE CELLS</span>
        </div>

        {/* Layer Visibility Toggles */}
        <div className="map-control-section">
          <div className="text-[11px] font-mono text-slate-500 mb-2 uppercase">
            Layer Controls
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => setShowH3(!showH3)}
              className={`layer-toggle-btn ${showH3 ? 'active' : ''}`}
            >
              <div className="flex items-center gap-2">
                {showH3 ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>Predicted H3 Extrusions</span>
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
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`layer-toggle-btn ${showHeatmap ? 'active' : ''}`}
            >
              <div className="flex items-center gap-2">
                {showHeatmap ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>Historical Hotspot Density</span>
              </div>
              <span className="layer-color-indicator heat-indicator" />
            </button>
          </div>
        </div>

        {/* Filter Controls: Risk Threshold & Time Window */}
        <div className="map-control-section">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1.5 uppercase">
            <span>Risk Threshold:</span>
            <span className="text-amber-600 font-bold">
              {(riskThreshold * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.95"
            step="0.05"
            value={riskThreshold}
            onChange={(e) => setRiskThreshold(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
          />

          <div className="mt-3">
            <div className="text-[11px] font-mono text-slate-500 mb-1.5 uppercase">
              Time Range Window
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(['all', '6h', '12h', '24h'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeFilter(range)}
                  className={`nexus-pill-button text-xs ${
                    timeFilter === range ? 'active' : ''
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Pan Presets */}
        <div className="map-control-section">
          <div className="text-[11px] font-mono text-slate-500 mb-1.5 uppercase">
            Quick Pan Nodes
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => programmaticPanZoom('ATM-DEL-042')}
              className="nexus-pill-button text-xs text-left truncate"
            >
              <Crosshair size={12} className="inline mr-1 text-red-500" />
              CP OTC Nexus
            </button>
            <button
              onClick={() => programmaticPanZoom('ATM-DEL-019')}
              className="nexus-pill-button text-xs text-left truncate"
            >
              <Crosshair size={12} className="inline mr-1 text-amber-500" />
              Barakhamba
            </button>
            <button
              onClick={() => programmaticPanZoom('ATM-NOI-007')}
              className="nexus-pill-button text-xs text-left truncate"
            >
              <Crosshair size={12} className="inline mr-1 text-cyan-600" />
              Noida Crypto Ramp
            </button>
            <button
              onClick={() => programmaticPanZoom('ATM-GUR-088')}
              className="nexus-pill-button text-xs text-left truncate"
            >
              <Crosshair size={12} className="inline mr-1 text-emerald-600" />
              Cyber City Hub
            </button>
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
                  ? 'SELECTED H3 HEXAGON CELL'
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
                  <span className="text-slate-500">H3 Index:</span>
                  <span className="text-cyan-700 font-bold">
                    {(selectedMapItem.data as any).cell}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Probability:</span>
                  <span className="text-orange-600 font-bold">
                    {((selectedMapItem.data as any).probability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Associated Account:</span>
                  <span className="text-slate-700 font-semibold">
                    {(selectedMapItem.data as any).accountId || 'ACC-89214'}
                  </span>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() =>
                      navigate(
                        `/prediction/${(selectedMapItem.data as any).accountId || 'ACC-89214'}`
                      )
                    }
                    className="w-full nexus-pill-button justify-center text-xs py-1.5"
                  >
                    View Account Prediction Dossier <ExternalLink size={12} />
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
                  <span className="text-slate-500">Location:</span>
                  <span className="text-slate-700 text-[11px] text-right max-w-[180px]">
                    {(selectedMapItem.data as any).address}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-amber-600 font-bold uppercase">
                    {(selectedMapItem.data as any).operationalStatus}
                  </span>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => navigate('/alerts')}
                    className="w-full nexus-pill-button justify-center text-xs py-1.5"
                  >
                    Check Linked Alerts Queue <ChevronRight size={12} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
