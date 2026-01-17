'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {

    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Login failed');
      }
      const data = await res.json();

      localStorage.setItem('token', data.token);
      router.push('/trips');
    } catch (error: unknown) {
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
        </div>

        <button
          disabled={loading}
          className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div className="mt-4 text-center">
          <span className="text-sm text-gray-600">
            Already have an account?
          </span>{' '}
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="text-sm text-purple-600 hover:underline"
          >
            Sign in
          </button>
        </div>

       </form>
    </div>
);
}
