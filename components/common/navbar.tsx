'use client';

import { useState, useRef, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, LogOut, User } from 'lucide-react';

interface NavbarProps {
  onNewTripClick?: () => void;
}

function subscribeToUser(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('user-updated', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('user-updated', callback);
  };
}

export default function Navbar({ onNewTripClick }: NavbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const name = useSyncExternalStore(subscribeToUser, () => localStorage.getItem('name') || '', () => '');
  const menuRef = useRef<HTMLDivElement>(null);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    router.push('/auth/login');
  }

  return (
    <nav aria-label="Main navigation" className="relative z-30 border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="min-h-18 py-3 flex items-center justify-between gap-3">
          <button onClick={() => router.push('/home')} className="flex items-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <MapPin size={20} className="text-purple-700" />
            </span>
            <span className="text-purple-800 font-bold text-xl tracking-tight">TripInOrder</span>
          </button>

          <div className="flex items-center gap-2.5">
            {onNewTripClick && <button
              aria-label="Create new trip"
              onClick={onNewTripClick}
              className="flex min-h-11 min-w-11 justify-center items-center gap-1.5 bg-purple-600 text-white font-medium text-sm px-3 sm:px-4 py-1.5 rounded-xl hover:bg-purple-700 transition-colors"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">New trip</span>
            </button>}

            <div ref={menuRef} className="relative">
              <button
                aria-label="Open user menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
                className="w-11 h-11 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 text-sm font-semibold"
              >
                {name.charAt(0).toUpperCase() || 'U'}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 text-sm">
                  <button
                    onClick={() => router.push('/profile')}
                    className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-purple-50 flex items-center gap-2"
                  >
                    <User size={14} /> Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-red-500 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
