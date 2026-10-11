import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DaySelect from '@/components/trip/DaySelect';
import ItineraryPanel, { type Itinerary } from '@/components/trip/ItineraryPanel';
import TripHeader from '@/components/trip/TripHeader';
import TripInfo from '@/components/trip/sidebar/TripInfo';
import { router } from '../helpers';

const place = (id: string, name: string, day: string, time: string): Itinerary => ({
  id, name, activity: 'Museum', day, time, latitude: 41.9, longitude: 12.49, notes: null, link: null,
});
const places = [
  place('p1', 'Colosseum', '2026-06-01', '09:30:00'),
  place('p2', 'Pantheon', '2026-06-01', '14:00:00'),
  place('p3', 'Vatican', '2026-06-02', '10:15:00'),
];

describe('ItineraryPanel', () => {
  function open(list = places, canEdit = true) {
    const handlers = { onSelectPlace: vi.fn(), onAddPlace: vi.fn(), onEditPlace: vi.fn(), onDeletePlace: vi.fn() };
    render(<ItineraryPanel city="Rome" startDate="2026-06-01" endDate="2026-06-03" id="d1"
      places={list} selectedPlace={null} canEdit={canEdit} {...handlers} />);
    return handlers;
  }

  it('groups places by day with their pin letter, time and directions', () => {
    open();
    expect(screen.getByRole('heading', { name: /Rome Itinerary/ })).toBeInTheDocument();
    expect(screen.getByText('01 Jun 2026 – 03 Jun 2026')).toBeInTheDocument();
    expect(screen.getByText('01 Jun 2026')).toBeInTheDocument();
    expect(screen.getByText('02 Jun 2026')).toBeInTheDocument();

    const row = screen.getByText('Vatican').closest('.itinerary-plan') as HTMLElement;
    expect(within(row).getByText('C')).toBeInTheDocument();
    expect(within(row).getByText('10:15')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Get directions' }))
      .toHaveAttribute('href', expect.stringContaining('destination=41.9,12.49'));
  });

  it('selects, edits and deletes a place independently', async () => {
    const handlers = open();
    await userEvent.click(screen.getByText('Pantheon'));
    expect(handlers.onSelectPlace).toHaveBeenCalledWith('p2');

    await userEvent.click(screen.getByRole('button', { name: 'Edit Pantheon' }));
    expect(handlers.onEditPlace).toHaveBeenCalledWith(places[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Delete Pantheon' }));
    expect(handlers.onDeletePlace).toHaveBeenCalledWith(places[1]);
    expect(handlers.onSelectPlace).toHaveBeenCalledTimes(1);
  });

  it('invites the first place when the destination is empty', async () => {
    const handlers = open([]);
    expect(screen.getByText('No places yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Add' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+ Add first place' }));
    expect(handlers.onAddPlace).toHaveBeenCalledTimes(1);
  });

  it('adds another place from the header', async () => {
    const handlers = open();
    await userEvent.click(screen.getByRole('button', { name: '+ Add' }));
    expect(handlers.onAddPlace).toHaveBeenCalledTimes(1);
  });

  it.each([[places, '+ Add'], [[], '+ Add first place']])('disables adding for viewers', async (list, name) => {
    const handlers = open(list, false);
    const button = screen.getByRole('button', { name });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', "Viewers can't add places");
    await userEvent.click(button);
    expect(handlers.onAddPlace).not.toHaveBeenCalled();
  });
});

describe('TripHeader', () => {
  const trip = {
    title: 'Italy 2026', description: 'Family trip', startDate: '2026-06-01', endDate: '2026-06-10', imageUrl: 'https://img.example/italy.jpg',
    destinations: [
      { city: 'Rome', country: 'IT', startDate: '2026-06-01', endDate: '2026-06-05' },
      { city: 'Paris', country: 'FR', startDate: '2026-06-05', endDate: '2026-06-10' },
    ],
  };

  function open(props: Partial<React.ComponentProps<typeof TripHeader>> = {}) {
    const handlers = { onTabChange: vi.fn(), onEdit: vi.fn(), onBudget: vi.fn() };
    render(<TripHeader trip={trip} isCompleted={false} activeTab="" {...handlers} {...props} />);
    return handlers;
  }

  it('summarizes the trip', () => {
    open();
    expect(screen.getByRole('heading', { name: 'Italy 2026' })).toBeInTheDocument();
    expect(screen.getByText('Family trip')).toBeInTheDocument();
    expect(screen.getByAltText('Italy 2026')).toHaveAttribute('src', trip.imageUrl);
    expect(screen.getByText(/01 Jun 2026 – 10 Jun 2026/)).toBeInTheDocument();
    expect(screen.getByText(/9 days/)).toBeInTheDocument();
    expect(screen.getByText(/2 destinations/)).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('marks a finished trip as completed', () => {
    open({ isCompleted: true });
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('selects the first destination by default and switches tabs', async () => {
    const handlers = open();
    expect(screen.getByRole('button', { name: /Rome/ })).toHaveAttribute('aria-pressed', 'true');
    const paris = screen.getByRole('button', { name: /Paris/ });
    expect(paris).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(paris);
    expect(handlers.onTabChange).toHaveBeenCalledWith('Paris');
  });

  it('highlights the active destination', () => {
    open({ activeTab: 'Paris' });
    expect(screen.getByRole('button', { name: /Paris/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Rome/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('opens editing and budget, and goes back to the trips list', async () => {
    const handlers = open();
    await userEvent.click(screen.getByRole('button', { name: 'Edit trip' }));
    expect(handlers.onEdit).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Budget' }));
    expect(handlers.onBudget).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'My trips' }));
    expect(router.push).toHaveBeenCalledWith('/home');
  });
});

describe('TripInfo', () => {
  it('shows the dates, duration and status', () => {
    render(<TripInfo checkIn="2026-06-01" checkOut="2026-06-10" status="Upcoming" />);
    expect(screen.getByText('01 Jun 2026')).toBeInTheDocument();
    expect(screen.getByText('10 Jun 2026')).toBeInTheDocument();
    expect(screen.getByText('9 days')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });
});

describe('DaySelect', () => {
  const days = ['2026-06-01', '2026-06-02', '2026-06-03'];

  it('shows the selected day and picks another with the mouse', async () => {
    const onChange = vi.fn();
    render(<DaySelect days={days} value="2026-06-01" onChange={onChange} />);
    const trigger = screen.getByRole('combobox', { name: 'Day' });
    expect(trigger).toHaveTextContent('Jun 1, Mon');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await userEvent.click(trigger);
    const options = screen.getAllByRole('option');
    expect(options.map(option => option.textContent)).toEqual(['Jun 1, Mon', 'Jun 2, Tue', 'Jun 3, Wed']);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(options[2]);

    expect(onChange).toHaveBeenCalledWith('2026-06-03');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('picks a day with the keyboard and closes on Escape', async () => {
    const onChange = vi.fn();
    render(<DaySelect days={days} value="2026-06-01" onChange={onChange} />);
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('2026-06-02');

    await user.keyboard('{ArrowDown}{End}{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('cannot be opened when disabled or without days', () => {
    const { rerender } = render(<DaySelect days={days} value="2026-06-01" onChange={vi.fn()} disabled />);
    expect(screen.getByRole('combobox', { name: 'Day' })).toBeDisabled();
    rerender(<DaySelect days={[]} value="" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Day' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Day' })).toHaveTextContent('Select a day');
  });
});
