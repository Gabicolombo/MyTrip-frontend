export type TransportMode = 'FLIGHT' | 'TRAIN' | 'BUS' | 'CAR' | 'BOAT' | 'OTHER';

export interface Transport {
  id: string;
  mode: TransportMode;
  fromDestinationId: string;
  toDestinationId: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  carrier: string;
  reference: string | null;
  amount: string | null;
  currency: string | null;
}

export const TRANSPORT_MODES: { value: TransportMode; label: string; emoji: string }[] = [
  { value: 'FLIGHT', label: 'Flight', emoji: '✈️' },
  { value: 'TRAIN', label: 'Train', emoji: '🚆' },
  { value: 'BUS', label: 'Bus', emoji: '🚌' },
  { value: 'CAR', label: 'Car', emoji: '🚗' },
  { value: 'BOAT', label: 'Boat', emoji: '⛴️' },
  { value: 'OTHER', label: 'Other', emoji: '📌' },
];

export function transportMode(mode: TransportMode) {
  return TRANSPORT_MODES.find(option => option.value === mode) ?? TRANSPORT_MODES[TRANSPORT_MODES.length - 1];
}
