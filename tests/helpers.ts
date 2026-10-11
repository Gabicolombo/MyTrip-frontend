import { vi } from 'vitest';

// Shared stand-ins for next/navigation (wired up in setup.ts).
export const router = { push: vi.fn(), replace: vi.fn() };
export const routeParams: Record<string, string> = {};

export function setUrl(path: string) {
  window.history.replaceState(null, '', path);
}

// A token shaped like the API's JWT: only the payload matters to the frontend.
export function signIn(id = 1, name = 'Gabi') {
  const payload = btoa(JSON.stringify({ id, username: name, email: 'gabi@example.com' }));
  const token = `header.${payload}.signature`;
  localStorage.setItem('token', token);
  localStorage.setItem('name', name);
  return token;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

// Replaces fetch with a handler and returns the mock so tests can inspect the calls.
export function mockFetch(handler: Handler) {
  const mock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => handler(String(input), init));
  vi.stubGlobal('fetch', mock);
  return mock;
}

export function requestBody(mock: ReturnType<typeof mockFetch>, call = 0) {
  return JSON.parse(String(mock.mock.calls[call][1]?.body));
}
