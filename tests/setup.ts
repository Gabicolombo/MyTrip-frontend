import '@testing-library/jest-dom/vitest';
import { createElement } from 'react';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { routeParams, router, setUrl } from './helpers';

vi.mock('next/navigation', async () => {
  const helpers = await import('./helpers');
  return {
    useRouter: () => helpers.router,
    useParams: () => helpers.routeParams,
    useSearchParams: () => new URLSearchParams(window.location.search),
  };
});

// The map needs a real browser (Leaflet); components that load it get a placeholder.
vi.mock('next/dynamic', () => ({
  default: () => () => createElement('div', { 'data-testid': 'map' }),
}));

// jsdom does not implement <dialog> modals.
HTMLDialogElement.prototype.showModal = function () { this.open = true; };
HTMLDialogElement.prototype.close = function () { this.open = false; };

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
  for (const key of Object.keys(routeParams)) delete routeParams[key];
  setUrl('/');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
