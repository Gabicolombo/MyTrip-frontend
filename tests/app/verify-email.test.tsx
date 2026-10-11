import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import VerifyEmailPage from '@/app/verificar-email/page';
import VerifyEmailAlias from '@/app/verify-email/page';
import { json, mockFetch, requestBody, setUrl } from '../helpers';

const verify = () => userEvent.click(screen.getByRole('button', { name: 'Verify email' }));

describe('verify email page', () => {
  it('verifies the token from the link only after the user clicks', async () => {
    const fetchMock = mockFetch(() => json({ message: 'Email verified successfully' }));
    setUrl('/verify-email?token=signed.jwt.token');
    render(<VerifyEmailPage />);

    expect(fetchMock).not.toHaveBeenCalled();
    await verify();

    expect(await screen.findByRole('heading', { name: 'Email verified!' })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3333/auth/verify-email');
    expect(requestBody(fetchMock)).toEqual({ token: 'signed.jwt.token' });
    expect(screen.queryByRole('button', { name: 'Verify email' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/login');
  });

  it('treats a link without a token as invalid and offers a new email', () => {
    const fetchMock = mockFetch(() => json({}));
    setUrl('/verify-email');
    render(<VerifyEmailPage />);
    expect(screen.getByText(/This link is invalid, has expired, or has already been used/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verify email' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the resend form when the API rejects the token', async () => {
    mockFetch(() => json({ message: 'Invalid or expired verification link' }, 400));
    setUrl('/verify-email?token=expired');
    render(<VerifyEmailPage />);
    await verify();
    expect(await screen.findByText(/This link is invalid, has expired/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeInTheDocument();
  });

  it('lets the user retry after a server error', async () => {
    mockFetch(() => json({}, 500));
    setUrl('/verify-email?token=abc');
    render(<VerifyEmailPage />);
    await verify();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to verify your email. Please try again.');
    expect(screen.getByRole('button', { name: 'Verify email' })).toBeEnabled();
  });

  it('lets the user retry when the server is unreachable', async () => {
    mockFetch(() => { throw new TypeError('Failed to fetch'); });
    setUrl('/verify-email?token=abc');
    render(<VerifyEmailPage />);
    await verify();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect to the server. Please try again.');
    expect(screen.getByRole('button', { name: 'Verify email' })).toBeEnabled();
  });

  it('serves the same page at /verify-email and /verificar-email', () => {
    expect(VerifyEmailAlias).toBe(VerifyEmailPage);
  });
});
