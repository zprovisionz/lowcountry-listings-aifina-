/**
 * Central Google Maps JS bootstrap for the SPA.
 * Loads once with recommended params (loading=async, v=weekly, places library).
 * @see https://developers.google.com/maps/documentation/javascript/load-maps-js-api
 */

export type MapsLoadState = 'idle' | 'loading' | 'ready' | 'error';

const MAPS_SCRIPT_BASE = 'https://maps.googleapis.com/maps/api/js';

/** Modern Maps JS exposes `importLibrary`; legacy typings omit it. */
type MapsNamespace = typeof google.maps & {
  importLibrary?: (name: string) => Promise<unknown>;
};

function getMapsNamespace(): MapsNamespace | undefined {
  return window.google?.maps as MapsNamespace | undefined;
}

let loadPromise: Promise<void> | null = null;
let loadState: MapsLoadState = 'idle';
const listeners = new Set<(s: MapsLoadState) => void>();

function setLoadState(next: MapsLoadState) {
  loadState = next;
  listeners.forEach((fn) => {
    try {
      fn(next);
    } catch {
      /* ignore subscriber errors */
    }
  });
}

export function getMapsLoadState(): MapsLoadState {
  return loadState;
}

/** Subscribe to load-state changes; immediately called with current state. */
export function subscribeMapsLoadState(fn: (s: MapsLoadState) => void): () => void {
  fn(loadState);
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getBrowserKey(): string | undefined {
  const k = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return typeof k === 'string' && k.trim().length > 0 ? k.trim() : undefined;
}

/** Builds the script URL (useful for debugging; covered by unit tests). */
export function buildGoogleMapsScriptUrl(key: string, callbackName: string): string {
  const params = new URLSearchParams({
    key,
    libraries: 'places',
    loading: 'async',
    v: 'weekly',
    callback: callbackName,
  });
  return `${MAPS_SCRIPT_BASE}?${params.toString()}`;
}

/**
 * Ensures the Maps JavaScript API is loaded (with `places` library).
 * Safe to call from multiple components; shares one in-flight promise.
 */
export function loadGoogleMaps(): Promise<void> {
  const key = getBrowserKey();
  if (!key) {
    if (import.meta.env.DEV) {
      console.warn(
        '[Google Maps] VITE_GOOGLE_MAPS_API_KEY is missing. Set it in .env.local and in Vercel (Preview + Production) for address autocomplete.',
      );
    }
    setLoadState('error');
    return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'));
  }

  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in a browser'));
  }

  const maps = getMapsNamespace();
  if (maps && typeof maps.importLibrary === 'function') {
    setLoadState('ready');
    return Promise.resolve();
  }

  if (loadPromise) return loadPromise;

  setLoadState('loading');
  loadPromise = new Promise<void>((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    const cbName = `__gmcb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

    const fail = (err: Error) => {
      loadPromise = null;
      setLoadState('error');
      delete w[cbName];
      reject(err);
    };

    const t = window.setTimeout(() => {
      fail(new Error('Google Maps load timed out'));
    }, 20_000);

    w[cbName] = () => {
      window.clearTimeout(t);
      delete w[cbName];
      try {
        const m = getMapsNamespace();
        if (!m || typeof m.importLibrary !== 'function') {
          fail(new Error('Google Maps loaded but importLibrary is missing'));
          return;
        }
        setLoadState('ready');
        resolve();
      } catch (e) {
        fail(e instanceof Error ? e : new Error(String(e)));
      }
    };

    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = buildGoogleMapsScriptUrl(key, cbName);
    script.onerror = () => {
      window.clearTimeout(t);
      fail(new Error('Failed to load Google Maps script (network or CSP)'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Loads the Places library module (new Places stack). */
export async function importPlacesLibrary(): Promise<unknown> {
  await loadGoogleMaps();
  const m = getMapsNamespace();
  if (!m?.importLibrary) throw new Error('importLibrary unavailable');
  return m.importLibrary('places');
}

/** After an error, allow a fresh load attempt. */
export function resetGoogleMapsLoad(): void {
  loadPromise = null;
  const m = getMapsNamespace();
  if (m && typeof m.importLibrary === 'function') setLoadState('ready');
  else setLoadState('idle');
}
