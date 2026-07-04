'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, LogOut, User } from 'lucide-react';

interface NavbarProps {
  onNewTripClick?: () => void;
}

export default function Navbar({ onNewTripClick }: NavbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userName = localStorage.getItem('name') || '';
    setName(userName);
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    router.push('/auth/login');
  }

  return (
    <nav className="px-4 pb-2 pt-2 pb-0">
      <div className="max-w-6xl mx-auto">
        <div className="bg-purple-700 rounded-2xl px-5 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/home')} className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <MapPin size={15} className="text-white" />
            </span>
            <span className="text-white font-medium text-lg tracking-tight">MyTrip</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onNewTripClick}
              className="flex items-center gap-1.5 bg-white text-purple-700 font-medium text-sm px-4 py-1.5 rounded-full hover:bg-purple-50 transition-colors"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">New trip</span>
            </button>

            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-white text-xs font-medium"
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