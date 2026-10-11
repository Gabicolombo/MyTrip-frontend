export const AUTH_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export function getCurrentUserId(): number | null {
  try {
    const payload = localStorage.getItem('token')?.split('.')[1];
    if (!payload) return null;
    const { id } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof id === 'number' ? id : null;
  } catch {
    return null;
  }
}
