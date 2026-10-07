'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserRound } from 'lucide-react';
import countriesData from 'world-countries';
import Navbar from '@/components/common/navbar';
import { AUTH_API_URL } from '@/lib/auth';
import {
  Combobox, ComboboxTrigger, ComboboxValue, ComboboxInput,
  ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty,
} from '@/components/ui/combobox';

const PROFILE_URL = `${AUTH_API_URL.replace(/\/+$/, '')}/users/me`;
const AUTH_ERROR = 'Unable to authenticate your session. Please sign in again to access your profile.';
const countries = [...countriesData].sort((a, b) =>
  a.name.common.localeCompare(b.name.common, 'en', { sensitivity: 'base' })
);
const countryOptions = countries.map(country => ({
  value: country.cca2,
  label: `${country.flag} ${country.name.common}`,
}));

interface Profile {
  name: string;
  email: string;
  nationality: string;
}

function readProfile(data: unknown): Profile {
  if (!data || typeof data !== 'object' || !('name' in data) || !('email' in data)
    || typeof data.name !== 'string' || typeof data.email !== 'string') {
    throw new Error('Unable to read your profile. Please try again.');
  }
  return {
    name: data.name,
    email: data.email,
    nationality: 'nationality' in data && typeof data.nationality === 'string' ? data.nationality : '',
  };
}

async function responseError(response: Response) {
  if (response.status === 401) return new Error(AUTH_ERROR);
  const data = await response.json().catch(() => null);
  return new Error(Array.isArray(data?.message) ? data.message.join(' ') : data?.message || 'Something went wrong. Please try again.');
}

function syncName(name: string) {
  localStorage.setItem('name', name);
  window.dispatchEvent(new Event('user-updated'));
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Profile>({ name: '', email: '', nationality: '' });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const nationalitySearchRef = useRef<HTMLInputElement>(null);
  const selectedCountry = countryOptions.find(country => country.value === form.nationality)
    ?? (form.nationality ? { value: form.nationality, label: form.nationality } : null);

  function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    window.dispatchEvent(new Event('user-updated'));
    router.replace('/auth/login');
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    const controller = new AbortController();
    async function loadProfile() {
      try {
        const response = await fetch(PROFILE_URL, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: 'no-store',
        });
        if (controller.signal.aborted) return;
        if (!response.ok) throw await responseError(response);
        const user = readProfile(await response.json());
        if (controller.signal.aborted) return;
        setProfile(user);
        setForm(user);
        syncName(user.name);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Failed to load profile.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadProfile();
    return () => controller.abort();
  }, [router, attempt]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    setError(null);
    setSuccess(false);
    if (!form.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    busy.current = true;
    setSaving(true);
    const updated = { ...form, name: form.name.trim(), email: form.email.trim() };
    try {
      const response = await fetch(PROFILE_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ...updated, ...(password ? { password } : {}) }),
      });
      if (!response.ok) throw await responseError(response);
      setProfile(updated);
      setForm(updated);
      setPassword('');
      syncName(updated.name);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  async function deleteAccount() {
    if (busy.current) return;
    busy.current = true;
    setDeleting(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await fetch(PROFILE_URL, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw await responseError(response);
      clearSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account.');
    } finally {
      busy.current = false;
      setDeleting(false);
      deleteDialog.current?.close();
    }
  }

  const inputClass = 'mt-2 min-h-11 w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400';
  const changed = profile && (form.name !== profile.name || form.email !== profile.email || form.nationality !== profile.nationality || password.length > 0);

  return (
    <main className="min-h-dvh bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link href="/home" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-gray-500 hover:text-purple-700"><ArrowLeft size={16} /> My trips</Link>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">My profile</h1>
        <p className="mt-2 mb-6 text-gray-500">Manage your personal details and account.</p>
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {error === AUTH_ERROR && <Link href="/auth/login" className="mb-4 inline-flex min-h-11 items-center rounded-xl bg-purple-600 px-4 text-white hover:bg-purple-700">Sign in again</Link>}
        {success && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">Your profile has been updated.</p>}
        {loading ? <p role="status" className="py-10 text-center text-gray-500">Loading profile...</p> : !profile ? (
          <button onClick={() => { setError(null); setLoading(true); setAttempt(value => value + 1); }} className="min-h-11 rounded-xl bg-purple-600 px-4 text-white">Try again</button>
        ) : (
          <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <form onSubmit={saveProfile} onChange={() => setSuccess(false)} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700"><UserRound size={24} /></span>
                <h2 className="text-lg font-semibold text-gray-900">Personal information</h2>
              </div>
              <fieldset disabled={saving || deleting} className="grid min-w-0 gap-5 disabled:opacity-60 sm:grid-cols-2">
                <label className="min-w-0 text-sm font-medium text-gray-600">Name<input autoComplete="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} /></label>
                <label className="min-w-0 text-sm font-medium text-gray-600">Email<input type="email" autoComplete="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} /></label>
                <div className="min-w-0 text-sm font-medium text-gray-600 sm:col-span-2">
                  <label htmlFor="profile-nationality">Country of nationality</label>
                  <Combobox
                    items={countryOptions}
                    value={selectedCountry}
                    isItemEqualToValue={(country, selected) => country.value === selected.value}
                    disabled={saving || deleting}
                    onValueChange={country => {
                      setForm(current => ({ ...current, nationality: country?.value ?? '' }));
                      setSuccess(false);
                    }}
                  >
                    <ComboboxTrigger id="profile-nationality" type="button"
                      className={`${inputClass} flex cursor-pointer items-center justify-between gap-2 text-left hover:border-purple-400 disabled:cursor-not-allowed`}>
                      <span className="min-w-0 truncate"><ComboboxValue placeholder="Select your country" /></span>
                    </ComboboxTrigger>
                    <ComboboxContent initialFocus={nationalitySearchRef}>
                      <ComboboxInput ref={nationalitySearchRef} aria-label="Search countries"
                        placeholder="Search countries..." showTrigger={false}
                        className="min-h-11 focus-within:border-purple-400 focus-within:ring-purple-200" />
                      <ComboboxEmpty>No countries found.</ComboboxEmpty>
                      <ComboboxList>
                        {(country: { value: string; label: string }) => (
                          <ComboboxItem key={country.value} value={country}
                            className="cursor-pointer data-highlighted:bg-purple-50 data-highlighted:text-purple-700">
                            {country.label}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
                <label className="min-w-0 text-sm font-medium text-gray-600 sm:col-span-2">New password
                  <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} aria-describedby="password-help" className={inputClass} />
                  <span id="password-help" className="mt-2 block text-xs font-normal text-gray-500">Leave blank to keep your current password.</span>
                </label>
              </fieldset>
              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                <button type="button" disabled={saving || deleting || !changed} onClick={() => { setForm(profile); setPassword(''); setSuccess(false); setError(null); }} className="min-h-11 rounded-xl border border-gray-300 px-5 text-sm font-semibold text-gray-600 disabled:opacity-50">Cancel changes</button>
                <button disabled={saving || deleting || !changed} className="min-h-11 rounded-xl bg-purple-600 px-5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save changes'}</button>
              </div>
            </form>
            <section className="min-w-0 rounded-2xl border border-red-200 bg-white p-5 sm:p-6">
              <h2 className="font-semibold text-gray-900">Delete account</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">Permanently delete your account. This action cannot be undone.</p>
              <button disabled={saving || deleting} onClick={() => deleteDialog.current?.showModal()} className="mt-5 min-h-11 w-full rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Delete my account</button>
            </section>
          </div>
        )}
      </div>
      <dialog ref={deleteDialog} aria-labelledby="delete-account-title" onCancel={event => { if (busy.current) event.preventDefault(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl backdrop:bg-black/40">
        <h2 id="delete-account-title" className="text-xl font-bold text-gray-900">Delete your account?</h2>
        <p className="mt-3 text-sm text-gray-600">This action is permanent. Are you sure you want to continue?</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button autoFocus disabled={deleting} onClick={() => deleteDialog.current?.close()} className="min-h-11 rounded-xl border border-gray-300 px-4 text-gray-600 disabled:opacity-50">Cancel</button>
          <button disabled={deleting} onClick={deleteAccount} className="min-h-11 rounded-xl bg-red-600 px-4 font-semibold text-white hover:bg-red-700 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete account'}</button>
        </div>
      </dialog>
    </main>
  );
}
