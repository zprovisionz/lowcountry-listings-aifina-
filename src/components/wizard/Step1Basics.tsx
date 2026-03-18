import { useEffect, useRef, useState } from 'react';
import type { WizardData } from '../../types/database';
import { PROPERTY_TYPES } from '../../types/database';
import { CHARLESTON_BOUNDS, TIMING_MS } from '../../config';

const BOUNDS = CHARLESTON_BOUNDS;

const detectNeighborhood = (addr: string): string => {
  const l = addr.toLowerCase();
  if (l.includes('mount pleasant') || l.includes('mt pleasant')) return 'Mount Pleasant';
  if (l.includes('james island'))   return 'James Island';
  if (l.includes('west ashley'))    return 'West Ashley';
  if (l.includes('isle of palms') || l.includes('iop')) return 'Isle of Palms';
  if (l.includes("sullivan"))       return "Sullivan's Island";
  if (l.includes('folly'))          return 'Folly Beach';
  if (l.includes('daniel island'))  return 'Daniel Island';
  if (l.includes('summerville'))    return 'Summerville';
  if (l.includes('kiawah'))         return 'Kiawah Island';
  if (l.includes('seabrook'))       return 'Seabrook Island';
  if (l.includes('goose creek'))    return 'Goose Creek';
  if (l.includes('hanahan'))        return 'Hanahan';
  if (l.includes('north charleston')) return 'North Charleston';
  if (l.includes('charleston'))     return 'Downtown Charleston';
  return 'Charleston Metro';
};

export default function Step1Basics({
  data,
  onChange,
  overviewOnly,
}: {
  data: WizardData;
  onChange: (p: Partial<WizardData>) => void;
  overviewOnly: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef    = useRef<google.maps.places.Autocomplete | null>(null);
  const [addrErr, setAddrErr] = useState('');
  const [mapsReady, setMapsReady] = useState(!!(window as Window & typeof globalThis & { googleMapsReady?: boolean }).googleMapsReady);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (mapsReady) return;
    const h = () => setMapsReady(true);
    window.addEventListener('googleMapsReady', h);
    return () => window.removeEventListener('googleMapsReady', h);
  }, [mapsReady]);

  // After 10s, allow manual address entry if Maps never loaded
  useEffect(() => {
    if (mapsReady || useFallback) return;
    const t = setTimeout(() => setUseFallback(true), TIMING_MS.mapsFallbackDelay);
    return () => clearTimeout(t);
  }, [mapsReady, useFallback]);

  useEffect(() => {
    if (!mapsReady || useFallback || !inputRef.current) return;
    const bounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(BOUNDS.south, BOUNDS.west),
      new window.google.maps.LatLng(BOUNDS.north, BOUNDS.east),
    );
    acRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      bounds, strictBounds: true,
      componentRestrictions:{ country:'us' },
      types:['address'],
      fields:['formatted_address','place_id','geometry'],
    });
    acRef.current.addListener('place_changed', () => {
      const p = acRef.current?.getPlace();
      if (!p?.formatted_address) return;
      const loc = p.geometry?.location;
      if (!loc) return;
      if (loc.lat() < BOUNDS.south || loc.lat() > BOUNDS.north || loc.lng() < BOUNDS.west || loc.lng() > BOUNDS.east) {
        setAddrErr('Address must be within Charleston, Berkeley, or Dorchester county.');
        return;
      }
      setAddrErr('');
      onChange({ address:p.formatted_address, placeId:p.place_id??'', neighborhood:detectNeighborhood(p.formatted_address) });
    });
  }, [mapsReady, useFallback, onChange]);

  const canEdit = mapsReady || useFallback;
  const syncManualAddress = (value: string) => {
    const trimmed = value.trim();
    setAddrErr('');
    onChange({ address: trimmed || '', placeId: '', neighborhood: trimmed ? detectNeighborhood(trimmed) : '' });
  };

  const neonField = (label: string, key: keyof WizardData, type='text', placeholder='') => (
    <div>
      <label className="neon-label">{label}</label>
      <input
        type={type}
        value={data[key] as string|number}
        onChange={e => onChange({ [key]: type==='number' ? (e.target.value===''?'':Number(e.target.value)) : e.target.value } as Partial<WizardData>)}
        placeholder={placeholder}
        className="neon-input"
      />
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div>
        <h2 className="step-heading">Property Basics</h2>
        <p className="step-sub">Start with the property address and core details. Address must be within Charleston metro.</p>
      </div>

      {/* Address */}
      <div>
        <label className="neon-label">Property Address *</label>
        <div style={{ position:'relative' }}>
          <span style={{
            position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
            fontSize:15, color: data.address ? 'var(--cyan)' : 'var(--text-lo)', transition:'color .2s', zIndex:1,
            pointerEvents:'none',
          }}>📍</span>
          <input
            key={useFallback ? 'fallback' : 'autocomplete'}
            ref={inputRef}
            value={useFallback ? (data.address ?? '') : undefined}
            defaultValue={!useFallback ? data.address : undefined}
            onChange={useFallback ? (e) => syncManualAddress(e.target.value) : undefined}
            onBlur={useFallback ? (e) => syncManualAddress(e.target.value.trim()) : undefined}
            disabled={!canEdit}
            placeholder={!canEdit ? 'Loading Maps…' : useFallback ? 'Type address (Charleston, Berkeley, or Dorchester)…' : 'Start typing a Charleston address…'}
            className="address-input"
            autoComplete="off"
            style={{ opacity: canEdit ? 1 : 0.5 }}
          />
        </div>
        {useFallback && data.address && (
          <div style={{
            marginTop:6, padding:'8px 12px',
            background:'rgba(255,200,80,0.07)', border:'1px solid rgba(255,200,80,0.25)',
            borderRadius:8, fontSize:11.5, color:'rgba(255,200,80,0.95)', fontFamily:'Space Mono,monospace',
          }}>Address not verified by Google; ensure it's in Charleston, Berkeley, or Dorchester.</div>
        )}
        {addrErr && (
          <div style={{
            marginTop:6, padding:'8px 12px',
            background:'rgba(255,80,80,0.07)', border:'1px solid rgba(255,80,80,0.25)',
            borderRadius:8, fontSize:11.5, color:'#ff8080', fontFamily:'Space Mono,monospace',
          }}>{addrErr}</div>
        )}
        {data.neighborhood && !addrErr && (
          <div style={{ marginTop:7, display:'inline-flex', alignItems:'center', gap:6,
            padding:'4px 12px', background:'rgba(0,255,255,0.07)', border:'1px solid rgba(0,255,255,0.22)',
            borderRadius:20, fontSize:10, color:'var(--cyan)', fontFamily:'Space Mono,monospace',
            boxShadow:'0 0 10px rgba(0,255,255,0.1)',
          }}>
            <span style={{ fontSize:8 }}>◆</span>
            {data.neighborhood} detected
          </div>
        )}
      </div>

      <div
        onClick={() => onChange({ overviewOnly: !data.overviewOnly })}
        style={{
          padding: '14px 16px',
          borderRadius: 12,
          border: `1px solid ${data.overviewOnly ? 'rgba(255,200,80,0.35)' : 'rgba(255,255,255,0.1)'}`,
          background: data.overviewOnly ? 'rgba(255,200,80,0.06)' : 'rgba(0,0,0,0.2)',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 4,
            border: `2px solid ${data.overviewOnly ? 'rgba(255,200,80,0.8)' : 'rgba(255,255,255,0.25)'}`,
            background: data.overviewOnly ? 'rgba(255,200,80,0.25)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0,
          }}>{data.overviewOnly ? '✓' : ''}</div>
          <div>
            <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--text-hi)' }}>
              Neighborhood overview only (quick generate)
            </div>
            <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: 'var(--text-mid)', marginTop: 4, lineHeight: 1.5 }}>
              Skip bed/bath/sqft. MLS will be an area-focused overview only—no invented property details. Add full specs later for a complete listing.
            </div>
          </div>
        </div>
      </div>

      {/* Property type */}
      <div>
        <label className="neon-label">Property Type *</label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {PROPERTY_TYPES.map(({ value, label }) => {
            const on = data.propertyType === value;
            return (
              <button key={value} onClick={() => onChange({ propertyType: value as WizardData['propertyType'] })} style={{
                padding:'9px 18px',
                background: on ? 'rgba(0,255,255,0.12)' : 'rgba(0,255,255,0.03)',
                border:`1px solid ${on ? 'rgba(0,255,255,0.6)' : 'rgba(0,255,255,0.15)'}`,
                borderRadius:9, cursor:'pointer',
                fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:13,
                color: on ? 'var(--cyan)' : 'var(--text-mid)',
                transition:'all .2s ease',
                boxShadow: on ? '0 0 16px rgba(0,255,255,0.2),inset 0 0 10px rgba(0,255,255,0.05)' : 'none',
              }}>{label}</button>
            );
          })}
        </div>
      </div>

      {/* Grid fields */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:14 }}>
        {neonField(overviewOnly ? 'Bedrooms (optional)' : 'Bedrooms *', 'bedrooms', 'number', '3')}
        {neonField(overviewOnly ? 'Bathrooms (optional)' : 'Bathrooms *', 'bathrooms', 'number', '2')}
        {neonField(overviewOnly ? 'Sq Ft (optional)' : 'Sq Ft *', 'sqft', 'number', '1850')}
        {neonField('Year Built',  'yearBuilt', 'number', '2005')}
        {neonField('List Price ($)','price',   'number', '650000')}
        {neonField('MLS #',       'mlsNumber', 'text',   'Optional')}
      </div>

    </div>
  );
}
