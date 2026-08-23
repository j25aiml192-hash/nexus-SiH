import React, { useEffect } from 'react';
import { Circle, MapContainer, TileLayer, useMap } from 'react-leaflet';
import PredictionPin from './PredictionPin';
import { ALERT_COLORS } from '@/lib/constants';

class MapErrorBoundary extends React.Component<
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
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F8FAFC',
            color: '#64748B',
            fontSize: '14px',
          }}
        >
          Map loading... refresh if this persists.
        </div>
      );
    }
    return this.props.children;
  }
}

function MapCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function NationalMap({
  predictions,
  onPinClick,
  center = [23.5937, 80.9629],
  zoom = 5,
}: {
  predictions: any[];
  onPinClick: (p: any) => void;
  center?: [number, number];
  zoom?: number;
}) {
  return (
    <MapErrorBoundary>
      <div className="relative z-0 h-full min-h-[420px] overflow-hidden rounded-2xl border border-[#E2E8F0] shadow-xs">
        <MapContainer
          center={center}
          zoom={zoom}
          zoomControl={false}
          className="h-full w-full bg-[#F1F5F9]"
        >
          <MapCenter center={center} zoom={zoom} />
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
          />
          {/* Render EVERY prediction with valid coordinates as its own distinct PredictionPin */}
          {predictions
            .filter(
              (p) =>
                p != null &&
                p.predicted_lat != null &&
                p.predicted_lng != null &&
                !isNaN(Number(p.predicted_lat)) &&
                !isNaN(Number(p.predicted_lng)) &&
                Number(p.predicted_lat) !== 0 &&
                Number(p.predicted_lng) !== 0
            )
            .map((prediction, idx) => {
              const lat = Number(prediction.predicted_lat);
              const lng = Number(prediction.predicted_lng);
              const radiusKm = Number(prediction.predicted_radius_km || 8);
              const alertColor = ALERT_COLORS[prediction.alert_level] || '#16A34A';

              return (
                <React.Fragment key={prediction.id || `pred-${idx}-${lat}-${lng}`}>
                  <PredictionPin
                    prediction={{
                      predicted_lat: lat,
                      predicted_lng: lng,
                      alert_level: prediction.alert_level || 'AMBER',
                    }}
                    onClick={() => onPinClick(prediction)}
                  />
                  <Circle
                    center={[lat, lng]}
                    radius={radiusKm * 1000}
                    pathOptions={{
                      color: alertColor,
                      fill: false,
                      weight: 1.5,
                      dashArray: '4, 4',
                      opacity: 0.35,
                    }}
                  />
                </React.Fragment>
              );
            })}
        </MapContainer>
      </div>
    </MapErrorBoundary>
  );
}
