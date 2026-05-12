import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { PostHogProvider } from 'posthog-js/react';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 0.2,
  });
}

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com';

function SentryFallback({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--space)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 440,
          padding: '32px 28px',
          background: 'rgba(8,8,28,0.9)',
          border: '1px solid rgba(255,80,80,0.35)',
          borderRadius: 20,
          backdropFilter: 'blur(24px)',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠</div>
        <h2
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 700,
            fontSize: 18,
            color: 'var(--text-hi)',
            marginBottom: 10,
          }}
        >
          Something went wrong
        </h2>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 13,
            color: 'var(--text-mid)',
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          {msg}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-primary"
          style={{ fontSize: 13, padding: '12px 24px' }}
        >
          Reload page
        </button>
      </div>
    </div>
  );
}

const appTree = (
  <StrictMode>
    <HelmetProvider>
      <Sentry.ErrorBoundary fallback={({ error }) => <SentryFallback error={error} />} showDialog={false}>
        {posthogKey ? (
          <PostHogProvider apiKey={posthogKey} options={{ api_host: posthogHost, person_profiles: 'identified_only' }}>
            <App />
          </PostHogProvider>
        ) : (
          <App />
        )}
      </Sentry.ErrorBoundary>
    </HelmetProvider>
  </StrictMode>
);

createRoot(document.getElementById('root')!).render(appTree);
