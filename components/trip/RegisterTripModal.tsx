'use client';

import { useState } from 'react';

interface RegisterTripModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function RegisterTripModal({ onClose, onSuccess }: RegisterTripModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      if (file) formData.append('file', file);

      const res = await fetch('http://localhost:4000/trips/create-trip', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create trip');
      }

      onSuccess();
      onClose();

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 w-110">
        <label className="uppercase text-gray-400 font-semibold text-sm">Create new trip ✈️</label>
        <h2 className="text-2xl font-bold text-gray-500 mb-1">Where are you going?</h2>

        {error && (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p>
        )}

        <div className="flex flex-col gap-3 py-5">
          <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Trip Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summer in Italy"
            required
            className="w-full rounded-lg border text-sm text-gray-400 border-gray-200 bg-gray-50 px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:outline-none"
          />

          <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A quick note about this trip…"
            className="rounded-lg border border-gray-200 px-3 py-2 bg-gray-50 text-sm text-gray-400 w-full focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none h-20"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full text-sm text-gray-400 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full text-sm text-gray-400 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Image</label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm text-gray-400 hover:border-purple-400 hover:text-purple-500">
          🖼️ <span>{file ? file.name : 'Choose an image…'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>

        <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
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
            {loading ? 'Creating…' : 'Create trip ✈️'}
          </button>
        </div>
      </form>
    </div>
  );
}