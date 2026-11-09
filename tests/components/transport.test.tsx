import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TripHeader from '@/components/trip/TripHeader';
import TransportForm from '@/components/trip/TransportForm';
import type { Transport } from '@/lib/transport';
import { json, mockFetch, requestBody, signIn } from '../helpers';

const rome = { id: 'd1', city: 'Rome', country: 'IT', startDate: '2026-06-01', endDate: '2026-06-05' };
const paris = { id: 'd2', city: 'Paris', country: 'FR', startDate: '2026-06-05', endDate: '2026-06-10' };
const flight: Transport = {
  id: 't1', mode: 'FLIGHT', fromDestinationId: 'd1', toDestinationId: 'd2',
  departureDate: '2026-06-05', departureTime: '14:35', arrivalDate: '2026-06-05', arrivalTime: '18:05',
  carrier: 'Transavia TO 7647', reference: 'X9HB3T', amount: '189.00', currency: 'EUR',
};

describe('TripHeader transport legs', () => {
  const trip = { title: 'Italy 2026', description: '', startDate: '2026-06-01', endDate: '2026-06-10', imageUrl: '', destinations: [rome, paris] };

  function open(props: Partial<React.ComponentProps<typeof TripHeader>> = {}) {
    const handlers = { onTabChange: vi.fn(), onEdit: vi.fn(), onBudget: vi.fn(), onAddTransport: vi.fn(), onEditTransport: vi.fn(), onDeleteTransport: vi.fn() };
    render(<TripHeader trip={trip} isCompleted={false} activeTab="" canEdit {...handlers} {...props} />);
    return handlers;
  }

  it('adds transport between two destinations', async () => {
    const handlers = open();
    const add = screen.getByRole('button', { name: 'Add transport' });
    expect(add).toHaveAttribute('title', 'Add transport from Rome to Paris');
    await userEvent.click(add);
    expect(handlers.onAddTransport).toHaveBeenCalledWith(rome, paris);
  });

  it('hides the add button from viewers', () => {
    open({ canEdit: false });
    expect(screen.queryByRole('button', { name: 'Add transport' })).not.toBeInTheDocument();
  });

  it('asks for another destination when the trip has only one', () => {
    open({ trip: { ...trip, destinations: [rome] } });
    expect(screen.queryByRole('button', { name: 'Add transport' })).not.toBeInTheDocument();
    expect(screen.getByText(/Add another destination to plan transport/)).toBeInTheDocument();
  });

  it('shows a saved leg with its details, and edits or deletes it', async () => {
    const handlers = open({ transports: [flight] });
    expect(screen.queryByRole('button', { name: 'Add transport' })).not.toBeInTheDocument();
    const leg = screen.getByRole('button', { name: /Flight EUR 189.00/ });
    await userEvent.click(leg);
    expect(leg).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Transavia TO 7647')).toBeInTheDocument();
    expect(screen.getByText('Departs · Rome')).toBeInTheDocument();
    expect(screen.getByText('Arrives · Paris')).toBeInTheDocument();
    expect(screen.getByText('05 Jun 2026 · 14:35')).toBeInTheDocument();
    expect(screen.getByText('X9HB3T')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(handlers.onEditTransport).toHaveBeenCalledWith(flight);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(handlers.onDeleteTransport).toHaveBeenCalledWith(flight);
  });

  it('lets viewers see a leg without editing it', async () => {
    open({ canEdit: false, transports: [flight] });
    await userEvent.click(screen.getByRole('button', { name: /Flight/ }));
    expect(screen.getByText('Transavia TO 7647')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});

describe('TransportForm', () => {
  function open(transport?: Transport) {
    signIn();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    render(<TransportForm tripId={7} from={rome} to={paris} transport={transport} onClose={onClose} onSuccess={onSuccess} />);
    return { onClose, onSuccess };
  }

  async function pickTime(user: ReturnType<typeof userEvent.setup>, label: string, hour: string, minute: string) {
    await user.click(screen.getByLabelText(label));
    const picker = screen.getByRole('group', { name: `Choose ${label.toLowerCase()}` });
    await user.click(within(picker).getByRole('button', { name: `Hour ${hour}` }));
    await user.click(within(picker).getByRole('button', { name: `Minute ${minute}` }));
  }

  it('creates a leg between the two destinations', async () => {
    const fetchMock = mockFetch(() => json({}, 201));
    const { onClose, onSuccess } = open();
    const user = userEvent.setup();
    expect(screen.getByText('→').closest('p')).toHaveTextContent('Rome → Paris');
    expect(screen.getByLabelText('Departure')).toHaveValue('2026-06-05');
    expect(screen.getByLabelText('Arrival')).toHaveValue('2026-06-05');

    await user.click(screen.getByRole('button', { name: /Train/ }));
    await pickTime(user, 'Departure time', '2', '35');
    await pickTime(user, 'Arrival time', '6', '05');
    expect(screen.getByLabelText('Departure time')).toHaveTextContent('02:35 PM');
    await user.type(screen.getByLabelText('Company and number'), 'Trenitalia FR 9521');
    await user.type(screen.getByLabelText('Amount'), '89,90');
    await user.click(screen.getByLabelText('Currency'));
    await user.type(await screen.findByRole('combobox', { name: 'Search currencies' }), 'EUR');
    await user.click(await screen.findByRole('option', { name: /^EUR/ }));
    await user.click(screen.getByRole('button', { name: 'Add transport' }));

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/trips/7/transports');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    expect(requestBody(fetchMock)).toEqual({
      mode: 'TRAIN', fromDestinationId: 'd1', toDestinationId: 'd2',
      departureDate: '2026-06-05', departureTime: '14:35', arrivalDate: '2026-06-05', arrivalTime: '18:05',
      carrier: 'Trenitalia FR 9521', reference: null, amount: '89.90', currency: 'EUR',
    });
  }, 15000);

  it('updates a leg with the full body', async () => {
    const fetchMock = mockFetch(() => json({}));
    const { onSuccess } = open(flight);
    const user = userEvent.setup();
    expect(screen.getByLabelText('Departure time')).toHaveTextContent('02:35 PM');
    expect(screen.getByLabelText('Arrival time')).toHaveTextContent('06:05 PM');
    expect(screen.getByRole('button', { name: /Flight/ })).toHaveAttribute('aria-pressed', 'true');

    await user.clear(screen.getByLabelText('Booking code (optional)'));
    await user.click(screen.getByRole('button', { name: 'Update transport' }));

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/trips/7/transports/t1');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PATCH');
    expect(requestBody(fetchMock)).toEqual({
      mode: 'FLIGHT', fromDestinationId: 'd1', toDestinationId: 'd2',
      departureDate: '2026-06-05', departureTime: '14:35', arrivalDate: '2026-06-05', arrivalTime: '18:05',
      carrier: 'Transavia TO 7647', reference: null, amount: '189.00', currency: 'EUR',
    });
  });

  it('refuses an arrival before the departure', async () => {
    const fetchMock = mockFetch(() => json({}));
    open();
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Arrival time'));
    await user.click(within(screen.getByRole('group', { name: 'Choose arrival time' })).getByRole('button', { name: 'AM' }));
    await user.type(screen.getByLabelText('Company and number'), 'Air France AF 1205');
    await user.click(screen.getByRole('button', { name: 'Add transport' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Arrival must be after departure.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the API error and keeps the form open', async () => {
    mockFetch(() => json({ message: 'Destination does not belong to this trip' }, 400));
    const { onSuccess } = open();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Company and number'), 'Air France AF 1205');
    await user.click(screen.getByRole('button', { name: 'Add transport' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Destination does not belong to this trip');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
