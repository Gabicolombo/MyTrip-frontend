import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfirmModal from '@/components/common/confirmModal';
import Navbar from '@/components/common/navbar';
import ResendVerification from '@/components/common/ResendVerification';
import { json, mockFetch, requestBody, router, signIn } from '../helpers';

describe('ResendVerification', () => {
  it('requests a new email and blocks another request for a minute', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchMock = mockFetch(() => json({ message: 'ok' }));
    render(<ResendVerification />);

    await user.type(screen.getByLabelText('Account email'), '  gabi@example.com ');
    await user.click(screen.getByRole('button', { name: 'Resend verification email' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Request sent. Check your inbox and spam folder.');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3333/auth/resend-verification');
    expect(requestBody(fetchMock)).toEqual({ email: 'gabi@example.com' });
    expect(screen.getByRole('button', { name: /Resend verification email \(\d+s\)/ })).toBeDisabled();

    act(() => { vi.advanceTimersByTime(61_000); });
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeEnabled();
  });

  it('starts with the given email and cooldown', () => {
    render(<ResendVerification initialEmail="gabi@example.com" initialCooldown={60} />);
    expect(screen.getByLabelText('Account email')).toHaveValue('gabi@example.com');
    expect(screen.getByRole('button', { name: 'Resend verification email (60s)' })).toBeDisabled();
  });

  it('reports a refused request', async () => {
    mockFetch(() => json({}, 429));
    render(<ResendVerification initialEmail="gabi@example.com" />);
    await userEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to resend the verification email. Please wait and try again.');
  });

  it('reports an unreachable server', async () => {
    mockFetch(() => { throw new TypeError('Failed to fetch'); });
    render(<ResendVerification initialEmail="gabi@example.com" />);
    await userEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect to the server. Please wait and try again.');
  });
});

describe('ConfirmModal', () => {
  it('shows the question and reports the answer', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmModal title="Confirm Deletion" message="Are you sure?" onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole('heading', { name: 'Confirm Deletion' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('Navbar', () => {
  it('shows the user initial and follows name changes', () => {
    signIn(1, 'gabi');
    render(<Navbar />);
    const menu = screen.getByRole('button', { name: 'Open user menu' });
    expect(menu).toHaveTextContent('G');

    act(() => {
      localStorage.setItem('name', 'Ana');
      window.dispatchEvent(new Event('user-updated'));
    });
    expect(menu).toHaveTextContent('A');
  });

  it('falls back to a generic initial without a name', () => {
    render(<Navbar />);
    expect(screen.getByRole('button', { name: 'Open user menu' })).toHaveTextContent('U');
  });

  it('only offers "New trip" where a handler is given', async () => {
    const onNewTripClick = vi.fn();
    const { rerender } = render(<Navbar />);
    expect(screen.queryByRole('button', { name: 'Create new trip' })).not.toBeInTheDocument();
    rerender(<Navbar onNewTripClick={onNewTripClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Create new trip' }));
    expect(onNewTripClick).toHaveBeenCalledTimes(1);
  });

  it('navigates home and to the profile', async () => {
    render(<Navbar />);
    await userEvent.click(screen.getByRole('button', { name: 'TripInOrder' }));
    expect(router.push).toHaveBeenCalledWith('/home');
    await userEvent.click(screen.getByRole('button', { name: 'Open user menu' }));
    await userEvent.click(screen.getByRole('button', { name: 'Profile' }));
    expect(router.push).toHaveBeenCalledWith('/profile');
  });

  it('logs out by clearing the session', async () => {
    signIn();
    render(<Navbar />);
    await userEvent.click(screen.getByRole('button', { name: 'Open user menu' }));
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('name')).toBeNull();
    expect(router.push).toHaveBeenCalledWith('/auth/login');
  });
});
