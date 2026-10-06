'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ResendVerification from '@/components/common/ResendVerification';
import { AUTH_API_URL } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {

    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${AUTH_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 403) {
        setVerificationEmail(email);
        setError('Please verify your email before signing in. Check your inbox or resend the verification email below.');
        return;
      }
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Login failed');
      }
      const data = await res.json();

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('name', data.name);
      router.push('/home');
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
       <form onSubmit={handleSubmit}>
        <h1 className='text-3xl font-bold mb-8 text-center text-purple-700'>TripInOrder</h1>

        {error && <p className='text-red-500 mb-4'>{error}</p>}

        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 mb-2 text-left'>Email</label>
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
          <label className='block text-sm font-medium text-gray-700 mb-2 text-left'>Password</label>
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
            Don&apos;t have an account?
          </span>{' '}
          <button
            type="button"
            onClick={() => router.push('/auth/register')}
            className="text-sm text-purple-600 hover:underline"
          >
            Sign up
          </button>
        </div>

       </form>
       {verificationEmail === null && (
         <button
           type="button"
           onClick={() => setVerificationEmail(email)}
           className="mt-4 text-sm text-purple-600 hover:underline"
         >
           Didn&apos;t receive a verification email?
         </button>
       )}
       {verificationEmail !== null && <ResendVerification initialEmail={verificationEmail} />}
       </div>
    </div>
);
}
