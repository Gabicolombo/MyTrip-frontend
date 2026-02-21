'use client';

import { useState } from 'react';

interface Destination {
  city: string;
  country: string;
  startDate: string;
  endDate: string;
}

interface AddDestinationsModalProps {
  tripId: string;
  onClose: () => void;
  onSuccess: () => void; // atualiza a lista na home
}

export default function AddDestinationsModal({ tripId, onClose, onSuccess }: AddDestinationsModalProps) {
  const [destinations, setDestinations] = useState<Destination[]>([
    { city: '', country: '', startDate: '', endDate: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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

      const res = await fetch('http://localhost:4000/trips/add-destination', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add destinations');
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 w-110 max-h-[90vh] overflow-y-auto">
        <label className="uppercase text-gray-400 font-semibold text-sm">Add destinations 📍</label>
        <h2 className="text-2xl font-bold text-gray-500 mb-1">Where are your stops?</h2>

        {error && (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p>
        )}

        <div className="flex flex-col gap-3 py-5">
          {destinations.map((dest, index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-purple-500 uppercase">
                  Destination {index + 1}
                </span>
                {destinations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDestination(index)}
                    className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-400 hover:text-red-600">
                    ✕ Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
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
                  <input
                    type="text"
                    value={dest.country}
                    onChange={(e) => updateDestination(index, 'country', e.target.value.toUpperCase())}
                    placeholder="e.g. IT"
                    maxLength={2}
                    required
                    className="w-full rounded-lg border text-sm text-gray-400 border-gray-200 bg-white px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    onChange={(e) => updateDestination(index, 'endDate', e.target.value)}
                    required
                    className="w-full text-sm text-gray-400 rounded-lg border border-gray-200 bg-white px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addDestination}
            className="w-full rounded-xl border border-dashed border-purple-300 py-2 text-sm font-semibold text-purple-500 hover:bg-purple-50">
            + Add destination
          </button>
        </div>

        <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
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