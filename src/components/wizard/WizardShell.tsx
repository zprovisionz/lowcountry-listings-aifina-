import type { ReactNode } from 'react';

const STEPS = [
  { label:'Basics',    icon:'🏠', desc:'Address & property details' },
  { label:'Photos',    icon:'📸', desc:'Upload listing photos' },
  { label:'Amenities', icon:'✦',  desc:'Features & staging' },
  { label:'Review',    icon:'◈',  desc:'Confirm & generate' },
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
  currentStep, children,
  onBack, onNext, onSubmit,
  nextDisabled = false, nextLabel = 'Continue →',
  submitting = false,
}: WizardShellProps) {
  const isLast = currentStep === STEPS.length;

  return (
    <div style={{ maxWidth:800, margin:'0 auto', display:'flex', flexDirection:'column', gap:22 }}>

      {/* Step progress */}
      <div className="glass-dash anim-fade-up" style={{ padding:'22px 26px' }}>
        <div style={{ display:'flex', alignItems:'center' }}>
          {STEPS.map((step, i) => {
            const n = i + 1;
            const isActive   = n === currentStep;
            const isDone     = n < currentStep;
            const isUpcoming = n > currentStep;

            return (
              <div key={step.label} style={{ display:'flex', alignItems:'center', flex:1 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flex:'0 0 auto' }}>
                  <div
                    className={`wizard-step-node ${isActive ? 'active' : isDone ? 'done' : 'upcoming'}`}
                    style={{ color: isDone ? '#00ff96' : isActive ? 'var(--cyan)' : 'var(--text-lo)', fontSize: isDone ? 14 : 17 }}
                  >
                    {isDone ? '✓' : step.icon}
                  </div>
                  <span style={{
                    fontFamily:'Space Mono,monospace', fontSize:8.5, letterSpacing:'.08em',
                    textTransform:'uppercase', whiteSpace:'nowrap',
                    color: isDone ? '#00ff96' : isActive ? 'var(--cyan)' : 'var(--text-ghost)',
                    transition:'color .3s',
                  }}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`wizard-connector ${isDone ? 'done' : 'upcoming'}`}
                    style={{ marginTop:-16 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content card */}
      <div className="glass-dash anim-fade-up d-100" style={{ overflow:'hidden' }}>
        {/* Card header bar */}
        <div style={{
          padding:'14px 26px',
          borderBottom:'1px solid rgba(0,255,255,0.08)',
          background:'rgba(0,255,255,0.03)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span className="dot-live" />
            <span style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'var(--cyan)', letterSpacing:'.14em' }}>
              STEP {currentStep} OF {STEPS.length} — {STEPS[currentStep-1].desc.toUpperCase()}
            </span>
          </div>
          <span style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)' }}>
            {Math.round((currentStep / STEPS.length) * 100)}% complete
          </span>
        </div>

        {/* Step content */}
        <div style={{ padding:'32px 28px' }}>
          {children}
        </div>

        {/* Nav */}
        <div style={{
          padding:'18px 28px',
          borderTop:'1px solid rgba(0,255,255,0.08)',
          background:'rgba(0,0,0,0.2)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <button onClick={onBack} disabled={currentStep === 1} className="btn btn-ghost"
            style={{
              fontSize:13,
              padding:'10px 22px',
              opacity: currentStep === 1 ? 0.35 : 1,
              cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
            }}>
            ← Back
          </button>

          {isLast ? (
            <button onClick={onSubmit} disabled={submitting || nextDisabled} className="btn btn-primary"
              style={{
                fontSize:14,
                padding:'12px 32px',
                opacity: (submitting || nextDisabled) ? 0.6 : 1,
                cursor: (submitting || nextDisabled) ? 'not-allowed' : 'pointer',
              }}>
              {submitting ? (
                <><span style={{ width:14,height:14,border:'1.5px solid rgba(0,255,255,.3)',borderTopColor:'var(--cyan)',borderRadius:'50%',animation:'spinRing .7s linear infinite',display:'inline-block' }} /> Generating…</>
              ) : '✦ Generate Listing'}
            </button>
          ) : (
            <button onClick={onNext} disabled={nextDisabled} className="btn btn-primary"
              style={{
                fontSize:14,
                padding:'12px 32px',
                opacity: nextDisabled ? 0.5 : 1,
                cursor: nextDisabled ? 'not-allowed' : 'pointer',
              }}>
              {nextLabel}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes spinRing { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
