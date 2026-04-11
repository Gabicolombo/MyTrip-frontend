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
  { value: 'Museum', emoji: '🏛️' },
  { value: 'Restaurant',        emoji: '🍽️' },
  { value: 'Beach',   emoji: '🏖️' },
  { value: 'Hiking',      emoji: '🌿' },
  { value: 'Culture',    emoji: '⛩️' },
  { value: 'Park',    emoji: '🏞️' },
  { value: 'House',    emoji: '🏖️' },
  { value: 'Tour',        emoji: '🎟️' },
  { value: 'Other',       emoji: '📌' },
];

export default function AddItinerary({ destinationId, startDate, endDate, onClose, onSuccess }: AddItineraryProps) {
  const [name, setName] = useState('');
  const [activity, setActivity] = useState('');
  const [time, setTime] = useState('');
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('AM');
  const [latitude, setLatitude]   = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [suggestions, setSuggestions]   = useState<NominatimResult[]>([]);
  const [searching, setSearching]       = useState(false);
  const [coordsConfirmed, setCoordsConfirmed] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const justSelected = useRef(false);
  const days = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d).toISOString().split('T')[0]);
  }
  const [day, setDay] = useState(days[0]);
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

  useEffect(() => {
    setTime(`${hour.padStart(2, '0')}:${minute.padStart(2, '0')} ${ampm}`);
  }, [hour, minute, ampm]);

  useEffect(() => {
    document.addEventListener('mousedown', (event) => {
      if (pickerRef.current && event.target && !pickerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    })
  }, [])

  function handleSelectSuggestion(place: NominatimResult) {
    justSelected.current = true;
    setName(place.name);
    setLatitude(parseFloat(place.lat));
    setLongitude(parseFloat(place.lon));
    setSuggestions([]);
    setCoordsConfirmed(true);
  }

  function displayError(message: string) {
    setError(message);
    setTimeout(() => {
      setError(null);
    }, 4000);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!coordsConfirmed || latitude === null || longitude === null) {
      displayError('Please select a place from the suggestions list.');
      return;
    }
    if (!activity) {
      displayError('Please select an activity type.');
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
    <div className='fixed inset-0 h-[100dvh] bg-black/30 z-50 flex justify-end'>
      {/**forms on the right side*/}
      <div className='w-[420px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300' style={{ height: '100dvh' }}>
        {/**header */}
        <div className='flex justify-between items-center px-6 py-5 border-b border-gray-100'>
          <h2 className='text-lg font-semibold text-gray-800'>Add place</h2>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600 transition-colors'>X</button>
        </div>

        {/**form */}
        <form onSubmit={handleSubmit} id="add-itinerary" className='flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-5'>

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

          </div>

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

            <div ref={pickerRef} className='flex flex-col gap-1.5 relative'>
              <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Time</label>
              <div className='flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 
                    px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400'>
                <span>{time}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="lucide lucide-clock2-icon lucide-clock-2 cursor-pointer"
                      onClick={() => open ? setOpen(false): setOpen(true)}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4-2"/></svg>
              </div>
              {open && (
                <div className='absolute top-full left-0 right-0 mt-1 grid grid-cols-3 rounded-lg border border-gray-200 bg-gray-50 
                  px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400'>
                  
                  <div className='overflow-y-auto h-44 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' >
                    {Array.from({ length: 12}, (_, i) => {
                      const hourTime = i === 0 ? 12 : i;
                      return (
                        <div 
                          key={hourTime} 
                          className={`cursor-pointer flex items-center justify-center ${String(hourTime) === hour ? 'bg-purple-400' : 'hover:bg-gray-400'}`}
                          onClick={() => setHour(String(hourTime))}>
                          {String(hourTime).padStart(2, '0')}
                        </div>
                      )
                    })}
        
                  </div>
                  <div className='overflow-y-auto h-44 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                    {Array.from({ length: 60}, (_, i) => {
                      const min = i

                      return (
                        <div 
                          key={min} 
                          className={`cursor-pointer flex items-center justify-center ${String(min).padStart(2, '0') === minute ? 'bg-purple-400' : 'hover:bg-gray-400'}`}
                          onClick={() => setMinute(String(min))}
                        >
                          {String(min).padStart(2, '0')}
                        </div>
                      )
                    })}
                  </div>
                  <div className='overflow-y-auto h-44 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                    {['AM', 'PM'].map((m) => (
                      <div 
                        key={m} 
                        className={`cursor-pointer flex items-center justify-center ${m === ampm ? 'bg-purple-400' : 'hover:bg-gray-400'}`}
                        onClick={() => setAmpm(m)}
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                </div> 
              )}
            </div>
                
            </div>
            
            {/**notes */}
            <div className='flex flex-col gap-2.5'>
              <label className='text-xs font-bold text-gray-500 uppercase tracking-wide'>Notes</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder='Additional details, tips, or reminders about this place.'
                className='w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400'
              />
            </div>

            {/**link */}
            <div className='flex flex-col gap-2.5'>
              <label className='text-xs font-bold text-gray-500 uppercase tracking-wide'>Link</label>
              <input 
                type="url" 
                placeholder='https://...' 
                value={link} 
                onChange={(e) => setLink(e.target.value)} 
                className='w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400'
              />
            </div>

        </form>

        {/**endForm */}
        <footer className='flex flex-cols-2 justify-between mt-5 px-6 py-2'>
          <button 
            className='flex items-center gap-1 px-5 py-3 text-gray-500 font-semibold rounded-full border cursor-pointer'
            onClick={onClose}
          >Cancel</button>

          <button 
            className='flex items-center gap-1 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed'
            type='submit'
            form='add-itinerary'
          >
            Add to Itinerary
          </button>
        </footer>

      </div>


    </div>
  )

}