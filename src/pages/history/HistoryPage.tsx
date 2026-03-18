import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGenerations } from '../../hooks/useGenerations';
import type { Generation } from '../../types/database';

const scoreColor = (s:number|null) =>
  !s ? 'var(--text-lo)' : s>=85 ? '#00ff96' : s>=70 ? 'var(--cyan)' : 'var(--magenta)';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { generations, loading, fetchGenerations, deleteGeneration } = useGenerations();
  const [search,     setSearch]     = useState('');
  const [deleting,   setDeleting]   = useState<string|null>(null);
  const [confirmDel, setConfirmDel] = useState<string|null>(null);

  useEffect(() => { fetchGenerations(); }, [fetchGenerations]);

  const filtered = generations.filter(g =>
    g.address.toLowerCase().includes(search.toLowerCase()) ||
    (g.neighborhood??'').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id:string) => {
    setDeleting(id);
    await deleteGeneration(id);
    setDeleting(null); setConfirmDel(null);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Toolbar */}
      <div className="anim-fade-up" style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:220, maxWidth:380 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'var(--text-lo)', zIndex:1 }}>🔍</span>
          <input
            type="text" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search by address or neighborhood…"
            className="neon-input"
            style={{ paddingLeft:38 }}
          />
        </div>
        <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)' }}>
          {filtered.length} LISTING{filtered.length!==1?'S':''}
        </div>
        <button onClick={() => navigate('/generate')} className="btn btn-primary btn-sm">✦ New Listing</button>
      </div>

      {/* Table */}
      <div className="glass-dash anim-fade-up d-100 history-table-wrap" style={{ overflow:'hidden' }}>
        {/* Header */}
        <div style={{
          display:'grid', gridTemplateColumns:'1fr 130px 90px 80px 80px 76px',
          minWidth: 640,
          padding:'12px 20px',
          borderBottom:'1px solid rgba(0,255,255,0.08)',
          background:'rgba(0,0,0,0.2)',
        }}>
          {['ADDRESS','NEIGHBORHOOD','STATUS','AUTH.','CONF.',''].map(h => (
            <span key={h} style={{ fontFamily:'Space Mono,monospace', fontSize:8.5, color:'var(--text-lo)', letterSpacing:'.14em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding:24, display:'flex', flexDirection:'column', gap:8 }}>
            {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{ height:52 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'60px 24px', textAlign:'center' }}>
            <div style={{ fontSize:36, marginBottom:14 }}>📋</div>
            <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:17, color:'var(--text-hi)', margin:'0 0 8px' }}>
              {search ? 'No matches' : 'No listings yet'}
            </p>
            <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:13.5, color:'var(--text-mid)', margin:'0 0 22px' }}>
              {search ? 'Try a different search.' : 'Generate your first Charleston listing.'}
            </p>
            {!search && <button onClick={() => navigate('/generate')} className="btn btn-primary btn-sm">Generate Now →</button>}
          </div>
        ) : (
          filtered.map((g:Generation, i) => (
            <div key={g.id}>
              <div
                onClick={() => g.status==='complete' && navigate(`/results/${g.id}`)}
                className="neon-table-row"
                style={{
                  display:'grid', gridTemplateColumns:'1fr 130px 90px 80px 80px 76px',
                  minWidth: 640,
                  padding:'14px 20px', alignItems:'center',
                  cursor: g.status==='complete' ? 'pointer' : 'default',
                  borderBottom: i<filtered.length-1 ? '1px solid rgba(0,255,255,0.05)' : 'none',
                }}
              >
                {/* Address */}
                <div style={{ overflow:'hidden' }}>
                  <div style={{ fontFamily:'DM Sans,sans-serif', fontWeight:500, fontSize:13.5, color:'#eafaff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {g.address}
                  </div>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:8.5, color:'var(--text-lo)', marginTop:2 }}>
                    {new Date(g.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                  </div>
                </div>
                {/* Neighborhood */}
                <div style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'var(--text-mid)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:8 }}>
                  {g.neighborhood ?? '—'}
                </div>
                {/* Status chip */}
                <div>
                  <span className={`chip chip-${g.status}`}>{g.status}</span>
                </div>
                {/* Scores */}
                <div style={{ fontFamily:'Space Mono,monospace', fontWeight:700, fontSize:13, color:scoreColor(g.authenticity_score) }}>
                  {g.authenticity_score!=null ? `${g.authenticity_score}%` : '—'}
                </div>
                <div style={{ fontFamily:'Space Mono,monospace', fontWeight:700, fontSize:13, color:scoreColor(g.confidence_score) }}>
                  {g.confidence_score!=null ? `${g.confidence_score}%` : '—'}
                </div>
                {/* Actions */}
                <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                  {g.status==='complete' && (
                    <button
                      onClick={e=>{e.stopPropagation();navigate(`/results/${g.id}`);}}
                      style={actionBtnSt} title="View">→</button>
                  )}
                  <button
                    onClick={e=>{e.stopPropagation();setConfirmDel(g.id);}}
                    style={{ ...actionBtnSt, color:'#ff6060', borderColor:'rgba(255,80,80,0.22)' }}
                    title="Delete">✕</button>
                </div>
              </div>

              {/* Confirm delete */}
              {confirmDel === g.id && (
                <div style={{
                  padding:'11px 20px',
                  background:'rgba(255,60,60,0.05)', borderBottom:'1px solid rgba(255,80,80,0.15)',
                  display:'flex', alignItems:'center', gap:14,
                }}>
                  <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:13, color:'#ff8080' }}>
                    Delete this listing permanently?
                  </span>
                  <button onClick={()=>handleDelete(g.id)} disabled={deleting===g.id} style={{
                    padding:'5px 14px', background:'rgba(255,60,60,0.12)',
                    border:'1px solid rgba(255,80,80,0.35)', borderRadius:6,
                    color:'#ff6060', fontFamily:'Space Mono,monospace',
                    fontSize:10, cursor:'pointer',
                  }}>
                    {deleting===g.id ? 'Deleting…' : 'Confirm'}
                  </button>
                  <button onClick={()=>setConfirmDel(null)} style={{ background:'none',border:'none',color:'var(--text-lo)',cursor:'pointer',fontSize:13 }}>Cancel</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style>{`.neon-input{transition:border-color .25s ease,box-shadow .25s ease}.neon-input:focus{border-color:rgba(0,255,255,.65)!important;box-shadow:0 0 0 3px rgba(0,255,255,.09),0 0 18px rgba(0,255,255,.1)!important}`}</style>
    </div>
  );
}

const actionBtnSt: React.CSSProperties = {
  width:28, height:28, borderRadius:6,
  background:'rgba(0,255,255,0.04)', border:'1px solid rgba(0,255,255,0.14)',
  color:'var(--text-mid)', cursor:'pointer', fontSize:13,
  display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s',
};
