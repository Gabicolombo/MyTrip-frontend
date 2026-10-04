'use client';

import { useState, useEffect } from 'react';
import countriesData from 'world-countries';

interface Destination {
  city: string;
  country: string;
  startDate: string;
  endDate: string;
}

interface AddDestinationsModalProps {
  tripId: string;
  destination?: Destination & { id: string };
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddDestinationsModal({ tripId, destination, onClose, onSuccess }: AddDestinationsModalProps) {
  const [destinations, setDestinations] = useState<Destination[]>(destination ? [{
    city: destination.city,
    country: destination.country,
    startDate: destination.startDate.slice(0, 10),
    endDate: destination.endDate.slice(0, 10),
  }] : [
    { city: '', country: '', startDate: '', endDate: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  useEffect(() => {
      async function fetchCountries() {
        try {
          const countryNames = countriesData
            .map((c) => c.name.common)
            .sort();
          setCountries(countryNames);
        } catch (err) {
          console.error('Failed to fetch countries', err);
        } finally {
          setLoadingCountries(false);
        }
      }
      fetchCountries();
    }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const body = destinations.map((dest, index) => ({
        tripId,
        city: dest.city,
        country: dest.country,
        startDate: dest.startDate,
        endDate: dest.endDate,
        orderIndex: index + 1,
      }));

      const res = await fetch(destination
        ? `http://localhost:4000/trips/update-destination/${destination.id}`
        : 'http://localhost:4000/trips/add-destination', {
        method: destination ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(destination ? destinations[0] : body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to save destinations');
      }

      onSuccess(); // atualiza cards na home
      onClose();

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  function addDestination() {
    setDestinations([...destinations, { city: '', country: '', startDate: '', endDate: '' }]);
  }

  function removeDestination(index: number) {
    setDestinations(destinations.filter((_, i) => i !== index));
  }

  function updateDestination(index: number, field: keyof Destination, value: string) {
    setDestinations(destinations.map((dest, i) =>
      i === index ? { ...dest, [field]: value } : dest
    ));
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-4 sm:p-6 w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain break-words">
        <label className="uppercase text-gray-400 font-semibold text-sm">{destination ? 'Edit destination' : 'Add destinations'} 📍</label>
        <h2 className="text-2xl font-bold text-gray-500 mb-1">{destination ? 'Edit destination' : 'Where are your stops?'}</h2>

        {error && (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p>
        )}

        <fieldset disabled={loading} className="flex flex-col gap-3 py-5">
          {destinations.map((dest, index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-purple-500 uppercase">
                  Destination {index + 1}
                </span>
                {!destination && destinations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDestination(index)}
                    className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-400 hover:text-red-600">
                    ✕ Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">City</label>
                  <input
                    type="text"
                    value={dest.city}
                    onChange={(e) => updateDestination(index, 'city', e.target.value)}
                    placeholder="e.g. Rome"
                    required
                    className="w-full rounded-lg border text-sm text-gray-400 border-gray-200 bg-white px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Country</label>
                  <select
                    value={dest.country}
                    onChange={(e) => updateDestination(index, 'country', e.target.value)}
                    required
                    disabled={loadingCountries}
                    className="w-full rounded-lg border text-sm text-gray-500 border-gray-200 bg-white px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">
                      {loadingCountries ? 'Loading...' : 'Select country...'}
                    </option>
                    {dest.country && !countries.includes(dest.country) && (
                      <option value={dest.country}>{dest.country}</option>
                    )}
                    {countries.map(c => (
                      <option key={c} value={c}>{c}</option> 
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Start Date</label>
                  <input
                    type="date"
                    value={dest.startDate}
                    onChange={(e) => updateDestination(index, 'startDate', e.target.value)}
                    required
                    className="w-full text-sm text-gray-400 rounded-lg border border-gray-200 bg-white px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">End Date</label>
                  <input
                    type="date"
                    value={dest.endDate}
                    min={dest.startDate}
                    onChange={(e) => updateDestination(index, 'endDate', e.target.value)}
                    required
                    className="w-full text-sm text-gray-400 rounded-lg border border-gray-200 bg-white px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}

          {!destination && <button
            type="button"
            onClick={addDestination}
            className="w-full rounded-xl border border-dashed border-purple-300 py-2 text-sm font-semibold text-purple-500 hover:bg-purple-50">
            + Add destination
          </button>}
        </fieldset>

        <div className="flex flex-wrap justify-between items-center gap-3 pt-4 mt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl border bg-white px-3 py-2 font-semibold text-gray-500 hover:border-purple-400">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-purple-500 px-3 py-2 text-white hover:bg-purple-700 disabled:opacity-50">
            {loading ? 'Saving…' : 'Save destinations 📍'}
          </button>
        </div>
      </form>
    </div>
  );
}
