import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddItinerary from '@/components/trip/AddItinerary';
import DestinationTabs from '@/components/trip/DestinationTabs';
import { searchPlaces } from '@/lib/photon';
import { json, mockFetch, requestBody, signIn } from '../helpers';

vi.mock('@/lib/photon', () => ({ searchPlaces: vi.fn() }));
const search = vi.mocked(searchPlaces);

const colosseum = {
  geometry: { type: 'Point' as const, coordinates: [12.4922, 41.8902] as [number, number] },
  properties: { osm_type: 'W', osm_id: 1, name: 'Colosseum', street: 'Piazza del Colosseo', housenumber: '1', city: 'Rome', country: 'Italy' },
};
const saved = {
  id: 'p1', name: 'Colosseum', activity: 'Museum', day: '2026-06-02T00:00:00.000Z', time: '09:30:00',
  latitude: 41.8902, longitude: 12.4922, notes: 'Book ahead', link: 'https://colosseo.it', amount: '18.00', currency: 'EUR',
};

beforeEach(() => {
  search.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('AddItinerary', () => {
  function open(itinerary?: typeof saved) {
    const session = signIn();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    render(<AddItinerary destinationId="d1" city="Rome" country="Italy" startDate="2026-06-01" endDate="2026-06-03"
      onClose={onClose} onSuccess={onSuccess} itinerary={itinerary} />);
    return { session, onClose, onSuccess };
  }

  async function pickPlace(user = userEvent.setup()) {
    search.mockResolvedValue([colosseum]);
    await user.type(screen.getByPlaceholderText('Eiffel Tower'), 'Colos');
    await user.click(await screen.findByRole('button', { name: /Colosseum/ }, { timeout: 3000 }));
  }
  const save = (name = 'Add Itinerary') => userEvent.click(screen.getByRole('button', { name }));

  it('searches places near the destination and saves the chosen one', async () => {
    const fetchMock = mockFetch(() => json({ id: 'p1' }, 201));
    const { session, onClose, onSuccess } = open();
    const user = userEvent.setup();

    search.mockResolvedValue([colosseum]);
    await user.type(screen.getByPlaceholderText('Eiffel Tower'), 'Colos');
    expect(screen.getByText('Searching…')).toBeInTheDocument();
    const suggestion = await screen.findByRole('button', { name: /Colosseum/ }, { timeout: 3000 });
    expect(suggestion).toHaveTextContent('Piazza del Colosseo, 1');
    expect(suggestion).toHaveTextContent('Rome, Italy');
    expect(search).toHaveBeenLastCalledWith('Colos', 'Rome', 'Italy', expect.any(AbortSignal));

    await user.click(suggestion);
    expect(screen.getByPlaceholderText('Eiffel Tower')).toHaveValue('Colosseum');
    expect(screen.getByText('41.89020, 12.49220')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Museum/ }));
    await save();

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/trips/add-itinerary');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${session}` });
    expect(requestBody(fetchMock)).toEqual({
      tripDestinationId: 'd1', name: 'Colosseum', activity: 'Museum', day: '2026-06-01', time: '12:00 PM',
      latitude: 41.8902, longitude: 12.4922, notes: null, link: null, amount: null, currency: null,
    });
  });

  it('requires a place picked from the suggestions', async () => {
    const fetchMock = mockFetch(() => json({}));
    open();
    await userEvent.type(screen.getByPlaceholderText('Eiffel Tower'), 'Co');
    await save();
    expect(screen.getByText('Please select a place from the suggestions list.')).toBeInTheDocument();
    expect(search).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires an activity type', async () => {
    const fetchMock = mockFetch(() => json({}));
    open();
    await pickPlace();
    await save();
    expect(screen.getByText('Please select an activity type.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires a currency with the amount and can clear the expense', async () => {
    const fetchMock = mockFetch(() => json({}, 201));
    const { onSuccess } = open();
    const user = userEvent.setup();
    await pickPlace(user);
    await user.click(screen.getByRole('button', { name: /Museum/ }));
    await user.type(screen.getByLabelText('Amount'), '40,5');
    await save();
    expect(screen.getByText('Select a currency for the amount.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Clear expense' }));
    expect(screen.getByLabelText('Amount')).toHaveValue('');
    await save();
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchMock)).toMatchObject({ amount: null, currency: null });
  });

  it('saves the expense with its currency, the notes and the link', async () => {
    const fetchMock = mockFetch(() => json({}, 201));
    const { onSuccess } = open();
    const user = userEvent.setup();
    await pickPlace(user);
    await user.click(screen.getByRole('button', { name: /Museum/ }));
    await user.type(screen.getByLabelText('Amount'), '40,5');
    await user.click(screen.getByLabelText('Currency'));
    await user.type(await screen.findByRole('combobox', { name: 'Search currencies' }), 'EUR');
    await user.click(await screen.findByRole('option', { name: /^EUR/ }));
    await user.type(screen.getByPlaceholderText(/Additional details/), 'Book ahead');
    await user.type(screen.getByPlaceholderText('https://...'), 'https://colosseo.it');
    await save();

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchMock)).toMatchObject({ amount: '40.5', currency: 'EUR', notes: 'Book ahead', link: 'https://colosseo.it' });
  });

  it('picks the day and the time', async () => {
    const fetchMock = mockFetch(() => json({}, 201));
    const { onSuccess } = open();
    const user = userEvent.setup();
    await pickPlace(user);
    await user.click(screen.getByRole('button', { name: /Museum/ }));

    await user.click(screen.getByRole('combobox', { name: 'Day' }));
    await user.click(screen.getByRole('option', { name: 'Jun 3, Wed' }));
    expect(screen.getByLabelText('Time')).toHaveTextContent('12:00 PM');
    await user.click(screen.getByLabelText('Time'));
    const picker = screen.getByRole('group', { name: 'Choose time' });
    await user.click(within(picker).getByRole('button', { name: 'Hour 9' }));
    await user.click(within(picker).getByRole('button', { name: 'Minute 05' }));
    await user.click(within(picker).getByRole('button', { name: 'AM' }));
    expect(screen.getByLabelText('Time')).toHaveTextContent('09:05 AM');
    await save();

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchMock)).toMatchObject({ day: '2026-06-03', time: '09:05 AM' });
  });

  it('tells when the search finds nothing or fails', async () => {
    open();
    const input = screen.getByPlaceholderText('Eiffel Tower');
    search.mockResolvedValue([]);
    await userEvent.type(input, 'Zzzz');
    expect(await screen.findByText(/No places found/, {}, { timeout: 3000 })).toBeInTheDocument();

    search.mockRejectedValue(new Error('Place search is unavailable. Please try again.'));
    await userEvent.type(input, 'y');
    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('Place search is unavailable. Please try again.');
  });

  it('edits an existing place', async () => {
    const fetchMock = mockFetch(() => json({}));
    const { onSuccess } = open(saved);
    expect(screen.getByRole('heading', { name: 'Update place' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Eiffel Tower')).toHaveValue('Colosseum');
    expect(screen.getByRole('combobox', { name: 'Day' })).toHaveTextContent('Jun 2, Tue');
    expect(screen.getByLabelText('Time')).toHaveTextContent('09:30 AM');
    expect(screen.getByLabelText('Amount')).toHaveValue('18.00');
    expect(screen.getByLabelText('Currency')).toHaveTextContent('EUR');

    const notes = screen.getByPlaceholderText(/Additional details/);
    await userEvent.clear(notes);
    await save('Update Itinerary');

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/trips/update-itinerary/p1');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PATCH');
    expect(requestBody(fetchMock)).toMatchObject({
      name: 'Colosseum', activity: 'Museum', day: '2026-06-02', time: '09:30 AM', notes: null, amount: '18.00', currency: 'EUR',
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('shows the API error and stays open', async () => {
    mockFetch(() => json({ message: 'User does not have permission to add itinerary' }, 401));
    const { onClose, onSuccess } = open(saved);
    await save('Update Itinerary');
    expect(await screen.findByText('User does not have permission to add itinerary')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes without saving', async () => {
    const { onClose } = open();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close itinerary form' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('DestinationTabs', () => {
  const destinations = [
    { id: 'd1', city: 'Rome', country: 'Italy', startDate: '2026-06-01', endDate: '2026-06-03' },
    { id: 'd2', city: 'Paris', country: 'France', startDate: '2026-06-03', endDate: '2026-06-06' },
  ];
  const louvre = { ...saved, id: 'p2', name: 'Louvre' };

  function api(remaining = { d1: [saved], d2: [louvre] }) {
    return mockFetch((url, init) => {
      if (init.method === 'DELETE') {
        remaining.d1 = [];
        return json(true);
      }
      return json(url.endsWith('/d2') ? remaining.d2 : remaining.d1);
    });
  }

  it('loads the itinerary of the first destination and shows the map', async () => {
    const session = signIn();
    const fetchMock = api();
    render(<DestinationTabs destinations={destinations} activeTab="" canEdit />);
    expect(await screen.findByText('Colosseum')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Rome Itinerary/ })).toBeInTheDocument();
    expect(screen.getByText('Rome, Italy')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/trips/itinerary/d1');
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${session}` });
  });

  it('loads another destination when the tab changes', async () => {
    signIn();
    const fetchMock = api();
    const { rerender } = render(<DestinationTabs destinations={destinations} activeTab="Rome" canEdit />);
    await screen.findByText('Colosseum');
    rerender(<DestinationTabs destinations={destinations} activeTab="Paris" canEdit />);
    expect(await screen.findByText('Louvre')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Paris Itinerary/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('http://localhost:4000/trips/itinerary/d2');
  });

  it('hides the map while the destination has no places', async () => {
    signIn();
    api({ d1: [], d2: [] });
    render(<DestinationTabs destinations={destinations} activeTab="" canEdit />);
    expect(await screen.findByText('No places yet')).toBeInTheDocument();
    expect(screen.queryByTestId('map')).not.toBeInTheDocument();
  });

  it('deletes a place after confirmation and reloads the list', async () => {
    signIn();
    const fetchMock = api();
    render(<DestinationTabs destinations={destinations} activeTab="" canEdit />);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Colosseum' }));
    expect(screen.getByText(/delete this itinerary item/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('No places yet')).toBeInTheDocument();
    const remove = fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE');
    expect(remove?.[0]).toBe('http://localhost:4000/trips/delete-itinerary/p1');
  });

  it('keeps the place when deletion is cancelled', async () => {
    signIn();
    const fetchMock = api();
    render(<DestinationTabs destinations={destinations} activeTab="" canEdit />);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Colosseum' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Colosseum')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  });

  it('opens the form to add and to edit a place', async () => {
    signIn();
    api();
    render(<DestinationTabs destinations={destinations} activeTab="" canEdit />);
    await userEvent.click(await screen.findByRole('button', { name: '+ Add' }));
    expect(screen.getByRole('heading', { name: 'Add place' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Add place' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Edit Colosseum' }));
    expect(screen.getByRole('heading', { name: 'Update place' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Eiffel Tower')).toHaveValue('Colosseum');
  });

  it('does not let viewers open the add form', async () => {
    signIn();
    api();
    render(<DestinationTabs destinations={destinations} activeTab="" canEdit={false} />);
    expect(await screen.findByRole('button', { name: '+ Add' })).toBeDisabled();
  });

  it('renders nothing for a trip without destinations', () => {
    mockFetch(() => json([]));
    const { container } = render(<DestinationTabs destinations={[]} activeTab="" canEdit />);
    expect(container).toBeEmptyDOMElement();
  });
});
