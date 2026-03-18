import { useEffect, useRef, useState, useCallback } from 'react';

const CHARLESTON_BOUNDS = { north: 33.2, south: 32.5, east: -79.6, west: -80.5 };

interface AddressSearchProps {
  onAddressSelect: (address: string) => void;
  onClear: () => void;
}

export default function AddressSearch({ onAddressSelect, onClear }: AddressSearchProps) {
  const inputRef        = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [value,   setValue]   = useState('');
  const [ready,   setReady]   = useState(false);
  const [focused, setFocused] = useState(false);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const init = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places) return;
    const bounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(CHARLESTON_BOUNDS.south, CHARLESTON_BOUNDS.west),
      new window.google.maps.LatLng(CHARLESTON_BOUNDS.north, CHARLESTON_BOUNDS.east),
    );
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      bounds, strictBounds: true,
      componentRestrictions: { country: 'us' },
      types: ['address'],
      fields: ['formatted_address', 'place_id', 'geometry'],
    });
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place?.formatted_address) return;
      const loc = place.geometry?.location;
      if (!loc ||
          loc.lat() < CHARLESTON_BOUNDS.south || loc.lat() > CHARLESTON_BOUNDS.north ||
          loc.lng() < CHARLESTON_BOUNDS.west  || loc.lng() > CHARLESTON_BOUNDS.east) {
        setError('Address must be in Charleston, Berkeley, or Dorchester county.');
        return;
      }
      setError('');
      setLoading(true);
      setValue(place.formatted_address);
      setTimeout(() => {
        setLoading(false);
        onAddressSelect(place.formatted_address!);
      }, 600);
    });
    setReady(true);
  }, [onAddressSelect]);

  useEffect(() => {
    if ((window as Window & typeof globalThis & { googleMapsReady?: boolean }).googleMapsReady) { init(); return; }
    const h = () => init();
    window.addEventListener('googleMapsReady', h);
    return () => window.removeEventListener('googleMapsReady', h);
  }, [init]);

  const handleClear = () => {
    setValue(''); setError(''); onClear(); inputRef.current?.focus();
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        {/* Pin icon */}
        <span style={{
          position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
          fontSize: 16, zIndex: 2, transition: 'color .3s',
          color: focused ? 'var(--cyan)' : 'var(--text-lo)',
        }}>
          📍
        </span>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={!ready}
          placeholder={ready ? 'Enter a Charleston area address...' : 'Initializing address search…'}
          className="address-input"
          autoComplete="off"
          style={{ opacity: ready ? 1 : 0.5 }}
        />

        {/* Loading spinner */}
        {loading && (
          <div style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            width: 16, height: 16,
            border: '1.5px solid rgba(0,255,255,0.2)',
            borderTopColor: 'var(--cyan)',
            borderRadius: '50%',
            animation: 'spinRing .7s linear infinite',
          }} />
        )}

        {/* Clear */}
        {value && !loading && (
          <button onClick={handleClear} style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            background: 'transparent', border: 'none', color: 'var(--text-lo)',
            cursor: 'pointer', fontSize: 16, lineHeight: 1,
            transition: 'color .2s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--cyan)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-lo)'}
          aria-label="Clear">✕</button>
        )}
      </div>

      {/* Geo badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginTop: 8, fontSize: 10,
        color: 'var(--text-ghost)', fontFamily: 'Space Mono, monospace',
      }}>
        <span style={{ color: 'var(--cyan)', fontSize: 8 }}>◆</span>
        Restricted to Charleston · Berkeley · Dorchester counties
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 8, padding: '9px 14px',
          background: 'rgba(255,80,80,0.08)',
          border: '1px solid rgba(255,80,80,0.28)',
          borderRadius: 8, fontSize: 11, color: '#ff8080',
          fontFamily: 'Space Mono, monospace',
        }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
