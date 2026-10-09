'use client';

import { TRIP_API_URL } from '@/lib/trip';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/common/navbar';
import EditTripModal from '@/components/trip/EditTripModal';
import TripHeader from '@/components/trip/TripHeader';
import TripInfo from '@/components/trip/sidebar/TripInfo';
import DestinationTabs from '@/components/trip/DestinationTabs';
import VisaCheck from '@/components/trip/sidebar/VisaCheck';
import BudgetModal from '@/components/trip/BudgetModal';

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
  const [editingTrip, setEditingTrip] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [activeTab, setActiveTab] = useState('');
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTripDetails() {
      try {
        const response = await fetch(`${TRIP_API_URL}/graphql`, {
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
  },[id, refreshVersion]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-gray-50">
        <Navbar />
        <p className="p-8 text-center text-gray-400 text-lg">Loading trip details...</p>
      </main>
    );
  }

  if (error || !trip) {
    return (
      <main className="min-h-dvh bg-gray-50">
        <Navbar />
        <p className="p-8 text-center text-red-500">{error ?? 'Trip not found.'}</p>
      </main>
    );
  }

  const isCompleted = new Date(trip.endDate).getTime() < new Date().getTime();

  return (
    <main className="min-h-dvh bg-gray-50">
      <Navbar />
      {editingTrip && (
        <EditTripModal
          trip={{ ...trip, id: String(trip.id) }}
          onClose={() => setEditingTrip(false)}
          onSuccess={() => setRefreshVersion(version => version + 1)}
        />
      )}
      <TripHeader
        trip={trip}
        isCompleted={isCompleted}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onEdit={() => setEditingTrip(true)}
        onBudget={() => setBudgetOpen(true)}
      />
      {budgetOpen && <BudgetModal tripId={trip.id} tripTitle={trip.title} destinations={trip.destinations} onClose={() => setBudgetOpen(false)} />}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
      
        {/*itinerary later*/}
        <DestinationTabs
            destinations={trip.destinations}
            activeTab={activeTab}
        />
        {/*sidebar*/}

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
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
