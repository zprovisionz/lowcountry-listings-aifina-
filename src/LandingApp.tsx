import Navbar       from './components/Navbar';
import Hero         from './components/Hero';
import Features     from './components/Features';
import Pricing      from './components/Pricing';
import UseCases     from './components/UseCases';
import FAQ          from './components/FAQ';
import Footer       from './components/Footer';

export default function LandingApp() {
  return (
    <div style={{ background: 'var(--space)', minHeight: '100vh', position: 'relative' }}>
      <div className="app-shell-bg" aria-hidden />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />
        <main>
          <Hero />
          <div className="divider" />
          <Features />
          <div className="divider" />
          <Pricing />
          <div className="divider" />
          <UseCases />
          <div className="divider" />
          <FAQ />
        </main>
        <Footer />
      </div>
    </div>
  );
}
