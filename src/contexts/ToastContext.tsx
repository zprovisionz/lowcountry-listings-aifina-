import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside <ToastProvider>');
  return ctx;
}

// ─── Toast UI ─────────────────────────────────────────────────────────
const TYPE_STYLES: Record<ToastType, { border: string; color: string; icon: string }> = {
  success: { border: 'rgba(0,255,150,0.4)',  color: '#00ff96', icon: '✓' },
  error:   { border: 'rgba(255,80,80,0.4)',  color: '#ff6060', icon: '✕' },
  warning: { border: 'rgba(255,200,0,0.4)',  color: '#ffc800', icon: '⚠' },
  info:    { border: 'rgba(0,255,255,0.4)',  color: '#00ffff', icon: 'ℹ' },
};

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (!toasts.length) return null;
  return (
    <div
      className="toast-container"
      style={{
        position: 'fixed', bottom: 28, right: 28, left: 'auto',
        zIndex: 10000,
        display: 'flex', flexDirection: 'column', gap: 10,
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      {toasts.map(t => {
        const s = TYPE_STYLES[t.type];
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 18px',
            background: 'rgba(8,8,28,0.96)',
            border: `1px solid ${s.border}`,
            borderRadius: 10,
            backdropFilter: 'blur(20px)',
            boxShadow: `0 0 20px ${s.border}, 0 12px 40px rgba(0,0,0,0.5)`,
            minWidth: 280, maxWidth: 420,
            animation: 'fadeUp .3s ease',
          }}>
            <span style={{ color: s.color, fontSize: 14, flexShrink: 0 }}>{s.icon}</span>
            <span style={{ flex: 1, fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: '#e0f8ff' }}>
              {t.message}
            </span>
            <button onClick={() => dismiss(t.id)} style={{
              background: 'none', border: 'none', color: '#3d5a68',
              cursor: 'pointer', fontSize: 14, padding: 2,
              transition: 'color .2s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#e0f8ff'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#3d5a68'}
            >✕</button>
          </div>
        );
      })}
    </div>
  );
}
