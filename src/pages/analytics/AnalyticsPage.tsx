import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface EventRow {
  id: string;
  generation_id: string | null;
  event_type: string;
  created_at: string;
}

interface GenInsightRow {
  id: string;
  neighborhood: string | null;
  tone: string | null;
  property_type: string | null;
  staged_photo_urls: string[] | null;
  created_at: string;
  status: string;
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [gens, setGens] = useState<GenInsightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addressMap, setAddressMap] = useState<Record<string, string>>({});

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [{ data: ev, error: evErr }, { data: gRows, error: gErr }] = await Promise.all([
      supabase
        .from('analytics_events')
        .select('id, generation_id, event_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('generations')
        .select('id, neighborhood, tone, property_type, staged_photo_urls, created_at, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(2000),
    ]);
    if (!evErr && ev) {
      const rows = ev as EventRow[];
      setEvents(rows);
      const ids = Array.from(new Set(rows.map((r) => r.generation_id).filter((v): v is string => !!v)));
      if (ids.length > 0) {
        const { data: genAddrs } = await supabase.from('generations').select('id, address').in('id', ids);
        if (genAddrs) {
          const map: Record<string, string> = {};
          (genAddrs as { id: string; address: string }[]).forEach((g) => {
            map[g.id] = g.address;
          });
          setAddressMap(map);
        }
      }
    }
    if (!gErr && gRows) setGens(gRows as GenInsightRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const views = events.filter((e) => e.event_type === 'view').length;
  const copies = events.filter((e) => e.event_type === 'copy').length;
  const generates = events.filter((e) => e.event_type === 'generate').length;
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

  const completeGens = useMemo(() => gens.filter((g) => g.status === 'complete'), [gens]);

  const neighborhoodRank = useMemo(() => {
    const m: Record<string, number> = {};
    completeGens.forEach((g) => {
      const k = g.neighborhood?.trim() || 'Unknown / unset';
      m[k] = (m[k] ?? 0) + 1;
    });
    return Object.entries(m)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 12);
  }, [completeGens]);

  const toneCounts = useMemo(() => {
    const m: Record<string, number> = {};
    completeGens.forEach((g) => {
      const t = g.tone?.trim() || 'standard';
      m[t] = (m[t] ?? 0) + 1;
    });
    return m;
  }, [completeGens]);

  const propertyTypeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    completeGens.forEach((g) => {
      const t = g.property_type?.trim() || 'unknown';
      m[t] = (m[t] ?? 0) + 1;
    });
    return Object.entries(m).sort(([, a], [, b]) => b - a);
  }, [completeGens]);

  const stagingRate = useMemo(() => {
    if (completeGens.length === 0) return 0;
    const withStage = completeGens.filter(
      (g) => g.staged_photo_urls && g.staged_photo_urls.length > 0
    ).length;
    return Math.round((withStage / completeGens.length) * 100);
  }, [completeGens]);

  const weeklyBars = useMemo(() => {
    const now = new Date();
    const mon = startOfWeekMonday(now);
    const out: { label: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const ws = new Date(mon);
      ws.setDate(ws.getDate() - i * 7);
      const we = new Date(ws);
      we.setDate(we.getDate() + 7);
      const t0 = ws.getTime();
      const t1 = we.getTime();
      const count = completeGens.filter((g) => {
        const t = new Date(g.created_at).getTime();
        return t >= t0 && t < t1;
      }).length;
      const label = `${ws.getMonth() + 1}/${ws.getDate()}`;
      out.push({ label, count });
    }
    const maxC = Math.max(1, ...out.map((w) => w.count));
    return { bars: out, maxC };
  }, [completeGens]);

  const tonePie = useMemo(() => {
    const entries = Object.entries(toneCounts).filter(([, c]) => c > 0);
    const total = entries.reduce((s, [, c]) => s + c, 0) || 1;
    let angle = 0;
    const colors = ['#00ffff', '#ff00ff', '#00ff96', '#ffaa44', '#88aaff', '#cc88ff'];
    const arcs: { d: string; color: string; label: string; pct: number }[] = [];
    entries.forEach(([label, count], i) => {
      const pct = (count / total) * 100;
      const slice = (count / total) * 360;
      const start = (angle * Math.PI) / 180;
      const end = ((angle + slice) * Math.PI) / 180;
      const x1 = 50 + 40 * Math.cos(start);
      const y1 = 50 + 40 * Math.sin(start);
      const x2 = 50 + 40 * Math.cos(end);
      const y2 = 50 + 40 * Math.sin(end);
      const large = slice > 180 ? 1 : 0;
      const d = `M 50 50 L ${x1} ${y1} A 40 40 0 ${large} 1 ${x2} ${y2} Z`;
      arcs.push({ d, color: colors[i % colors.length], label, pct: Math.round(pct) });
      angle += slice;
    });
    return { arcs, total, toneEntries: entries };
  }, [toneCounts]);

  const nhMax = Math.max(1, ...neighborhoodRank.map(([, c]) => c));

  if (loading) {
    return (
      <div style={{ padding: '24px 28px', maxWidth: 960, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 32, width: 280, marginBottom: 8, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 18, width: 360, marginBottom: 28, borderRadius: 6 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 200, borderRadius: 14, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 240, borderRadius: 14 }} />
      </div>
    );
  }

  const hasEvents = events.length > 0;
  const hasGens = gens.length > 0;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 28, color: 'var(--text-hi)', marginBottom: 8 }}>
        Performance Analytics
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 28 }}>
        Engagement from analytics_events plus generation insights from your saved listings.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
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
          <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, letterSpacing: '.14em', color: 'var(--magenta)', marginBottom: 6 }}>GENERATIONS LOGGED</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 32, color: 'var(--text-hi)' }}>{generates}</div>
        </div>
        <div className="glass" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, letterSpacing: '.14em', color: 'var(--cyan)', marginBottom: 6 }}>LISTINGS TRACKED</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 32, color: 'var(--text-hi)' }}>{uniqueListings}</div>
        </div>
      </div>

      {hasGens && (
        <div className="glass-dash" style={{ padding: 24, borderRadius: 16, marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            Generation insights
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22 }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.12em', marginBottom: 10 }}>
                TOP NEIGHBORHOODS (completed)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {neighborhoodRank.length === 0 ? (
                  <span style={{ color: 'var(--text-mid)', fontSize: 13 }}>No completed listings yet.</span>
                ) : (
                  neighborhoodRank.map(([name, count]) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                      <svg width={100} height={10} style={{ flexShrink: 0 }}>
                        <rect x={0} y={0} width={100} height={10} rx={3} fill="rgba(0,255,255,0.08)" />
                        <rect
                          x={0}
                          y={0}
                          width={Math.max(4, (count / nhMax) * 100)}
                          height={10}
                          rx={3}
                          fill="url(#barGradAnalytics)"
                        />
                        <defs>
                          <linearGradient id="barGradAnalytics" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="var(--cyan)" />
                            <stop offset="100%" stopColor="var(--magenta)" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--cyan)', width: 28, textAlign: 'right' }}>{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.12em', marginBottom: 10 }}>
                  TONE MIX
                </div>
                <svg viewBox="0 0 100 100" width={120} height={120} style={{ display: 'block' }}>
                  {tonePie.arcs.map((a) => (
                    <path key={a.label + a.color} d={a.d} fill={a.color} stroke="rgba(0,0,0,0.35)" strokeWidth={0.5} />
                  ))}
                  <text x={50} y={54} textAnchor="middle" fill="#eafaff" fontSize="10" fontFamily="DM Mono, monospace">
                    {tonePie.total}
                  </text>
                </svg>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, minWidth: 140 }}>
                {tonePie.toneEntries.map(([label, count], i) => (
                  <li key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-mid)', marginBottom: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: ['#00ffff', '#ff00ff', '#00ff96', '#ffaa44', '#88aaff', '#cc88ff'][i % 6] }} />
                      {label}
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace" }}>{count}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.12em', marginBottom: 10 }}>
                PROPERTY TYPE
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {propertyTypeCounts.map(([pt, c]) => (
                  <li key={pt} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'var(--text-mid)' }}>
                    <span>{pt.replace(/_/g, ' ')}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--magenta)' }}>{c}</span>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: 'rgba(0,255,255,0.06)', border: '1px solid rgba(0,255,255,0.15)' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.1em' }}>STAGING USAGE</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 22, color: 'var(--text-hi)', marginTop: 4 }}>
                  {stagingRate}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-mid)' }}>Completed listings with staged_photo_urls</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasGens && (
        <div className="glass" style={{ padding: 28, borderRadius: 16, marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
            Weekly generations (last 8 weeks, completed)
          </h3>
          <svg width="100%" height={140} viewBox="0 0 640 140" preserveAspectRatio="none" style={{ display: 'block' }}>
            {weeklyBars.bars.map((w, i) => {
              const bw = 640 / 8 - 8;
              const x = i * (640 / 8) + 4;
              const h = (w.count / weeklyBars.maxC) * 90;
              const y = 120 - h;
              return (
                <g key={w.label + String(i)}>
                  <rect x={x} y={y} width={bw} height={h} rx={4} fill="rgba(0,255,255,0.45)" stroke="rgba(0,255,255,0.5)" strokeWidth={1} />
                  <text x={x + bw / 2} y={132} textAnchor="middle" fill="var(--text-lo)" fontSize="9" fontFamily="DM Mono, monospace">
                    {w.label}
                  </text>
                  <text x={x + bw / 2} y={y - 4} textAnchor="middle" fill="var(--text-hi)" fontSize="10" fontFamily="DM Mono, monospace">
                    {w.count}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

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

      {!hasEvents && !hasGens && (
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
            Generate a listing to see insights here.
          </p>
          <button onClick={() => navigate('/generate')} className="btn btn-primary btn-sm">
            Generate a listing →
          </button>
        </div>
      )}
    </div>
  );
}
