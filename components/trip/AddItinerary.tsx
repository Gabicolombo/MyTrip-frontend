'use client';

import { useState, useRef, useEffect } from 'react';

interface AddItineraryProps {
  destinationId: string;         
  startDate: string;             
  endDate: string;              
  onClose: () => void;
  onSuccess: () => void;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
}

const ACTIVITIES = [
  { value: 'Sightseeing', emoji: '🏛️' },
  { value: 'Food',        emoji: '🍽️' },
  { value: 'Transport',   emoji: '🚆' },
  { value: 'Nature',      emoji: '🌿' },
  { value: 'Shopping',    emoji: '🛍️' },
  { value: 'Tour',        emoji: '🎟️' },
  { value: 'Other',       emoji: '📌' },
];

export default function AddItinerary({ destinationId, startDate, endDate, onClose, onSuccess }: AddItineraryProps) {
  const [name, setName] = useState('');
  const [activity, setActivity] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [latitude, setLatitude]   = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions]   = useState<NominatimResult[]>([]);
  const [searching, setSearching]       = useState(false);
  const [coordsConfirmed, setCoordsConfirmed] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const justSelected = useRef(false);
  const days = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d).toISOString().split('T')[0]);
  }

  // Handle place search input changes
  useEffect(() => {

    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    setCoordsConfirmed(false);
    setLatitude(null);
    setLongitude(null);

    if (name.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(async () => {
      try {
 
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=5`);
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error('Error fetching location suggestions:', err);
      } finally {
        setSearching(false);
      }
    }, 450);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    }

  }, [name]);


  function handleSelectSuggestion(place: NominatimResult) {
    justSelected.current = true;
    setName(place.name);
    setLatitude(parseFloat(place.lat));
    setLongitude(parseFloat(place.lon));
    setSuggestions([]);
    setCoordsConfirmed(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!coordsConfirmed || latitude === null || longitude === null) {
      setError('Please select a place from the suggestions list.');
      return;
    }
    if (!activity) {
      setError('Please select an activity type.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:4000/trips/add-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          tripDestinationId: destinationId,
          name,
          activity,
          day,
          time,
          latitude,
          longitude,
          notes: notes || null,
          link: link || null,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create trip');
      }

      onSuccess();
      onClose();
      } catch(err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    // overlay 
    <div className='fixed inset-0 bg-black/30 z-50 flex justify-end'>
      {/**forms on the right side*/}
      <div className='w-[420px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300'>
        {/**header */}
        <div className='flex justify-between items-center px-6 py-5 border-b border-gray-100'>
          <h2 className='text-lg font-semibold text-gray-800'>Add place</h2>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600 transition-colors'>X</button>
        </div>

        {/**form */}
        <form onSubmit={handleSubmit} className='flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5'>

          {error && (
            <p className='rounded-lg border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500'>{error}</p>
          )}

          {/**place name with suggestions */}
          <div className='flex flex-col gap-2.5'>
            <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Place name</label>

            <div className='relative'>
              <input type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Eiffel Tower'
                className='w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400'
              />

              {suggestions.length > 0 && (
                <ul className='absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden max-h-52 overflow-y-auto'>
                  {suggestions.map((place) => {
                    const parts = place.display_name.split(', ');
                    const name = place.name;
                    const address = parts.slice(1, 3).join(', '); 

                    return (
                      <li
                        key={place.place_id}
                        onMouseDown={() => handleSelectSuggestion(place)}
                        className='flex items-start gap-2 px-3 py-2.5 hover:bg-purple-50 cursor-pointer border-b border-gray-50 last:border-none'
                      >
                        <span className="text-purple-400 mt-0.5">📍</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{name}</p>
                          <p className="text-xs text-gray-400">{address}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

            </div>

             {searching && (
                <p className="text-xs text-gray-400">Searching…</p>
              )} 

              {coordsConfirmed && latitude && longitude && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                  <span>📍</span>
                  <span>{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
                </div>
              )}

            {/**activity type */}
            <div className='flex flex-col gap-1.5'>
              <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Type</label>

              <div className='flex flex-wrap gap-2'>
                {ACTIVITIES.map((act) => (
                  <button 
                    key={act.value}
                    type='button'
                    onClick={() => setActivity(act.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    activity === act.value
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-purple-400'
                  }`}
                  >
                    {act.emoji} {act.value}
                  </button>
                ))}
              </div>

            </div>

            {/**day and time */}
            <div className='grid grid-cols-2 gap-3'>
                <div className='flex flex-col gap-1.5'>
                  <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Day</label>

                  <select 
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    required
                    className='rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400'
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className='flex flex-col gap-1.5'>
                  <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Time</label>
                  
                </div>
            </div>


          </div>

        </form>

      </div>


    </div>
  )

}