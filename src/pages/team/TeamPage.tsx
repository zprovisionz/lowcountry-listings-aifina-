import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../hooks/useTeam';
import type { Profile } from '../../types/database';

const ROLE_STYLES: Record<string, { color: string; border: string; bg: string }> = {
  owner:  { color: 'var(--cyan)',    border: 'rgba(0,255,255,0.3)',  bg: 'rgba(0,255,255,0.08)'  },
  editor: { color: 'var(--magenta)', border: 'rgba(255,0,255,0.3)',  bg: 'rgba(255,0,255,0.08)'  },
  viewer: { color: 'var(--text-lo)', border: 'rgba(255,255,255,0.1)', bg: 'rgba(255,255,255,0.04)' },
};

export default function TeamPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const {
    team,
    members,
    invites,
    loading,
    inviteLoading,
    inviteMember,
    removeMember,
    revokeInvite,
  } = useTeam();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const isTeamTier = profile?.tier === 'team';

  if (!isTeamTier) {
    return (
      <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center' }}>
        <div style={{
          padding: '48px 40px',
          background: 'rgba(10,10,32,0.75)',
          border: '1px solid rgba(255,0,255,0.2)',
          borderRadius: 20, backdropFilter: 'blur(24px)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>◎</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: '#eafaff', margin: '0 0 12px' }}>
            Team Features
          </h2>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.75, margin: '0 0 28px' }}>
            Upgrade to the <strong style={{ color: 'var(--magenta)' }}>Team plan</strong> to invite agents,
            assign roles (Owner · Editor · Viewer), share a generation quota,
            and apply custom brokerage branding.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginBottom: 28 }}>
            {[
              'Multi-user seats (3–15+ agents)',
              'Owner / Editor / Viewer role system',
              '200 shared staging credits / month',
              'Unlimited shared generations',
              'Custom logo & brand colors',
              'Dedicated onboarding call',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'var(--text-mid)', fontFamily: 'DM Sans, sans-serif' }}>
                <span style={{ color: 'var(--magenta)', fontSize: 11 }}>✓</span>
                {f}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/account')} className="btn btn-accent" style={{ fontSize: 14, padding: '12px 28px' }}>
              Upgrade to Team — $149/mo →
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn btn-ghost" style={{ fontSize: 14 }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !team) {
    return (
      <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-mid)' }}>
        Loading team…
      </div>
    );
  }

  const canInvite = profile?.role === 'owner' || profile?.role === 'editor';
  const isOwner = profile?.role === 'owner';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      <div style={{
        padding: '22px 26px',
        background: 'rgba(255,0,255,0.04)',
        border: '1px solid rgba(255,0,255,0.18)',
        borderRadius: 14,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14,
      }}>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: '#eafaff', margin: '0 0 4px' }}>
            {team.name}
          </h2>
          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-lo)', margin: 0, letterSpacing: '.1em' }}>
            TEAM PLAN · UNLIMITED SHARED
          </p>
        </div>
      </div>

      {canInvite && (
        <div className="glass" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--cyan)', letterSpacing: '.12em', marginBottom: 12 }}>INVITE MEMBER</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <input
              type="email"
              placeholder="agent@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={{
                padding: '10px 14px',
                background: 'rgba(5,7,24,0.9)',
                border: '1px solid rgba(0,255,255,0.22)',
                borderRadius: 9,
                color: 'var(--text-hi)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                minWidth: 220,
              }}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
              style={{
                padding: '10px 14px',
                background: 'rgba(5,7,24,0.9)',
                border: '1px solid rgba(0,255,255,0.22)',
                borderRadius: 9,
                color: 'var(--text-hi)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
              }}
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              className="btn btn-primary btn-sm"
              disabled={inviteLoading || !inviteEmail.trim()}
              onClick={async () => {
                await inviteMember(inviteEmail.trim(), inviteRole);
                setInviteEmail('');
              }}
            >
              {inviteLoading ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          { label: 'Shared Generations', used: team.shared_generations_used, limit: team.shared_generations_limit, color: 'var(--cyan)' },
          { label: 'Shared Staging Credits', used: team.shared_staging_used, limit: team.shared_staging_limit, color: 'var(--magenta)' },
        ].map(({ label, used, limit, color }) => (
          <div key={label} style={{
            padding: '18px 20px',
            background: 'rgba(10,10,32,0.7)',
            border: '1px solid rgba(0,255,255,0.1)',
            borderRadius: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.12em' }}>{label.toUpperCase()}</span>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color }}>
                {used} / {limit === -1 ? '∞' : limit}
              </span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: limit === -1 ? '10%' : `${Math.min(100, (used / limit) * 100)}%`,
                background: color, borderRadius: 2,
                boxShadow: `0 0 6px ${color}`,
              }} />
            </div>
          </div>
        ))}
      </div>

      {invites.length > 0 && (
        <div className="glass" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.12em', marginBottom: 12 }}>PENDING INVITES</div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {invites.map((inv) => (
              <li key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{inv.email} — {inv.role}</span>
                {canInvite && (
                  <button
                    type="button"
                    onClick={() => revokeInvite(inv.id)}
                    style={{ background: 'none', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 6, color: '#ff8080', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{
        background: 'rgba(10,10,32,0.75)',
        border: '1px solid rgba(0,255,255,0.12)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid rgba(0,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.14em' }}>
            TEAM MEMBERS ({members.length})
          </span>
        </div>

        {members.map((m: Profile, i: number) => {
          const rs = ROLE_STYLES[m.role ?? 'viewer'];
          const isCurrentUser = m.id === profile?.id;
          return (
            <div key={m.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 120px 80px',
              padding: '14px 20px', alignItems: 'center',
              borderBottom: i < members.length - 1 ? '1px solid rgba(0,255,255,0.05)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(0,255,255,0.15), rgba(255,0,255,0.15))',
                  border: '1px solid rgba(0,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--cyan)',
                }}>
                  {(m.full_name ?? m.email)?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 13.5, color: '#eafaff' }}>
                    {isCurrentUser ? `${m.full_name ?? m.email} (You)` : m.full_name ?? m.email}
                  </div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-lo)' }}>{m.email}</div>
                </div>
              </div>
              <div>
                <span style={{
                  padding: '3px 10px',
                  background: rs.bg, border: `1px solid ${rs.border}`,
                  borderRadius: 20, fontFamily: 'Space Mono, monospace',
                  fontSize: 9, color: rs.color, letterSpacing: '.06em',
                }}>
                  {(m.role ?? 'viewer').toUpperCase()}
                </span>
              </div>
              <div>
                {!isCurrentUser && isOwner && (m.role ?? 'viewer') !== 'owner' && (
                  <>
                    <button
                      type="button"
                      onClick={() => removeMember(m.id)}
                      style={{
                        background: 'none', border: '1px solid rgba(255,80,80,0.2)',
                        borderRadius: 6, color: '#ff8080',
                        fontFamily: 'Space Mono, monospace', fontSize: 9,
                        padding: '4px 10px', cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        padding: '16px 20px',
        background: 'rgba(10,10,32,0.5)',
        border: '1px solid rgba(0,255,255,0.08)',
        borderRadius: 12,
      }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.14em', marginBottom: 12 }}>
          ROLE PERMISSIONS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { role: 'owner',  desc: 'Full access · billing · invite members · branding' },
            { role: 'editor', desc: 'Generate listings · view history · use staging' },
            { role: 'viewer', desc: 'View generations only · no editing or generating' },
          ].map(({ role, desc }) => {
            const rs = ROLE_STYLES[role];
            return (
              <div key={role} style={{
                display: 'flex', gap: 10,
                padding: '10px 12px',
                background: rs.bg, border: `1px solid ${rs.border}`,
                borderRadius: 8,
              }}>
                <span style={{ color: rs.color, fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: '.06em', whiteSpace: 'nowrap', fontWeight: 700 }}>
                  {role.toUpperCase()}
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-lo)', lineHeight: 1.5 }}>
                  {desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
