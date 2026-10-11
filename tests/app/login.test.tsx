import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import LoginPage from '@/app/auth/login/page';
import { json, mockFetch, requestBody, router, setUrl } from '../helpers';

async function submit(email = 'gabi@example.com', password = 'abc123') {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('TripInOrder@gmail.com'), email);
  await user.type(screen.getByPlaceholderText('******'), password);
  await user.click(screen.getByRole('button', { name: 'Sign In' }));
}

const loginOk = () => mockFetch(() => json({ access_token: 'jwt-token', name: 'Gabi' }));

describe('login page', () => {
  it('signs in, stores the session and goes to the trips list', async () => {
    const fetchMock = loginOk();
    render(<LoginPage />);
    await submit();

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/home'));
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3333/auth/login');
    expect(requestBody(fetchMock)).toEqual({ email: 'gabi@example.com', password: 'abc123' });
    expect(localStorage.getItem('token')).toBe('jwt-token');
    expect(localStorage.getItem('name')).toBe('Gabi');
  });

  it('returns to the page given in ?next= after signing in', async () => {
    loginOk();
    setUrl(`/auth/login?next=${encodeURIComponent('/trip-invite?token=abc&accept=1')}`);
    render(<LoginPage />);
    await submit();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/trip-invite?token=abc&accept=1'));
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example'])('ignores the external redirect %s', async next => {
    loginOk();
    setUrl(`/auth/login?next=${encodeURIComponent(next)}`);
    render(<LoginPage />);
    await submit();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/home'));
  });

  it('resumes an invitation saved before creating the account, only once', async () => {
    loginOk();
    localStorage.setItem('pendingInvite', '/trip-invite?token=abc&accept=1');
    render(<LoginPage />);
    await submit();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/trip-invite?token=abc&accept=1'));
    expect(localStorage.getItem('pendingInvite')).toBeNull();
  });

  it('shows the error returned by the API and does not store a session', async () => {
    mockFetch(() => json({ message: 'Invalid credentials' }, 400));
    render(<LoginPage />);
    await submit();
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('offers to resend the verification email when the account is not verified', async () => {
    mockFetch(() => json({ message: 'Verify your email before logging in' }, 403));
    render(<LoginPage />);
    await submit();
    expect(await screen.findByText(/Please verify your email before signing in/)).toBeInTheDocument();
    expect(screen.getByLabelText('Account email')).toHaveValue('gabi@example.com');
  });

  it('opens the resend form and links to registration', async () => {
    render(<LoginPage />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /receive a verification email/ }));
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(router.push).toHaveBeenCalledWith('/auth/register');
  });
});
