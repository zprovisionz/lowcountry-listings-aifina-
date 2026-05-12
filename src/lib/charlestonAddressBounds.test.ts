import { describe, expect, it } from 'vitest';
import { isWithinCharlestonMetro, readLatLng } from './charlestonAddressBounds';

describe('isWithinCharlestonMetro', () => {
  it('accepts downtown Charleston', () => {
    expect(isWithinCharlestonMetro(32.7765, -79.9311)).toBe(true);
  });

  it('rejects far outside metro', () => {
    expect(isWithinCharlestonMetro(40.7, -74)).toBe(false);
  });
});

describe('readLatLng', () => {
  it('reads legacy LatLng callables', () => {
    const loc = {
      lat: () => 32.8,
      lng: () => -79.9,
    };
    expect(readLatLng(loc)).toEqual({ lat: 32.8, lng: -79.9 });
  });

  it('reads plain literals', () => {
    expect(readLatLng({ lat: 32.7, lng: -80.0 })).toEqual({ lat: 32.7, lng: -80.0 });
  });

  it('returns null for null', () => {
    expect(readLatLng(null)).toBeNull();
  });
});
