import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AddDestinationsModal from '@/components/trip/AddDestinationModal';
import EditTripModal from '@/components/trip/EditTripModal';
import RegisterTripModal from '@/components/trip/RegisterTripModal';
import { json, mockFetch, requestBody, signIn } from '../helpers';

const setDates = (container: HTMLElement, ...values: string[]) => {
  const inputs = container.querySelectorAll('input[type="date"]');
  values.forEach((value, index) => fireEvent.change(inputs[index], { target: { value } }));
};
const formData = (mock: ReturnType<typeof mockFetch>) => mock.mock.calls[0][1]?.body as FormData;

describe('RegisterTripModal', () => {
  function open() {
    const session = signIn();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const view = render(<RegisterTripModal onClose={onClose} onSuccess={onSuccess} />);
    return { session, onClose, onSuccess, ...view };
  }

  it('creates a trip with its photo and refreshes the list', async () => {
    const fetchMock = mockFetch(() => json({ id: 1 }, 201));
    const { session, onClose, onSuccess, container } = open();
    const photo = new File(['x'], 'rome.png', { type: 'image/png' });

    await userEvent.type(screen.getByPlaceholderText('Summer in Italy'), 'Italy 2026');
    await userEvent.type(screen.getByPlaceholderText(/A quick note/), 'Family trip');
    setDates(container, '2026-06-01', '2026-06-10');
    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, photo);
    expect(screen.getByText('rome.png')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Create trip/ }));

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/trips/create-trip');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${session}` });
    const body = formData(fetchMock);
    expect(Object.fromEntries([...body.entries()].filter(([key]) => key !== 'file'))).toEqual({
      title: 'Italy 2026', description: 'Family trip', startDate: '2026-06-01', endDate: '2026-06-10',
    });
    expect((body.get('file') as File).name).toBe('rome.png');
  });

  it('shows the API error and stays open', async () => {
    mockFetch(() => json({ message: 'End date must be after start date' }, 400));
    const { onClose, onSuccess, container } = open();
    await userEvent.type(screen.getByPlaceholderText('Summer in Italy'), 'Italy');
    setDates(container, '2026-06-10', '2026-06-01');
    await userEvent.click(screen.getByRole('button', { name: /Create trip/ }));
    expect(await screen.findByText('End date must be after start date')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on cancel without saving', async () => {
    const fetchMock = mockFetch(() => json({}));
    const { onClose } = open();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('EditTripModal', () => {
  const trip = { id: '7', title: 'Italy', description: 'Old notes', imageUrl: 'https://img.example/italy.jpg' };

  function open() {
    signIn();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    render(<EditTripModal trip={trip} onClose={onClose} onSuccess={onSuccess} />);
    return { onClose, onSuccess };
  }

  it('starts with the current trip and saves the changes', async () => {
    const fetchMock = mockFetch(() => json({}));
    const { onClose, onSuccess } = open();
    const title = screen.getByLabelText('Trip title');
    expect(title).toHaveValue('Italy');
    expect(screen.getByLabelText('Description')).toHaveValue('Old notes');
    expect(screen.getByAltText('Current trip photo')).toHaveAttribute('src', trip.imageUrl);

    await userEvent.clear(title);
    await userEvent.type(title, '  Italy 2026 ');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/trips/update-trip/7');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PATCH');
    expect(Object.fromEntries(formData(fetchMock).entries())).toEqual({ title: 'Italy 2026', description: 'Old notes' });
  });

  it('rejects a blank title without calling the API', async () => {
    const fetchMock = mockFetch(() => json({}));
    open();
    const title = screen.getByLabelText('Trip title');
    await userEvent.clear(title);
    await userEvent.type(title, '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please enter a trip title.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows API validation errors', async () => {
    mockFetch(() => json({ message: ['title too long', 'description too long'] }, 400));
    const { onClose } = open();
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('title too long, description too long');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('AddDestinationsModal', () => {
  function open(destination?: { id: string; city: string; country: string; startDate: string; endDate: string }) {
    const session = signIn();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const view = render(<AddDestinationsModal tripId="7" destination={destination} onClose={onClose} onSuccess={onSuccess} />);
    return { session, onClose, onSuccess, ...view };
  }

  async function chooseCountry(index: number, country: string) {
    const user = userEvent.setup();
    await user.click(screen.getAllByLabelText('Country')[index]);
    await user.type(await screen.findByRole('combobox', { name: 'Search countries' }), country);
    await user.click(await screen.findByRole('option', { name: country }));
  }

  it('adds several destinations in order', async () => {
    const fetchMock = mockFetch(() => json({}, 201));
    const { session, onClose, onSuccess, container } = open();

    await userEvent.click(screen.getByRole('button', { name: '+ Add destination' }));
    await userEvent.click(screen.getByRole('button', { name: '+ Add destination' }));
    expect(screen.getByText('Destination 3')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: /Remove/ })[2]);
    expect(screen.queryByText('Destination 3')).not.toBeInTheDocument();

    const cities = screen.getAllByPlaceholderText('e.g. Rome');
    await userEvent.type(cities[0], 'Rome');
    await userEvent.type(cities[1], 'Paris');
    await chooseCountry(0, 'Italy');
    await chooseCountry(1, 'France');
    setDates(container, '2026-06-01', '2026-06-04', '2026-06-04', '2026-06-08');
    await userEvent.click(screen.getByRole('button', { name: /Save destinations/ }));

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/trips/add-destination');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${session}` });
    expect(requestBody(fetchMock)).toEqual([
      { tripId: '7', city: 'Rome', country: 'Italy', startDate: '2026-06-01', endDate: '2026-06-04', orderIndex: 1 },
      { tripId: '7', city: 'Paris', country: 'France', startDate: '2026-06-04', endDate: '2026-06-08', orderIndex: 2 },
    ]);
  });

  it('edits a single existing destination', async () => {
    const fetchMock = mockFetch(() => json({}));
    const { onSuccess } = open({
      id: 'd1', city: 'Rome', country: 'Italy',
      startDate: '2026-06-01T00:00:00.000Z', endDate: '2026-06-04T00:00:00.000Z',
    });
    expect(screen.getByRole('heading', { name: 'Edit destination' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Add destination' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();

    const city = screen.getByPlaceholderText('e.g. Rome');
    expect(city).toHaveValue('Rome');
    await userEvent.clear(city);
    await userEvent.type(city, 'Florence');
    await userEvent.click(screen.getByRole('button', { name: /Save destinations/ }));

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/trips/update-destination/d1');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PATCH');
    expect(requestBody(fetchMock)).toEqual({ city: 'Florence', country: 'Italy', startDate: '2026-06-01', endDate: '2026-06-04' });
  });

  it('asks for a country before saving', async () => {
    const fetchMock = mockFetch(() => json({}, 201));
    const { container } = open();
    await userEvent.type(screen.getByPlaceholderText('e.g. Rome'), 'Rome');
    setDates(container, '2026-06-01', '2026-06-04');
    await userEvent.click(screen.getByRole('button', { name: /Save destinations/ }));
    expect(await screen.findByText('Please select a country for every destination.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the API error and stays open', async () => {
    mockFetch(() => json({ message: 'Destination dates are outside the trip' }, 400));
    const { onClose, onSuccess } = open({ id: 'd1', city: 'Rome', country: 'Italy', startDate: '2026-06-01', endDate: '2026-06-04' });
    await userEvent.click(screen.getByRole('button', { name: /Save destinations/ }));
    expect(await screen.findByText('Destination dates are outside the trip')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
