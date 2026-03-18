import { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import UpgradeModal from '../../components/ui/UpgradeModal';
import type { BulkJob, BulkJobResult } from '../../types/database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

function parseCSV(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/);
  return lines.map((line) => {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if ((c === ',' && !inQuotes) || c === '\t') {
        row.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    row.push(current.trim());
    return row;
  });
}

function parseRows(csvRows: string[][]): { address: string; bedrooms?: number; bathrooms?: number; sqft?: number; propertyType?: string; tone?: string }[] {
  if (csvRows.length < 2) return [];
  const header = csvRows[0].map((h) => h.toLowerCase());
  const addrIdx = header.findIndex((h) => h.includes('address') || h === 'address');
  const bedsIdx = header.findIndex((h) => h.includes('bed') || h === 'beds');
  const bathsIdx = header.findIndex((h) => h.includes('bath') || h === 'baths');
  const sqftIdx = header.findIndex((h) => h.includes('sqft') || h.includes('sq ft'));
  const typeIdx = header.findIndex((h) => h.includes('type') || h === 'property');
  const toneIdx = header.findIndex((h) => h === 'tone');
  const rows: { address: string; bedrooms?: number; bathrooms?: number; sqft?: number; propertyType?: string; tone?: string }[] = [];
  for (let i = 1; i < csvRows.length; i++) {
    const r = csvRows[i];
    const address = (addrIdx >= 0 ? r[addrIdx] : r[0])?.trim();
    if (!address) continue;
    rows.push({
      address,
      bedrooms: bedsIdx >= 0 ? parseInt(r[bedsIdx] ?? '', 10) : undefined,
      bathrooms: bathsIdx >= 0 ? parseFloat(r[bathsIdx] ?? '') as number : undefined,
      sqft: sqftIdx >= 0 ? parseInt(r[sqftIdx] ?? '', 10) : undefined,
      propertyType: typeIdx >= 0 ? r[typeIdx] : undefined,
      tone: toneIdx >= 0 ? r[toneIdx] : undefined,
    });
  }
  return rows;
}

export default function BulkPage() {
  const { profile } = useAuth();
  const [parsed, setParsed] = useState<string[][]>([]);
  const [job, setJob] = useState<BulkJob | null>(null);
  const [polling, setPolling] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const canUseBulk = profile && profile.tier !== 'free';

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setParsed(parseCSV(text));
      setJob(null);
    };
    reader.readAsText(file);
  }, []);

  const startBulk = useCallback(async () => {
    if (!canUseBulk) {
      setShowUpgrade(true);
      return;
    }
    const rows = parseRows(parsed);
    if (rows.length === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    setPolling(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bulk-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ rows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Bulk start failed');
      const jobId = json.jobId;
      const interval = setInterval(async () => {
        const { data } = await supabase.from('bulk_jobs').select('*').eq('id', jobId).single();
        if (data) setJob(data as BulkJob);
        if (data?.status === 'complete' || data?.status === 'error') {
          clearInterval(interval);
          setPolling(false);
        }
      }, 3000);
      const { data: initial } = await supabase.from('bulk_jobs').select('*').eq('id', jobId).single();
      if (initial) setJob(initial as BulkJob);
    } catch (err) {
      setPolling(false);
      if (err instanceof Error) alert(err.message);
    }
  }, [canUseBulk, parsed, SUPABASE_URL]);

  const downloadCSV = useCallback(() => {
    if (!job?.results?.length) return;
    const header = 'Address,Status,Generation ID,Authenticity Score,View Link';
    const lines = (job.results as BulkJobResult[]).map((r) =>
      [r.address, r.status, r.generation_id ?? '', r.authenticity_score ?? '', r.generation_id ? `${window.location.origin}/results/${r.generation_id}` : ''].join(',')
    );
    const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bulk-results-${job.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [job]);

  const rows = parseRows(parsed);
  const preview = parsed.slice(0, 6);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--text-hi)', marginBottom: 8 }}>
        Bulk CSV Generation
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 28 }}>
        Upload a CSV with columns: address (required), bedrooms, bathrooms, sqft, property type, tone. We’ll generate listings for each row.
      </p>

      {!canUseBulk && (
        <div style={{ padding: 16, marginBottom: 24, background: 'rgba(255,200,80,0.08)', border: '1px solid rgba(255,200,80,0.25)', borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-mid)' }}>
            Bulk generation is available on Starter and above. Upgrade to use this feature.
          </p>
          <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowUpgrade(true)}>
            View plans
          </button>
        </div>
      )}

      <div
        className="glass"
        style={{ padding: 28, borderRadius: 16, marginBottom: 24 }}
      >
        <label style={{ display: 'block', fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: '.12em', color: 'var(--cyan)', marginBottom: 10 }}>
          UPLOAD CSV
        </label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          style={{ display: 'block', width: '100%', padding: 12, border: '1px dashed rgba(0,255,255,0.3)', borderRadius: 10, background: 'rgba(0,255,255,0.03)', color: 'var(--text-mid)' }}
        />
      </div>

      {preview.length > 0 && (
        <div className="glass" style={{ padding: 28, borderRadius: 16, marginBottom: 24, overflowX: 'auto' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Preview ({rows.length} rows)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {preview[0]?.map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid rgba(0,255,255,0.2)', color: 'var(--cyan)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.slice(1, 6).map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-mid)' }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 20 }}
            onClick={startBulk}
            disabled={polling || rows.length === 0}
          >
            {polling ? 'Processing…' : `Start Bulk Generation (${rows.length} rows)`}
          </button>
        </div>
      )}

      {job && (
        <div className="glass" style={{ padding: 28, borderRadius: 16, marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            Job: {job.status} — {job.processed_rows} / {job.total_rows}
          </h3>
          {job.status === 'running' && (
            <div style={{ height: 8, background: 'rgba(0,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
              <div
                style={{
                  height: '100%',
                  width: `${(job.processed_rows / (job.total_rows || 1)) * 100}%`,
                  background: 'var(--cyan)',
                  transition: 'width .3s ease',
                }}
              />
            </div>
          )}
          {job.error_message && (
            <p style={{ fontSize: 12, color: '#ff8080', marginBottom: 16 }}>{job.error_message}</p>
          )}
          {Array.isArray(job.results) && job.results.length > 0 && (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid rgba(0,255,255,0.2)' }}>Address</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid rgba(0,255,255,0.2)' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid rgba(0,255,255,0.2)' }}>Score</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid rgba(0,255,255,0.2)' }}>View</th>
                  </tr>
                </thead>
                <tbody>
                  {(job.results as BulkJobResult[]).map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-mid)' }}>{r.address}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{r.status}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{r.authenticity_score ?? '—'}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {r.generation_id ? (
                          <a href={`/results/${r.generation_id}`} style={{ color: 'var(--cyan)' }}>View</a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="btn btn-ghost btn-sm" onClick={downloadCSV}>
                Download CSV
              </button>
            </>
          )}
        </div>
      )}

      {showUpgrade && <UpgradeModal reason="feature" featureName="Bulk CSV Generation" onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}
