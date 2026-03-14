'use client';

import { formatDate } from '@/lib/utils';
import { useState } from 'react';
import ItineraryPanel from './ItineraryPanel';

interface Destination {
  city: string;
  country: string;
  startDate: string;
  endDate: string;
}

interface DestinationTabsProps {
  destinations: Destination[];
  activeTab: string;
}

interface Place {
  id: string;
  name: string;
  type: string;
  day: string;
  time: string;
  notes?: string;
}

export default function DestinationTabs({ destinations, activeTab }: DestinationTabsProps) {
  const [places, setPlaces] = useState<Record<string, Place[]>>({});
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  let activeDestination = destinations.find(dest => dest.city === activeTab);
  if (!activeDestination && destinations.length === 0) {
    return null;
  }
  activeDestination ??= destinations[0];

  const activePlaces = places[activeTab] ?? [];

  return (
    <div className='grid grid-cols-2 gap-4'>
      {/**itinerary */}

      <ItineraryPanel
        city={activeDestination.city}
        startDate={activeDestination.startDate}
        endDate={activeDestination.endDate}
        places={activePlaces}
        selectedPlace={selectedPlace}
        onSelectPlace={(placeId) => setSelectedPlace(placeId)}
        onAddPlace={() => setDrawerOpen(true)}
      />

      {/* <div className='bg-white rounded-2xl shadow-sm overflow-hidden'>
        <div className='flex justify-between items-center px-5 py-4 border-b border-gray-100'>
          <h3 className='font-semibold text-gray-800'>
            🗺 {activeDestination.city}, {activeDestination.country} Itinerary
          </h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {formatDate(activeDestination.startDate)} – {formatDate(activeDestination.endDate)}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
          <span className='text-4xl'>🗺️</span>
          <p className='font-semibold text-gray-600'>No places yet</p>
          <p className="text-sm text-gray-400 max-w-[200px] leading-relaxed">
            Add the places you want to visit in {activeDestination.city}
          </p>
          <button className='mt-2 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-full transition-colors'>
            + Add first place
          </button>
        </div>
      </div> */}

      {/**map */}
      <div className='bg-white rounded-2xl shadow-sm overflow-hidden sticky top-6'>
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_#D1FAE5]" />
          <span className="text-sm font-semibold text-gray-700">
            {activeDestination.city}, {activeDestination.country}
          </span>
        </div>
        {/*placeholder for map*/}
        <div className='h-96 bg-gradient-to-br from-violet-100 via-purple-100 to-purple-200 flex flex-col items-center justify-center gap-2 text-gray-400'>
          <span className='text-4xl opacity-40'>📍</span>
          <span className='text-sm'>Map coming soon</span>
        </div>
      </div>
    </div>
  )

}