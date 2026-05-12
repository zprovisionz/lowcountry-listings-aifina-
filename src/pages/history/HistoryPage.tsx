import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useGenerations } from '../../hooks/useGenerations';
import { lookupNeighborhood } from '../../lib/neighborhoods';
import { captureProductEvent } from '../../lib/product-analytics';
import type { Generation, AgentTone } from '../../types/database';
import { PROPERTY_TYPES } from '../../types/database';
import { TIMING_MS } from '../../config';

const PAGE = 50;

const scoreColor = (s: number | null) =>
  !s ? 'var(--text-lo)' : s >= 85 ? '#00ff96' : s >= 70 ? 'var(--cyan)' : 'var(--magenta)';

type DatePreset = 'month' | '30' | '90' | 'all';
type SortKey = 'newest' | 'oldest' | 'authenticity' | 'address';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackEvent } = useGenerations();
  const [rows, setRows] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);
  const [relistTarget, setRelistTarget] = useState<Generation | null>(null);

  const [search, setSearch] = useState('');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState<string>('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [toneFilter, setToneFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sort, setSort] = useState<SortKey>('newest');

  const [neighborhoodOptions, setNeighborhoodOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const loadNeighborhoods = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('generations')
      .select('neighborhood')
      .eq('user_id', user.id)
      .not('neighborhood', 'is', null);
    const set = new Set<string>();
    (data as { neighborhood: string | null }[] | null)?.forEach((r) => {
      if (r.neighborhood) set.add(r.neighborhood);
    });
    setNeighborhoodOptions([...set].sort((a, b) => a.localeCompare(b)));
  }, [user]);

  const buildQuery = useCallback(() => {
    if (!user) return null;
    let q = supabase.from('generations').select('*').eq('user_id', user.id);

    if (neighborhoodFilter) q = q.eq('neighborhood', neighborhoodFilter);
    if (propertyTypeFilter) q = q.eq('property_type', propertyTypeFilter);
    if (toneFilter) q = q.eq('tone', toneFilter);
    if (statusFilter) q = q.eq('status', statusFilter as Generation['status']);

    const now = new Date();
    if (datePreset === 'month') {
      q = q.gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
    } else if (datePreset === '30') {
      q = q.gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
    } else if (datePreset === '90') {
      q = q.gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString());
    }

    const s = search.trim();
    if (s) {
      const esc = s.replace(/%/g, '').replace(/,/g, '');
      const p = `%${esc}%`;
      q = q.or(`address.ilike.${p},neighborhood.ilike.${p}`);
    }

    if (sort === 'newest') q = q.order('created_at', { ascending: false });
    else if (sort === 'oldest') q = q.order('created_at', { ascending: true });
    else if (sort === 'authenticity') {
      q = q.order('authenticity_score', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    } else if (sort === 'address') q = q.order('address', { ascending: true });

    return q;
  }, [user, neighborhoodFilter, propertyTypeFilter, toneFilter, statusFilter, datePreset, search, sort]);

  const fetchPage = useCallback(
    async (append: boolean) => {
      const q = buildQuery();
      if (!q) return;
      setLoading(true);
      const from = append ? offsetRef.current : 0;
      const { data, error } = await q.range(from, from + PAGE - 1);
      if (error) {
        toast(error.message ?? 'Failed to load history', 'error');
        setLoading(false);
        return;
      }
      const next = (data as Generation[]) ?? [];
      if (append) setRows((prev) => [...prev, ...next]);
      else {
        setRows(next);
        offsetRef.current = 0;
      }
      offsetRef.current = from + next.length;
      setHasMore(next.length === PAGE);
      setLoading(false);
    },
    [buildQuery, toast]
  );

  useEffect(() => {
    loadNeighborhoods();
  }, [loadNeighborhoods]);

  useEffect(() => {
    if (!user) return;
    offsetRef.current = 0;
    setSelected(new Set());
    fetchPage(false);
  }, [user, neighborhoodFilter, propertyTypeFilter, toneFilter, statusFilter, datePreset, sort, search, fetchPage]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleSelectAllOnPage = () => {
    const pageIds = rows.map((r) => r.id);
    const allOn = pageIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const n = new Set(prev);
      if (allOn) pageIds.forEach((id) => n.delete(id));
      else pageIds.forEach((id) => n.add(id));
      return n;
    });
  };

  const handleDeleteOne = async (id: string) => {
    setDeletingId(id);
    await supabase.from('generations').delete().eq('id', id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSelected((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    setDeletingId(null);
    setConfirmDel(null);
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setDeleting(true);
    await supabase.from('generations').delete().in('id', ids);
    setRows((prev) => prev.filter((r) => !ids.includes(r.id)));
    setSelected(new Set());
    setBulkConfirm(false);
    setDeleting(false);
    toast('Selected listings deleted.', 'success');
  };

  const exportCsv = () => {
    const ids = [...selected];
    const exportRows = rows.filter((r) => ids.includes(r.id));
    if (exportRows.length === 0) {
      toast('Select at least one row.', 'error');
      return;
    }
    const header = ['address', 'neighborhood', 'date', 'authenticity', 'confidence', 'status'];
    const lines = [
      header.join(','),
      ...exportRows.map((g) =>
        [
          `"${(g.address || '').replace(/"/g, '""')}"`,
          `"${(g.neighborhood ?? '').replace(/"/g, '""')}"`,
          g.created_at,
          g.authenticity_score ?? '',
          g.confidence_score ?? '',
          g.status,
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lowcountry-listings-export.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('CSV downloaded.', 'success');
  };

  const filteredCountLabel = useMemo(() => `${rows.length}${hasMore ? '+' : ''} loaded`, [rows.length, hasMore]);

  const handleRelistSubmit = useCallback(
    async (
      source: Generation,
      values: { tone: AgentTone; price: string; notes: string },
    ): Promise<{ ok: boolean; error?: string; generationId?: string }> => {
      if (!user) return { ok: false, error: 'Not signed in.' };
      try {
        const trimmedPrice = values.price.trim();
        const priceNumber = trimmedPrice ? Number(trimmedPrice.replace(/[^0-9.]/g, '')) : null;

        const { data: gen, error: insertErr } = await supabase
          .from('generations')
          .insert({
            user_id: user.id,
            address: source.address,
            neighborhood: source.neighborhood,
            property_type: source.property_type,
            bedrooms: source.bedrooms,
            bathrooms: source.bathrooms,
            sqft: source.sqft,
            amenities: source.amenities ?? [],
            photo_urls: source.photo_urls ?? [],
            status: 'generating',
            tone: values.tone,
            relist_of: source.id,
          })
          .select('id')
          .single();

        if (insertErr || !gen) {
          return { ok: false, error: insertErr?.message ?? 'Could not create relist row.' };
        }

        const neighborhoodData = await lookupNeighborhood(source.neighborhood ?? '');

        const invokePromise = supabase.functions.invoke('generate-listing', {
          body: {
            generationId: gen.id,
            address: source.address,
            neighborhood: source.neighborhood ?? '',
            neighborhoodContext: neighborhoodData?.keywords_for_ai ?? null,
            neighborhoodLifestyle: neighborhoodData?.lifestyle ?? [],
            propertyType: source.property_type,
            bedrooms: source.bedrooms ?? '',
            bathrooms: source.bathrooms ?? '',
            sqft: source.sqft ?? '',
            price: priceNumber ?? '',
            amenities: source.amenities ?? [],
            customAmenities: '',
            tone: values.tone,
            generateMLS: true,
            generateAirbnb: true,
            generateSocial: true,
            generateEmail: true,
            photoUrls: source.photo_urls ?? [],
            overviewOnly: false,
            relistOf: source.id,
            relistNotes: values.notes,
            relistPrice: priceNumber,
          },
        });
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), TIMING_MS.invokeTimeout)
        );

        const invokeResult = (await Promise.race([invokePromise, timeout])) as { error?: unknown };
        if (invokeResult?.error) {
          return { ok: true, generationId: gen.id };
        }

        captureProductEvent('relist_created', {
          source_generation_id: source.id,
          neighborhood: source.neighborhood,
          tone: values.tone,
        });
        await trackEvent(gen.id, 'generate', {
          source: 'relist',
          source_generation_id: source.id,
          neighborhood: source.neighborhood,
          tone: values.tone,
        });
        return { ok: true, generationId: gen.id };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Relist failed.';
        return { ok: false, error: msg };
      }
    },
    [user, trackEvent]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Filters */}
      <div className="glass-dash anim-fade-up" style={{ padding: '16px 18px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px', minWidth: 180 }}>
          <label className="neon-label" style={{ display: 'block', marginBottom: 6 }}>Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Address or neighborhood…"
            className="neon-input"
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ minWidth: 150 }}>
          <label className="neon-label" style={{ display: 'block', marginBottom: 6 }}>Neighborhood</label>
          <select
            value={neighborhoodFilter}
            onChange={(e) => setNeighborhoodFilter(e.target.value)}
            style={selectSt}
          >
            <option value="">All</option>
            {neighborhoodOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 140 }}>
          <label className="neon-label" style={{ display: 'block', marginBottom: 6 }}>Property type</label>
          <select
            value={propertyTypeFilter}
            onChange={(e) => setPropertyTypeFilter(e.target.value)}
            style={selectSt}
          >
            <option value="">All</option>
            {PROPERTY_TYPES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 130 }}>
          <label className="neon-label" style={{ display: 'block', marginBottom: 6 }}>Date</label>
          <select value={datePreset} onChange={(e) => setDatePreset(e.target.value as DatePreset)} style={selectSt}>
            <option value="month">This month</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
        <div style={{ minWidth: 120 }}>
          <label className="neon-label" style={{ display: 'block', marginBottom: 6 }}>Tone</label>
          <select value={toneFilter} onChange={(e) => setToneFilter(e.target.value)} style={selectSt}>
            <option value="">All</option>
            <option value="luxury">Luxury</option>
            <option value="family">Family</option>
            <option value="investment">Investment</option>
            <option value="standard">Standard</option>
          </select>
        </div>
        <div style={{ minWidth: 120 }}>
          <label className="neon-label" style={{ display: 'block', marginBottom: 6 }}>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectSt}>
            <option value="">All</option>
            <option value="complete">Complete</option>
            <option value="generating">Generating</option>
            <option value="pending">Pending</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div style={{ minWidth: 150 }}>
          <label className="neon-label" style={{ display: 'block', marginBottom: 6 }}>Sort</label>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={selectSt}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="authenticity">Highest authenticity</option>
            <option value="address">Address A–Z</option>
          </select>
        </div>
      </div>

      {/* Toolbar */}
      <div className="anim-fade-up" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--text-lo)' }}>
          {filteredCountLabel}
        </div>
        <button type="button" onClick={toggleSelectAllOnPage} className="btn btn-ghost btn-sm" disabled={rows.length === 0}>
          Toggle page selection
        </button>
        <button
          type="button"
          onClick={() => setBulkConfirm(true)}
          disabled={selected.size === 0}
          className="btn btn-ghost btn-sm"
          style={{ color: '#ff8080', borderColor: 'rgba(255,80,80,0.25)' }}
        >
          Delete selected ({selected.size})
        </button>
        <button type="button" onClick={exportCsv} disabled={selected.size === 0} className="btn btn-ghost btn-sm">
          Export selected CSV
        </button>
        <button onClick={() => navigate('/generate')} className="btn btn-primary btn-sm">✦ New Listing</button>
      </div>

      {bulkConfirm && (
        <div className="glass anim-fade-up" style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,80,80,0.3)' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#ffaaa0', marginRight: 12 }}>
            Delete {selected.size} listing(s) permanently?
          </span>
          <button type="button" onClick={handleBulkDelete} disabled={deleting} className="btn btn-ghost btn-sm" style={{ color: '#ff6060' }}>
            {deleting ? 'Deleting…' : 'Confirm delete'}
          </button>
          <button type="button" onClick={() => setBulkConfirm(false)} className="btn btn-ghost btn-sm">Cancel</button>
        </div>
      )}

      {/* Table */}
      <div className="glass-dash anim-fade-up d-100 history-table-wrap" style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '36px minmax(160px,1fr) 120px 90px 72px 72px 100px',
          minWidth: 720,
          padding: '12px 20px',
          borderBottom: '1px solid rgba(0,255,255,0.08)',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <input
            type="checkbox"
            aria-label="Select all on page"
            checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
            onChange={toggleSelectAllOnPage}
            style={{ accentColor: 'var(--cyan)' }}
          />
          {['ADDRESS', 'AREA', 'STATUS', 'AUTH.', 'CONF.', 'ACTIONS'].map((h) => (
            <span key={h} style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 8.5, color: 'var(--text-lo)', letterSpacing: '.14em' }}>{h}</span>
          ))}
        </div>

        {loading && rows.length === 0 ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 52 }} />)}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>📋</div>
            <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 17, color: 'var(--text-hi)', margin: '0 0 8px' }}>
              No matches
            </p>
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13.5, color: 'var(--text-mid)', margin: '0 0 22px' }}>
              Adjust filters or generate a new listing.
            </p>
            <button onClick={() => navigate('/generate')} className="btn btn-primary btn-sm">Generate Now →</button>
          </div>
        ) : (
          rows.map((g: Generation, i) => (
            <div key={g.id}>
              <div
                className="neon-table-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px minmax(160px,1fr) 120px 90px 72px 72px 100px',
                  minWidth: 720,
                  padding: '14px 20px',
                  alignItems: 'center',
                  borderBottom: i < rows.length - 1 ? '1px solid rgba(0,255,255,0.05)' : 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(g.id)}
                  onChange={() => toggleSelect(g.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ accentColor: 'var(--cyan)' }}
                />
                <div
                  onClick={() => g.status === 'complete' && navigate(`/results/${g.id}`)}
                  style={{ overflow: 'hidden', cursor: g.status === 'complete' ? 'pointer' : 'default' }}
                >
                  <div style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 500, fontSize: 13.5, color: '#eafaff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {g.address}
                  </div>
                  <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 8.5, color: 'var(--text-lo)', marginTop: 2 }}>
                    {new Date(g.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 10, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                  {g.neighborhood ?? '—'}
                </div>
                <div>
                  <span className={`chip chip-${g.status}`}>{g.status}</span>
                </div>
                <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontWeight: 700, fontSize: 13, color: scoreColor(g.authenticity_score) }}>
                  {g.authenticity_score != null ? `${g.authenticity_score}%` : '—'}
                </div>
                <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontWeight: 700, fontSize: 13, color: scoreColor(g.confidence_score) }}>
                  {g.confidence_score != null ? `${g.confidence_score}%` : '—'}
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {g.status === 'complete' && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/results/${g.id}`); }}
                        style={actionBtnSt}
                        title="View"
                      >→</button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/generate?remixId=${g.id}`); }}
                        style={actionBtnSt}
                        title="Remix"
                      >↻</button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setRelistTarget(g); }}
                        style={{ ...actionBtnSt, color: 'var(--magenta)', borderColor: 'rgba(255,0,255,0.22)' }}
                        title="Relist (back on the market)"
                      >✦</button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setConfirmDel(g.id); }}
                    style={{ ...actionBtnSt, color: '#ff6060', borderColor: 'rgba(255,80,80,0.22)' }}
                    title="Delete"
                  >✕</button>
                </div>
              </div>

              {confirmDel === g.id && (
                <div style={{
                  padding: '11px 20px',
                  background: 'rgba(255,60,60,0.05)',
                  borderBottom: '1px solid rgba(255,80,80,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}>
                  <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#ff8080' }}>
                    Delete this listing permanently?
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteOne(g.id)}
                    disabled={deletingId === g.id}
                    style={{
                      padding: '5px 14px',
                      background: 'rgba(255,60,60,0.12)',
                      border: '1px solid rgba(255,80,80,0.35)',
                      borderRadius: 6,
                      color: '#ff6060',
                      fontFamily: "'DM Mono', ui-monospace, monospace",
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                  >
                    {deletingId === g.id ? 'Deleting…' : 'Confirm'}
                  </button>
                  <button type="button" onClick={() => setConfirmDel(null)} style={{ background: 'none', border: 'none', color: 'var(--text-lo)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                </div>
              )}
            </div>
          ))
        )}

        {hasMore && !loading && (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fetchPage(true)}>
              Load more
            </button>
          </div>
        )}
        {loading && rows.length > 0 && (
          <div style={{ padding: 12, textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-lo)' }}>
            Loading…
          </div>
        )}
      </div>

      {relistTarget && (
        <RelistModal
          source={relistTarget}
          onClose={() => setRelistTarget(null)}
          onSubmit={handleRelistSubmit}
          onSuccess={(genId) => {
            setRelistTarget(null);
            toast('Relist generation started.', 'success');
            navigate(`/results/${genId}`);
          }}
        />
      )}

      <style>{`.neon-input{transition:border-color .25s ease,box-shadow .25s ease}.neon-input:focus{border-color:rgba(0,255,255,.65)!important;box-shadow:0 0 0 3px rgba(0,255,255,.09),0 0 18px rgba(0,255,255,.1)!important}`}</style>
    </div>
  );
}

function RelistModal({
  source,
  onClose,
  onSubmit,
  onSuccess,
}: {
  source: Generation;
  onClose: () => void;
  onSubmit: (
    source: Generation,
    values: { tone: AgentTone; price: string; notes: string },
  ) => Promise<{ ok: boolean; error?: string; generationId?: string }>;
  onSuccess: (generationId: string) => void;
}) {
  const [tone, setTone] = useState<AgentTone>((source.tone as AgentTone) ?? 'standard');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('post-price-reduction, emphasize value');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [busy, onClose]);

  const handleConfirm = async () => {
    setBusy(true);
    setErr(null);
    const res = await onSubmit(source, { tone, price, notes });
    setBusy(false);
    if (res.ok && res.generationId) {
      onSuccess(res.generationId);
    } else {
      setErr(res.error ?? 'Relist failed.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="relist-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 800,
        background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div
        className="glass-dash"
        style={{
          maxWidth: 540, width: '100%', maxHeight: '92vh', overflow: 'auto',
          padding: 26, borderRadius: 16, border: '1px solid rgba(255,0,255,0.32)',
        }}
      >
        <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--magenta)', letterSpacing: '.14em', marginBottom: 8 }}>
          RELIST · BACK ON MARKET
        </div>
        <h3
          id="relist-modal-title"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 800, color: 'var(--text-hi)', margin: '0 0 6px' }}
        >
          Relist this listing
        </h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--text-mid)', margin: '0 0 18px', lineHeight: 1.65 }}>
          Generates a fresh draft (MLS · Airbnb · Social · Email) with relist framing, reusing the source photos, amenities, and specs.
        </p>

        {/* Read-only summary */}
        <div
          style={{
            padding: '12px 14px', borderRadius: 10,
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(0,255,255,0.14)',
            marginBottom: 16,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}
        >
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 14, color: 'var(--text-hi)' }}>
            {source.address}
          </div>
          <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9.5, color: 'var(--text-lo)', letterSpacing: '.06em' }}>
            {(source.neighborhood ?? 'Charleston')}{' · '}original tone: {(source.tone ?? 'standard').toString()}
          </div>
        </div>

        {/* Tone */}
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="relist-tone" className="neon-label" style={{ display: 'block', marginBottom: 6 }}>
            New tone
          </label>
          <select
            id="relist-tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as AgentTone)}
            style={modalInputSt}
          >
            <option value="standard">Standard</option>
            <option value="luxury">Luxury</option>
            <option value="family">Family</option>
            <option value="investment">Investment</option>
          </select>
        </div>

        {/* Price */}
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="relist-price" className="neon-label" style={{ display: 'block', marginBottom: 6 }}>
            New price (optional)
          </label>
          <input
            id="relist-price"
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 749,000"
            className="neon-input"
            style={{ width: '100%' }}
          />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="relist-notes" className="neon-label" style={{ display: 'block', marginBottom: 6 }}>
            Notes for the AI
          </label>
          <textarea
            id="relist-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="post-price-reduction, emphasize value, refreshed staging…"
            style={{
              width: '100%', padding: 12, borderRadius: 8, resize: 'vertical',
              background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(0,255,255,0.18)', color: '#c8e4ec',
              fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, lineHeight: 1.6,
            }}
          />
        </div>

        {err && (
          <div
            style={{
              padding: '10px 12px', borderRadius: 8, marginBottom: 14,
              background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.3)',
              fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: '#ff8080',
            }}
          >
            {err}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-accent" disabled={busy} onClick={handleConfirm}>
            {busy ? 'Relisting…' : 'Confirm Relist →'}
          </button>
        </div>
      </div>
    </div>
  );
}

const modalInputSt: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,255,255,0.18)',
  color: 'var(--text-hi)', fontSize: 13, fontFamily: 'DM Sans, sans-serif',
};

const selectSt: React.CSSProperties = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(0,255,255,0.15)',
  color: 'var(--text-hi)',
  fontSize: 12,
  fontFamily: 'DM Sans, sans-serif',
};

const actionBtnSt: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  background: 'rgba(0,255,255,0.04)',
  border: '1px solid rgba(0,255,255,0.14)',
  color: 'var(--text-mid)',
  cursor: 'pointer',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all .2s',
};
