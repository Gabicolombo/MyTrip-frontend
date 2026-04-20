'use client';

import { useState, useEffect } from 'react';
import ItineraryPanel from './ItineraryPanel';
import AddItinerary from './AddItinerary';

interface Destination {
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  id: string;
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

interface Itinerary {
  id: string;
  name: string;
  activity: string;
  day: string;
  time: string;
  latitude: number;
  longitude: number;
  notes: string | null;
  link: string | null;
}

const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
}

export default function DestinationTabs({ destinations, activeTab }: DestinationTabsProps) {
  const [editingItinerary, setEditingItinerary] = useState<Itinerary | null>(null);  
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  let activeDestination = destinations.find(dest => dest.city === activeTab);
  activeDestination ??= destinations[0];

  async function fetchItinerary() {
    try {
      const res = await fetch(`http://localhost:4000/trips/itinerary/${activeDestination?.id}`, {
        headers
      });
      const data = await res.json();
      setItinerary(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function onDeletePlace(place: Itinerary) {
    try {
      const res = await fetch(`http://localhost:4000/trips/delete-itinerary/${place.id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete the itinerary');
      }

      fetchItinerary();
      
    } catch (err: unknown) {
      throw err instanceof Error ? err.message : 'Something went wrong';
    }
  }

  useEffect(() => {
    fetchItinerary();
  }, [activeDestination?.id]);

  if (!activeDestination && destinations.length === 0) {
    return null;
  }

  return (
    <div className='grid grid-cols-2 gap-4'>
      {/**itinerary */}

      <ItineraryPanel
        city={activeDestination.city}
        startDate={activeDestination.startDate}
        endDate={activeDestination.endDate}
        id={activeDestination.id}
        places={itinerary}
        selectedPlace={selectedPlace}
        onSelectPlace={(placeId) => setSelectedPlace(placeId)}
        onAddPlace={() => setDrawerOpen(true)}
        onEditPlace={(place) => {
          setEditingItinerary(place);
          setDrawerOpen(true);
        }}
        onDeletePlace={(place) => {
          onDeletePlace(place);
        }}
      />

      {drawerOpen && (
        <AddItinerary
          destinationId={activeDestination.id}
          startDate={activeDestination.startDate}
          endDate={activeDestination.endDate}
          onClose={() => { 
            setDrawerOpen(false);   
            setEditingItinerary(null); 
          }}
          onSuccess={() => { fetchItinerary(); setDrawerOpen(false); setEditingItinerary(null); }}
          itinerary={editingItinerary ?? undefined}
        />
      )}

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