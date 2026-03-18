import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Profile } from '../types/database';
import type { TeamInvite } from '../types/database';

interface TeamRow {
  id: string;
  name: string;
  owner_id: string;
  shared_generations_used: number;
  shared_generations_limit: number;
  shared_staging_used: number;
  shared_staging_limit: number;
}

export function useTeam() {
  const { user, profile } = useAuth();
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);

  const teamId = profile?.team_id ?? null;

  const fetchTeam = useCallback(async () => {
    if (!teamId) {
      setTeam(null);
      setMembers([]);
      setInvites([]);
      setLoading(false);
      return;
    }
    const [teamRes, membersRes, invitesRes] = await Promise.all([
      supabase.from('teams').select('*').eq('id', teamId).single(),
      supabase.from('profiles').select('*').eq('team_id', teamId),
      supabase.from('team_invites').select('*').eq('team_id', teamId).is('accepted_at', null).gt('expires_at', new Date().toISOString()),
    ]);
    setTeam(teamRes.data ?? null);
    setMembers((membersRes.data ?? []) as Profile[]);
    setInvites((invitesRes.data ?? []) as TeamInvite[]);
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const inviteMember = useCallback(
    async (email: string, role: 'editor' | 'viewer') => {
      if (!user?.id) return;
      setInviteLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-team-member`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email: email.trim(), role, teamId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Invite failed');
        await fetchTeam();
      } finally {
        setInviteLoading(false);
      }
    },
    [user?.id, fetchTeam]
  );

  const removeMember = useCallback(
    async (userId: string) => {
      if (!teamId || !profile?.role || profile.role === 'viewer') return;
      const { error } = await supabase.from('profiles').update({ team_id: null, role: null }).eq('id', userId).eq('team_id', teamId);
      if (!error) await fetchTeam();
    },
    [teamId, profile?.role, fetchTeam]
  );

  const updateMemberRole = useCallback(
    async (userId: string, role: 'owner' | 'editor' | 'viewer') => {
      if (!teamId || profile?.role !== 'owner') return;
      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId).eq('team_id', teamId);
      if (!error) await fetchTeam();
    },
    [teamId, profile?.role, fetchTeam]
  );

  const revokeInvite = useCallback(
    async (inviteId: string) => {
      const { error } = await supabase.from('team_invites').delete().eq('id', inviteId);
      if (!error) await fetchTeam();
    },
    [fetchTeam]
  );

  return {
    team,
    members,
    invites,
    loading,
    inviteLoading,
    inviteMember,
    removeMember,
    updateMemberRole,
    revokeInvite,
    refetch: fetchTeam,
  };
}
