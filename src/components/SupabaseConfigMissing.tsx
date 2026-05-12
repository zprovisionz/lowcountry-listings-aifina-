/**
 * Shown when the SPA loads without Vite Supabase env vars (e.g. Vercel project not configured).
 * Replaces a silent blank screen from a thrown module-level error.
 */
export default function SupabaseConfigMissing() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b0f14',
        color: '#e8ecf2',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'DM Sans, system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          padding: '36px 32px',
          background: 'rgba(12, 18, 28, 0.95)',
          border: '1px solid rgba(100, 140, 200, 0.25)',
          borderRadius: 16,
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 22,
            fontWeight: 600,
            margin: '0 0 12px',
            color: '#f0f4fa',
          }}
        >
          App configuration incomplete
        </h1>
        <p style={{ margin: '0 0 16px', fontSize: 15, lineHeight: 1.55, color: '#b8c4d4' }}>
          This deployment is missing the Supabase environment variables the app needs at build
          time. Add them in the Vercel project, redeploy, and this page will be replaced by the
          site.
        </p>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#8ec8ff' }}>
          Required in Vercel → Settings → Environment Variables (Production / Preview as needed):
        </p>
        <ul
          style={{
            textAlign: 'left',
            margin: '12px 0 0',
            paddingLeft: 20,
            fontSize: 13,
            lineHeight: 1.7,
            color: '#c5d0de',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          <li>VITE_SUPABASE_URL</li>
          <li>VITE_SUPABASE_ANON_KEY</li>
        </ul>
        <p style={{ margin: '20px 0 0', fontSize: 12, color: '#7a8a9c' }}>
          Values come from Supabase → Project Settings → API (Project URL and anon public key).
        </p>
      </div>
    </div>
  );
}
