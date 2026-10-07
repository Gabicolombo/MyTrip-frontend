export interface PhotonPlace {
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

const endpoint = process.env.NEXT_PUBLIC_PHOTON_URL || 'https://photon.komoot.io/api/';
const cityCenters = new Map<string, [number, number]>();

async function queryPhoton(params: URLSearchParams, signal: AbortSignal): Promise<PhotonPlace[]> {
  const response = await fetch(`${endpoint}?${params}`, { signal });
  if (!response.ok) throw new Error('Place search is unavailable. Please try again.');
  const data = await response.json();
  if (!Array.isArray(data.features)) throw new Error('Invalid place search response.');
  const seen = new Set<string>();
  return data.features.filter((place: PhotonPlace) => {
    const coordinates = place.geometry?.coordinates;
    return place.geometry?.type === 'Point' && Array.isArray(coordinates)
      && Number.isFinite(coordinates[0]) && Number.isFinite(coordinates[1])
      && Math.abs(coordinates[0]) <= 180 && Math.abs(coordinates[1]) <= 90
      && Boolean(place.properties?.name || place.properties?.street);
  }).filter((place: PhotonPlace) => {
    const key = `${place.properties.osm_type}-${place.properties.osm_id}-${place.geometry.coordinates.join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchPlaces(text: string, city: string, country: string, signal: AbortSignal) {
  const destination = `${city}, ${country}`;
  let center = cityCenters.get(destination);
  if (!center) {
    try {
      const cities = await queryPhoton(new URLSearchParams({ q: destination, limit: '1', layer: 'city' }), signal);
      center = cities[0]?.geometry.coordinates;
      if (center) {
        if (cityCenters.size >= 100) cityCenters.clear();
        cityCenters.set(destination, center);
      }
    } catch (error) {
      if (signal.aborted) throw error;
      // A failed city lookup should not prevent searching for the place itself.
    }
  }
  const params = new URLSearchParams({ q: text, limit: '5' });
  if (center) {
    params.set('lon', String(center[0]));
    params.set('lat', String(center[1]));
  }
  return queryPhoton(params, signal);
}
