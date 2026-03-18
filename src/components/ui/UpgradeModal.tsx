import { useStripe } from '../../hooks/useStripe';

interface UpgradeModalProps {
  reason: 'quota' | 'feature';
  featureName?: string;
  onClose: () => void;
}

export default function UpgradeModal({ reason, featureName, onClose }: UpgradeModalProps) {
  const { createCheckoutSession, loading } = useStripe();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-magenta"
        style={{
          maxWidth: 440,
          width: '100%',
          padding: 32,
          borderRadius: 20,
          border: '1px solid rgba(255,0,255,0.35)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,0,255,0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text-hi)' }}>
            {reason === 'quota' ? 'Generation limit reached' : featureName ? `Unlock: ${featureName}` : 'Upgrade to continue'}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-lo)',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: 24 }}>
          {reason === 'quota'
            ? 'You’ve used all included generations this period. Buy extra credits or upgrade your plan for more.'
            : 'This feature is available on a higher plan. Upgrade or buy credit packs below.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="btn btn-primary"
            disabled={loading}
            onClick={() => createCheckoutSession('subscription', 'pro')}
            style={{ width: '100%', justifyContent: 'center', padding: '14px 20px' }}
          >
            {loading ? 'Opening…' : 'Upgrade to Pro — $39/mo'}
          </button>
          <button
            className="btn btn-ghost"
            disabled={loading}
            onClick={() => createCheckoutSession('payment', undefined, 'gen_20')}
            style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 13 }}
          >
            Buy 20 extra generations — $10
          </button>
        </div>

        <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-ghost)', marginTop: 20, textAlign: 'center' }}>
          Charleston · Berkeley · Dorchester only
        </p>
      </div>
    </div>
  );
}
