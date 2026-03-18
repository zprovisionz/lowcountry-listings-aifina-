import { useRef, useState, useCallback } from 'react';
import type { WizardData } from '../../types/database';

const MAX = 10;

export default function Step2Photos({ data, onChange }: { data:WizardData; onChange:(p:Partial<WizardData>)=>void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const remaining = MAX - data.photoFiles.length;
    const newFiles = Array.from(files).slice(0, remaining).filter(f => f.type.startsWith('image/'));
    if (!newFiles.length) return;
    onChange({
      photoFiles:[...data.photoFiles,...newFiles],
      photoUrls:[...data.photoUrls,...newFiles.map(f => URL.createObjectURL(f))],
    });
  }, [data.photoFiles, data.photoUrls, onChange]);

  const remove = (i:number) => {
    URL.revokeObjectURL(data.photoUrls[i]);
    onChange({
      photoFiles:data.photoFiles.filter((_,j)=>j!==i),
      photoUrls:data.photoUrls.filter((_,j)=>j!==i),
    });
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div>
        <h2 className="step-heading">Property Photos</h2>
        <p className="step-sub">
          Upload up to {MAX} photos. OpenAI Vision analyzes architectural details, finishes,
          and Lowcountry character — automatically woven into your listing copy.
        </p>
      </div>

      {/* Neon dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => data.photoFiles.length < MAX && fileRef.current?.click()}
        className={`neon-dropzone${dragging ? ' dragging' : ''}`}
        style={{ cursor: data.photoFiles.length >= MAX ? 'not-allowed' : 'pointer' }}
      >
        <input ref={fileRef} type="file" multiple accept="image/*" style={{ display:'none' }}
          onChange={e => addFiles(e.target.files)} disabled={data.photoFiles.length >= MAX} />
        <div style={{ fontSize:38, marginBottom:14 }}>📸</div>
        <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16, color:'var(--text-hi)', margin:'0 0 6px' }}>
          {data.photoFiles.length >= MAX ? 'Maximum photos reached' : 'Drop photos here or click to browse'}
        </p>
        <p style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'var(--text-lo)', margin:'0 0 16px', letterSpacing:'.06em' }}>
          {data.photoFiles.length} / {MAX} uploaded · JPG, PNG, WEBP · Max 10MB each
        </p>
        {data.photoFiles.length < MAX && (
          <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
            Browse Files
          </button>
        )}
      </div>

      {/* Photo grid */}
      {data.photoUrls.length > 0 && (
        <div>
          <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)', letterSpacing:'.14em', marginBottom:10 }}>
            UPLOADED — OPENAI VISION WILL ANALYZE THESE
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(128px,1fr))', gap:10 }}>
            {data.photoUrls.map((url, i) => (
              <div key={url} style={{
                position:'relative', borderRadius:10, overflow:'hidden',
                border:'1px solid rgba(0,255,255,0.2)',
                aspectRatio:'4/3', background:'rgba(0,0,0,0.3)',
                boxShadow:'0 0 14px rgba(0,255,255,0.06)',
              }}>
                <img src={url} alt={`Photo ${i+1}`} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,0.45) 0%,transparent 55%)' }} />
                <span style={{ position:'absolute', bottom:5, left:7, fontFamily:'Space Mono,monospace', fontSize:9, color:'rgba(255,255,255,0.55)' }}>
                  #{i+1}
                </span>
                <button onClick={() => remove(i)} style={{
                  position:'absolute', top:5, right:5,
                  background:'rgba(0,0,0,0.7)', border:'1px solid rgba(255,80,80,0.4)',
                  borderRadius:5, color:'#ff8080', fontSize:11,
                  width:22, height:22, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', transition:'background .2s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='rgba(255,80,80,0.25)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='rgba(0,0,0,0.7)'}
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vision info */}
      <div className="glass-magenta" style={{ padding:'16px 18px', borderRadius:12, display:'flex', gap:12, alignItems:'flex-start' }}>
        <span style={{ fontSize:20, flexShrink:0 }}>🤖</span>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13.5, color:'var(--text-hi)', marginBottom:4 }}>
            OpenAI Vision Analysis
          </div>
          <div style={{ fontFamily:'DM Sans,sans-serif', fontSize:13, color:'var(--text-mid)', lineHeight:1.65 }}>
            Vision AI extracts only high-confidence, visible details from your photos (no guessing).
            Those photo notes can be woven into your copy when they align with your selected amenities. No photos? You can still generate from your facts alone.
          </div>
        </div>
      </div>
    </div>
  );
}
