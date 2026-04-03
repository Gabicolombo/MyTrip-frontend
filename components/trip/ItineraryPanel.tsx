'use client';

import { formatDate } from '@/lib/utils';
import { useState  } from 'react';

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

interface ItineraryPanelProps {
  city: string;
  startDate: string;
  endDate: string;
  id: string;
  places: Itinerary[];
  selectedPlace: string | null;
  onSelectPlace: (placeId: string) => void;
  onAddPlace: () => void;
}

export default function ItineraryPanel({ city, startDate, endDate, id, places, selectedPlace, onSelectPlace, onAddPlace }: ItineraryPanelProps) {

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // we need to group by day
  const groupedByDay = places.reduce((acc, place) => {
    if (!acc[place.day]) {
      acc[place.day] = [];
    }
    acc[place.day].push(place);
    return acc;
  }, {} as Record<string, Itinerary[]>);

  const formatTime = (time: string) => time.slice(0, 5);

  const pinLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  console.log('endDate', endDate, 'startDate', startDate);
  return (
    <div className='bg-white rounded-2xl shadow-sm overflow-hidden'>
      {/**header */}
      <div className='flex justify-between items-center px-5 py-4 border-b border-gray-100'>
        <h3 className='font-semibold text-gray-800'>🗺 {city} Itinerary</h3>
        <div className='flex items-center gap-4'>
          <span className='text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full'>
            {formatDate(startDate)} – {formatDate(endDate)}
          </span>
          {
            places.length > 0 && (
              <button onClick={onAddPlace}
                className='flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-full transaction-colors'>
                + Add
              </button>
            )
          }
        </div>
      </div>
        
      {places.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
          <span className="text-4xl">🗺️</span>
          <p className="font-semibold text-gray-600">No places yet</p>
          <p className="text-sm text-gray-400 max-w-[200px] leading-relaxed">
            Add the places you want to visit in {city}
          </p>
          <button
            onClick={onAddPlace}
            className="mt-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-full transition-colors"
          >
            + Add first place
          </button>
        </div>
      )}

      {Object.entries(groupedByDay).map(([day, dayPlaces]) => (
          <div key={day} className='border-b border-gray-100 last:border-none'>
            <div className='px-5 py-2 bg-gray-50 text-xs font-semibold uppercase tracking-widest text-purple-400'>
              {formatDate(day)}
            </div>


            {dayPlaces.map((place, index) => {
              const letter = pinLetters[places.indexOf(place)];
              const isActive = selectedPlace === place.id;
              return (
                <div key={place.id} onClick={() => onSelectPlace(place.id)} 
                className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors border-l-2 ${
                  isActive
                    ? 'bg-purple-50 border-l-purple-600'
                    : 'border-l-transparent hover:bg-purple-50'
                }`}>

                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                      isActive
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-100 text-purple-600'
                    }`}>
                      {letter}
                  </div>

                  {/**Info place */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{place.name}</p>
                    <p className="text-xs text-gray-400">{place.activity}</p>
                  </div>

                  {/* time */}
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {formatTime(place.time)}
                  </span>

                </div>
              )
            })}

          </div>
        ))
      }
 
    </div>


  )
}