import { useRef, useState, useCallback } from 'react';
import type { WizardData } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import {
  remainingStagingCredits,
  stagingBatchCapForTier,
  stagingSelectionCapForUi,
} from '../../lib/stagingCredits';
import { DEBUG } from '../../config';

const MAX = 10;

export default function Step2Photos({ data, onChange }: { data: WizardData; onChange: (p: Partial<WizardData>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { profile } = useAuth();
  const allowBypass = !!(DEBUG.bypassBilling && (import.meta.env.DEV || profile?.is_test_user));
  const photoN = data.photoFiles.length;
  const selectCap = stagingSelectionCapForUi(profile, profile?.tier, photoN, allowBypass);
  const tierCap = stagingBatchCapForTier(profile?.tier);
  const rem = profile ? remainingStagingCredits(profile) : 0;
  const remLabel = rem === Number.POSITIVE_INFINITY ? '∞' : String(Math.floor(rem));

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = MAX - data.photoFiles.length;
      const newFiles = Array.from(files)
        .slice(0, remaining)
        .filter((f) => f.type.startsWith('image/'));
      if (!newFiles.length) return;
      onChange({
        photoFiles: [...data.photoFiles, ...newFiles],
        photoUrls: [...data.photoUrls, ...newFiles.map((f) => URL.createObjectURL(f))],
      });
    },
    [data.photoFiles, data.photoUrls, onChange],
  );

  const remove = (i: number) => {
    URL.revokeObjectURL(data.photoUrls[i]);
    onChange({
      photoFiles: data.photoFiles.filter((_, j) => j !== i),
      photoUrls: data.photoUrls.filter((_, j) => j !== i),
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 className="step-heading">Property Photos</h2>
        <p className="step-sub" style={{ marginBottom: 0 }}>
          Upload up to {MAX} photos. OpenAI Vision reads high-confidence details for your listing copy. Virtual staging runs later on Results (1 credit per photo).
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => data.photoFiles.length < MAX && fileRef.current?.click()}
        className={`neon-dropzone${dragging ? ' dragging' : ''}`}
        style={{ cursor: data.photoFiles.length >= MAX ? 'not-allowed' : 'pointer' }}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => addFiles(e.target.files)}
          disabled={data.photoFiles.length >= MAX}
        />
        <div style={{ fontSize: 38, marginBottom: 14 }}>📸</div>
        <p
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 700,
            fontSize: 16,
            color: 'var(--text-hi)',
            margin: '0 0 6px',
          }}
        >
          {data.photoFiles.length >= MAX ? 'Maximum photos reached' : 'Drop photos here or click to browse'}
        </p>
        <p
          style={{
            fontFamily: "'DM Mono', ui-monospace, monospace",
            fontSize: 'var(--text-ui-label)',
            color: 'var(--text-lo)',
            margin: '0 0 16px',
            letterSpacing: '.06em',
          }}
        >
          {data.photoFiles.length} / {MAX} · JPG, PNG, WEBP · max 10MB each
        </p>
        {data.photoFiles.length < MAX && (
          <button type="button" className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
            Browse Files
          </button>
        )}
      </div>

      {photoN > 0 && profile && (
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12.5,
            color: 'var(--text-mid)',
            margin: 0,
            lineHeight: 1.55,
          }}
          title="Batch limits: Starter 5 per run, Pro and above 10. You cannot spend more credits than you have."
        >
          {selectCap > 0 || allowBypass ? (
            <>
              Later on Results you could stage up to <strong style={{ color: 'var(--cyan)' }}>{selectCap}</strong> of these photos in one batch
              {tierCap > 0 ? ` (plan max ${tierCap}/run)` : ''}. You have <strong style={{ color: 'var(--magenta)' }}>{remLabel}</strong> staging credits
              remaining.
            </>
          ) : (
            <>
              Virtual staging runs on the Results page after you generate (1 credit per photo). Your plan has <strong style={{ color: 'var(--magenta)' }}>no staging credits</strong> right now — upgrade from Free to use staging.
            </>
          )}
        </p>
      )}

      {data.photoUrls.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: "'DM Mono', ui-monospace, monospace",
              fontSize: 'var(--text-ui-label)',
              color: 'var(--text-lo)',
              letterSpacing: '.14em',
              marginBottom: 10,
            }}
          >
            UPLOADED — VISION USES THESE FOR COPY
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(128px,42vw),1fr))', gap: 10 }}>
            {data.photoUrls.map((url, i) => (
              <div
                key={url}
                style={{
                  position: 'relative',
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: '1px solid rgba(0,255,255,0.2)',
                  aspectRatio: '4/3',
                  background: 'rgba(0,0,0,0.3)',
                  boxShadow: '0 0 14px rgba(0,255,255,0.06)',
                }}
              >
                <img src={url} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top,rgba(0,0,0,0.45) 0%,transparent 55%)',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 5,
                    left: 7,
                    fontFamily: "'DM Mono', ui-monospace, monospace",
                    fontSize: 'var(--text-ui-label)',
                    color: 'rgba(255,255,255,0.55)',
                  }}
                >
                  #{i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  style={{
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    background: 'rgba(0,0,0,0.7)',
                    border: '1px solid rgba(255,80,80,0.4)',
                    borderRadius: 5,
                    color: '#ff8080',
                    fontSize: 11,
                    width: 22,
                    height: 22,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background .2s',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,80,80,0.25)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.7)')}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <label
        className="glass-magenta"
        style={{
          padding: '10px 14px',
          borderRadius: 12,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          cursor: 'help',
        }}
        title="Vision only adds details it can see clearly. Staging is separate: pick photos and a style on the Results page after you generate."
      >
        <span style={{ fontSize: 18, flexShrink: 0 }}>🤖</span>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--text-hi)' }}>Vision</strong> pulls high-confidence visible details into your MLS copy — no guessing. No photos? You can still generate from facts alone.
        </span>
      </label>
    </div>
  );
}
