import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import DashboardParticles from './DashboardParticles';
import QuotaWarning from '../ui/QuotaWarning';

export default function AppLayout() {
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--space)', position:'relative', overflow:'hidden' }}>

      {/* Particle background */}
      <DashboardParticles />

      {/* Scanline overlay */}
      <div style={{
        position:'fixed', inset:0, pointerEvents:'none', zIndex:9999,
        background:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.016) 3px,rgba(0,0,0,0.016) 4px)',
      }} />

      {/* Desktop sidebar */}
      <div className="desktop-sidebar" style={{ position:'relative', zIndex:50, flexShrink:0 }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.65)',
          backdropFilter:'blur(4px)', zIndex:200,
        }} />
      )}

      {/* Mobile sidebar drawer */}
      <div className="mobile-sidebar" style={{
        position:'fixed', top:0, left:0, zIndex:201, height:'100vh',
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform .3s var(--ease-expo)',
      }}>
        <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
      </div>

      {/* Main content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden', position:'relative', zIndex:1 }}>
        <TopBar onMobileSidebarToggle={() => setMobileOpen(m => !m)} />
        <main style={{
          flex:1, overflowY:'auto', overflowX:'hidden',
          padding:'28px 28px 48px',
        }}>
          <QuotaWarning />
          <Outlet />
        </main>
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
