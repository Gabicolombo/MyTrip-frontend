'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import ResendVerification from '@/components/common/ResendVerification';
import { AUTH_API_URL } from '@/lib/auth';
import countriesData from 'world-countries';
import {
  Combobox, ComboboxTrigger, ComboboxValue, ComboboxInput,
  ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty,
} from '@/components/ui/combobox';

const nationalityCountries = [...countriesData].sort((a, b) =>
  a.name.common.localeCompare(b.name.common, 'en', { sensitivity: 'base' })
);
const countryOptions = nationalityCountries.map(country => ({
  value: country.cca2,
  label: `${country.flag} ${country.name.common}`,
}));

export default function RegisterPage() {
  const [registered, setRegistered] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nationality, setNationality] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nationalitySearchRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: React.FormEvent) {

    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${AUTH_API_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, nationality }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = Array.isArray(errorData?.message)
          ? errorData.message.join(' ')
          : typeof errorData?.message === 'string' ? errorData.message : 'Unable to create your account. Please try again.';

        if (message.includes('Unable to send verification email')) {
          setVerificationFailed(true);
          setError(message);
          setPassword('');
          return;
        }

        throw new Error(message);
      }

      setRegistered(true);
      setPassword('');

    }catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="
        min-h-dvh
        flex 
        items-center 
        justify-center
        px-4 py-6 sm:py-10
        bg-no-repeat
        bg-cover
        bg-center
        relative" style={{backgroundImage: "url('/mytripv3.jpg')"}}>
       <div className='bg-white p-5 sm:p-10 rounded-2xl shadow-lg font-bold text-center text-purple-700 w-full max-w-lg'>
       {registered || verificationFailed ? (
         <section lang="en">
           <h1 className="mb-6 text-3xl font-bold">{verificationFailed ? 'Verify your email' : 'Check your email'}</h1>
           {verificationFailed ? (
             <>
               <p role="alert" className="mb-4 text-red-500">{error}</p>
               <p className="font-normal text-gray-600">Use the button below to resend the verification email to {email} once the countdown ends.</p>
             </>
           ) : (
             <p role="status" className="font-normal text-gray-600">We sent a verification link to {email}. Please check your spam folder too.</p>
           )}
           <ResendVerification initialEmail={email} initialCooldown={verificationFailed ? 60 : 0} />
           <Link href="/auth/login" className="mt-6 inline-block hover:underline">Sign in</Link>
         </section>
       ) : (
       <form onSubmit={handleSubmit}>
        <h1 className='text-3xl font-bold mb-8 text-center text-purple-700'>TripInOrder</h1>

        {error && <p className='text-red-500 mb-4'>{error}</p>}

        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 mb-2'>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full
              rounded-lg
              border
              border-gray-300
              px-4
              py-2.5
              text-sm
              focus:outline-none
              focus:ring-2
              focus:ring-purple-400
              focus:border-purple-400"
            required
          />
        </div>

        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 mb-2'>Email</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='TripInOrder@gmail.com'
            className="w-full
              rounded-lg
              border
              border-gray-300
              px-4
              py-2.5
              text-sm
              focus:outline-none
              focus:ring-2
              focus:ring-purple-400
              focus:border-purple-400"
            required
          />
        </div>

        <div className='mb-6'>
          <label className='block text-sm font-medium text-gray-700 mb-2'>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="******"
            className="w-full
              rounded-lg
              border
              border-gray-300
              px-4
              py-2.5
              text-sm
              focus:outline-none
              focus:ring-2
              focus:ring-purple-400
              focus:border-purple-400"
            required
          />
          <p className="flex items-start mt-2 text-xs text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-1.5">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
      
            Password must contain at least one letter and one number, and can include special characters
          </p>
        </div>

        <div className='mb-4'>
          <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-1">
            Country of nationality
          </label>

          <Combobox
            name="nationality"
            items={countryOptions}
            value={countryOptions.find(country => country.value === nationality) ?? null}
            isItemEqualToValue={(country, selected) => country.value === selected.value}
            onValueChange={country => setNationality(country?.value ?? '')}
            disabled={loading}
          >
            <ComboboxTrigger id="nationality" type="button"
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-left text-sm font-normal text-gray-700 hover:border-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 disabled:cursor-not-allowed disabled:opacity-50">
              <span className="min-w-0 truncate"><ComboboxValue placeholder="Select your country" /></span>
            </ComboboxTrigger>
            <ComboboxContent initialFocus={nationalitySearchRef}>
              <ComboboxInput ref={nationalitySearchRef} aria-label="Search countries"
                placeholder="Search countries..." showTrigger={false}
                className="min-h-11 focus-within:border-purple-400 focus-within:ring-purple-200" />
              <ComboboxEmpty>No countries found.</ComboboxEmpty>
              <ComboboxList>
                {(country: { value: string; label: string }) => (
                  <ComboboxItem key={country.value} value={country}
                    className="cursor-pointer data-highlighted:bg-purple-50 data-highlighted:text-purple-700">
                    {country.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>

        </div>

        <button
          disabled={loading}
          className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        

       </form>
       )}
       </div>
    </div>
  )

}
