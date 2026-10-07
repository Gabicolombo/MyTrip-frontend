export const TRIP_API_URL = (
  process.env.NEXT_PUBLIC_TRIP_API_URL || 'http://localhost:4000'
).replace(/\/+$/, '');
