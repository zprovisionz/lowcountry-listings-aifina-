import { useEffect } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const token = searchParams.get('token') ?? '';

  useEffect(() => {
    if (!user || !token) return;
    (async () => {
      // RPC not yet in generated Database types
      // @ts-expect-error accept_team_invite
      const { data, error } = await supabase.rpc('accept_team_invite', { p_token: token });
      const rpcResult = data as { ok?: boolean; error?: string } | null;
      if (error || rpcResult?.ok === false) {
        const msg = error?.message ?? rpcResult?.error ?? 'Invite is invalid or expired.';
        toast(msg, 'error');
        navigate('/dashboard', { replace: true });
      } else {
        toast('You have joined the team!', 'success');
        navigate('/team', { replace: true });
      }
    })();
  }, [token, user, navigate, toast]);

  if (!user) {
    sessionStorage.setItem('pendingInviteToken', token);
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--space)',
      }}
    >
      <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 11, color: 'var(--text-lo)', letterSpacing: '0.14em' }}>
        JOINING TEAM…
      </div>
    </div>
  );
}
