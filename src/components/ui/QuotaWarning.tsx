import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useStripe } from '../../hooks/useStripe';

export default function QuotaWarning() {
  const { profile } = useAuth();
  const { createCheckoutSession, openBillingPortal, loading } = useStripe();
  const [dismissed, setDismissed] = useState(false);

  if (!profile || dismissed) return null;

  const used = profile.generations_used;
  const limit = profile.generations_limit;
  const effectiveLimit = limit === -1 ? 999999 : limit + (profile.extra_gen_credits ?? 0);
  const ratio = limit === -1 ? 0 : used / (limit || 1);
  if (ratio < 0.8) return null;

  return (
    <div
      style={{
        padding: '12px 20px',
        marginBottom: 16,
        background: ratio >= 1 ? 'rgba(255,80,80,0.08)' : 'rgba(255,200,80,0.06)',
        border: `1px solid ${ratio >= 1 ? 'rgba(255,80,80,0.3)' : 'rgba(255,200,80,0.25)'}`,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>
        {ratio >= 1
          ? `You've used all ${limit} generations this period.`
          : `${used} of ${effectiveLimit} generations used — running low.`}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={loading}
          onClick={() => createCheckoutSession('payment', undefined, 'gen_20')}
        >
          Buy extras
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={loading}
          onClick={() => openBillingPortal()}
        >
          Upgrade
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-ghost)',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
