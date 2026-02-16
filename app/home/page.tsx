'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Destination {
  id: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  orderIndex: string;
}

interface Trip {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  destinations: Destination[];
  imageUrl: string;
}

export default function HomePage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    async function fetchTrips() {
      try {
        console.log('Fetching trips with token:', localStorage.getItem('token'));
        const response = await fetch('http://localhost:4000/trips/my-trips', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
   
        if (!response.ok) {
          throw new Error('Failed to fetch trips');
        }

        const data = await response.json();
        setTrips(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Something went wrong');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchTrips();
  }, []);

  return (
   <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl text-purple-600 font-bold">Welcome back 👋</h1>
          <button className="px-5 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">
            + New Trip
          </button>
        </div>

        {trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip) => {
          const isCompleted =
            new Date(trip.endDate).getTime() < new Date().getTime();

          return (
            <div
              key={trip.id}
              className={`p-6 rounded-2xl shadow-sm hover:shadow-lg transition cursor-pointer ${
                isCompleted
                  ? "bg-red-50 border border-red-200"
                  : "bg-green-50 border border-green-200"
              }`}
            >
              <img
                src={trip.imageUrl}
                alt={trip.title}
              />

              <h2 className="text-xl font-semibold mb-2 text-purple-600 text-center">
                {trip.title}
              </h2>

              <p className="text-sm text-gray-500 mt-2 text-center">
                {trip.destinations.map((destination, index) => (
                  <span key={destination.id}>
                    {destination.city}
                    {index < trip.destinations.length - 1 && " • "}
                  </span>
                ))}
              </p>

              <p className="text-gray-500 mb-4 py-4 text-center">
                {trip.startDate} – {trip.endDate}
              </p>

              <p className="text-center">
                {isCompleted ? (
                  <span className="text-red-500 font-semibold">Completed</span>
                ) : (
                  <span className="text-green-600 font-semibold">Upcoming</span>
                )}
              </p>
            </div>
          );
        })}
          </div>
        ): (
          <div className="bg-white p-10 rounded-2xl text-center shadow-sm">
            <h2 className="text-xl font-semibold mb-4">
              Ready to plan your next adventure? ✈️
            </h2>
            <p className="text-gray-500 mb-6">
              You do not have any trips yet.
            </p>
            <button className="px-5 py-2 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700">
              Create your first trip
            </button>
          </div>
        )}

      </div>
    </main>
  )

}