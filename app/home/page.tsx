'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RegisterTripModal from '@/components/trip/RegisterTripModal';
import AddDestinationsModal from '@/components/trip/AddDestinationModal';
import { Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/common/confirmModal';
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
  status: 'Initiated' | 'Completed';
}

export default function HomePage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const [destinationsTripId, setDestinationsTripId] = useState<string | null>(null);
  const name = localStorage.getItem('name') || 'Traveler';

  async function deleteTrip(tripId: string) {

    try {
      console.log('Attempting to delete trip with ID:', tripId);
      const response = await fetch(`http://localhost:4000/trips/delete-trip/${tripId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete trip');
      setTrips(prev => prev.filter(trip => trip.id !== tripId));
      return `Trip ${tripId} deleted successfully`;
    }catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function fetchTrips() {
    try {
      const response = await fetch('http://localhost:4000/trips/my-trips', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch trips');

      const data = await response.json();
      console.log(data);
      setTrips(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTrips();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl text-purple-600 font-bold">Welcome back {name} 👋</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">
            + New Trip
          </button>
        </div>

        {isModalOpen && (
          <RegisterTripModal
            onClose={() => setIsModalOpen(false)}
            onSuccess={fetchTrips}
          />
        )}

        {destinationsTripId && (
          <AddDestinationsModal
            tripId={destinationsTripId}
            onClose={() => setDestinationsTripId(null)}
            onSuccess={() => { fetchTrips(); setDestinationsTripId(null); }}
          />
        )}

        {trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => {
              const isCompleted = trip.status === 'Completed';
              const hasDestinations = trip.destinations.length > 0;
             
              return (
                <div
                  key={trip.id}
                  className={`p-6 rounded-2xl shadow-sm hover:shadow-lg transition cursor-pointer ${
                    isCompleted
                      ? 'bg-red-50 border border-red-200 pointer-events-none'
                      : 'bg-green-50 border border-green-200'
                  }`}
                >
                  <button className='ml-auto block mb-2' onClick={() => { setConfirmModalOpen(true); setDeletingTrip(trip); }}>
                    <Trash2 className="text-red-400 hover:text-red-600 transition-colors" size={16} />
                  </button>
                  <img src={trip.imageUrl} alt={trip.title} />

                  {deletingTrip === trip && (
                    <ConfirmModal
                      title="Confirm Deletion"
                      message="Are you sure you want to delete this trip? This action cannot be undone."
                  
                      onConfirm={() => {
                        deleteTrip(trip.id);
                        setConfirmModalOpen(false);
                        setDeletingTrip(null);
                      }}
                      onCancel={() => {
                        setConfirmModalOpen(false); 
                      }}
                    />
                  )}

                  <h2 className="text-xl font-semibold m-2 text-purple-600 text-center">
                    {trip.title}
                  </h2>

                  {hasDestinations ? (
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      {trip.destinations.map((destination, index) => (
                        <span key={destination.id}>
                          {destination.city}
                          {index < trip.destinations.length - 1 && ' • '}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <div className="flex justify-center mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDestinationsTripId(trip.id);
                        }}
                        className="text-xs text-purple-500 border border-purple-300 rounded-lg px-3 py-1 hover:bg-purple-50">
                        + Add destinations
                      </button>
                    </div>
                  )}

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
                  <button 
                    onClick={() => router.push(`/trip/${trip.id}`)}
                    className='px-4 py-2 mt-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 block mx-auto'>
                    Details
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white p-10 rounded-2xl text-center shadow-sm">
            <h2 className="text-xl font-semibold mb-4">
              Ready to plan your next adventure? ✈️
            </h2>
            <p className="text-gray-500 mb-6">You do not have any trips yet.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Create your first trip
            </button>
          </div>
        )}

      </div>
    </main>
  );
}