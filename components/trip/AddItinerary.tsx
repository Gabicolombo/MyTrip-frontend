'use client';

import { TRIP_API_URL } from '@/lib/trip';

import { useState, useRef, useEffect, useId } from 'react';
import { Itinerary } from './ItineraryPanel';
import { searchPlaces, type PhotonPlace } from '@/lib/photon';
import DaySelect from './DaySelect';
import countriesData from 'world-countries';
import { itineraryCost } from '@/lib/itinerary-cost';
import {
  Combobox, ComboboxTrigger, ComboboxValue, ComboboxInput,
  ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty,
} from '@/components/ui/combobox';

const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' });
const currencies = [...new Set(['USD', ...countriesData.flatMap(country => Object.keys(country.currencies))])]
  .sort()
  .map(code => ({ value: code, label: `${code} — ${currencyNames.of(code) || code}` }));

interface ItineraryProps {
  destinationId: string;         
  city: string;
  country: string;
  startDate: string;             
  endDate: string;              
  onClose: () => void;
  onSuccess: () => void;
  itinerary?: Itinerary; // Optional, only needed for editing existing itinerary items
}

const ACTIVITIES = [
  { value: 'Museum', emoji: '🏛️' },
  { value: 'Restaurant',        emoji: '🍽️' },
  { value: 'Beach',   emoji: '🏖️' },
  { value: 'Hiking',      emoji: '🌿' },
  { value: 'Culture',    emoji: '⛩️' },
  { value: 'Park',    emoji: '🏞️' },
  { value: 'House',    emoji: '🏠' },
  { value: 'Shopping', emoji: '🛍️' },
  { value: 'Bar', emoji: '🍻' },
  { value: 'Tour',        emoji: '🎟️' },
  { value: 'Other',       emoji: '📌' },
];

export default function AddItinerary({ destinationId, city, country, startDate, endDate, onClose, onSuccess, itinerary }: ItineraryProps) {
  const isEditing = itinerary !== undefined;
  const h = parseInt(itinerary?.time.slice(0,2) ?? '12');
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const [name, setName] = useState(itinerary?.name ?? '');
  const [activity, setActivity] = useState(itinerary?.activity ?? '');
  const [time, setTime] = useState(itinerary?.time ?? '12:00 PM');
  const [hour, setHour] = useState(String(h12));
  const [minute, setMinute] = useState(itinerary?.time?.slice(3, 5) ??'00');
  const [ampm, setAmpm] = useState(parseInt(itinerary?.time?.slice(0,2) ?? '12') >= 12 ? 'PM' : 'AM');
  const [latitude, setLatitude]   = useState<number | null>(itinerary?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(itinerary?.longitude ?? null);
  const [notes, setNotes] = useState(itinerary?.notes ?? '');
  const [link, setLink] = useState(itinerary?.link ?? '');
  const [amount, setAmount] = useState(itinerary?.amount == null ? '' : String(itinerary.amount));
  const [currency, setCurrency] = useState(itinerary?.currency ?? '');
  const currencySearchRef = useRef<HTMLInputElement>(null);
  const expenseId = useId();
  const selectedCurrency = currencies.find(option => option.value === currency)
    ?? (currency ? { value: currency, label: currency } : null);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [suggestions, setSuggestions]   = useState<PhotonPlace[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching]       = useState(false);
  const [coordsConfirmed, setCoordsConfirmed] = useState(Boolean(itinerary));
  const searchController = useRef<AbortController | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const timeButtonRef = useRef<HTMLButtonElement>(null);
  const timePickerId = useId();

  const days: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d).toISOString().split('T')[0]);
  }
  const [day, setDay] = useState(
    itinerary?.day?.slice(0, 10) ?? days[0]
  );
  // Handle place search input changes
  useEffect(() => {

    if (coordsConfirmed || name.trim().length < 3) return;
    const controller = new AbortController();
    searchController.current = controller;
    const timeout = setTimeout(async () => {
      try {
        const places = await searchPlaces(name.trim(), city, country, controller.signal);
        if (!controller.signal.aborted) {
          setSuggestions(places);
          setSearched(true);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setSearchError(err instanceof Error ? err.message : 'Unable to search places. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 600);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    }

  }, [name, city, country, coordsConfirmed]);

  useEffect(() => {
    setTime(`${hour.padStart(2, '0')}:${minute.padStart(2, '0')} ${ampm}`);
  }, [hour, minute, ampm]);

  useEffect(() => {
    function handleOutsidePointer(event: PointerEvent) {
      if (pickerRef.current && event.target && !pickerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer);
  }, []);

  function handleSelectSuggestion(place: PhotonPlace) {
    searchController.current?.abort();
    setName(place.properties.name || place.properties.street || '');
    const [lon, lat] = place.geometry.coordinates;
    setLatitude(lat);
    setLongitude(lon);
    setSuggestions([]);
    setSearching(false);
    setSearchError(null);
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
    if (submitting.current) return;

    if (!coordsConfirmed || latitude === null || longitude === null) {
      displayError('Please select a place from the suggestions list.');
      return;
    }
    if (!activity) {
      displayError('Please select an activity type.');
      return;
    }
    if (!days.includes(day)) {
      displayError('Please select a day within the destination dates.');
      return;
    }

    let cost: ReturnType<typeof itineraryCost>;
    try {
      cost = itineraryCost(amount, currency);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please check the expense fields.');
      return;
    }

    submitting.current = true;
    setLoading(true);
    setError(null);

    try {
      const body = JSON.stringify({
          tripDestinationId: destinationId,
          name,
          activity,
          day,
          time,
          latitude,
          longitude,
          notes: notes || null,
          link: link || null,
          ...cost,
      });
      let res: Response;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      };
      if(isEditing) {
        res = await fetch(`${TRIP_API_URL}/trips/update-itinerary/${itinerary?.id}`, {
          method: 'PATCH',
          headers,
          body,
        });
      }
      else {
        res = await fetch(`${TRIP_API_URL}/trips/add-itinerary`, {
          method: 'POST',
          headers,
          body,
        });
      }
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create trip');
      }

      onSuccess();
      onClose();
      } catch(err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    // overlay 
    <div className='fixed inset-0 h-[100dvh] bg-black/30 z-50 flex justify-end'>
      {/**forms on the right side*/}
      <div className='w-full max-w-[420px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300' style={{ height: '100dvh' }}>
        {/**header */}
        <div className='flex shrink-0 justify-between items-center px-4 sm:px-6 py-4 border-b border-gray-100'>
          <h2 className='text-lg font-semibold text-gray-800'>{isEditing ?'Update' : 'Add'} place</h2>
          <button aria-label='Close itinerary form' disabled={loading} onClick={onClose} className='min-h-11 min-w-11 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50'>X</button>
        </div>

        {/**form */}
        <form onSubmit={handleSubmit} id="add-itinerary" className='flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 flex flex-col gap-5'>

          {error && (
            <p className='rounded-lg border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500'>{error}</p>
          )}

          {/**place name with suggestions */}
          <div className='flex flex-col gap-2.5'>
            <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Place name</label>

            <div className='relative'>
              <input type="text"
                value={name}
                onChange={(e) => {
                  searchController.current?.abort();
                  setName(e.target.value);
                  setCoordsConfirmed(false);
                  setLatitude(null);
                  setLongitude(null);
                  setSuggestions([]);
                  setSearchError(null);
                  setSearched(false);
                  setSearching(e.target.value.trim().length >= 3);
                }}
                placeholder='Eiffel Tower'
                className='w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400'
              />

              {suggestions.length > 0 && (
                <ul className='absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden max-h-52 overflow-y-auto'>
                  {suggestions.map((place) => {
                    const { properties } = place;
                    const name = properties.name || properties.street;
                    const streetAddress = [properties.street, properties.housenumber].filter(Boolean).join(', ');
                    const address = [...new Set([properties.city, properties.state, properties.country].filter(Boolean))].join(', ');

                    return (
                      <li
                        key={`${properties.osm_type}-${properties.osm_id}-${place.geometry.coordinates.join(',')}`}
                      >
                        <button type="button" onClick={() => handleSelectSuggestion(place)} className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-purple-50 focus:bg-purple-50">
                        <span className="text-purple-400 mt-0.5">📍</span>
                        <div className="min-w-0 break-words">
                          <p className="text-sm font-medium text-gray-800">{name}</p>
                          {streetAddress && <p className="text-xs text-gray-600">{streetAddress}</p>}
                          <p className="text-xs text-gray-400">{address}</p>
                        </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

            </div>

             {searching && (
                <p className="text-xs text-gray-400">Searching…</p>
              )} 

              {searchError && <p role="alert" className="text-xs text-red-500">{searchError}</p>}
              {searched && !searching && !coordsConfirmed && !searchError && suggestions.length === 0 && (
                <p className="text-xs text-gray-500">No places found. Try another spelling or include the city.</p>
              )}
              <p className="text-xs text-gray-400">
                Search by <a href="https://photon.komoot.io" target="_blank" rel="noreferrer" className="underline">Photon</a>
                {' · © '}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap contributors</a>
              </p>
              {coordsConfirmed && latitude !== null && longitude !== null && (
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
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <DaySelect days={days} value={day} onChange={setDay} disabled={loading} />

            <div ref={pickerRef} className='flex flex-col gap-1.5 relative'
              onKeyDown={event => {
                if (event.key === 'Escape' && open) {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                  timeButtonRef.current?.focus();
                }
              }}
              onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
              }}>
              <label htmlFor={`${timePickerId}-button`} className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Time</label>
              <button type="button" ref={timeButtonRef} id={`${timePickerId}-button`}
                aria-expanded={open} aria-controls={open ? timePickerId : undefined}
                onClick={() => setOpen(value => !value)}
                className='flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-gray-50
                    px-3 py-2 text-sm text-gray-700 transition-colors hover:border-purple-400 hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400'>
                <span>{time}</span>
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="lucide lucide-clock2-icon lucide-clock-2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4-2"/></svg>
              </button>
              {open && (
                <div id={timePickerId} role="group" aria-label="Choose time" className='absolute z-10 top-full left-0 right-0 mt-1 grid grid-cols-3 rounded-lg border border-gray-200 bg-gray-50
                  px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400'>
                  
                  <div className='overflow-y-auto h-44 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' >
                    {Array.from({ length: 12}, (_, i) => {
                      const hourTime = i === 0 ? 12 : i;
                      return (
                        <button type="button" aria-label={`Hour ${hourTime}`} aria-pressed={String(hourTime) === hour}
                          key={hourTime} 
                          className={`w-full cursor-pointer flex items-center justify-center ${String(hourTime) === hour ? 'bg-purple-400' : 'hover:bg-gray-400'}`}
                          onClick={() => setHour(String(hourTime))}>
                          {String(hourTime).padStart(2, '0')}
                        </button>
                      )
                    })}
        
                  </div>
                  <div className='overflow-y-auto h-44 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                    {Array.from({ length: 60}, (_, i) => {
                      const min = i

                      return (
                        <button type="button" aria-label={`Minute ${String(min).padStart(2, '0')}`} aria-pressed={String(min).padStart(2, '0') === minute}
                          key={min} 
                          className={`w-full cursor-pointer flex items-center justify-center ${String(min).padStart(2, '0') === minute ? 'bg-purple-400' : 'hover:bg-gray-400'}`}
                          onClick={() => setMinute(String(min))}
                        >
                          {String(min).padStart(2, '0')}
                        </button>
                      )
                    })}
                  </div>
                  <div className='overflow-y-auto h-44 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                    {['AM', 'PM'].map((m) => (
                      <button type="button" aria-pressed={m === ampm}
                        key={m} 
                        className={`w-full cursor-pointer flex items-center justify-center ${m === ampm ? 'bg-purple-400' : 'hover:bg-gray-400'}`}
                        onClick={() => setAmpm(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div> 
              )}
            </div>
                
            </div>
            
            <fieldset disabled={loading} className="min-w-0 space-y-3 disabled:opacity-50">
              <legend className="text-xs font-bold uppercase tracking-wide text-gray-500">Expense (optional)</legend>
              <p id={`${expenseId}-help`} className="text-xs text-gray-500">Enter the amount spent at this place and select its currency, or leave both blank.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor={`${expenseId}-amount`} className="text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</label>
                  <input id={`${expenseId}-amount`} name="amount" type="text" inputMode="decimal"
                    value={amount} onChange={event => setAmount(event.target.value)} placeholder="e.g. 40.00"
                    aria-describedby={`${expenseId}-help`}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor={`${expenseId}-currency`} className="text-xs font-semibold uppercase tracking-wide text-gray-500">Currency</label>
                  <Combobox items={currencies} value={selectedCurrency} disabled={loading}
                    isItemEqualToValue={(option, selected) => option.value === selected.value}
                    onValueChange={option => setCurrency(option?.value ?? '')}>
                    <ComboboxTrigger id={`${expenseId}-currency`} type="button"
                      className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm text-gray-700 hover:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-400 disabled:cursor-not-allowed">
                      <span className="min-w-0 truncate"><ComboboxValue placeholder="Select currency" /></span>
                    </ComboboxTrigger>
                    <ComboboxContent initialFocus={currencySearchRef}>
                      <ComboboxInput ref={currencySearchRef} aria-label="Search currencies" placeholder="Search currencies..." showTrigger={false} />
                      <ComboboxEmpty>No currencies found.</ComboboxEmpty>
                      <ComboboxList>
                        {(option: { value: string; label: string }) => (
                          <ComboboxItem key={option.value} value={option} className="cursor-pointer data-highlighted:bg-purple-50 data-highlighted:text-purple-700">{option.label}</ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
              </div>
              {(amount !== '' || currency !== '') && <button type="button"
                onClick={() => { setAmount(''); setCurrency(''); setError(null); }}
                className="cursor-pointer text-sm text-purple-600 hover:underline disabled:cursor-not-allowed">Clear expense</button>}
            </fieldset>

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
        <footer className='flex shrink-0 flex-wrap justify-between gap-2 border-t border-gray-100 px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]'>
          <button 
            className='flex items-center gap-1 px-5 py-3 text-gray-500 font-semibold rounded-full border cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
            disabled={loading}
            onClick={onClose}
          >Cancel</button>

          <button 
            className='flex items-center gap-1 px-5 py-3 bg-purple-600 enabled:hover:bg-purple-700 text-white font-semibold rounded-full transition-colors cursor-pointer disabled:bg-gray-400 disabled:cursor-wait'
            type='submit'
            form='add-itinerary'
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Saving...' : `${isEditing ? 'Update' : 'Add'} Itinerary`}
          </button>
        </footer>

      </div>


    </div>
  )

}
