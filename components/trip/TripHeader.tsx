'use client';

import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

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

export default function TripHeader({ trip, isCompleted, activeTab, onTabChange }: TripHeroProps) {
  const router = useRouter();

  const total = totalDays(trip.startDate, trip.endDate);

  return (
    <div className="bg-gradient-to-br from-violet-900 via-purple-700 to-purple-500 pt-5 sm:pt-10 pb-0 px-4 sm:px-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_80%_20%,_#a78bfa,_transparent_60%)]" />
      <div className="max-w-7xl mx-auto relative z-10">
        <button
          onClick={() => router.back()}
          className="text-white/60 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors"
        >
          ← Back to trips
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
          <div className="min-w-0 break-words">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">{trip.title}</h1>
            {trip.description && (
              <p className="text-white/60 mt-1 text-sm">{trip.description}</p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap sm:flex-col items-start sm:items-end gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              isCompleted
                ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
            }`}>
              {isCompleted ? 'Completed' : 'Upcoming'}
            </span>

            <button className="flex items-center gap-2 text-xs text-white font-medium px-3 py-1.5 rounded-full bg-white/15 border border-white/25 hover:bg-white/25 transition-colors backdrop-blur-sm">
              🛂 Visa Check
            </button>
          </div>
        </div>

        {/* meta info */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6 sm:mb-8 text-sm text-white/60">
          <span>📅 <strong className="text-white/90">{formatDate(trip.startDate)}</strong> – <strong className="text-white/90">{formatDate(trip.endDate)}</strong></span>
          <span>⏱ <strong className="text-white/90">{total} days</strong></span>
          <span>📍 <strong className="text-white/90">{trip.destinations.length}</strong> destinations</span>
        </div>

        {/* tabs */}
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain">
          {trip.destinations.map((dest) => {
            const isActive = (activeTab || trip.destinations[0]?.city) === dest.city;
            const flag = countryFlag[dest.country] ?? '🌍';

            return (
              <button
                key={dest.city}
                onClick={() => onTabChange(dest.city)}
                aria-pressed={isActive}
                className={`flex shrink-0 whitespace-nowrap items-center gap-2 px-4 sm:px-5 py-2.5 rounded-t-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gray-50 text-purple-700 font-semibold pb-3'
                    : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                }`}
              >
                {flag} {dest.city}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  )


}