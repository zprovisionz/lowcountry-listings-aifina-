import { CHARLESTON_BOUNDS } from '../config';

export { CHARLESTON_BOUNDS };

export function isWithinCharlestonMetro(lat: number, lng: number): boolean {
  return (
    lat >= CHARLESTON_BOUNDS.south &&
    lat <= CHARLESTON_BOUNDS.north &&
    lng >= CHARLESTON_BOUNDS.west &&
    lng <= CHARLESTON_BOUNDS.east
  );
}

/** Supports both legacy LatLng (lat()/lng()) and plain { lat, lng } from newer Place types. */
export function readLatLng(loc: { lat(): number; lng(): number } | { lat: number; lng: number } | null | undefined): {
  lat: number;
  lng: number;
} | null {
  if (!loc) return null;
  const lat = typeof (loc as { lat: unknown }).lat === 'function' ? (loc as { lat: () => number }).lat() : (loc as { lat: number }).lat;
  const lng = typeof (loc as { lng: unknown }).lng === 'function' ? (loc as { lng: () => number }).lng() : (loc as { lng: number }).lng;
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}
