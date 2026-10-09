'use client';

import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Pencil, Wallet } from 'lucide-react';

interface Destination {
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

export default function TripHeader({ trip, isCompleted, activeTab, onTabChange, onEdit, onBudget }: TripHeroProps) {
  const router = useRouter();

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

            {/* tabs */}
            <div aria-label="Trip destinations" className="flex gap-2 overflow-x-auto overscroll-x-contain mt-5 pb-2">
              {trip.destinations.map((dest) => {
                const isActive = (activeTab || trip.destinations[0]?.city) === dest.city;
                const flag = countryFlag[dest.country] ?? '🌍';

                return (
                  <button
                    key={dest.city}
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
                );
              })}
            </div>

          </div>
        </header>
      )


    }
