import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HomePage from '@/app/home/page';
import { json, mockFetch, router, signIn } from '../helpers';

const italy = {
  id: '7', title: 'Italy 2026', description: 'Family trip', startDate: '2026-06-01', endDate: '2026-06-10',
  imageUrl: 'https://img.example/italy.jpg', status: 'Initiated',
  destinations: [
    { id: 'd1', city: 'Rome', country: 'Italy', startDate: '2026-06-01', endDate: '2026-06-05', orderIndex: '1' },
    { id: 'd2', city: 'Florence', country: 'Italy', startDate: '2026-06-05', endDate: '2026-06-10', orderIndex: '2' },
  ],
};
const japan = {
  id: '8', title: 'Japan 2024', description: '', startDate: '2024-04-01', endDate: '2024-04-15',
  imageUrl: 'https://img.example/japan.jpg', status: 'Completed', destinations: [],
};

function api(trips: unknown[] = [italy, japan]) {
  return mockFetch((url, init) => {
    if (init.method === 'DELETE') return json({});
    if (url.endsWith('/trips/my-trips')) return json(trips);
    return json({});
  });
}
const card = (title: string) => screen.getByRole('heading', { name: title }).parentElement as HTMLElement;

describe('home page', () => {
  it('lists the trips of the signed-in user', async () => {
    const session = signIn();
    const fetchMock = api();
    render(<HomePage />);

    const trip = within(await screen.findByRole('heading', { name: 'Italy 2026' }).then(heading => heading.parentElement as HTMLElement));
    expect(trip.getByText('Rome, Florence')).toBeInTheDocument();
    expect(trip.getByText(/01 Jun → 10 Jun/)).toBeInTheDocument();
    expect(trip.getByText('9 days')).toBeInTheDocument();
    expect(trip.getByText('Upcoming')).toBeInTheDocument();
    expect(trip.getByAltText('Italy 2026')).toHaveAttribute('src', italy.imageUrl);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/trips/my-trips');
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${session}` });
  });

  it('marks finished trips as completed and not editable', async () => {
    signIn();
    api();
    render(<HomePage />);
    await screen.findByRole('heading', { name: 'Japan 2024' });
    const finished = within(card('Japan 2024'));
    expect(finished.getByText('Completed')).toBeInTheDocument();
    expect(finished.queryByRole('button', { name: 'Edit trip' })).not.toBeInTheDocument();
    expect(finished.queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(card('Italy 2026')).getByRole('button', { name: 'Edit trip' })).toBeInTheDocument();
  });

  it('invites the user to create the first trip', async () => {
    signIn();
    api([]);
    render(<HomePage />);
    expect(await screen.findByText('You do not have any trips yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create your first trip' }));
    expect(screen.getByRole('heading', { name: 'Where are you going?' })).toBeInTheDocument();
  });

  it('opens the new trip form from the navbar', async () => {
    signIn();
    api();
    render(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: 'Create new trip' }));
    expect(screen.getByRole('heading', { name: 'Where are you going?' })).toBeInTheDocument();
  });

  it('opens the trip details', async () => {
    signIn();
    api();
    render(<HomePage />);
    await screen.findByRole('heading', { name: 'Italy 2026' });
    await userEvent.click(within(card('Italy 2026')).getByRole('button', { name: 'Details' }));
    expect(router.push).toHaveBeenCalledWith('/trip/7');
  });

  it('opens the forms to edit the trip, add destinations and edit one destination', async () => {
    signIn();
    api();
    render(<HomePage />);
    await screen.findByRole('heading', { name: 'Italy 2026' });
    const trip = within(card('Italy 2026'));

    await userEvent.click(trip.getByRole('button', { name: 'Edit trip' }));
    expect(within(screen.getByRole('dialog')).getByLabelText('Trip title')).toHaveValue('Italy 2026');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await userEvent.click(trip.getByRole('button', { name: '+ Add destinations' }));
    expect(screen.getByRole('heading', { name: 'Where are your stops?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await userEvent.selectOptions(trip.getByRole('combobox', { name: 'Edit destination in Italy 2026' }), 'Florence');
    expect(screen.getByRole('heading', { name: 'Edit destination' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Rome')).toHaveValue('Florence');
  });

  it('deletes a trip only after confirmation', async () => {
    const session = signIn();
    const fetchMock = api();
    render(<HomePage />);
    await screen.findByRole('heading', { name: 'Italy 2026' });

    await userEvent.click(screen.getByRole('button', { name: 'Delete Italy 2026' }));
    expect(screen.getByText(/Are you sure you want to delete this trip/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Delete Italy 2026' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await expect.poll(() => screen.queryByRole('heading', { name: 'Italy 2026' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Japan 2024' })).toBeInTheDocument();

    const remove = fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE');
    expect(remove?.[0]).toBe('http://localhost:4000/trips/delete-trip/7');
    expect(remove?.[1]?.headers).toMatchObject({ Authorization: `Bearer ${session}` });
  });

  it('keeps the trip when the API refuses to delete it', async () => {
    signIn();
    const fetchMock = mockFetch((_url, init) => init.method === 'DELETE' ? json({}, 401) : json([italy]));
    render(<HomePage />);
    await screen.findByRole('heading', { name: 'Italy 2026' });
    await userEvent.click(screen.getByRole('button', { name: 'Delete Italy 2026' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await vi.waitFor(() => expect(fetchMock.mock.results.at(-1)?.type).toBe('return'));
    await fetchMock.mock.results.at(-1)?.value;
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(screen.getByRole('heading', { name: 'Italy 2026' })).toBeInTheDocument();
  });
});
