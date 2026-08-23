import { Circle, MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import PredictionPin from './PredictionPin';
import { ALERT_COLORS } from '@/lib/constants';

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
    <div className="h-full min-h-[420px] overflow-hidden rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
      <MapContainer center={center} zoom={zoom} zoomControl={false} className="h-full w-full">
        <MapCenter center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; CARTO'
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
        />
        {predictions.map((prediction) => (
          <span key={prediction.id}>
            <PredictionPin prediction={prediction} onClick={() => onPinClick(prediction)} />
            <Circle
              center={[prediction.predicted_lat, prediction.predicted_lng]}
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
  );
}
