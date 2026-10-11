import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import RegisterPage from '@/app/auth/register/page';
import { json, mockFetch, requestBody } from '../helpers';

async function submit() {
  const user = userEvent.setup();
  await user.type(screen.getAllByRole('textbox')[0], 'Gabi');
  await user.type(screen.getByPlaceholderText('TripInOrder@gmail.com'), 'gabi@example.com');
  await user.type(screen.getByPlaceholderText('******'), 'abc123');
  await user.click(screen.getByRole('button', { name: 'Sign In' }));
}

describe('register page', () => {
  it('creates the account and asks the user to check their email', async () => {
    const fetchMock = mockFetch(() => json({ message: 'Account created.' }, 201));
    render(<RegisterPage />);
    await submit();

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('We sent a verification link to gabi@example.com.');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3333/users/register');
    expect(requestBody(fetchMock)).toMatchObject({ name: 'Gabi', email: 'gabi@example.com', password: 'abc123' });
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/login');
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeEnabled();
  });

  it('shows a single API error and keeps the form', async () => {
    mockFetch(() => json({ message: 'User already exists' }, 400));
    render(<RegisterPage />);
    await submit();
    expect(await screen.findByText('User already exists')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('joins validation errors returned as a list', async () => {
    mockFetch(() => json({ message: ['Invalid email format', 'Name must be at least 3 characters long'] }, 400));
    render(<RegisterPage />);
    await submit();
    expect(await screen.findByText('Invalid email format Name must be at least 3 characters long')).toBeInTheDocument();
  });

  it('falls back to a generic message when the error has no body', async () => {
    mockFetch(() => new Response('', { status: 500 }));
    render(<RegisterPage />);
    await submit();
    expect(await screen.findByText('Unable to create your account. Please try again.')).toBeInTheDocument();
  });

  it('keeps the account and offers a delayed resend when the email could not be sent', async () => {
    mockFetch(() => json({ message: 'Unable to send verification email. Try resending in one minute.' }, 503));
    render(<RegisterPage />);
    await submit();

    expect(await screen.findByRole('heading', { name: 'Verify your email' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to send verification email.');
    expect(screen.getByLabelText('Account email')).toHaveValue('gabi@example.com');
    expect(screen.getByRole('button', { name: 'Resend verification email (60s)' })).toBeDisabled();
  });
});
