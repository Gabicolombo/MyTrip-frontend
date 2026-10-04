'use client';

import { useState } from 'react';

interface EditTripModalProps {
  trip: { id: string; title: string; description: string; imageUrl: string };
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTripModal({ trip, onClose, onSuccess }: EditTripModalProps) {
  const [title, setTitle] = useState(trip.title);
  const [description, setDescription] = useState(trip.description ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (!title.trim()) {
      setError('Please enter a trip title.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append('title', title.trim());
      body.append('description', description);
      if (file) body.append('file', file);

      const response = await fetch(`http://localhost:4000/trips/update-trip/${trip.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.message;
        throw new Error(Array.isArray(message) ? message.join(', ') : message || 'Failed to update trip');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-labelledby="edit-trip-title" className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border bg-white p-4 sm:p-6">
        <h2 id="edit-trip-title" className="text-2xl font-bold text-gray-600">Edit trip</h2>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <fieldset disabled={loading} className="flex flex-col gap-4 py-5 disabled:opacity-60">
          <label className="text-sm font-semibold text-gray-500">
            Trip title
            <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
          </label>
          <label className="text-sm font-semibold text-gray-500">
            Description
            <textarea className={`${inputClass} h-24 resize-none`} value={description} onChange={e => setDescription(e.target.value)} />
          </label>
          {trip.imageUrl && (
            // Trip photos are served by the API and can use arbitrary image hosts.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={trip.imageUrl} alt="Current trip photo" className="h-40 w-full rounded-xl object-cover" />
          )}
          <label className="text-sm font-semibold text-gray-500">
            Trip photo
            <input type="file" accept="image/*" className={`${inputClass} mt-1`} onChange={e => setFile(e.target.files?.[0] ?? null)} />
            <span className="mt-1 block text-xs font-normal">Choose an image to replace the current photo.</span>
          </label>
        </fieldset>

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button type="button" disabled={loading} onClick={onClose} className="rounded-xl border px-3 py-2 font-semibold text-gray-500 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={loading} className="rounded-xl bg-purple-500 px-3 py-2 text-white hover:bg-purple-700 disabled:opacity-50">{loading ? 'Saving...' : 'Save changes'}</button>
        </div>
      </form>
    </div>
  );
}
