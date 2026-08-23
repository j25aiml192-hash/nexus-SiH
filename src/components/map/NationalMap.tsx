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
            background: '#0A0F2C',
            color: '#8A9BB5',
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
  center = [20.5937, 78.9629],
  zoom = 5,
}: {
  predictions: any[];
  onPinClick: (p: any) => void;
  center?: [number, number];
  zoom?: number;
}) {
  return (
    <MapErrorBoundary>
      <div className="h-full min-h-[420px] overflow-hidden rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        <MapContainer center={center} zoom={zoom} zoomControl={false} className="h-full w-full">
          <MapCenter center={center} zoom={zoom} />
          <TileLayer
            attribution='&copy; CARTO'
            url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
          />
          {predictions
            .filter(
              (p) =>
                p &&
                p.predicted_lat != null &&
                p.predicted_lng != null &&
                !isNaN(Number(p.predicted_lat)) &&
                !isNaN(Number(p.predicted_lng)) &&
                Number(p.predicted_lat) !== 0 &&
                Number(p.predicted_lng) !== 0
            )
            .map((prediction) => (
              <span key={prediction.id}>
                <PredictionPin prediction={prediction} onClick={() => onPinClick(prediction)} />
                <Circle
                  center={[Number(prediction.predicted_lat), Number(prediction.predicted_lng)]}
                  radius={(prediction.predicted_radius_km || 10) * 1000}
                  pathOptions={{
                    color: ALERT_COLORS[prediction.alert_level] || '#16A34A',
                    fill: false,
                    weight: 1.5,
                    dashArray: '4, 4',
                    opacity: 0.3,
                  }}
                />
              </span>
            ))}
        </MapContainer>
      </div>
    </MapErrorBoundary>
  );
}
