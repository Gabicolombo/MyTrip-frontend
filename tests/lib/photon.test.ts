import { describe, expect, it } from 'vitest';
import { searchPlaces } from '@/lib/photon';
import { json, mockFetch } from '../helpers';

const place = (name: string, lon: number, lat: number, id = 1) => ({
  geometry: { type: 'Point', coordinates: [lon, lat] },
  properties: { osm_type: 'N', osm_id: id, name },
});
const signal = () => new AbortController().signal;

describe('searchPlaces', () => {
  it('biases the search around the destination city and caches its center', async () => {
    const fetchMock = mockFetch(url => json({
      features: url.includes('layer=city') ? [place('Lisbon', -9.14, 38.72)] : [place('Belem Tower', -9.21, 38.69, 2)],
    }));

    const results = await searchPlaces('Belem', 'Lisbon', 'Portugal', signal());
    expect(results.map(result => result.properties.name)).toEqual(['Belem Tower']);
    const search = new URL(String(fetchMock.mock.calls[1][0]));
    expect(search.searchParams.get('q')).toBe('Belem');
    expect(search.searchParams.get('lon')).toBe('-9.14');
    expect(search.searchParams.get('lat')).toBe('38.72');

    await searchPlaces('Castle', 'Lisbon', 'Portugal', signal());
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('still searches when the city lookup fails', async () => {
    const fetchMock = mockFetch(url => url.includes('layer=city') ? json({}, 500) : json({ features: [place('Louvre', 2.33, 48.86)] }));
    const results = await searchPlaces('Louvre', 'Paris', 'France', signal());
    expect(results).toHaveLength(1);
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.has('lon')).toBe(false);
  });

  it('drops duplicates, unnamed places and invalid coordinates', async () => {
    mockFetch(url => json({
      features: url.includes('layer=city') ? [] : [
        place('Prado', -3.69, 40.41),
        place('Prado', -3.69, 40.41),
        place('', -3.7, 40.4, 2),
        place('Nowhere', 999, 40.4, 3),
      ],
    }));
    const results = await searchPlaces('Prado', 'Madrid', 'Spain', signal());
    expect(results.map(result => result.properties.name)).toEqual(['Prado']);
  });

  it('reports an unavailable or malformed search', async () => {
    mockFetch(url => url.includes('layer=city') ? json({ features: [] }) : json({}, 503));
    await expect(searchPlaces('x', 'Rome', 'Italy', signal())).rejects.toThrow('Place search is unavailable. Please try again.');
    mockFetch(url => url.includes('layer=city') ? json({ features: [] }) : json({ nope: true }));
    await expect(searchPlaces('x', 'Rome', 'Italy', signal())).rejects.toThrow('Invalid place search response.');
  });
});
