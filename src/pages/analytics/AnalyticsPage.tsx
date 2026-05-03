import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface EventRow {
  id: string;
  generation_id: string | null;
  event_type: string;
  created_at: string;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addressMap, setAddressMap] = useState<Record<string, string>>({});

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('analytics_events')
      .select('id, generation_id, event_type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500);
    if (!error && data) {
      const rows = data as EventRow[];
      setEvents(rows);
      const ids = Array.from(new Set(rows.map(r => r.generation_id).filter((v): v is string => !!v)));
      if (ids.length > 0) {
        const { data: gens } = await supabase
          .from('generations')
          .select('id, address')
          .in('id', ids);
        if (gens) {
          const map: Record<string, string> = {};
          (gens as { id: string; address: string }[]).forEach(g => { map[g.id] = g.address; });
          setAddressMap(map);
        }
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const views = events.filter((e) => e.event_type === 'view').length;
  const copies = events.filter((e) => e.event_type === 'copy').length;
  const copyRate = views > 0 ? Math.round((copies / views) * 100) : 0;
  const uniqueListings = new Set(events.map((e) => e.generation_id).filter(Boolean)).size;

  const byDate = events.reduce<Record<string, { view: number; copy: number }>>((acc, e) => {
    const d = e.created_at.slice(0, 10);
    if (!acc[d]) acc[d] = { view: 0, copy: 0 };
    if (e.event_type === 'view') acc[d].view++;
    if (e.event_type === 'copy') acc[d].copy++;
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort();
  const maxVal = Math.max(1, ...sortedDates.flatMap((d) => [byDate[d].view, byDate[d].copy]));

  const byGeneration = events
    .filter((e) => e.generation_id && e.event_type === 'copy')
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.generation_id!] = (acc[e.generation_id!] ?? 0) + 1;
      return acc;
    }, {});
  const topListings = Object.entries(byGeneration)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (loading) {
    return (
      <div style={{ padding: '24px 28px', maxWidth: 960, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 32, width: 280, marginBottom: 8, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 18, width: 360, marginBottom: 28, borderRadius: 6 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 200, borderRadius: 14, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 240, borderRadius: 14 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 28, color: 'var(--text-hi)', marginBottom: 8 }}>
        Performance Analytics
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 28 }}>
        Views and copies tracked for your listings. Embed links to drive traffic and measure engagement.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="glass" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, letterSpacing: '.14em', color: 'var(--cyan)', marginBottom: 6 }}>TOTAL VIEWS</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 32, color: 'var(--text-hi)' }}>{views}</div>
        </div>
        <div className="glass" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, letterSpacing: '.14em', color: 'var(--cyan)', marginBottom: 6 }}>TOTAL COPIES</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 32, color: 'var(--text-hi)' }}>{copies}</div>
        </div>
        <div className="glass" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, letterSpacing: '.14em', color: 'var(--cyan)', marginBottom: 6 }}>COPY RATE</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 32, color: 'var(--text-hi)' }}>{copyRate}%</div>
        </div>
        <div className="glass" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, letterSpacing: '.14em', color: 'var(--cyan)', marginBottom: 6 }}>LISTINGS TRACKED</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 32, color: 'var(--text-hi)' }}>{uniqueListings}</div>
        </div>
      </div>

      {sortedDates.length > 0 && (
        <div className="glass" style={{ padding: 28, borderRadius: 16, marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Activity (last 30 days)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
            {sortedDates.slice(-30).map((d) => (
              <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div
                  style={{
                    width: '100%',
                    height: Math.max(4, (byDate[d].view / maxVal) * 80),
                    background: 'rgba(0,255,255,0.4)',
                    borderRadius: 2,
                  }}
                  title={`${d}: ${byDate[d].view} views`}
                />
                <div
                  style={{
                    width: '100%',
                    height: Math.max(4, (byDate[d].copy / maxVal) * 80),
                    background: 'rgba(255,0,255,0.4)',
                    borderRadius: 2,
                  }}
                  title={`${d}: ${byDate[d].copy} copies`}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 10, color: 'var(--text-lo)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, background: 'var(--cyan)', borderRadius: 2 }} /> Views</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, background: 'var(--magenta)', borderRadius: 2 }} /> Copies</span>
          </div>
        </div>
      )}

      {topListings.length > 0 && (
        <div className="glass" style={{ padding: 28, borderRadius: 16 }}>
          <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Top listings by copies</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {topListings.map(([genId, count]) => {
              const address = addressMap[genId];
              return (
                <li key={genId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: 12 }}>
                  <a
                    href={`/results/${genId}`}
                    style={{
                      fontSize: 13, color: 'var(--cyan)', textDecoration: 'none',
                      flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    title={address ?? genId}
                  >
                    {address ?? `Listing ${genId.slice(0, 8)}…`}
                  </a>
                  <span style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 12, color: 'var(--text-mid)', flexShrink: 0 }}>{count} copies</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {events.length === 0 && (
        <div style={{
          padding: '52px 24px', textAlign: 'center',
          background: 'rgba(10,10,32,0.5)',
          border: '1px solid rgba(0,255,255,0.1)',
          borderRadius: 14,
        }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>📊</div>
          <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 17, color: 'var(--text-hi)', margin: '0 0 6px' }}>
            No analytics yet
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: 'var(--text-mid)', margin: '0 0 22px' }}>
            Once your results pages get viewed or copied, performance will show up here.
          </p>
          <button onClick={() => navigate('/generate')} className="btn btn-primary btn-sm">
            Generate a listing →
          </button>
        </div>
      )}
    </div>
  );
}
