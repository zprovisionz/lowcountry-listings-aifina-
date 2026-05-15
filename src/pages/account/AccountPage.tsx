import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useStripe } from '../../hooks/useStripe';
import { supabase } from '../../lib/supabase';
import { PLAN_LIMITS } from '../../config';

interface Tier {
  name: string;
  key: string;
  price: string;
  gens: string;
  staging: string;
  color: string;
  border: string;
}

const TIERS: Tier[] = [
  { name:'Free',    key:'free',     price:'$0/mo',   gens:`${PLAN_LIMITS.free.generations}/mo`, staging:'None',       color:'var(--text-lo)', border:'rgba(255,255,255,0.1)' },
  { name:'Starter', key:'starter',  price:'$19/mo',  gens:'100/mo',       staging:'10 credits', color:'var(--cyan)',    border:'rgba(0,255,255,0.28)' },
  { name:'Pro',     key:'pro',      price:'$39/mo',  gens:'Unlimited',    staging:'40 credits', color:'var(--cyan)',    border:'rgba(0,255,255,0.5)' },
  { name:'Pro+',    key:'pro_plus', price:'$59/mo',  gens:'Unlimited',    staging:'100 credits',color:'var(--magenta)',  border:'rgba(255,0,255,0.5)' },
  { name:'Team',    key:'team',     price:'$149/mo', gens:'Unlimited shared',staging:'200 credits',color:'var(--magenta)',border:'rgba(255,0,255,0.4)' },
];

const CREDIT_PACKS = [
  { id: 'gen_10', label: '10 generations', price: '$7.50' },
  { id: 'gen_20', label: '20 generations', price: '$10' },
  { id: 'staging_10', label: '10 staging credits', price: '$5' },
  { id: 'staging_20', label: '20 staging credits', price: '$10' },
];

export default function AccountPage() {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { createCheckoutSession, openBillingPortal, loading: stripeLoading } = useStripe();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const NAME_MAX = 80;
  const trimmedName = fullName.trim();
  const nameValid = trimmedName.length > 0 && trimmedName.length <= NAME_MAX;

  const handleSaveName = async () => {
    if (!profile) return;
    if (!nameValid) {
      toast(`Name must be 1–${NAME_MAX} characters.`, 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmedName })
      .eq('id', profile.id);
    if (error) toast('Failed to save name.', 'error');
    else toast('Name updated!', 'success');
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Profile */}
      <div style={{
        padding: '24px 26px',
        background: 'rgba(10,10,32,0.75)',
        border: '1px solid rgba(0,255,255,0.14)',
        borderRadius: 16, backdropFilter: 'blur(20px)',
      }}>
        <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.14em', marginBottom: 18 }}>
          PROFILE
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(0,255,255,0.18), rgba(255,0,255,0.18))',
            border: '2px solid rgba(0,255,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 22, color: 'var(--cyan)',
            boxShadow: '0 0 18px rgba(0,255,255,0.15)',
          }}>
            {(profile?.full_name ?? profile?.email ?? 'U')[0].toUpperCase()}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label htmlFor="account-fullname" style={labelStyle}>Display Name</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  id="account-fullname"
                  type="text"
                  value={fullName}
                  maxLength={NAME_MAX}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your name"
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,255,255,0.7)'; }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(0,255,255,0.22)'; }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving || !nameValid}
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
              <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--text-ghost)', marginTop: 6, letterSpacing: '.06em' }}>
                {trimmedName.length}/{NAME_MAX}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <div style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed', userSelect: 'all' }}>
                {profile?.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current plan */}
      <div style={{
        padding: '24px 26px',
        background: 'rgba(10,10,32,0.75)',
        border: '1px solid rgba(0,255,255,0.14)',
        borderRadius: 16,
      }}>
        <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.14em', marginBottom: 18 }}>
          PLAN & BILLING
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          {TIERS.map(t => {
            const isCurrent = profile?.tier === t.key;
            return (
              <div key={t.key} style={{
                padding: '16px 14px',
                background: isCurrent ? 'rgba(0,255,255,0.07)' : 'rgba(0,0,0,0.25)',
                border: `1px solid ${isCurrent ? t.border : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 12,
                textAlign: 'center',
                transform: isCurrent ? 'scale(1.03)' : 'scale(1)',
                boxShadow: isCurrent ? `0 0 20px ${t.border}` : 'none',
                transition: 'all .2s',
              }}>
                <div style={{
                  fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 15,
                  color: isCurrent ? t.color : 'var(--text-mid)', marginBottom: 4,
                }}>
                  {t.name}
                </div>
                <div style={{
                  fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 11,
                  color: isCurrent ? t.color : 'var(--text-lo)', fontWeight: 700,
                }}>
                  {t.price}
                </div>
                <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 8.5, color: 'var(--text-ghost)', marginTop: 6 }}>
                  {t.gens}
                </div>
                {isCurrent && (
                  <div style={{
                    marginTop: 8,
                    fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 8,
                    color: t.color, letterSpacing: '.12em',
                  }}>
                    CURRENT
                  </div>
                )}
                {!isCurrent && TIERS.indexOf(t) > TIERS.findIndex(x => x.key === profile?.tier) && (
                  <button
                    onClick={() => createCheckoutSession('subscription', t.key)}
                    disabled={stripeLoading}
                    style={{
                      marginTop: 10, width: '100%',
                      padding: '5px 0',
                      background: 'rgba(255,0,255,0.08)',
                      border: '1px solid rgba(255,0,255,0.25)',
                      borderRadius: 6,
                      fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 8.5,
                      color: 'var(--magenta)', cursor: stripeLoading ? 'not-allowed' : 'pointer',
                      letterSpacing: '.06em',
                    }}
                  >
                    Upgrade →
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 8.5, color: 'var(--text-lo)', letterSpacing: '.12em', marginBottom: 4 }}>GENERATIONS</div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 20, color: 'var(--cyan)' }}>
                {profile?.generations_used ?? 0}
                <span style={{ fontSize: 13, color: 'var(--text-lo)', fontWeight: 400 }}>
                  {' '}/ {profile?.generations_limit === -1 ? '∞' : (profile?.generations_limit ?? 0) + (profile?.extra_gen_credits ?? 0)}
                </span>
                {(profile?.extra_gen_credits ?? 0) > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--cyan)', marginLeft: 6 }}>(+{profile?.extra_gen_credits ?? 0} extra)</span>
                )}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 8.5, color: 'var(--text-lo)', letterSpacing: '.12em', marginBottom: 4 }}>STAGING CREDITS</div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 20, color: 'var(--magenta)' }}>
                {profile?.staging_credits_used ?? 0}
                <span style={{ fontSize: 13, color: 'var(--text-lo)', fontWeight: 400 }}>
                  {' '}/ {(profile?.staging_credits_limit === -1 ? 999 : profile?.staging_credits_limit ?? 0) + (profile?.extra_staging_credits ?? 0)}
                </span>
                {(profile?.extra_staging_credits ?? 0) > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--magenta)', marginLeft: 6 }}>(+{profile?.extra_staging_credits ?? 0} extra)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={stripeLoading}
            onClick={() => openBillingPortal()}
          >
            {stripeLoading ? 'Opening…' : 'Manage Subscription & Billing'}
          </button>
        </div>

        <div style={{ marginTop: 22 }}>
          <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.12em', marginBottom: 12 }}>CREDIT PACKS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {CREDIT_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={stripeLoading}
                onClick={() => createCheckoutSession('payment', undefined, pack.id)}
              >
                {pack.label} — {pack.price}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MLS Connection — coming soon (collect interest only, no token storage) */}
      <div style={{
        padding: '20px 24px',
        background: 'rgba(10,10,32,0.5)',
        border: '1px dashed rgba(0,255,255,0.18)',
        borderRadius: 14,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.14em', marginBottom: 6 }}>
              MLS CONNECTION · ROADMAP
            </div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 14, color: 'var(--text-hi)', marginBottom: 4 }}>
              Direct MLS / RESO Web API integration
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-mid)', margin: 0, lineHeight: 1.6 }}>
              We're building a one-click MLS pull (RESO-compliant) so you can populate the wizard from a listing ID. Want early access?
            </p>
          </div>
          <a
            href="mailto:hello@lowcountrylistings.ai?subject=MLS%20integration%20early%20access"
            className="btn btn-ghost btn-sm"
            style={{ textDecoration: 'none', flexShrink: 0 }}
          >
            Notify me →
          </a>
        </div>
      </div>

      {/* Danger zone */}
      <div style={{
        padding: '22px 24px',
        background: 'rgba(255,60,60,0.04)',
        border: '1px solid rgba(255,80,80,0.15)',
        borderRadius: 14,
      }}>
        <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'rgba(200,60,60,0.7)', letterSpacing: '.14em', marginBottom: 14 }}>
          ACCOUNT
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={handleSignOut} className="btn btn-ghost" style={{ fontSize: 13, borderColor: 'rgba(255,80,80,0.25)', color: '#ff8080' }}>
            ⏻ Sign Out
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '10px 20px', background: 'transparent',
              border: '1px solid rgba(255,80,80,0.35)',
              borderRadius: 9, color: '#ff8080',
              fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Delete Account
          </button>
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-lo)', margin: '14px 0 0', lineHeight: 1.6 }}>
          Account deletion is handled by request so we can verify identity and confirm
          billing wind-down. We respond within 1 business day and remove your data within
          30 days per our{' '}
          <a href="/privacy" style={{ color: 'var(--cyan)' }}>Privacy Policy</a>.
        </p>
      </div>

      {showDeleteConfirm && (
        <DeleteAccountConfirm
          email={profile?.email ?? ''}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

function DeleteAccountConfirm({ email, onClose }: { email: string; onClose: () => void }) {
  const subject = encodeURIComponent('Account deletion request');
  const body = encodeURIComponent(
    `Please delete the Lowcountry Listings AI account associated with: ${email}\n\nReason (optional):\n`
  );
  const mailtoHref = `mailto:support@lowcountrylistings.ai?subject=${subject}&body=${body}`;

  useEscClose(onClose);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          maxWidth: 460, width: '100%', padding: 28, borderRadius: 16,
          background: 'rgba(10,10,32,0.95)', border: '1px solid rgba(255,80,80,0.35)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: '#ff8080', letterSpacing: '.14em', marginBottom: 12 }}>
          PERMANENT · IRREVERSIBLE
        </div>
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 20, color: 'var(--text-hi)', margin: '0 0 10px' }}>
          Delete your account
        </h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.7, margin: '0 0 18px' }}>
          This will permanently remove your generations, staging history, billing records, and
          team memberships within 30 days. To start the request, send us a deletion email
          from <strong style={{ color: 'var(--text-hi)' }}>{email}</strong>. We'll confirm
          before processing.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
          <a
            href={mailtoHref}
            onClick={onClose}
            style={{
              padding: '9px 18px',
              background: 'rgba(255,80,80,0.1)',
              border: '1px solid rgba(255,80,80,0.45)',
              borderRadius: 9, color: '#ff8080',
              fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 13,
              textDecoration: 'none',
            }}
          >
            Email deletion request →
          </a>
        </div>
      </div>
    </div>
  );
}

function useEscClose(onClose: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
}

const labelStyle: React.CSSProperties = { display: 'block', fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, letterSpacing: '.14em', color: 'var(--text-lo)', textTransform: 'uppercase', marginBottom: 7 };
const inputStyle: React.CSSProperties = { padding: '11px 14px', background: 'rgba(5,7,24,0.9)', border: '1px solid rgba(0,255,255,0.22)', borderRadius: 9, color: 'var(--text-hi)', fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, outline: 'none', transition: 'border-color .2s', caretColor: 'var(--cyan)', display: 'block' };
