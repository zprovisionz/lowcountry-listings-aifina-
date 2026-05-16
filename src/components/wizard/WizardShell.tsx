import type { ReactNode } from 'react';

const STEPS = [
  { label: 'Basics', icon: '🏠', desc: 'Address & property details' },
  { label: 'Photos', icon: '📸', desc: 'Upload listing photos' },
  { label: 'Amenities', icon: '✦', desc: 'Features & staging' },
  { label: 'Review', icon: '◈', desc: 'Confirm & generate' },
];

interface WizardShellProps {
  currentStep: number;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  submitting?: boolean;
}

export default function WizardShell({
  currentStep,
  children,
  onBack,
  onNext,
  onSubmit,
  nextDisabled = false,
  nextLabel = 'Continue →',
  submitting = false,
}: WizardShellProps) {
  const isLast = currentStep === STEPS.length;
  const stepMeta = STEPS[currentStep - 1];

  return (
    <div
      className="wizard-shell-immersive"
      style={{
        maxWidth: 800,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div className="glass-dash anim-fade-up d-100 wizard-immersive-card" style={{ overflow: 'visible' }}>
        {/* Single slim progress bar — no duplicate step rail or header strip */}
        <div
          className="wizard-progress-track"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label={`Step ${currentStep} of ${STEPS.length}: ${stepMeta.label}`}
        >
          <div
            className="wizard-progress-fill"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="wizard-content-pad wizard-content-pad--immersive">{children}</div>

        <div
          className="wizard-nav-pad wizard-nav-pad--immersive"
          style={{
            borderTop: '1px solid rgba(0,255,255,0.08)',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <button
            type="button"
            onClick={onBack}
            disabled={currentStep === 1}
            className="btn btn-ghost"
            style={{
              fontSize: 13,
              padding: '10px 18px',
              opacity: currentStep === 1 ? 0.35 : 1,
              cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
              justifySelf: 'start',
            }}
          >
            ← Back
          </button>

          <div
            className="wizard-nav-meta"
            style={{
              textAlign: 'center',
              minWidth: 0,
              fontFamily: "'DM Mono', ui-monospace, monospace",
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-lo)',
            }}
          >
            <span style={{ color: 'var(--cyan)' }}>Step {currentStep}</span>
            <span style={{ color: 'var(--text-ghost)', margin: '0 6px' }}>/</span>
            <span style={{ color: 'var(--text-mid)' }}>{STEPS.length}</span>
            <span
              style={{
                display: 'block',
                marginTop: 4,
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 13,
                letterSpacing: '0.02em',
                textTransform: 'none',
                color: 'var(--text-hi)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {stepMeta.label}
            </span>
          </div>

          {isLast ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting || nextDisabled}
              className="btn btn-primary"
              style={{
                fontSize: 14,
                padding: '12px 28px',
                opacity: submitting || nextDisabled ? 0.6 : 1,
                cursor: submitting || nextDisabled ? 'not-allowed' : 'pointer',
                justifySelf: 'end',
              }}
            >
              {submitting ? (
                <>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: '1.5px solid rgba(0,255,255,.3)',
                      borderTopColor: 'var(--cyan)',
                      borderRadius: '50%',
                      animation: 'spinRing .7s linear infinite',
                      display: 'inline-block',
                    }}
                  />{' '}
                  Generating…
                </>
              ) : (
                '✦ Generate Listing'
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className="btn btn-primary"
              style={{
                fontSize: 14,
                padding: '12px 28px',
                opacity: nextDisabled ? 0.5 : 1,
                cursor: nextDisabled ? 'not-allowed' : 'pointer',
                justifySelf: 'end',
              }}
            >
              {nextLabel}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes spinRing { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
