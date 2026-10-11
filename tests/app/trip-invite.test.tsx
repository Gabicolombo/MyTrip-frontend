import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import TripInvitePage from '@/app/trip-invite/page';
import { json, mockFetch, requestBody, setUrl, signIn } from '../helpers';

const token = 'a'.repeat(64);
const acceptPath = `/trip-invite?token=${token}&accept=1`;
const accept = () => userEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));

function open({ signedIn = true, auto = false } = {}) {
  const session = signedIn ? signIn() : null;
  setUrl(auto ? acceptPath : `/trip-invite?token=${token}`);
  render(<TripInvitePage />);
  return session;
}

describe('trip invite page', () => {
  it('accepts the invitation for a signed-in user and links to the trip', async () => {
    const fetchMock = mockFetch(() => json({ tripId: 7, role: 'EDITOR' }));
    const session = open();
    expect(fetchMock).not.toHaveBeenCalled();
    await accept();

    expect(await screen.findByRole('heading', { name: 'Invitation accepted!' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open trip' })).toHaveAttribute('href', '/trip/7');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/trips/invites/accept');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${session}` });
    expect(requestBody(fetchMock)).toEqual({ token });
  });

  it('asks a signed-out visitor to sign in and come back to accept', () => {
    const fetchMock = mockFetch(() => json({}));
    open({ signedIn: false });
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' }))
      .toHaveAttribute('href', `/auth/login?next=${encodeURIComponent(acceptPath)}`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('remembers the invitation when the visitor leaves to create an account', async () => {
    open({ signedIn: false });
    const link = screen.getByRole('link', { name: 'Create an account' });
    expect(link).toHaveAttribute('href', '/auth/register');
    link.addEventListener('click', event => event.preventDefault());
    await userEvent.click(link);
    expect(localStorage.getItem('pendingInvite')).toBe(acceptPath);
  });

  it('accepts by itself when the user returns from signing in', async () => {
    const fetchMock = mockFetch(() => json({ tripId: 7, role: 'VIEWER' }));
    open({ auto: true });
    expect(await screen.findByRole('heading', { name: 'Invitation accepted!' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not accept automatically without a session', () => {
    const fetchMock = mockFetch(() => json({}));
    open({ signedIn: false, auto: true });
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed token without calling the API', () => {
    const fetchMock = mockFetch(() => json({}));
    signIn();
    setUrl('/trip-invite?token=not-a-token');
    render(<TripInvitePage />);
    expect(screen.getByText(/This invitation is invalid or has expired/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'Invite not found'],
    [400, 'token must match'],
    [401, 'Invite has expired'],
  ])('shows the invitation as invalid on %i %s', async (status, message) => {
    mockFetch(() => json({ message }, status));
    open();
    await accept();
    expect(await screen.findByText(/This invitation is invalid or has expired/)).toBeInTheDocument();
  });

  it.each([
    [409, 'User is already a participant in this trip', 'You are already a participant in this trip.'],
    [409, 'Invite is no longer pending', 'This invitation has already been used.'],
    [401, 'Invite email does not match the current user', 'This invitation was sent to a different email address.'],
    [401, 'A verified account is required to accept an invite', 'Verify your email address before accepting this invitation.'],
  ])('explains the %i "%s" refusal', async (status, message, shown) => {
    mockFetch(() => json({ message }, status));
    open();
    await accept();
    expect(await screen.findByRole('alert')).toHaveTextContent(shown);
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in with another account' })).toBeInTheDocument();
  });

  it('asks to sign in again when the session is rejected', async () => {
    mockFetch(() => json({ message: 'Unauthorized' }, 401));
    open();
    await accept();
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText(/Sign in with the email address that received this invitation/)).toBeInTheDocument();
  });

  it('lets the user retry after a server or network error', async () => {
    mockFetch(() => json({}, 500));
    open();
    await accept();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to accept the invitation. Please try again.');

    const fetchMock = mockFetch(() => { throw new TypeError('Failed to fetch'); });
    await accept();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect to the server. Please try again.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Accept invitation' })).toBeEnabled();
  });
});
