import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import QuotaWarning from '../ui/QuotaWarning';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--space)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="app-shell-bg" aria-hidden />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flex: 1,
          minWidth: 0,
          width: '100%',
        }}
      >
        <div className="desktop-sidebar" style={{ position: 'relative', flexShrink: 0 }}>
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </div>

        {mobileOpen && (
          <div
            role="presentation"
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 200,
            }}
          />
        )}

        <div
          className="mobile-sidebar"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 201,
            height: '100vh',
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform .3s var(--ease-expo)',
          }}
        >
          <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <TopBar onMobileSidebarToggle={() => setMobileOpen((m) => !m)} />
          <main
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '28px 28px 48px',
            }}
          >
            <QuotaWarning />
            <Outlet />
          </main>
        </div>
      </div>

      <style>{`
        .desktop-sidebar { display:flex; }
        .mobile-sidebar  { display:none; }
        @media (max-width:768px) {
          .desktop-sidebar { display:none; }
          .mobile-sidebar  { display:flex; }
          main { padding:18px 14px 40px !important; }
        }
      `}</style>
    </div>
  );
}
