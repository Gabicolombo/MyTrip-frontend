import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TripDetailsPage from '@/app/trip/[id]/page';
import { json, mockFetch, routeParams, signIn } from '../helpers';

const participants = [
  { userId: 1, user: { name: 'Gabi' }, role: 'OWNER' },
  { userId: 2, user: { name: 'Ana' }, role: 'EDITOR' },
  { userId: 3, user: { name: 'Leo' }, role: 'VIEWER' },
];
const trip = {
  id: 7, title: 'Italy 2026', description: 'Family trip', startDate: '2099-06-01', endDate: '2099-06-10',
  imageUrl: 'https://img.example/italy.jpg', participants,
  destinations: [
    { id: 'd1', tripId: 7, city: 'Rome', country: 'Italy', startDate: '2099-06-01', endDate: '2099-06-05' },
    { id: 'd2', tripId: 7, city: 'Paris', country: 'France', startDate: '2099-06-05', endDate: '2099-06-10' },
  ],
};

function api(details: unknown = { data: { tripDetails: trip } }) {
  return mockFetch((url, init) => {
    if (url.endsWith('/graphql')) return json(details);
    if (init.method === 'DELETE') return json(true);
    if (url.includes('/trips/itinerary-by-trip/')) return json({ totals: [], byCategory: [] });
    return json([]);
  });
}
const graphqlCalls = (mock: ReturnType<typeof mockFetch>) => mock.mock.calls.filter(([url]) => String(url).endsWith('/graphql'));

function open(userId = 1) {
  const session = signIn(userId);
  routeParams.id = '7';
  render(<TripDetailsPage />);
  return session;
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('trip details page', () => {
  it('loads the trip from the route and shows its sections', async () => {
    const fetchMock = api();
    const session = open();
    expect(screen.getByText('Loading trip details...')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Italy 2026' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Rome Itinerary/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trip Info' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Visa Check/ })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Participants' })).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getAllByText('Upcoming').length).toBeGreaterThan(0);

    const [url, init] = graphqlCalls(fetchMock)[0];
    expect(url).toBe('http://localhost:4000/graphql');
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${session}` });
    const body = JSON.parse(String(init?.body));
    expect(body.variables).toEqual({ id: 7 });
    expect(body.query).toContain('userId');
  });

  it('shows the API error instead of the trip', async () => {
    api({ errors: [{ message: 'User does not have permission to view this trip' }] });
    open();
    expect(await screen.findByText('User does not have permission to view this trip')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Italy 2026' })).not.toBeInTheDocument();
  });

  it('marks a trip that already ended as completed', async () => {
    api({ data: { tripDetails: { ...trip, startDate: '2020-06-01', endDate: '2020-06-10' } } });
    open();
    await screen.findByRole('heading', { name: 'Italy 2026' });
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.queryByText('Upcoming')).not.toBeInTheDocument();
  });

  it('switches the itinerary to the selected destination', async () => {
    const fetchMock = api();
    open();
    await userEvent.click(await screen.findByRole('button', { name: /Paris/ }));
    expect(await screen.findByRole('heading', { name: /Paris Itinerary/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/trips/itinerary/d2'))).toBe(true);
  });

  it('opens the edit form and reloads the trip after saving', async () => {
    const fetchMock = api();
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit trip' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Edit trip' }));
    expect(dialog.getByLabelText('Trip title')).toHaveValue('Italy 2026');
    await userEvent.click(dialog.getByRole('button', { name: 'Save changes' }));

    await vi.waitFor(() => expect(graphqlCalls(fetchMock)).toHaveLength(2));
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/trips/update-trip/7'))).toBe(true);
    expect(screen.queryByRole('dialog', { name: 'Edit trip' })).not.toBeInTheDocument();
  });

  it('opens and closes the budget', async () => {
    api();
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Budget' }));
    expect(await screen.findByRole('heading', { name: 'No recorded expenses yet' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close budget' }));
    expect(screen.queryByRole('heading', { name: 'No recorded expenses yet' })).not.toBeInTheDocument();
  });

  describe('permissions by role', () => {
    it('lets the owner add places, invite and remove participants', async () => {
      api();
      open(1);
      expect(await screen.findByRole('button', { name: '+ Add first place' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Invite by email' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Remove Leo' })).toBeInTheDocument();
    });

    it('lets an editor add places and invite, but not remove participants', async () => {
      api();
      open(2);
      expect(await screen.findByRole('button', { name: '+ Add first place' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Invite by email' })).toBeEnabled();
      expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
    });

    it('disables adding places and inviting for a viewer', async () => {
      api();
      open(3);
      expect(await screen.findByRole('button', { name: '+ Add first place' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Invite by email' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Budget' })).toBeEnabled();
    });
  });

  it('reloads the trip after a participant is removed', async () => {
    const fetchMock = api();
    open(1);
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Leo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await vi.waitFor(() => expect(graphqlCalls(fetchMock)).toHaveLength(2));
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/trips/delete-participant/7/3'))).toBe(true);
  });
});
