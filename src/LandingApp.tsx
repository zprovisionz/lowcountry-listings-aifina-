import Navbar       from './components/Navbar';
import Hero         from './components/Hero';
import Features     from './components/Features';
import Pricing      from './components/Pricing';
import Testimonials from './components/Testimonials';
import FAQ          from './components/FAQ';
import Footer       from './components/Footer';

export default function LandingApp() {
  return (
    <div style={{ background: '#0a0a1f', minHeight: '100vh', position: 'relative' }}>
      {/* Global scanline overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.018) 3px, rgba(0,0,0,0.018) 4px)',
      }} />
      <Navbar />
      <main>
        <Hero />
        <div className="divider" />
        <Features />
        <div className="divider" />
        <Pricing />
        <div className="divider" />
        <Testimonials />
        <div className="divider" />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
