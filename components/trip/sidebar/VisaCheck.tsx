'use client';

import { TRIP_API_URL } from '@/lib/trip';

import { useState } from 'react';
import countriesData from 'world-countries';

const countries = [...countriesData].sort((a, b) =>
  a.name.common.localeCompare(b.name.common, 'en', { sensitivity: 'base' })
);

interface VisaCheckProps {
  destinations: string[];
}

function getVisaBadge(requirement: string) {
  const val = requirement.toLowerCase().trim();

  if (val === 'visa free')        return { label: 'Visa-free',         cls: 'bg-green-100 text-green-600' };
  if (val === 'eta')              return { label: 'ETA required',      cls: 'bg-yellow-100 text-yellow-600' };
  if (val === 'e-visa')           return { label: 'E-visa',            cls: 'bg-yellow-100 text-yellow-600' };
  if (val === 'visa on arrival')  return { label: 'Visa on arrival',   cls: 'bg-yellow-100 text-yellow-600' };
  if (val === 'visa required')    return { label: 'Visa required',     cls: 'bg-red-100 text-red-500' };
  if (val === 'no admission')     return { label: 'No admission',      cls: 'bg-red-100 text-red-500' };
  if (val === '-1')               return { label: 'No data',           cls: 'bg-gray-100 text-gray-400' };

  const days = parseInt(val);
  if (!isNaN(days) && days > 0)  return { label: `${days} days visa-free`, cls: 'bg-green-100 text-green-600' };

  return { label: requirement, cls: 'bg-gray-100 text-gray-400' };
}

export default function VisaCheck({ destinations }: VisaCheckProps) {
  const [passport, setPassport]       = useState('');
  const [results, setResults]         = useState<Record<string, string> | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uniqueDestinations = [...new Set(destinations.map(country => country.trim()).filter(Boolean))];

  async function handleCheck() {
    if (!passport || uniqueDestinations.length === 0 || loading) {
      return;
    }
    setLoading(true);
    setResults(null);
    setError(null);

    try {
      const checks = await Promise.all(
        uniqueDestinations.map(async (destination) => {
          const res = await fetch(`${TRIP_API_URL}/trips/visa-check`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ passport, destination }),
          });
          const data = await res.json();
          if (!res.ok || typeof data.requirement !== 'string') {
            throw new Error('Failed to check visa requirements. Please try again later.');
          }
          return { destination, requirement: data.requirement };
        })
      );

      const map: Record<string, string> = {};
      checks.forEach(c => { map[c.destination] = c.requirement; });
      setResults(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check visa requirements. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  const selectClass = "w-full min-w-0 min-h-11 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition disabled:opacity-50";

  return (
    <div className='relative z-20 min-w-0 break-words bg-white rounded-2xl shadow-sm overflow-visible'>
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">🛂 Visa Check</h3>
      </div>

      <div className='px-5 py-4 flex flex-col gap-3'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-widest text-purple-400'>
            Destinations
          </p>
          <div className='flex flex-wrap gap-2'>
            {uniqueDestinations.map(dest => (
              <span key={dest} className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                {dest}
              </span>
            ))}
          </div>
        </div>

        <div className='relative'>
          <label htmlFor="visa-passport" className='block mb-1 text-xs font-semibold uppercase tracking-widest text-purple-400'>
            Your passport
          </label>
          <select
            id="visa-passport"
            value={passport}
            disabled={loading}
            onChange={event => {
              setPassport(event.target.value);
              setResults(null);
              setError(null);
            }}
            className={selectClass}
          >
            <option value="" disabled>Select your country</option>
            {countries.map(country => (
              <option key={country.cca2} value={country.name.common}>{country.name.common}</option>
            ))}
          </select>

        </div>

        <button
          onClick={handleCheck}
          disabled={!passport || loading || uniqueDestinations.length === 0}
          className="w-full min-h-11 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-full transition-colors"
        >
          {loading ? 'Checking...' : 'Check requirements'}
        </button>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {uniqueDestinations.length === 0 && <p className="text-xs text-gray-500">Add a destination to check visa requirements.</p>}
        {results && (
          <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
            {uniqueDestinations.map(dest => {
              const badge = getVisaBadge(results[dest] ?? '-1');
              return (
                <div key={dest} className="flex flex-wrap gap-2 items-center justify-between">
                  <span className="text-sm text-gray-700">{dest}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
            <p className="text-xs text-gray-400 leading-relaxed mt-1">
              Always confirm with the official embassy before travelling.
            </p>
          </div>
        )}

      </div>

    </div>
  )

}
