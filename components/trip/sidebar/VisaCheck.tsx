'use strict';

import { useEffect, useState } from 'react';

interface VisaResult {
  requirement: string;
}

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
  const [countries, setCountries]     = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [passport, setPassport]       = useState('');
  const [results, setResults]         = useState<Record<string, string> | null>(null);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    async function fetchCountries() {
      try {
        const res  = await fetch('https://restcountries.com/v3.1/all?fields=name');
        const data = await res.json();
        const names = data
          .map((c: any) => c.name.common)
          .sort();
        setCountries(names);
      } catch (err) {
        console.error('Failed to fetch countries', err);
      } finally {
        setLoadingCountries(false);
      }
    }
    fetchCountries();
  }, []);

  async function handleCheck() {
    if (!passport || !destinations) {
      alert('Please select both passport and destination countries.');
      return;
    }
    setLoading(true);
    setResults(null);

    try {
      const checks = await Promise.all(
        destinations.map(async (destination) => {
          const res = await fetch('http://localhost:4000/trips/visa-check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ passport, destination }),
          });
          const data = await res.json();
          return { destination, requirement: data.requirement };
        })
      );

      const map: Record<string, string> = {};
      checks.forEach(c => { map[c.destination] = c.requirement; });
      setResults(map);
    } catch (err) {
      console.error('Visa check failed', err);
      alert('Failed to check visa requirements. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  const selectClass = "w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition disabled:opacity-50";

  return (
    <div className='bg-white rounded-2xl shadow-sm overflow-hidden'>
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">🛂 Visa Check</h3>
      </div>

      <div className='px-5 py-4 flex flex-col gap-3'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-widest text-purple-400'>
            Destinations
          </p>
          <div className='flex flex-wrap gap-2'>
            {destinations.map(dest => (
              <span key={dest} className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                {dest}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className='text-xs font-semibold uppercase tracking-widest text-purple-400'>
            Your passport
          </p>
          <select 
            value={passport} 
            onChange={e => {setPassport(e.target.value); setResults(null)}}
            disabled={loadingCountries}
            className={selectClass}  
          >
            <option value="">
              {loadingCountries ? 'Loading countries...' : 'Select your country...'}
            </option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCheck}
          disabled={!passport || loading}
          className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-full transition-colors"
        >
          {loading ? 'Checking...' : 'Check requirements'}
        </button>

        {results && (
          <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
            {destinations.map(dest => {
              const badge = getVisaBadge(results[dest] ?? '-1');
              return (
                <div key={dest} className="flex items-center justify-between">
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