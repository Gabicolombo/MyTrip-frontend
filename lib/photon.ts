import countriesData from 'world-countries';

export interface PhotonPlace {
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
}

const endpoint = process.env.NEXT_PUBLIC_PHOTON_URL || 'https://photon.komoot.io/api/';
const CITY_RADIUS = 0.25;
const CACHE_LIMIT = 100;
const cityCenters = new Map<string, Promise<[number, number] | null>>();
const results = new Map<string, PhotonPlace[]>();
const countryCodes = new Map(countriesData.map(country => [country.name.common.toLowerCase(), country.cca2]));

function remember<T>(cache: Map<string, T>, key: string, value: T) {
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, value);
}

async function queryPhoton(params: URLSearchParams, signal?: AbortSignal): Promise<PhotonPlace[]> {
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

// Shared between the prefetch and the searches, so the city is only looked up once.
function getCityCenter(city: string, country: string) {
  const destination = `${city}, ${country}`;
  let center = cityCenters.get(destination);
  if (!center) {
    center = queryPhoton(new URLSearchParams({ q: destination, limit: '1', layer: 'city' }))
      .then(cities => cities[0]?.geometry.coordinates ?? null)
      .catch(() => {
        cityCenters.delete(destination);
        return null;
      });
    remember(cityCenters, destination, center);
  }
  return center;
}

export function prefetchCity(city: string, country: string) {
  if (city && country) void getCityCenter(city, country);
}

export async function searchPlaces(text: string, city: string, country: string, signal: AbortSignal) {
  const key = `${text.toLowerCase()}|${city}|${country}`;
  const cached = results.get(key);
  if (cached) return cached;

  const center = await getCityCenter(city, country);
  signal.throwIfAborted();

  const params = new URLSearchParams({ q: text, limit: '10' });
  if (center) {
    const [lon, lat] = center;
    params.set('lon', String(lon));
    params.set('lat', String(lat));
    params.set('bbox', [lon - CITY_RADIUS, lat - CITY_RADIUS, lon + CITY_RADIUS, lat + CITY_RADIUS].join(','));
  }
  const countryCode = countryCodes.get(country.toLowerCase());
  const places = (await queryPhoton(params, signal)).filter(place =>
    !countryCode || !place.properties.countrycode || place.properties.countrycode.toUpperCase() === countryCode
  );
  remember(results, key, places);
  return places;
}
