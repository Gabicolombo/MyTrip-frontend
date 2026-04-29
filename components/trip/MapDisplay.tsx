import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import { Itinerary } from './ItineraryPanel';

const customIcon = L.divIcon({
  className: '',
  html: `<div style="
    background:#7c3aed;
    width:32px;
    height:32px;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    border:2px solid white;
    box-shadow:0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});


function MapUpdater({ places, selectedPlaceId }: { places: Itinerary[]; selectedPlaceId?: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (places.length === 0) return;
    if (selectedPlaceId) {
      const selected = places.find(p => p.id === selectedPlaceId);
      if (selected) {
        map.setView([selected.latitude, selected.longitude], 15, { animate: true });
        return;
      }
    }
    const bounds = places.map((p: Itinerary) => [p.latitude, p.longitude] as [number, number]);
    map.fitBounds(bounds, { padding: [40, 40], animate: true });
  }, [places, selectedPlaceId]);

  return null;
}

export default function MapDisplay({ places, selectedPlaceId }: { places: Itinerary[]; selectedPlaceId?: string | null }) {
  const points = places.map( p => ({
    lat: p.latitude,
    lng: p.longitude,
    name: p.name,
  }))

  const defaultCenter: [number, number] = [51.505, -0.09];
  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <MapUpdater places={places} selectedPlaceId={selectedPlaceId} />
      {points.map((p, idx) => (
        <Marker key={idx} position={[p.lat, p.lng]} icon={customIcon}>
          <Popup>{p.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}