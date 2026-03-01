'use client';

import { formatDate } from '@/lib/utils';

interface TripInfoProps {
  checkIn: string;
  checkOut: string;
  status: string;
}

const totalDays = (startDate: string, endDate: string) => {
  return Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime())
    / (1000 * 60 * 60 * 24)
  )

}

export default function TripInfo({ checkIn, checkOut, status }: TripInfoProps) {

  const total = totalDays(checkIn, checkOut);
  const isCompleted = status === 'Completed';

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-6">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">Trip Info</h3>
      
      <div className="flex flex-col divide-y divide-gray-100">
        <div className="flex justify-between items-center py-3">
          <span className="text-sm text-gray-400">📅 Check-in</span>
          <span className="text-sm font-medium text-gray-700">{formatDate(checkIn)}</span>
        </div>

        <div className="flex justify-between items-center py-3">
          <span className="text-sm text-gray-400">📅 Check-out</span>
          <span className="text-sm font-medium text-gray-700">{formatDate(checkOut)}</span>
        </div>

        <div className="flex justify-between items-center py-3">
          <span className="text-sm text-gray-400">⏱ Duration</span>
          <span className="text-sm font-medium text-gray-700">{total} days</span>
        </div>

        <div className="flex justify-between items-center py-3">
          <span className="text-sm text-gray-400">📍Status</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            isCompleted
              ? 'bg-red-100 text-red-500'
              : 'bg-emerald-100 text-emerald-600'
          }`}>
            {status}
          </span>
        </div>
      </div>
    
    </div>
  );
}