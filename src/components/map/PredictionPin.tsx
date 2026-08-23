import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { ALERT_COLORS } from '@/lib/constants';

const iconFor = (level: string) => {
  const color = ALERT_COLORS[level] || '#16A34A';
  return L.divIcon({
    className: '',
    html: `<div class="prediction-pin-wrapper"><div class="prediction-pin-dot" style="background:${color};"></div></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

export default function PredictionPin({
  prediction,
  onClick,
}: {
  prediction: { predicted_lat: number; predicted_lng: number; alert_level: string };
  onClick: () => void;
}) {
  return (
    <Marker
      position={[prediction.predicted_lat, prediction.predicted_lng]}
      icon={iconFor(prediction.alert_level)}
      eventHandlers={{ click: onClick }}
    />
  );
}
