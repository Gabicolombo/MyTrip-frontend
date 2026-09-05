'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TripHeader from '@/components/trip/TripHeader';
import TripInfo from '@/components/trip/sidebar/TripInfo';
import DestinationTabs from '@/components/trip/DestinationTabs';
import VisaCheck from '@/components/trip/sidebar/VisaCheck';

const TRIP_DETAILS_QUERY = `
  query tripDetails($id: Int!) {
    tripDetails(id: $id) {
      id
      title
      description
      startDate
      endDate
      imageUrl
      participants {
        user {
          name
        }
        role
      }
      destinations {
        startDate
        endDate
        city
        country
        id
        tripId
      }
    }
  }
`;

interface Destination {
  startDate: string;
  endDate: string;
  city: string;
  country: string;
  id: string;
}

interface Participant {
  user: {name: string};
  role: string;
}

interface TripDetails {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  imageUrl: string;
  participants: Participant[];
  destinations: Destination[];
}

export default function TripDetailsPage() {

  const { id } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('');
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTripDetails() {
      try {
        const response = await fetch('http://localhost:4000/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({query: TRIP_DETAILS_QUERY, variables: {id: Number(id)}}),
        });

        const json = await response.json();

        if (json.errors) {
          throw new Error(json.errors[0].message);
        }

        setTrip(json.data.tripDetails);
          
      }catch(err:unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Something went wrong');
        }
      }finally {
        setLoading(false);
      }
    }
    if (id) fetchTripDetails();
  },[id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-lg">Loading trip details...</p>
      </main>
    );
  }

  if (error || !trip) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">{error ?? 'Trip not found.'}</p>
      </main>
    );
  }

  const isCompleted = new Date(trip.endDate).getTime() < new Date().getTime();
  const owner = trip.participants.find((p) => p.role === 'OWNER');

  return (
    <main className="min-h-screen bg-gray-50">
      <TripHeader
        trip={trip}
        isCompleted={isCompleted}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-[1fr_300px] gap-6 items-start">
      
        {/*itinerary later*/}
        <DestinationTabs
            destinations={trip.destinations}
            activeTab={activeTab}
        />
        {/*sidebar*/}

        <div className="flex flex-col gap-4">
          <TripInfo
            checkIn={trip.startDate}
            checkOut={trip.endDate}
            status={isCompleted ? 'Completed' : 'Upcoming'}
          />
          {/* Participants later */}

          <VisaCheck
            destinations={trip.destinations.map(d => d.country)}
          />
        </div>
      </div>
    </main>
  )

}