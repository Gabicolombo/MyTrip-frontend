'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Users, UserPlus, X } from 'lucide-react';
import ConfirmModal from '@/components/common/confirmModal';
import { TRIP_API_URL } from '@/lib/trip';
import { getCurrentUserId } from '@/lib/auth';

interface ParticipantsProps {
  tripId: number;
  participants: Participant[];
  onRemoved: () => void;
}

interface Participant {
  userId: number;
  user: { name: string };
  role: string;
}

const roleLabels: Record<string, string> = {
  OWNER: 'Owner',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
};

export default function Participants({ tripId, participants, onRemoved }: ParticipantsProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER');
  const [sending, setSending] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Participant | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [currentUserId] = useState(getCurrentUserId);
  const myRole = participants.find(participant => participant.userId === currentUserId)?.role;
  const isOwner = myRole === 'OWNER';
  const canInvite = myRole === 'OWNER' || myRole === 'EDITOR';

  async function handleRemove(participant: Participant) {
    setRemoving(null);
    if (removingId !== null) return;
    setError(null);
    setSuccess(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please sign in to remove participants.');
      return;
    }
    setRemovingId(participant.userId);
    try {
      const response = await fetch(`${TRIP_API_URL}/trips/delete-participant/${tripId}/${participant.userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(response.status === 401
          ? 'You do not have permission to remove participants.'
          : 'Unable to remove the participant. Please try again.');
      }
      setSuccess(`${participant.user.name} was removed from the trip.`);
      onRemoved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove the participant. Please try again.');
    } finally {
      setRemovingId(null);
    }
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError(null);
    setSuccess(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please sign in to invite participants.');
      return;
    }
    submitting.current = true;
    setSending(true);
    try {
      const response = await fetch(`${TRIP_API_URL}/trips/${tripId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
        throw new Error(typeof message === 'string' ? message : 'Unable to send the invitation. Please try again.');
      }
      setSuccess(`Invitation sent to ${email.trim()} as ${roleLabels[role]}.`);
      setEmail('');
      setRole('VIEWER');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send the invitation. Please try again.');
    } finally {
      submitting.current = false;
      setSending(false);
    }
  }

  return (
    <section className="min-w-0 rounded-2xl bg-white shadow-sm" aria-labelledby="participants-heading">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
        <Users size={18} className="text-purple-500" aria-hidden="true" />
        <h3 id="participants-heading" className="font-semibold text-gray-800">Participants</h3>
        <span className="ml-auto rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-600">{participants.length}</span>
      </div>
      <div className="space-y-4 px-5 py-4">
        {participants.length === 0 ? (
          <p className="text-sm text-gray-500">No participants yet.</p>
        ) : (
          <ul className="space-y-3">
            {participants.map(participant => (
              <li key={participant.userId} className="flex items-center gap-2">
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-purple-50 text-sm font-semibold text-purple-600">
                  {participant.user.name.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <span className="min-w-0 flex-1 break-words text-sm text-gray-700">{participant.user.name}</span>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
                  {roleLabels[participant.role] ?? participant.role}
                </span>
                {isOwner && participant.role !== 'OWNER' && (
                  <button type="button" disabled={removingId !== null} aria-label={`Remove ${participant.user.name}`}
                    onClick={() => setRemoving(participant)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <button type="button" disabled={sending || !canInvite} aria-expanded={open} aria-controls="invite-participant-form"
          title={canInvite ? undefined : "Viewers can't invite participants"}
          onClick={() => { setOpen(!open); setError(null); setSuccess(null); }}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-purple-200 px-3 py-2 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent">
          <UserPlus size={16} aria-hidden="true" />
          {open ? 'Cancel invitation' : 'Invite by email'}
        </button>
        {open && (
          <form id="invite-participant-form" onSubmit={handleInvite} className="space-y-3 border-t border-gray-100 pt-4">
            <div>
              <label htmlFor="participant-email" className="mb-1 block text-xs font-semibold text-gray-600">Email</label>
              <input id="participant-email" type="email" autoComplete="email" required maxLength={254} disabled={sending}
                value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com"
                className="min-h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 disabled:opacity-50" />
            </div>
            <div>
              <label htmlFor="participant-role" className="mb-1 block text-xs font-semibold text-gray-600">Role</label>
              <select id="participant-role" value={role} disabled={sending} aria-describedby="participant-role-description"
                onChange={event => setRole(event.target.value === 'EDITOR' ? 'EDITOR' : 'VIEWER')}
                className="min-h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 disabled:opacity-50">
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
              </select>
              <p id="participant-role-description" className="mt-1 text-xs text-gray-500">
                {role === 'EDITOR' ? 'Can view and edit the trip.' : 'Can view the trip without making changes.'}
              </p>
            </div>
            <button type="submit" disabled={sending || !email.trim()}
              className="min-h-11 w-full rounded-full bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40">
              {sending ? 'Sending...' : 'Send invitation'}
            </button>
          </form>
        )}
        {error && <p role="alert" className="break-words text-sm text-red-600">{error}</p>}
        {success && <p role="status" className="break-words text-sm text-green-700">{success}</p>}
      </div>
      {removing && (
        <ConfirmModal
          title="Remove participant"
          message={`Remove ${removing.user.name} from this trip?`}
          onConfirm={() => handleRemove(removing)}
          onCancel={() => setRemoving(null)}
        />
      )}
    </section>
  );
}
