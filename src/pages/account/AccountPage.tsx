import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useStripe } from '../../hooks/useStripe';
import { supabase } from '../../lib/supabase';

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
  { name:'Free',    key:'free',     price:'$0/mo',   gens:'10/mo',        staging:'None',       color:'var(--text-lo)', border:'rgba(255,255,255,0.1)' },
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
  const [mlsName, setMlsName] = useState('');
  const [mlsEndpoint, setMlsEndpoint] = useState('');
  const [mlsToken, setMlsToken] = useState('');
  const [mlsSaving, setMlsSaving] = useState(false);

  const handleSaveName = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
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
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.14em', marginBottom: 18 }}>
          PROFILE
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(0,255,255,0.18), rgba(255,0,255,0.18))',
            border: '2px solid rgba(0,255,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--cyan)',
            boxShadow: '0 0 18px rgba(0,255,255,0.15)',
          }}>
            {(profile?.full_name ?? profile?.email ?? 'U')[0].toUpperCase()}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Display Name</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your name"
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,255,255,0.7)'; }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(0,255,255,0.22)'; }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
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
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.14em', marginBottom: 18 }}>
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
                  fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15,
                  color: isCurrent ? t.color : 'var(--text-mid)', marginBottom: 4,
                }}>
                  {t.name}
                </div>
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: 11,
                  color: isCurrent ? t.color : 'var(--text-lo)', fontWeight: 700,
                }}>
                  {t.price}
                </div>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8.5, color: 'var(--text-ghost)', marginTop: 6 }}>
                  {t.gens}
                </div>
                {isCurrent && (
                  <div style={{
                    marginTop: 8,
                    fontFamily: 'Space Mono, monospace', fontSize: 8,
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
                      fontFamily: 'Space Mono, monospace', fontSize: 8.5,
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
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8.5, color: 'var(--text-lo)', letterSpacing: '.12em', marginBottom: 4 }}>GENERATIONS</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--cyan)' }}>
                {profile?.generations_used ?? 0}
                <span style={{ fontSize: 13, color: 'var(--text-lo)', fontWeight: 400 }}>
                  {' '}/ {profile?.generations_limit === -1 ? '∞' : (profile?.generations_limit ?? 0) + (profile?.extra_gen_credits ?? 0)}
                </span>
                {(profile?.extra_gen_credits ?? 0) > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--cyan)', marginLeft: 6 }}>(+{profile.extra_gen_credits} extra)</span>
                )}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8.5, color: 'var(--text-lo)', letterSpacing: '.12em', marginBottom: 4 }}>STAGING CREDITS</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--magenta)' }}>
                {profile?.staging_credits_used ?? 0}
                <span style={{ fontSize: 13, color: 'var(--text-lo)', fontWeight: 400 }}>
                  {' '}/ {(profile?.staging_credits_limit === -1 ? 999 : profile?.staging_credits_limit ?? 0) + (profile?.extra_staging_credits ?? 0)}
                </span>
                {(profile?.extra_staging_credits ?? 0) > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--magenta)', marginLeft: 6 }}>(+{profile.extra_staging_credits} extra)</span>
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
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.12em', marginBottom: 12 }}>CREDIT PACKS</div>
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

      {/* MLS Connection (RESO stub) */}
      <div style={{
        padding: '24px 26px',
        background: 'rgba(10,10,32,0.75)',
        border: '1px solid rgba(0,255,255,0.14)',
        borderRadius: 16,
      }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.14em', marginBottom: 18 }}>
          MLS CONNECTION (RESO STUB)
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-mid)', marginBottom: 16 }}>
          Connect your MLS data feed (RESO Web API). Token is stored encrypted. Full integration coming in a future release.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
          <input type="text" placeholder="MLS name" value={mlsName} onChange={(e) => setMlsName(e.target.value)} style={inputStyle} />
          <input type="url" placeholder="API endpoint" value={mlsEndpoint} onChange={(e) => setMlsEndpoint(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Access token (stored encrypted)" value={mlsToken} onChange={(e) => setMlsToken(e.target.value)} style={inputStyle} />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={mlsSaving || !mlsName.trim()}
            onClick={async () => {
              if (!profile?.id) return;
              setMlsSaving(true);
              const { error } = await supabase.from('mls_connections').insert({
                user_id: profile.id,
                mls_name: mlsName.trim(),
                api_endpoint: mlsEndpoint.trim() || null,
                access_token_encrypted: mlsToken.trim() || null,
                status: mlsToken.trim() ? 'connected' : 'pending',
              });
              if (error) toast(error.message, 'error');
              else { toast('MLS connection saved.', 'success'); setMlsName(''); setMlsEndpoint(''); setMlsToken(''); }
              setMlsSaving(false);
            }}
          >
            {mlsSaving ? 'Saving…' : 'Save connection'}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div style={{
        padding: '22px 24px',
        background: 'rgba(255,60,60,0.04)',
        border: '1px solid rgba(255,80,80,0.15)',
        borderRadius: 14,
      }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'rgba(200,60,60,0.7)', letterSpacing: '.14em', marginBottom: 14 }}>
          ACCOUNT
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={handleSignOut} className="btn btn-ghost" style={{ fontSize: 13, borderColor: 'rgba(255,80,80,0.25)', color: '#ff8080' }}>
            ⏻ Sign Out
          </button>
          <button
            onClick={() => toast('Account deletion: contact support@lowcountrylistings.ai', 'info')}
            style={{
              padding: '10px 20px', background: 'transparent',
              border: '1px solid rgba(255,80,80,0.2)',
              borderRadius: 9, color: 'rgba(200,80,80,0.6)',
              fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontFamily: 'Space Mono, monospace', fontSize: 9, letterSpacing: '.14em', color: 'var(--text-lo)', textTransform: 'uppercase', marginBottom: 7 };
const inputStyle: React.CSSProperties = { padding: '11px 14px', background: 'rgba(5,7,24,0.9)', border: '1px solid rgba(0,255,255,0.22)', borderRadius: 9, color: 'var(--text-hi)', fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, outline: 'none', transition: 'border-color .2s', caretColor: 'var(--cyan)', display: 'block' };
