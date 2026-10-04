import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import { Itinerary } from './ItineraryPanel';

const categoryIcons: Record<string, string> = {
  Museum: '🏛️',
  Restaurant: '🍽️',
  Beach: '🏖️',
  Hiking: '🌿',
  Culture: '⛩️',
  Park: '🏞️',
  House: '🏖️',
  Tour: '🎟️',
  Other: '📌',
};

const customIcon = (activity: string) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #cfbfebf3;
      border: 2px solid white;
      border-radius: 50%;
      font-size: 20px;
      box-shadow: 0 2px 6px #0005;
    ">${categoryIcons[activity] ?? '📌'}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
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
  }, [map, places, selectedPlaceId]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export default function MapDisplay({ places, selectedPlaceId }: { places: Itinerary[]; selectedPlaceId?: string | null }) {
  const points = places.map( p => ({
    lat: p.latitude,
    lng: p.longitude,
    name: p.name,
    icon: p.activity
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
        <Marker key={idx} position={[p.lat, p.lng]} icon={customIcon(p.icon)}>
          <Popup>{p.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}