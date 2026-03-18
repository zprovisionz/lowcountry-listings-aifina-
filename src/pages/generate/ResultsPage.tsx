import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Generation, StagingJob } from '../../types/database';
import CopyButton from '../../components/ui/CopyButton';
import ScoreRing from '../../components/ui/ScoreRing';
import { useGenerations } from '../../hooks/useGenerations';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

type Tab = 'mls' | 'airbnb' | 'social' | 'staging';

const TABS: { key:Tab; label:string; icon:string; words:string }[] = [
  { key:'mls',     label:'MLS Description',  icon:'📋', words:'350–450 words' },
  { key:'airbnb',  label:'Airbnb Copy',       icon:'🏠', words:'200–250 words' },
  { key:'social',  label:'Social Captions',   icon:'📣', words:'3 posts' },
  { key:'staging', label:'Virtual Staging',   icon:'🛋', words:'fal.ai' },
];

const STAGING_STYLES = [
  { id: 'coastal_modern',         label: 'Coastal Modern' },
  { id: 'lowcountry_traditional', label: 'Lowcountry Traditional' },
  { id: 'contemporary',          label: 'Contemporary' },
  { id: 'minimalist',            label: 'Minimalist' },
  { id: 'luxury_resort',         label: 'Luxury Resort' },
  { id: 'empty_clean',           label: 'Empty & Clean' },
];

export default function ResultsPage() {
  const { id } = useParams<{ id:string }>();
  const navigate = useNavigate();
  const { trackEvent } = useGenerations();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [gen,           setGen]           = useState<Generation | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState<Tab>('mls');
  const [polling,       setPolling]       = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef    = useRef(0);
  const [stagingJobs,   setStagingJobs]   = useState<StagingJob[]>([]);
  const [stagingStyle,  setStagingStyle]  = useState('coastal_modern');
  const [stagingPhoto,  setStagingPhoto]  = useState<string>('');
  const [stagingBusy,   setStagingBusy]   = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editNotes,     setEditNotes]     = useState('');
  const [editPreset,    setEditPreset]    = useState('');
  const [editBusy,      setEditBusy]      = useState(false);

  // ── Load generation + subscribe to Realtime updates ──────────────────
  useEffect(() => {
    if (!id) return;

    const clearPoll = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setPolling(false);
    };

    const loadGen = async () => {
      const { data, error } = await supabase.from('generations').select('*').eq('id', id).single();
      if (error || !data) { setLoading(false); return; }
      setGen(data as Generation);
      setLoading(false);
      if (data.status === 'generating') {
        setPolling(true);
        pollCountRef.current = 0;
        pollIntervalRef.current = setInterval(async () => {
          pollCountRef.current += 1;
          const { data: u } = await supabase.from('generations').select('*').eq('id', id).single();
          if (u && u.status !== 'generating') {
            setGen(u as Generation);
            clearPoll();
            return;
          }
          // safety: stop polling after ~90s (45 attempts)
          if (pollCountRef.current >= 45) {
            clearPoll();
          }
        }, 2000);
      }
      await trackEvent(id, 'view');
    };
    loadGen();
    return () => clearPoll();
  }, [id, trackEvent]);

  // ── Load existing staging jobs + subscribe Realtime ──────────────────
  useEffect(() => {
    if (!id) return;

    supabase.from('staging_queue').select('*').eq('generation_id', id).order('created_at').then(({ data }) => {
      if (data) setStagingJobs(data as StagingJob[]);
    });

    const channel = supabase
      .channel(`staging-${id}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'staging_queue',
        filter: `generation_id=eq.${id}`,
      }, payload => {
        setStagingJobs(prev => {
          const updated = payload.new as StagingJob;
          const exists  = prev.find(j => j.id === updated.id);
          return exists
            ? prev.map(j => j.id === updated.id ? updated : j)
            : [...prev, updated];
        });
        if ((payload.new as StagingJob).status === 'complete') setStagingBusy(false);
        if ((payload.new as StagingJob).status === 'error')    { setStagingBusy(false); toast('Staging failed. Please try again.', 'error'); }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, toast]);

  // ── Trigger a staging job ─────────────────────────────────────────────
  const handleEditRegenerateMls = useCallback(async () => {
    if (!user?.id || !id || !gen?.mls_copy) return;
    setEditBusy(true);
    const { data, error } = await supabase.functions.invoke('edit-regenerate-mls', {
      body: {
        generationId: id,
        userId: user.id,
        currentMls: gen.mls_copy,
        userNotes: editNotes.trim(),
        preset: editPreset || undefined,
      },
    });
    setEditBusy(false);
    if (error) {
      toast(error.message ?? 'Edit failed', 'error');
      return;
    }
    if (data?.mls_copy) {
      setGen(prev => (prev ? { ...prev, mls_copy: data.mls_copy } : prev));
      setEditModalOpen(false);
      setEditNotes('');
      setEditPreset('');
      toast('MLS updated.', 'success');
    } else {
      toast((data as { error?: string })?.error ?? 'Edit failed', 'error');
    }
  }, [user?.id, id, gen?.mls_copy, editNotes, editPreset, toast]);

  const handleStagePhoto = useCallback(async () => {
    if (!user || !id || !stagingPhoto) return;
    setStagingBusy(true);
    const { error } = await supabase.functions.invoke('stage-photo', {
      body: { generationId: id, photoUrl: stagingPhoto, stagingStyle, userId: user.id },
    });
    if (error) { setStagingBusy(false); toast(error.message ?? 'Staging failed', 'error'); }
  }, [user, id, stagingPhoto, stagingStyle, toast]);

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:20 }}>
      <div style={{ width:44,height:44,border:'2px solid rgba(0,255,255,0.2)',borderTopColor:'var(--cyan)',borderRadius:'50%',animation:'spinRing .8s linear infinite' }} />
      <span style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'var(--text-lo)', letterSpacing:'.14em' }}>LOADING RESULTS…</span>
      <style>{`@keyframes spinRing{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ── Generating ── */
  if (polling || gen?.status === 'generating') return (
    <div style={{ maxWidth:560, margin:'60px auto' }}>
      <div className="glass-featured anim-fade-up" style={{ padding:'48px 40px', textAlign:'center' }}>
        <div style={{
          width:72, height:72, borderRadius:'50%', margin:'0 auto 24px',
          background:'linear-gradient(135deg,rgba(0,255,255,0.15),rgba(255,0,255,0.15))',
          border:'2px solid rgba(0,255,255,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:28,
        }}>✦</div>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:22, color:'#eafaff', margin:'0 0 10px' }}>
          Generating Your Listing…
        </h2>
        <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:14, color:'var(--text-mid)', lineHeight:1.75, margin:'0 0 26px' }}>
          GPT-4o-mini is crafting hyper-local copy with neighborhood intelligence,
          landmark distances, and authentic Charleston vocabulary.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:8, textAlign:'left' }}>
          {['Analyzing address & neighborhood','Injecting Lowcountry vocabulary','Calculating landmark distances','Scoring authenticity'].map((step, i) => (
            <div key={step} style={{
              display:'flex', alignItems:'center', gap:10, padding:'9px 14px',
              background:'rgba(0,255,255,0.04)', borderRadius:8, border:'1px solid rgba(0,255,255,0.1)',
            }}>
              <div style={{ width:13,height:13,borderRadius:'50%',border:'1.5px solid rgba(0,255,255,0.3)',borderTopColor:'var(--cyan)',animation:`spinRing ${0.7+i*0.1}s linear infinite`,flexShrink:0 }} />
              <span style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'var(--text-lo)' }}>{step}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes spinRing{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ── Error ── */
  if (!gen || gen.status === 'error') return (
    <div style={{ textAlign:'center', padding:'80px 24px' }}>
      <div style={{ fontSize:40, marginBottom:16 }}>⚠</div>
      <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:20, color:'#eafaff', margin:'0 0 10px' }}>
        {gen?.status === 'error' ? 'Generation Failed' : 'Not Found'}
      </h2>
      <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:14, color:'var(--text-mid)', marginBottom:24 }}>
        {gen?.status === 'error' ? 'Something went wrong with this generation.' : 'This listing could not be found.'}
      </p>
      <button onClick={() => navigate('/generate')} className="btn btn-primary">Try Again →</button>
    </div>
  );

  const wc = (t:string|null) => t ? t.trim().split(/\s+/).length : 0;

  return (
    <div style={{ maxWidth:900, margin:'0 auto', display:'flex', flexDirection:'column', gap:22 }}>

      {/* Header */}
      <div className="anim-fade-up" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:14 }}>
        <div>
          <button onClick={() => navigate('/history')} style={{
            background:'none', border:'none', color:'var(--text-lo)', fontFamily:'Space Mono,monospace',
            fontSize:10, cursor:'pointer', letterSpacing:'.1em', marginBottom:8, padding:0,
            display:'flex', alignItems:'center', gap:5, transition:'color .2s',
          }}
          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='var(--cyan)'}
          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='var(--text-lo)'}
          >← HISTORY</button>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:20, color:'#eafaff', margin:'0 0 6px' }}>
            {gen.address}
          </h1>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            {gen.neighborhood && (
              <span className="tag" style={{ marginBottom:0 }}>{gen.neighborhood}</span>
            )}
            <span style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)' }}>
              {new Date(gen.created_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
            </span>
          </div>
        </div>
        <button onClick={() => navigate('/generate')} className="btn btn-ghost btn-sm">✦ New Listing</button>
      </div>

      {/* Scores row */}
      <div className="glass-dash anim-fade-up d-100" style={{ padding:'26px 28px', display:'flex', alignItems:'flex-start', gap:30, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:24, flexShrink:0 }}>
          {gen.authenticity_score != null && <ScoreRing value={gen.authenticity_score} label="Authenticity" color="cyan" />}
          {gen.confidence_score    != null && <ScoreRing value={gen.confidence_score}   label="Confidence"  color="magenta" />}
        </div>

        {/* Landmark distances */}
        {gen.landmark_distances && (
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)', letterSpacing:'.14em', marginBottom:8 }}>
              LANDMARK DISTANCES
            </div>
            {Object.entries(gen.landmark_distances).slice(0,4).map(([place,dist],i) => (
              <div key={place} style={{
                display:'flex', justifyContent:'space-between', padding:'6px 10px',
                background: i%2===0 ? 'rgba(0,255,255,0.03)' : 'transparent', borderRadius:6,
              }}>
                <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:12.5, color:'var(--text-mid)' }}>{place}</span>
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:11, color: i%2===0 ? 'var(--cyan)' : 'var(--magenta)', fontWeight:700 }}>{dist}</span>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {gen.improvement_suggestions && gen.improvement_suggestions.length > 0 && (
          <div style={{ flex:1, minWidth:180 }}>
            <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)', letterSpacing:'.14em', marginBottom:8 }}>SUGGESTIONS</div>
            {gen.improvement_suggestions.map(s => (
              <div key={s} style={{ display:'flex', alignItems:'flex-start', gap:7, marginBottom:8, fontFamily:'DM Sans,sans-serif', fontSize:12.5, color:'var(--text-mid)', lineHeight:1.55 }}>
                <span style={{ color:'var(--magenta)', flexShrink:0, marginTop:2, fontSize:10 }}>◈</span>
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="glass-dash anim-fade-up d-200" style={{ overflow:'hidden' }}>
        {/* Tab bar */}
        <div className="neon-tab-bar">
          {TABS.map(t => {
            const avail = t.key==='mls' ? !!gen.mls_copy : t.key==='airbnb' ? !!gen.airbnb_copy : !!(gen.social_captions?.length);
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => avail && setTab(t.key)}
                disabled={!avail}
                className={`neon-tab${isActive ? ' active' : ''}`}
                style={{ opacity: avail ? 1 : 0.3, cursor: avail ? 'pointer' : 'not-allowed' }}
              >
                <span style={{ fontSize:18 }}>{t.icon}</span>
                <span style={{ fontFamily:'Syne,sans-serif', fontWeight: isActive ? 700 : 500, fontSize:12.5, color: isActive ? 'var(--cyan)' : 'var(--text-mid)', transition:'color .2s' }}>
                  {t.label}
                </span>
                <span style={{ fontFamily:'Space Mono,monospace', fontSize:8, color:'var(--text-ghost)', letterSpacing:'.08em' }}>
                  {t.words}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ padding:'24px 28px' }}>

          {/* MLS / Airbnb */}
          {(tab === 'mls' || tab === 'airbnb') && (() => {
            const text = tab==='mls' ? gen.mls_copy : gen.airbnb_copy;
            const inputsParts = [
              gen.bedrooms != null ? `${gen.bedrooms} bed` : null,
              gen.bathrooms != null ? `${gen.bathrooms} bath` : null,
              gen.sqft != null ? `${Number(gen.sqft).toLocaleString()} sqft` : null,
              gen.neighborhood || null,
            ].filter(Boolean);
            const basedOnInputs = inputsParts.length > 0 ? inputsParts.join(' · ') : null;
            return (
              <div>
                {basedOnInputs && (
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'var(--text-ghost)', letterSpacing:'.06em', marginBottom:12 }}>
                    Based on your inputs: {basedOnInputs}
                  </div>
                )}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
                  <div>
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)', letterSpacing:'.14em' }}>
                      {tab==='mls' ? 'RESO-COMPLIANT MLS DESCRIPTION' : 'AIRBNB / VRBO GUEST-FACING COPY'}
                    </div>
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-ghost)', marginTop:3 }}>{wc(text)} words</div>
                  </div>
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                    {tab==='mls' && text && user && (
                      <button
                        type="button"
                        onClick={() => setEditModalOpen(true)}
                        className="btn-primary"
                        style={{ padding:'10px 18px', fontSize:12 }}
                      >
                        Edit &amp; regenerate
                      </button>
                    )}
                    <CopyButton text={text??''} label="COPY TEXT" onCopy={() => trackEvent(id!,'copy')} />
                  </div>
                </div>
                <div style={{
                  background:'rgba(0,0,0,0.4)', border:'1px solid rgba(0,255,255,0.1)',
                  borderRadius:12, padding:'20px 22px',
                  fontFamily:'DM Sans,sans-serif', fontSize:14.5, lineHeight:1.9,
                  color:'#c8e4ec', whiteSpace:'pre-wrap', position:'relative',
                }}>
                  <div style={{ display:'flex', gap:5, marginBottom:14 }}>
                    {['#ff5f57','#ffbd2e','#28c840'].map(c => (
                      <div key={c} style={{ width:8,height:8,borderRadius:'50%',background:c,opacity:.7 }} />
                    ))}
                  </div>
                  {text}
                </div>
              </div>
            );
          })()}

          {/* Social */}
          {tab === 'social' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)', letterSpacing:'.14em', marginBottom:4 }}>
                3 PLATFORM-READY CAPTIONS WITH LOWCOUNTRY HASHTAGS
              </div>
              {(gen.social_captions??[]).map((caption,i) => (
                <div key={i} className={i%2===0?'glass':'glass-magenta'} style={{ padding:'18px 20px', borderRadius:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontFamily:'Space Mono,monospace', fontSize:9, color: i%2===0 ? 'var(--cyan)' : 'var(--magenta)', letterSpacing:'.12em' }}>
                      CAPTION {i+1}
                    </span>
                    <CopyButton text={caption} label="COPY" onCopy={() => trackEvent(id!,'copy')} />
                  </div>
                  <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:13.5, lineHeight:1.8, color:'#c8e4ec', margin:0, whiteSpace:'pre-wrap' }}>
                    {caption}
                  </p>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <CopyButton text={(gen.social_captions??[]).join('\n\n---\n\n')} label="COPY ALL 3" onCopy={() => trackEvent(id!,'copy')} />
              </div>
            </div>
          )}

          {/* Virtual Staging */}
          {tab === 'staging' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)', letterSpacing:'.14em' }}>
                AI VIRTUAL STAGING · POWERED BY FAL.AI
              </div>

              {/* No photos warning */}
              {(!gen.photo_urls || gen.photo_urls.length === 0) && (
                <div className="glass" style={{ padding:'20px 22px', borderRadius:12, textAlign:'center' }}>
                  <div style={{ fontSize:28, marginBottom:10 }}>📸</div>
                  <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:14, color:'var(--text-mid)', margin:0 }}>
                    No photos were uploaded with this listing. Go back and generate a new listing with photos to use virtual staging.
                  </p>
                </div>
              )}

              {/* Photo picker + style selector */}
              {gen.photo_urls && gen.photo_urls.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div>
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)', letterSpacing:'.1em', marginBottom:8 }}>SELECT PHOTO TO STAGE</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))', gap:8 }}>
                      {gen.photo_urls.map((url, i) => (
                        <div
                          key={url}
                          onClick={() => setStagingPhoto(url)}
                          style={{
                            borderRadius:8, overflow:'hidden', aspectRatio:'4/3',
                            border: stagingPhoto === url ? '2px solid var(--cyan)' : '2px solid rgba(0,255,255,0.15)',
                            cursor:'pointer', position:'relative',
                            boxShadow: stagingPhoto === url ? '0 0 12px rgba(0,255,255,0.3)' : 'none',
                            transition:'border-color .15s, box-shadow .15s',
                          }}
                        >
                          <img src={url} alt={`Photo ${i+1}`} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                          {stagingPhoto === url && (
                            <div style={{ position:'absolute', inset:0, background:'rgba(0,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <span style={{ color:'var(--cyan)', fontSize:20, fontWeight:700 }}>✓</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)', letterSpacing:'.1em', marginBottom:8 }}>STAGING STYLE</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {STAGING_STYLES.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setStagingStyle(s.id)}
                          style={{
                            padding:'7px 14px', borderRadius:20, fontSize:12,
                            fontFamily:'DM Sans,sans-serif', cursor:'pointer', transition:'all .15s',
                            background: stagingStyle === s.id ? 'rgba(0,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                            border: stagingStyle === s.id ? '1px solid var(--cyan)' : '1px solid rgba(255,255,255,0.1)',
                            color: stagingStyle === s.id ? 'var(--cyan)' : 'var(--text-mid)',
                          }}
                        >{s.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Quota info */}
                  {profile && (
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-ghost)', letterSpacing:'.08em' }}>
                      STAGING CREDITS: {profile.staging_credits_used} / {profile.staging_credits_limit === -1 ? '∞' : profile.staging_credits_limit} USED
                    </div>
                  )}

                  <button
                    onClick={handleStagePhoto}
                    disabled={!stagingPhoto || stagingBusy || (profile?.staging_credits_limit !== -1 && (profile?.staging_credits_used ?? 0) >= (profile?.staging_credits_limit ?? 0))}
                    className="btn btn-primary"
                    style={{ width:'fit-content', opacity: (!stagingPhoto || stagingBusy) ? 0.6 : 1 }}
                  >
                    {stagingBusy ? 'Staging in progress…' : '🛋 Stage This Photo'}
                  </button>
                </div>
              )}

              {/* Staging job results */}
              {stagingJobs.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)', letterSpacing:'.14em' }}>STAGED RESULTS</div>
                  {stagingJobs.map(job => (
                    <div key={job.id} className="glass" style={{ borderRadius:12, overflow:'hidden' }}>
                      {job.status === 'processing' && (
                        <div style={{ padding:'20px', display:'flex', alignItems:'center', gap:12 }}>
                          <div style={{ width:16,height:16,borderRadius:'50%',border:'2px solid rgba(0,255,255,0.2)',borderTopColor:'var(--cyan)',animation:'spinRing .8s linear infinite',flexShrink:0 }} />
                          <span style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'var(--text-lo)' }}>
                            Staging in progress — fal.ai is applying {STAGING_STYLES.find(s => s.id === job.staging_style)?.label ?? job.staging_style} style…
                          </span>
                        </div>
                      )}
                      {job.status === 'error' && (
                        <div style={{ padding:'16px 20px', color:'#ff8080', fontFamily:'DM Sans,sans-serif', fontSize:13 }}>
                          ⚠ {job.error_message ?? 'Staging failed'}
                        </div>
                      )}
                      {job.status === 'complete' && job.staged_url && (
                        <div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:'rgba(0,0,0,0.5)' }}>
                            <div style={{ position:'relative' }}>
                              <img src={job.original_url} alt="Original" style={{ width:'100%', display:'block', objectFit:'cover', aspectRatio:'4/3' }} />
                              <div style={{ position:'absolute', bottom:6, left:8, fontFamily:'Space Mono,monospace', fontSize:8, color:'rgba(255,255,255,0.7)', background:'rgba(0,0,0,0.6)', padding:'2px 6px', borderRadius:4 }}>BEFORE</div>
                            </div>
                            <div style={{ position:'relative' }}>
                              <img src={job.staged_url} alt="Staged" style={{ width:'100%', display:'block', objectFit:'cover', aspectRatio:'4/3' }} />
                              <div style={{ position:'absolute', bottom:6, left:8, fontFamily:'Space Mono,monospace', fontSize:8, color:'var(--cyan)', background:'rgba(0,0,0,0.6)', padding:'2px 6px', borderRadius:4 }}>STAGED</div>
                            </div>
                          </div>
                          <div style={{ padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                            <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:12, color:'var(--text-mid)' }}>
                              {STAGING_STYLES.find(s => s.id === job.staging_style)?.label} — {new Date(job.created_at).toLocaleTimeString()}
                            </span>
                            <a href={job.staged_url} download target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize:11 }}>
                              Download
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Property details strip */}
      <div className="anim-fade-up d-300" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10 }}>
        {[
          { label:'Type',      value:gen.property_type?.replace('_',' ') },
          { label:'Bedrooms',  value:gen.bedrooms },
          { label:'Bathrooms', value:gen.bathrooms },
          { label:'Sq Ft',     value:gen.sqft ? Number(gen.sqft).toLocaleString() : null },
          { label:'Amenities', value:gen.amenities.length ? `${gen.amenities.length} features` : null },
        ].filter(r=>r.value!=null).map(({ label, value }) => (
          <div key={label} style={{
            padding:'12px 16px', textAlign:'center',
            background:'rgba(10,10,32,0.5)', border:'1px solid rgba(0,255,255,0.09)', borderRadius:10,
          }}>
            <div style={{ fontFamily:'Space Mono,monospace', fontSize:8, color:'var(--text-lo)', letterSpacing:'.12em', marginBottom:6 }}>
              {label.toUpperCase()}
            </div>
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:17, color:'var(--text-hi)' }}>
              {String(value)}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="anim-fade-up d-400" style={{ display:'flex', gap:12, flexWrap:'wrap', paddingBottom:20 }}>
        <button onClick={() => navigate('/generate')} className="btn btn-primary" style={{ fontSize:13 }}>✦ Generate Another</button>
        <button onClick={() => navigate('/history')} className="btn btn-ghost" style={{ fontSize:13 }}>← Back to History</button>
      </div>

      {editModalOpen && gen.mls_copy && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => !editBusy && setEditModalOpen(false)}
        >
          <div
            className="glass-dash"
            style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 24, borderRadius: 16 }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, margin: '0 0 8px', color: 'var(--text-hi)' }}>
              Edit &amp; regenerate MLS
            </h3>
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: 'var(--text-mid)', margin: '0 0 16px', lineHeight: 1.6 }}>
              Describe changes. Facts stay locked to your saved listing—only copy that matches your amenities and specs is kept.
            </p>
            <label className="neon-label" style={{ display: 'block', marginBottom: 6 }}>Quick suggestion</label>
            <select
              value={editPreset}
              onChange={e => setEditPreset(e.target.value)}
              style={{
                width: '100%', marginBottom: 14, padding: '10px 12px', borderRadius: 8,
                background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,255,255,0.2)', color: 'var(--text-hi)', fontSize: 13,
              }}
            >
              <option value="">(none)</option>
              <option value="add_piazza">Add piazza — only if in your amenities/photos</option>
              <option value="remove_fireplace">Remove fireplace (unless listed)</option>
              <option value="shorten_opening">Shorten opening</option>
              <option value="more_lifestyle">More area lifestyle (landmarks only)</option>
              <option value="tighten_specs">Tighten bed/bath/sqft wording</option>
            </select>
            <label className="neon-label" style={{ display: 'block', marginBottom: 6 }}>Your notes</label>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              placeholder="e.g. Emphasize the chef's kitchen; tone down the opening…"
              rows={5}
              style={{
                width: '100%', marginBottom: 16, padding: 12, borderRadius: 8, resize: 'vertical',
                background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(0,255,255,0.15)', color: '#c8e4ec',
                fontFamily: 'DM Sans,sans-serif', fontSize: 14, lineHeight: 1.6,
              }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost" disabled={editBusy} onClick={() => setEditModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={editBusy} onClick={handleEditRegenerateMls}>
                {editBusy ? 'Regenerating…' : 'Apply & update MLS'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spinRing{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
