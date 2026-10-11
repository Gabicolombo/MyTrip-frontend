import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ProfilePage from '@/app/profile/page';
import { json, mockFetch, router, signIn } from '../helpers';

const me = { name: 'Gabi', email: 'gabi@example.com', nationality: 'BR' };
const PROFILE_URL = 'http://localhost:3333/users/me';

function api(overrides: Partial<Record<'GET' | 'PATCH' | 'DELETE', () => Response>> = {}) {
  return mockFetch((_url, init) => (overrides[(init.method ?? 'GET') as 'GET'] ?? (() => json(init.method ? {} : me)))());
}
const calls = (mock: ReturnType<typeof mockFetch>, method: string) => mock.mock.calls.filter(([, init]) => init?.method === method);

describe('profile page', () => {
  it('sends a signed-out visitor to the login page', () => {
    const fetchMock = api();
    render(<ProfilePage />);
    expect(router.replace).toHaveBeenCalledWith('/auth/login');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loads the profile into the form', async () => {
    const session = signIn(1, 'Old name');
    const fetchMock = api();
    render(<ProfilePage />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading profile...');

    expect(await screen.findByLabelText('Name')).toHaveValue('Gabi');
    expect(screen.getByLabelText('Email')).toHaveValue('gabi@example.com');
    expect(screen.getByLabelText('Country of nationality')).toHaveTextContent('Brazil');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(localStorage.getItem('name')).toBe('Gabi');
    expect(fetchMock.mock.calls[0][0]).toBe(PROFILE_URL);
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Authorization: `Bearer ${session}` });
  });

  it('saves the changed details and updates the stored name', async () => {
    signIn();
    const fetchMock = api();
    render(<ProfilePage />);
    const name = await screen.findByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, '  Gabriela ');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Your profile has been updated.')).toBeInTheDocument();
    const [patch] = calls(fetchMock, 'PATCH');
    expect(patch[0]).toBe(PROFILE_URL);
    expect(JSON.parse(String(patch[1]?.body))).toEqual({ name: 'Gabriela', email: 'gabi@example.com', nationality: 'BR' });
    expect(localStorage.getItem('name')).toBe('Gabriela');
    expect(screen.getByLabelText('Name')).toHaveValue('Gabriela');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('sends a new password only when one is typed', async () => {
    signIn();
    const fetchMock = api();
    render(<ProfilePage />);
    await userEvent.type(await screen.findByLabelText(/New password/), 'newpass1');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Your profile has been updated.');
    expect(JSON.parse(String(calls(fetchMock, 'PATCH')[0][1]?.body))).toMatchObject({ password: 'newpass1' });
    expect(screen.getByLabelText(/New password/)).toHaveValue('');
  });

  it('discards unsaved changes', async () => {
    signIn();
    const fetchMock = api();
    render(<ProfilePage />);
    const name = await screen.findByLabelText('Name');
    await userEvent.type(name, ' Colombo');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel changes' }));
    expect(name).toHaveValue('Gabi');
    expect(calls(fetchMock, 'PATCH')).toHaveLength(0);
  });

  it('rejects a blank name without calling the API', async () => {
    signIn();
    const fetchMock = api();
    render(<ProfilePage />);
    const name = await screen.findByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please enter your name.');
    expect(calls(fetchMock, 'PATCH')).toHaveLength(0);
  });

  it('shows why the API refused the update', async () => {
    signIn();
    api({ PATCH: () => json({ message: ['Invalid email format', 'Password too short'] }, 400) });
    render(<ProfilePage />);
    await userEvent.type(await screen.findByLabelText('Name'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email format Password too short');
    expect(screen.queryByText('Your profile has been updated.')).not.toBeInTheDocument();
  });

  it('asks to sign in again when the session expired', async () => {
    signIn();
    api({ GET: () => json({}, 401) });
    render(<ProfilePage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to authenticate your session.');
    expect(screen.getByRole('link', { name: 'Sign in again' })).toHaveAttribute('href', '/auth/login');
  });

  it('retries after the profile fails to load', async () => {
    signIn();
    let healthy = false;
    const fetchMock = mockFetch(() => healthy ? json(me) : json({ message: 'Database unavailable' }, 500));
    render(<ProfilePage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
    healthy = true;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText('Name')).toHaveValue('Gabi');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a malformed profile response', async () => {
    signIn();
    api({ GET: () => json({ name: 'Gabi' }) });
    render(<ProfilePage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to read your profile. Please try again.');
  });

  it('deletes the account after confirmation and ends the session', async () => {
    const session = signIn();
    const fetchMock = api();
    render(<ProfilePage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Delete your account?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Delete account' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/auth/login'));
    const [remove] = calls(fetchMock, 'DELETE');
    expect(remove[0]).toBe(PROFILE_URL);
    expect(remove[1]?.headers).toMatchObject({ Authorization: `Bearer ${session}` });
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('name')).toBeNull();
  });

  it('keeps the account when deletion is cancelled or fails', async () => {
    signIn();
    const fetchMock = api({ DELETE: () => json({ message: 'Error removing user' }, 400) });
    render(<ProfilePage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(calls(fetchMock, 'DELETE')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Error removing user');
    expect(localStorage.getItem('token')).not.toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
