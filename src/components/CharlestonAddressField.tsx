import { useCallback, useEffect, useRef, useState } from 'react';
import { CHARLESTON_BOUNDS, isWithinCharlestonMetro, readLatLng } from '../lib/charlestonAddressBounds';
import { detectNeighborhood } from '../lib/detectNeighborhood';
import {
  loadGoogleMaps,
  importPlacesLibrary,
  resetGoogleMapsLoad,
  subscribeMapsLoadState,
  type MapsLoadState,
} from '../lib/googleMaps';

export type CharlestonAddressSelection = {
  formattedAddress: string;
  placeId: string;
  neighborhood: string;
};

type GmpSelectLike = Event & {
  placePrediction?: {
    toPlace(): {
      fetchFields: (opts: { fields: string[] }) => Promise<{ [k: string]: unknown } | void>;
      formattedAddress?: string;
      id?: string;
      location?: { lat(): number; lng(): number } | { lat: number; lng: number } | null;
    };
  };
};

type PlaceAutocompleteElementCtor = new (opts?: object) => HTMLElement & {
  placeholder: string;
  includedRegionCodes: string[];
  locationRestriction: google.maps.LatLngBoundsLiteral | null;
  addEventListener(type: 'gmp-select', listener: (ev: GmpSelectLike) => void): void;
};

export type CharlestonAddressFieldProps = {
  /**
   * When set, manual entry is controlled by the parent (wizard).
   * When omitted, manual typing uses local state (landing hero).
   */
  manualValue?: string;
  onManualChange?: (value: string) => void;
  onPick: (sel: CharlestonAddressSelection) => void;
  onClear?: () => void;
  placeholder?: string;
  variant?: 'hero' | 'wizard';
  disabled?: boolean;
  manualInputId?: string;
};

const boundsLiteral: google.maps.LatLngBoundsLiteral = {
  north: CHARLESTON_BOUNDS.north,
  south: CHARLESTON_BOUNDS.south,
  east: CHARLESTON_BOUNDS.east,
  west: CHARLESTON_BOUNDS.west,
};

function readPlacePrediction(ev: Event): GmpSelectLike['placePrediction'] | undefined {
  const e = ev as CustomEvent<{ placePrediction?: GmpSelectLike['placePrediction'] }> & GmpSelectLike;
  return e.placePrediction ?? e.detail?.placePrediction;
}

export default function CharlestonAddressField({
  manualValue: controlledManual,
  onManualChange,
  onPick,
  onClear,
  placeholder = 'Start typing a Charleston address…',
  variant = 'wizard',
  disabled = false,
  manualInputId,
}: CharlestonAddressFieldProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pacRef = useRef<(HTMLElement & { value?: string }) | null>(null);
  const onPickRef = useRef(onPick);
  const onClearRef = useRef(onClear);
  const onManualChangeRef = useRef(onManualChange);
  onPickRef.current = onPick;
  onClearRef.current = onClear;
  onManualChangeRef.current = onManualChange;

  const [mapsState, setMapsState] = useState<MapsLoadState>('idle');
  const [manualMode, setManualMode] = useState(false);
  const [internalManual, setInternalManual] = useState('');
  const [hasPick, setHasPick] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [loadingPick, setLoadingPick] = useState(false);
  const [loadHint, setLoadHint] = useState(false);

  const isControlledManual = controlledManual !== undefined;
  const effectiveManual = isControlledManual ? (controlledManual ?? '') : internalManual;

  const setEffectiveManual = useCallback(
    (v: string) => {
      if (isControlledManual) onManualChangeRef.current?.(v);
      else setInternalManual(v);
    },
    [isControlledManual],
  );

  useEffect(() => subscribeMapsLoadState(setMapsState), []);

  useEffect(() => {
    if (mapsState !== 'loading') return;
    const t = window.setTimeout(() => setLoadHint(true), 3000);
    return () => window.clearTimeout(t);
  }, [mapsState]);

  useEffect(() => {
    if (manualMode || disabled) return;
    loadGoogleMaps().catch(() => {
      /* error state via subscribe */
    });
  }, [manualMode, disabled]);

  const teardownPac = useCallback(() => {
    if (hostRef.current) hostRef.current.innerHTML = '';
    pacRef.current = null;
  }, []);

  const attachPac = useCallback(async () => {
    if (manualMode || disabled || !hostRef.current) return;
    teardownPac();
    try {
      await loadGoogleMaps();
    } catch {
      return;
    }
    const placesLib = (await importPlacesLibrary()) as unknown as {
      PlaceAutocompleteElement: PlaceAutocompleteElementCtor;
    };
    const Ctor = placesLib.PlaceAutocompleteElement;
    if (!Ctor || typeof Ctor !== 'function') {
      setManualMode(true);
      return;
    }

    const el = new Ctor({});
    el.placeholder = placeholder;
    el.includedRegionCodes = ['us'];
    el.locationRestriction = boundsLiteral;

    const onSelect = async (ev: GmpSelectLike) => {
      const pred = readPlacePrediction(ev);
      if (!pred) return;
      setLoadingPick(true);
      setGeoError('');
      try {
        const place = pred.toPlace();
        await place.fetchFields({
          fields: ['formattedAddress', 'location', 'id'],
        });
        const addr = place.formattedAddress?.trim();
        const loc = readLatLng(place.location as Parameters<typeof readLatLng>[0]);
        if (!addr || !loc) {
          setGeoError('Could not read that place. Try again or use manual entry.');
          return;
        }
        if (!isWithinCharlestonMetro(loc.lat, loc.lng)) {
          setGeoError('Address must be in Charleston, Berkeley, or Dorchester county.');
          return;
        }
        const placeId = (place.id as string | undefined) ?? '';
        setHasPick(true);
        onPickRef.current({
          formattedAddress: addr,
          placeId,
          neighborhood: detectNeighborhood(addr),
        });
      } catch {
        setGeoError('Google Places error. Try manual entry or check billing/API settings.');
      } finally {
        setLoadingPick(false);
      }
    };

    el.addEventListener('gmp-select', (ev) => {
      void onSelect(ev as GmpSelectLike);
    });

    hostRef.current.appendChild(el);
    pacRef.current = el as HTMLElement & { value?: string };
  }, [disabled, manualMode, placeholder, teardownPac]);

  useEffect(() => {
    if (manualMode || disabled || mapsState !== 'ready') {
      teardownPac();
      return;
    }
    let cancelled = false;
    void (async () => {
      await attachPac();
      if (cancelled) teardownPac();
    })();
    return () => {
      cancelled = true;
      teardownPac();
    };
  }, [attachPac, disabled, manualMode, mapsState, teardownPac]);

  const handleClear = () => {
    setGeoError('');
    setHasPick(false);
    if (pacRef.current && 'value' in pacRef.current) {
      try {
        (pacRef.current as HTMLInputElement).value = '';
      } catch {
        /* ignore */
      }
    }
    setEffectiveManual('');
    onClearRef.current?.();
    if (hostRef.current && mapsState === 'ready' && !manualMode) void attachPac();
  };

  const showManual = manualMode || mapsState === 'error';
  const mapsLoading = mapsState === 'loading' && !manualMode;
  const showClear = (hasPick || effectiveManual.trim().length > 0) && !loadingPick;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: variant === 'hero' ? 16 : 14,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: variant === 'hero' ? 16 : 15,
            zIndex: 2,
            transition: 'color .3s',
            color: 'var(--text-lo)',
            pointerEvents: 'none',
          }}
        >
          📍
        </span>

        {showManual ? (
          <input
            id={manualInputId}
            type="text"
            value={effectiveManual}
            disabled={disabled}
            onChange={(e) => {
              setGeoError('');
              setEffectiveManual(e.target.value);
            }}
            onBlur={() => {
              const trimmed = effectiveManual.trim();
              if (!trimmed) return;
              setHasPick(true);
              onPickRef.current({
                formattedAddress: trimmed,
                placeId: '',
                neighborhood: detectNeighborhood(trimmed),
              });
            }}
            placeholder={
              mapsState === 'error'
                ? 'Type full street address (Charleston metro)…'
                : 'Type address (Charleston, Berkeley, or Dorchester)…'
            }
            className="address-input"
            autoComplete="off"
            style={{
              paddingLeft: variant === 'hero' ? 44 : 40,
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <div
            ref={hostRef}
            className="gmp-place-autocomplete-host"
            style={{
              minHeight: 46,
              paddingLeft: variant === 'hero' ? 36 : 32,
              opacity: disabled ? 0.5 : mapsLoading ? 0.65 : 1,
              transition: 'opacity .2s',
            }}
          />
        )}

        {loadingPick && (
          <div
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              border: '1.5px solid rgba(0,255,255,0.2)',
              borderTopColor: 'var(--cyan)',
              borderRadius: '50%',
              animation: 'spinRing .7s linear infinite',
            }}
          />
        )}

        {showClear && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-lo)',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
            }}
            aria-label="Clear"
          >
            ✕
          </button>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          marginTop: 8,
          fontSize: 10,
          color: 'var(--text-ghost)',
          fontFamily: "'DM Mono', ui-monospace, monospace",
        }}
      >
        <span style={{ color: 'var(--cyan)', fontSize: 8 }}>◆</span>
        <span>Charleston · Berkeley · Dorchester</span>
        {!showManual && mapsState !== 'idle' && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setGeoError('');
              setManualMode(true);
              teardownPac();
            }}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: '1px solid rgba(0,255,255,0.25)',
              borderRadius: 6,
              color: 'var(--cyan)',
              fontSize: 9,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Mono', ui-monospace, monospace",
            }}
          >
            Type manually
          </button>
        )}
        {showManual && mapsState === 'error' && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              resetGoogleMapsLoad();
              setManualMode(false);
              setGeoError('');
              void loadGoogleMaps().catch(() => {});
            }}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: '1px solid rgba(0,255,255,0.25)',
              borderRadius: 6,
              color: 'var(--cyan)',
              fontSize: 9,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Mono', ui-monospace, monospace",
            }}
          >
            Retry Google
          </button>
        )}
      </div>

      {mapsLoading && loadHint && !showManual && (
        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            color: 'var(--text-lo)',
            fontFamily: "'DM Mono', ui-monospace, monospace",
          }}
        >
          Still loading Google address search… you can switch to manual entry anytime.
        </div>
      )}

      {mapsState === 'error' && !manualMode && (
        <div
          style={{
            marginTop: 8,
            padding: '9px 14px',
            background: 'rgba(255,200,80,0.07)',
            border: '1px solid rgba(255,200,80,0.28)',
            borderRadius: 8,
            fontSize: 11,
            color: 'rgba(255,220,140,0.95)',
            fontFamily: "'DM Mono', ui-monospace, monospace",
          }}
        >
          Google Maps did not load (check API key billing, enabled APIs, and HTTP referrer restrictions). Use{' '}
          <strong>Type manually</strong> above.
        </div>
      )}

      {effectiveManual.trim().length > 0 && showManual && (
        <div
          style={{
            marginTop: 6,
            padding: '8px 12px',
            background: 'rgba(255,200,80,0.07)',
            border: '1px solid rgba(255,200,80,0.25)',
            borderRadius: 8,
            fontSize: 11.5,
            color: 'rgba(255,200,80,0.95)',
            fontFamily: "'DM Mono', ui-monospace, monospace",
          }}
        >
          Address not verified by Google; ensure it&apos;s in Charleston, Berkeley, or Dorchester.
        </div>
      )}

      {geoError && (
        <div
          style={{
            marginTop: 8,
            padding: '9px 14px',
            background: 'rgba(255,80,80,0.08)',
            border: '1px solid rgba(255,80,80,0.28)',
            borderRadius: 8,
            fontSize: 11,
            color: '#ff8080',
            fontFamily: "'DM Mono', ui-monospace, monospace",
          }}
        >
          ⚠ {geoError}
        </div>
      )}

      <style>{`@keyframes spinRing { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
