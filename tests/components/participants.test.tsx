import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Participants from '@/components/trip/sidebar/Participants';
import { json, mockFetch, requestBody, signIn } from '../helpers';

const participants = [
  { userId: 1, user: { name: 'Gabi' }, role: 'OWNER' },
  { userId: 2, user: { name: 'Ana' }, role: 'EDITOR' },
  { userId: 3, user: { name: 'Leo' }, role: 'VIEWER' },
];

function open(currentUserId: number | null, list = participants) {
  const session = currentUserId === null ? null : signIn(currentUserId);
  const onChanged = vi.fn();
  render(<Participants tripId={7} participants={list} onChanged={onChanged} />);
  return { session, onChanged };
}

async function changeRole(name: string, role: 'Editor' | 'Viewer') {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: `Change role of ${name}` }));
  await user.click(await screen.findByRole('menuitemradio', { name: role }));
}

async function invite(email: string, role?: 'Editor') {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Invite by email' }));
  await user.type(screen.getByLabelText('Email'), email);
  if (role) await user.selectOptions(screen.getByLabelText('Role'), role);
  await user.click(screen.getByRole('button', { name: 'Send invitation' }));
}

describe('Participants', () => {
  it('lists every participant with their role and the total', () => {
    open(1);
    const rows = screen.getAllByRole('listitem');
    expect(rows.map(row => row.textContent)).toEqual([
      expect.stringMatching(/Gabi.*Owner/),
      expect.stringMatching(/Ana.*Editor/),
      expect.stringMatching(/Leo.*Viewer/),
    ]);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows an empty state', () => {
    open(1, []);
    expect(screen.getByText('No participants yet.')).toBeInTheDocument();
  });

  describe('inviting', () => {
    it('sends the invitation with the chosen role', async () => {
      const fetchMock = mockFetch(() => json({ id: 'invite-1' }, 201));
      const { session } = open(2);
      await invite(' leo@example.com ', 'Editor');

      expect(await screen.findByRole('status')).toHaveTextContent('Invitation sent to leo@example.com as Editor.');
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('http://localhost:4000/trips/7/invites');
      expect(init?.method).toBe('POST');
      expect(init?.headers).toMatchObject({ Authorization: `Bearer ${session}` });
      expect(requestBody(fetchMock)).toEqual({ email: 'leo@example.com', role: 'EDITOR' });
      expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    });

    it('invites as viewer by default', async () => {
      const fetchMock = mockFetch(() => json({}, 201));
      open(1);
      await invite('leo@example.com');
      await screen.findByRole('status');
      expect(requestBody(fetchMock).role).toBe('VIEWER');
    });

    it('shows the reason when the API refuses', async () => {
      mockFetch(() => json({ message: 'Invite already exists for this email' }, 409));
      open(1);
      await invite('leo@example.com');
      expect(await screen.findByRole('alert')).toHaveTextContent('Invite already exists for this email');
      expect(screen.getByLabelText('Email')).toHaveValue('leo@example.com');
    });

    it('joins validation errors and falls back to a generic message', async () => {
      mockFetch(() => json({ message: ['email must be an email', 'role is invalid'] }, 400));
      open(1);
      await invite('leo@example.com');
      expect(await screen.findByRole('alert')).toHaveTextContent('email must be an email role is invalid');

      mockFetch(() => new Response('', { status: 500 }));
      await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Unable to send the invitation. Please try again.');
    });

    it.each<[number | null, string]>([[3, 'viewers'], [99, 'users outside the trip'], [null, 'signed-out visitors']])('is disabled for user %s (%s)', id => {
      open(id);
      const button = screen.getByRole('button', { name: 'Invite by email' });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', "Viewers can't invite participants");
    });

    it('is enabled for editors and owners', () => {
      open(2);
      expect(screen.getByRole('button', { name: 'Invite by email' })).toBeEnabled();
    });
  });

  describe('changing roles', () => {
    it('lets only the owner change roles, and never the owner row, next to the remove button', () => {
      open(1);
      expect(screen.getByRole('button', { name: 'Change role of Ana' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Change role of Leo' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Change role of Gabi' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove Leo' })).toBeInTheDocument();
    });

    it('marks the current role in the menu', async () => {
      open(1);
      await userEvent.click(screen.getByRole('button', { name: 'Change role of Ana' }));
      expect(await screen.findByRole('menuitemradio', { name: 'Editor' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('menuitemradio', { name: 'Viewer' })).toHaveAttribute('aria-checked', 'false');
    });

    it.each<[number | null, string]>([[2, 'editor'], [3, 'viewer'], [null, 'signed-out visitor']])('hides role changes from user %s (%s)', id => {
      open(id);
      expect(screen.queryByRole('button', { name: /^Change role of/ })).not.toBeInTheDocument();
    });

    it('updates the role and refreshes the trip', async () => {
      const fetchMock = mockFetch(() => json(true));
      const { session, onChanged } = open(1);
      await changeRole('Leo', 'Editor');

      expect(await screen.findByRole('status')).toHaveTextContent('Leo is now Editor.');
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('http://localhost:4000/trips/update-participant-role/7/3');
      expect(init?.method).toBe('PATCH');
      expect(init?.headers).toMatchObject({ Authorization: `Bearer ${session}` });
      expect(requestBody(fetchMock)).toEqual({ newRole: 'EDITOR' });
      expect(onChanged).toHaveBeenCalledTimes(1);
    });

    it.each([
      [401, 'You do not have permission to change roles.'],
      [500, 'Unable to change the role. Please try again.'],
    ])('explains a %i failure', async (status, message) => {
      mockFetch(() => json({ message: 'nope' }, status));
      const { onChanged } = open(1);
      await changeRole('Ana', 'Viewer');
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(onChanged).not.toHaveBeenCalled();
    });
  });

  describe('removing', () => {
    it('lets only the owner remove, and never the owner row', () => {
      open(1);
      expect(screen.getByRole('button', { name: 'Remove Ana' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove Leo' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove Gabi' })).not.toBeInTheDocument();
    });

    it.each<[number | null, string]>([[2, 'editor'], [3, 'viewer'], [null, 'signed-out visitor']])('hides removal from user %s (%s)', id => {
      open(id);
      expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
    });

    it('removes a participant after confirmation and refreshes the trip', async () => {
      const fetchMock = mockFetch(() => json(true));
      const { session, onChanged } = open(1);
      await userEvent.click(screen.getByRole('button', { name: 'Remove Leo' }));
      expect(screen.getByText('Remove Leo from this trip?')).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(await screen.findByRole('status')).toHaveTextContent('Leo was removed from the trip.');
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('http://localhost:4000/trips/delete-participant/7/3');
      expect(init?.method).toBe('DELETE');
      expect(init?.headers).toMatchObject({ Authorization: `Bearer ${session}` });
      expect(onChanged).toHaveBeenCalledTimes(1);
    });

    it('does nothing when the confirmation is cancelled', async () => {
      const fetchMock = mockFetch(() => json(true));
      const { onChanged } = open(1);
      await userEvent.click(screen.getByRole('button', { name: 'Remove Ana' }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText('Remove Ana from this trip?')).not.toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(onChanged).not.toHaveBeenCalled();
    });

    it.each([
      [401, 'You do not have permission to remove participants.'],
      [500, 'Unable to remove the participant. Please try again.'],
    ])('explains a %i failure and keeps the list', async (status, message) => {
      mockFetch(() => json({ message: 'nope' }, status));
      const { onChanged } = open(1);
      await userEvent.click(screen.getByRole('button', { name: 'Remove Ana' }));
      await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(onChanged).not.toHaveBeenCalled();
      expect(within(screen.getByRole('list')).getByText('Ana')).toBeInTheDocument();
    });
  });
});
