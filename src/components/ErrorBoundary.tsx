import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
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
                fontFamily: 'Syne, sans-serif',
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
              {this.state.error.message}
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
    return this.props.children;
  }
}
