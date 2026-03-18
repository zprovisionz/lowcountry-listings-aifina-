// supabase/functions/invite-team-member/index.ts
// Validates caller is team owner/editor, inserts team_invites, optionally sends Supabase invite email.
// Required: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function randomToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/[/+=]/g, (c) => ({ '/': '_', '+': '-', '=': '' }[c] ?? c));
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { email, role = 'editor', teamId } = body as { email: string; role?: 'owner' | 'editor' | 'viewer'; teamId?: string };

    if (!email?.trim()) {
      return new Response(JSON.stringify({ error: 'Email required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const profile = await supabase.from('profiles').select('team_id, role').eq('id', user.id).single();
    const userTeamId = profile.data?.team_id;
    const userRole = profile.data?.role;

    const tid = teamId ?? userTeamId;
    if (!tid) {
      return new Response(JSON.stringify({ error: 'You are not on a team' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const team = await supabase.from('teams').select('owner_id, name').eq('id', tid).single();
    const isOwner = team.data?.owner_id === user.id;
    const isEditor = userRole === 'editor';
    if (!isOwner && !isEditor) {
      return new Response(JSON.stringify({ error: 'Only team owners and editors can invite' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const token = randomToken();
    const { data: invite, error: inviteErr } = await supabase.from('team_invites').insert({
      team_id: tid,
      invited_by: user.id,
      email: email.trim().toLowerCase(),
      role: role === 'owner' ? 'editor' : role,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).select('id').single();

    if (inviteErr) {
      return new Response(JSON.stringify({ error: inviteErr.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const inviteUrl = `${req.headers.get('origin') ?? 'https://localhost:5173'}/join?token=${token}`;
    try {
      await supabase.auth.admin.inviteUserByEmail(email.trim(), {
        data: { invite_url: inviteUrl, team_name: team.data?.name ?? 'Lowcountry Listings AI' },
        redirectTo: inviteUrl,
      });
    } catch (_) {
      // Supabase may not have email configured; invite row is still created
    }

    return new Response(JSON.stringify({ inviteId: invite?.id, token }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invite failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
