import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Seo from '../../components/seo/Seo';
import neighborhoodsFile from '../../../public/charleston_neighborhoods.json';
import {
  type NeighborhoodsFile,
  SITE_ORIGIN,
  buildEditorialOverview,
  buildIndexBreadcrumbLd,
  buildIndexMetaDescription,
  buildIndexTitle,
  neighborhoodPath,
  priceRangeLabel,
} from '../../lib/neighborhoodContent';

const data = neighborhoodsFile as NeighborhoodsFile;

export default function NeighborhoodsIndexPage() {
  const canonical = `${SITE_ORIGIN}/neighborhoods`;

  return (
    <div style={{ background: 'var(--space)', minHeight: '100vh', position: 'relative' }}>
      <Seo
        title={buildIndexTitle()}
        description={buildIndexMetaDescription()}
        canonical={canonical}
        jsonLd={[buildIndexBreadcrumbLd()]}
      />
      <div className="app-shell-bg" aria-hidden />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />

        <main style={{
          padding: '140px 24px 90px',
          background:
            'radial-gradient(ellipse 90% 60% at 50% -10%, oklch(0.72 0.13 195 / 0.10) 0%, transparent 55%),' +
            'radial-gradient(ellipse 55% 45% at 90% 80%, oklch(0.78 0.11 85 / 0.06) 0%, transparent 50%),' +
            'var(--space)',
        }}>
          <div className="section-inner">
            <header style={{ maxWidth: 760, margin: '0 auto 56px', textAlign: 'center' }}>
              <div className="tag">Charleston Neighborhoods</div>
              <h1 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 800,
                fontSize: 'clamp(36px, 5.5vw, 60px)',
                lineHeight: 1.05,
                letterSpacing: '-.03em',
                color: 'var(--text-hi)',
                margin: '12px 0 18px',
              }}>
                Listing copy that sounds like <span className="shimmer-text">where it&rsquo;s from</span>.
              </h1>
              <p style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 'clamp(15px, 1.8vw, 18px)',
                color: 'var(--text-mid)',
                lineHeight: 1.75,
                margin: '0 auto',
                maxWidth: 640,
              }}>
                Every neighborhood in the Charleston metro has its own vocabulary, rhythm, and reference
                points. These pages are how we train our AI — and how you preview the local intelligence
                you&rsquo;ll get when you generate a listing.
              </p>
            </header>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 18,
            }}>
              {data.neighborhoods.map((n) => (
                <Link
                  key={n.name}
                  to={neighborhoodPath(n.name)}
                  style={{
                    textDecoration: 'none',
                    display: 'block',
                    background: 'var(--space-card)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 18,
                    padding: '24px 24px 22px',
                    backdropFilter: 'blur(22px)',
                    transition: 'transform .3s var(--ease-expo), border-color .3s ease, box-shadow .3s ease',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'translateY(-4px)';
                    el.style.borderColor = 'var(--cyan-border)';
                    el.style.boxShadow = '0 20px 44px rgba(0,0,0,0.35)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = '';
                    el.style.borderColor = 'rgba(255,255,255,0.07)';
                    el.style.boxShadow = '';
                  }}
                >
                  <div style={{
                    fontFamily: "'DM Mono', ui-monospace, monospace",
                    fontSize: 9,
                    color: 'var(--cyan)',
                    letterSpacing: '.14em',
                    marginBottom: 8,
                  }}>
                    {n.county.toUpperCase()} COUNTY · {priceRangeLabel(n)}
                  </div>
                  <h2 style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontWeight: 700,
                    fontSize: 22,
                    color: 'var(--text-hi)',
                    margin: '0 0 10px',
                    letterSpacing: '-.01em',
                  }}>
                    {n.name}
                  </h2>
                  <p style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 13.5,
                    color: 'var(--text-mid)',
                    lineHeight: 1.65,
                    margin: 0,
                  }}>
                    {buildEditorialOverview(n).split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.')}
                  </p>
                  <div style={{
                    marginTop: 16,
                    fontFamily: "'DM Mono', ui-monospace, monospace",
                    fontSize: 10,
                    color: 'var(--cyan)',
                    letterSpacing: '.12em',
                  }}>
                    Explore {n.name} →
                  </div>
                </Link>
              ))}
            </div>

            <div style={{ marginTop: 64, textAlign: 'center' }}>
              <p style={{
                fontFamily: "'DM Mono', ui-monospace, monospace",
                fontSize: 10,
                color: 'var(--text-ghost)',
                letterSpacing: '.14em',
              }}>
                {data.neighborhoods.length} NEIGHBORHOODS · CHARLESTON · BERKELEY · DORCHESTER
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
