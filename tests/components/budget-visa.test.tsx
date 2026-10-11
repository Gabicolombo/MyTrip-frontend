import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BudgetModal from '@/components/trip/BudgetModal';
import VisaCheck from '@/components/trip/sidebar/VisaCheck';
import { json, mockFetch, requestBody, signIn } from '../helpers';

describe('BudgetModal', () => {
  const destinations = [
    { id: 'd1', city: 'Rome', country: 'Italy' },
    { id: 'd2', city: 'Paris', country: 'France' },
  ];
  const tripSummary = {
    totals: [{ currency: 'EUR', amount: '1234.5' }, { currency: 'USD', amount: '20' }],
    byCategory: [
      { activity: 'Museum', currency: 'EUR', amount: '34.5' },
      { activity: 'Restaurant', currency: 'EUR', amount: '1200' },
      { activity: 'Tour', currency: 'USD', amount: '20' },
    ],
  };

  function open(signedIn = true) {
    const session = signedIn ? signIn() : null;
    const onClose = vi.fn();
    render(<BudgetModal tripId={7} tripTitle="Italy 2026" destinations={destinations} onClose={onClose} />);
    return { session, onClose };
  }

  it('shows the whole trip totals per currency and category', async () => {
    const fetchMock = mockFetch(() => json(tripSummary));
    const { session } = open();
    expect(screen.getByRole('status')).toHaveTextContent('Loading expenses...');

    const totals = await screen.findByRole('region', { name: 'Totals by currency' });
    expect(within(totals).getByText('Total · EUR').parentElement).toHaveTextContent('1,234.50');
    expect(within(totals).getByText('Total · USD').parentElement).toHaveTextContent('20.00');
    expect(screen.getByText('Museum').parentElement).toHaveTextContent('EUR 34.50');
    expect(screen.getByText('Restaurant').parentElement).toHaveTextContent('EUR 1,200.00');
    expect(screen.getByText('Tour').parentElement).toHaveTextContent('USD 20.00');
    expect(screen.getByRole('heading', { name: 'Entire trip · Recorded expenses' })).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/trips/itinerary-by-trip/7');
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${session}` });
  });

  it('adds up the expenses of a single destination', async () => {
    const fetchMock = mockFetch(url => url.endsWith('/trips/itinerary/d1')
      ? json([
        { activity: 'Museum', amount: '10.10', currency: 'EUR' },
        { activity: 'Museum', amount: '5.20', currency: 'EUR' },
        { activity: 'Park', amount: null, currency: null },
      ])
      : json(tripSummary));
    open();
    await screen.findByText('Total · USD');
    await userEvent.click(screen.getByRole('button', { name: 'Rome' }));

    expect(await screen.findByRole('heading', { name: 'Rome, Italy · Recorded expenses' })).toBeInTheDocument();
    expect((await screen.findByText('Total · EUR')).parentElement).toHaveTextContent('15.30');
    expect(screen.queryByText('Total · USD')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rome' })).toHaveAttribute('aria-pressed', 'true');
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('http://localhost:4000/trips/itinerary/d1');
  });

  it('explains when nothing was recorded', async () => {
    mockFetch(() => json({ totals: [], byCategory: [] }));
    open();
    expect(await screen.findByRole('heading', { name: 'No recorded expenses yet' })).toBeInTheDocument();
  });

  it('asks to sign in again without a session', async () => {
    const fetchMock = mockFetch(() => json(tripSummary));
    open(false);
    expect(await screen.findByRole('alert')).toHaveTextContent('Please sign in again to view expenses.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks to sign in again when the session expired', async () => {
    mockFetch(() => json({}, 401));
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Please sign in again to view expenses.');
  });

  it('retries after a failed load', async () => {
    let healthy = false;
    const fetchMock = mockFetch(() => healthy ? json(tripSummary) : json({}, 500));
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load expenses. Please try again.');
    healthy = true;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Total · EUR')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('closes from the header button', async () => {
    mockFetch(() => json(tripSummary));
    const { onClose } = open();
    await userEvent.click(screen.getByRole('button', { name: 'Close budget' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('VisaCheck', () => {
  async function choosePassport(country: string) {
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Your passport'));
    await user.type(await screen.findByRole('combobox', { name: 'Search countries' }), country);
    await user.click(await screen.findByRole('option', { name: country }));
  }

  it('lists each destination country once and needs a passport first', () => {
    render(<VisaCheck destinations={['Italy', ' Italy ', 'Japan', '']} />);
    expect(screen.getAllByText(/^(Italy|Japan)$/).map(item => item.textContent)).toEqual(['Italy', 'Japan']);
    expect(screen.getByRole('button', { name: 'Check requirements' })).toBeDisabled();
  });

  it('asks for a destination when the trip has none', () => {
    render(<VisaCheck destinations={[]} />);
    expect(screen.getByText('Add a destination to check visa requirements.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check requirements' })).toBeDisabled();
  });

  it('checks every destination for the chosen passport and labels the result', async () => {
    const requirements: Record<string, string> = {
      Italy: '90', Japan: 'visa free', Australia: 'eta', India: 'e-visa', Egypt: 'visa on arrival',
      China: 'visa required', Atlantis: '-1', Narnia: 'no admission', Oz: 'ask the wizard',
    };
    const session = signIn();
    const fetchMock = mockFetch((_url, init) => json({ requirement: requirements[JSON.parse(String(init.body)).destination] }));
    render(<VisaCheck destinations={Object.keys(requirements)} />);
    await choosePassport('Brazil');
    await userEvent.click(screen.getByRole('button', { name: 'Check requirements' }));

    const label = async (country: string) => (await screen.findAllByText(country)).at(-1)?.parentElement;
    expect(await label('Italy')).toHaveTextContent('90 days visa-free');
    expect(await label('Japan')).toHaveTextContent('Visa-free');
    expect(await label('Australia')).toHaveTextContent('ETA required');
    expect(await label('India')).toHaveTextContent('E-visa');
    expect(await label('Egypt')).toHaveTextContent('Visa on arrival');
    expect(await label('China')).toHaveTextContent('Visa required');
    expect(await label('Atlantis')).toHaveTextContent('No data');
    expect(await label('Narnia')).toHaveTextContent('No admission');
    expect(await label('Oz')).toHaveTextContent('ask the wizard');
    expect(screen.getByText('Always confirm with the official embassy before travelling.')).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(9);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/trips/visa-check');
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${session}` });
    expect(requestBody(fetchMock)).toEqual({ passport: 'Brazil', destination: 'Italy' });
  });

  it('reports a failed check without partial results', async () => {
    signIn();
    mockFetch((_url, init) => JSON.parse(String(init.body)).destination === 'Japan' ? json({}, 500) : json({ requirement: '90' }));
    render(<VisaCheck destinations={['Italy', 'Japan']} />);
    await choosePassport('Brazil');
    await userEvent.click(screen.getByRole('button', { name: 'Check requirements' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to check visa requirements. Please try again later.');
    expect(screen.queryByText('90 days visa-free')).not.toBeInTheDocument();
  });
});
