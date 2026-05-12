import { describe, expect, it } from 'vitest';
import { buildGoogleMapsScriptUrl } from './googleMaps';

describe('buildGoogleMapsScriptUrl', () => {
  it('includes key, places, async loading, weekly version, and callback', () => {
    const url = buildGoogleMapsScriptUrl('TEST_KEY', 'myCallback');
    expect(url).toContain('key=TEST_KEY');
    expect(url).toContain('libraries=places');
    expect(url).toContain('loading=async');
    expect(url).toContain('v=weekly');
    expect(url).toContain('callback=myCallback');
    expect(url.startsWith('https://maps.googleapis.com/maps/api/js?')).toBe(true);
  });
});
