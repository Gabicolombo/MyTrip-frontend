'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nationality, setNationality] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {

    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3333/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, nationality }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Login failed');
      }

      router.push('/login');

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
        min-h-screen 
        flex 
        items-center 
        justify-center
        px-4
        bg-no-repeat
        bg-cover
        bg-center
        relative" style={{backgroundImage: "url('/mytripv3.jpg')"}}>
       <form onSubmit={handleSubmit} className='bg-white p-10 rounded-2xl shadow-lg font-bold text-center text-purple-700 w-full max-w-lg'> 
        <h1 className='text-3xl font-bold mb-8 text-center text-purple-700'>MyTrip</h1>

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
            placeholder='mytrip@gmail.com'
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nationality
          </label>

          <select
            name="nationality"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
          >
            <option value="">Select your nationality</option>
            <option value="BR">🇧🇷 Brazilian</option>
            <option value="US">🇺🇸 American</option>
            <option value="FR">🇫🇷 French</option>
          </select>

        </div>

        <button
          disabled={loading}
          className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        

       </form>
    </div>
  )

}