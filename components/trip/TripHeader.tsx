'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { transportMode, type Transport } from '@/lib/transport';
import { ArrowLeft, Pencil, Wallet } from 'lucide-react';

interface Destination {
  id: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
}

interface Trip {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  imageUrl: string;
  destinations: Destination[];
}

interface TripHeroProps {
  trip: Trip;
  isCompleted: boolean;
  activeTab: string;
  onTabChange: (city: string) => void;
  onEdit: () => void;
  onBudget: () => void;
  transports?: Transport[];
  canEdit?: boolean;
  onAddTransport?: (from: Destination, to: Destination) => void;
  onEditTransport?: (transport: Transport) => void;
  onDeleteTransport?: (transport: Transport) => void;
}

const countryFlag: Record<string, string> = {
  UK: '🇬🇧',
  FR: '🇫🇷',
  ES: '🇪🇸',
  IT: '🇮🇹',
  DE: '🇩🇪',
  PT: '🇵🇹',
  US: '🇺🇸',
  BR: '🇧🇷',
};

const totalDays = (startDate: string, endDate: string) => {
  return Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime())
    / (1000 * 60 * 60 * 24)
  )
}

export default function TripHeader({ trip, isCompleted, activeTab, onTabChange, onEdit, onBudget, transports = [], canEdit = false, onAddTransport, onEditTransport, onDeleteTransport }: TripHeroProps) {
  const router = useRouter();
  const [selectedTransportId, setSelectedTransportId] = useState<string | null>(null);
  const selectedTransport = transports.find(transport => transport.id === selectedTransportId);
  const cityOf = (id: string) => trip.destinations.find(dest => dest.id === id)?.city ?? '';

  const total = totalDays(trip.startDate, trip.endDate);

  return (
    <header className="max-w-7xl mx-auto px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <div className="min-w-0">
        <button
          onClick={() => router.push('/home')}
          className="min-h-11 text-gray-500 hover:text-purple-700 text-sm mb-3 flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={16} /> My trips
        </button>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="relative h-40 sm:h-56 lg:h-72 bg-gradient-to-br from-violet-900 via-purple-700 to-purple-400">
            {trip.imageUrl && (
              // Trip photos may be hosted on arbitrary API image hosts.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={trip.imageUrl} alt={trip.title} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
              <div className="min-w-0 break-words">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 [overflow-wrap:anywhere]">{trip.title}</h1>
                {trip.description && (
                  <p className="text-gray-500 mt-2 text-sm sm:text-base whitespace-pre-line [overflow-wrap:anywhere]">{trip.description}</p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap sm:flex-col items-start sm:items-end gap-2">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  isCompleted
                    ? 'bg-gray-100 text-gray-600 border border-gray-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {isCompleted ? 'Completed' : 'Upcoming'}
                </span>

                <button onClick={onEdit} className="flex min-h-11 items-center gap-2 text-sm text-purple-700 font-semibold px-4 py-2 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors">
                  <Pencil size={16} /> Edit trip
                </button>
                <button type="button" onClick={onBudget} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700">
                  <Wallet size={16} /> Budget
                </button>
              </div>
            </div>

            {/* meta info */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-600">
              <span>📅 {formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
              <span>⏱ {total} days</span>
              <span>📍 {trip.destinations.length} destinations</span>
            </div>
              </div>
            </div>

            {/* tabs, with transport legs between neighbouring destinations */}
            <div aria-label="Trip destinations" className="flex items-center overflow-x-auto overscroll-x-contain mt-5 pb-2">
              {trip.destinations.map((dest, index) => {
                const isActive = (activeTab || trip.destinations[0]?.city) === dest.city;
                const flag = countryFlag[dest.country] ?? '🌍';
                const next = trip.destinations[index + 1];
                const legs = next ? transports.filter(transport => transport.fromDestinationId === dest.id && transport.toDestinationId === next.id) : [];

                return (
                  <div key={dest.city} className="flex shrink-0 items-center">
                    <button
                      onClick={() => onTabChange(dest.city)}
                      aria-pressed={isActive}
                      className={`flex min-h-11 shrink-0 whitespace-nowrap items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-purple-600 text-white font-semibold'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-purple-50 hover:text-purple-700'
                      }`}
                    >
                      {flag} {dest.city}
                    </button>

                    {next && (
                      <div className="flex shrink-0 items-center gap-1 px-1">
                        <span aria-hidden="true" className="w-3 border-t-2 border-dashed border-gray-300" />
                        {legs.map(leg => {
                          const option = transportMode(leg.mode);
                          const isOpen = selectedTransportId === leg.id;
                          return (
                            <button key={leg.id} type="button" aria-expanded={isOpen}
                              onClick={() => setSelectedTransportId(isOpen ? null : leg.id)}
                              className={`flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                                isOpen ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-600 hover:border-purple-400'
                              }`}>
                              {option.emoji} {option.label}
                              {leg.amount && leg.currency && <span className="tabular-nums text-gray-400">{leg.currency} {leg.amount}</span>}
                            </button>
                          );
                        })}
                        {legs.length === 0 && canEdit && onAddTransport && (
                          <button type="button" aria-label="Add transport" title={`Add transport from ${dest.city} to ${next.city}`}
                            onClick={() => onAddTransport(dest, next)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-purple-300 bg-white text-lg font-semibold leading-none text-purple-600 transition-colors hover:border-purple-600 hover:bg-purple-50">
                            +
                          </button>
                        )}
                        <span aria-hidden="true" className="w-3 border-t-2 border-dashed border-gray-300" />
                      </div>
                    )}
                  </div>
                );
              })}
              {trip.destinations.length === 1 && canEdit && (
                <span className="ml-3 shrink-0 whitespace-nowrap rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-400">
                  🚆 Add another destination to plan transport between cities
                </span>
              )}
            </div>

            {selectedTransport && (
              <div className="mt-2 grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-5 sm:items-start">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">{transportMode(selectedTransport.mode).emoji} {transportMode(selectedTransport.mode).label}</p>
                  <p className="text-sm font-medium text-gray-700 break-words">{selectedTransport.carrier}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Departs · {cityOf(selectedTransport.fromDestinationId)}</p>
                  <p className="text-sm font-medium text-gray-700">{formatDate(selectedTransport.departureDate)} · {selectedTransport.departureTime.slice(0, 5)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Arrives · {cityOf(selectedTransport.toDestinationId)}</p>
                  <p className="text-sm font-medium text-gray-700">{formatDate(selectedTransport.arrivalDate)} · {selectedTransport.arrivalTime.slice(0, 5)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Booking</p>
                  <p className="text-sm font-medium text-gray-700 break-words">{selectedTransport.reference || '—'}</p>
                </div>
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-400">Price</p>
                    <p className="text-sm font-medium tabular-nums text-gray-700">{selectedTransport.amount && selectedTransport.currency ? `${selectedTransport.currency} ${selectedTransport.amount}` : '—'}</p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => onEditTransport?.(selectedTransport)} className="min-h-9 rounded-lg px-2 text-xs font-semibold text-purple-700 hover:bg-purple-50">Edit</button>
                      <button type="button" onClick={() => onDeleteTransport?.(selectedTransport)} className="min-h-9 rounded-lg px-2 text-xs font-semibold text-red-500 hover:bg-red-50">Delete</button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </header>
      )


    }
