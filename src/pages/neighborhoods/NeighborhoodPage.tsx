import { Link, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Seo from '../../components/seo/Seo';
import NotFoundPage from '../NotFoundPage';
import neighborhoodsFile from '../../../public/charleston_neighborhoods.json';
import {
  type NeighborhoodsFile,
  buildBreadcrumbLd,
  buildEditorialOverview,
  buildMetaDescription,
  buildPageTitle,
  buildPlaceLd,
  findNeighborhoodBySlug,
  neighborhoodUrl,
  priceRangeLabel,
  slugify,
} from '../../lib/neighborhoodContent';

const data = neighborhoodsFile as NeighborhoodsFile;

export default function NeighborhoodPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const neighborhood = findNeighborhoodBySlug(data, slug);

  if (!neighborhood) {
    return <NotFoundPage />;
  }

  const canonical = neighborhoodUrl(neighborhood.name);
  const overview = buildEditorialOverview(neighborhood);
  const generateHref = `/generate?neighborhood=${slugify(neighborhood.name)}`;

  return (
    <div style={{ background: 'var(--space)', minHeight: '100vh', position: 'relative' }}>
      <Seo
        title={buildPageTitle(neighborhood)}
        description={buildMetaDescription(neighborhood)}
        canonical={canonical}
        jsonLd={[buildBreadcrumbLd(neighborhood), buildPlaceLd(neighborhood)]}
      />
      <div className="app-shell-bg" aria-hidden />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />

        <main style={{
          padding: '140px 24px 80px',
          background:
            'radial-gradient(ellipse 90% 70% at 50% -10%, oklch(0.72 0.13 195 / 0.10) 0%, transparent 55%),' +
            'radial-gradient(ellipse 50% 40% at 90% 80%, oklch(0.78 0.11 85 / 0.06) 0%, transparent 50%),' +
            'var(--space)',
        }}>
          <div className="section-inner" style={{ maxWidth: 860 }}>

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" style={{
              fontFamily: "'DM Mono', ui-monospace, monospace",
              fontSize: 10,
              color: 'var(--text-lo)',
              letterSpacing: '.14em',
              marginBottom: 22,
            }}>
              <Link to="/" style={{ color: 'var(--text-lo)', textDecoration: 'none' }}>HOME</Link>
              <span style={{ margin: '0 8px', color: 'var(--text-ghost)' }}>/</span>
              <Link to="/neighborhoods" style={{ color: 'var(--text-lo)', textDecoration: 'none' }}>
                NEIGHBORHOODS
              </Link>
              <span style={{ margin: '0 8px', color: 'var(--text-ghost)' }}>/</span>
              <span style={{ color: 'var(--cyan)' }}>{neighborhood.name.toUpperCase()}</span>
            </nav>

            {/* Header */}
            <header style={{ marginBottom: 44 }}>
              <div className="tag">{neighborhood.county} County · Charleston Metro</div>
              <h1 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 800,
                fontSize: 'clamp(38px, 6vw, 64px)',
                lineHeight: 1.04,
                letterSpacing: '-.03em',
                color: 'var(--text-hi)',
                margin: '14px 0 22px',
              }}>
                {neighborhood.name} <span style={{ color: 'var(--text-mid)', fontWeight: 500, fontSize: '0.55em', display: 'block', marginTop: 6 }}>
                  Real Estate Listing Copy & Vocabulary
                </span>
              </h1>
              <p style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 'clamp(15px, 1.7vw, 17px)',
                color: 'var(--text-mid)',
                lineHeight: 1.85,
                margin: 0,
              }}>
                {overview}
              </p>
            </header>

            {/* Two-column highlights / landmarks */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 18,
              marginBottom: 36,
            }}>
              <section style={{
                background: 'var(--space-card)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16,
                padding: 22,
                backdropFilter: 'blur(20px)',
              }}>
                <h2 style={{
                  fontFamily: "'DM Mono', ui-monospace, monospace",
                  fontSize: 10,
                  color: 'var(--cyan)',
                  letterSpacing: '.16em',
                  margin: '0 0 14px',
                  textTransform: 'uppercase',
                }}>
                  Lifestyle Highlights
                </h2>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {neighborhood.lifestyle.map((item) => (
                    <li key={item} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 9,
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      color: 'var(--text-mid)',
                      lineHeight: 1.6,
                    }}>
                      <span style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: 1 }}>✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section style={{
                background: 'var(--space-card)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16,
                padding: 22,
                backdropFilter: 'blur(20px)',
              }}>
                <h2 style={{
                  fontFamily: "'DM Mono', ui-monospace, monospace",
                  fontSize: 10,
                  color: 'var(--magenta)',
                  letterSpacing: '.16em',
                  margin: '0 0 14px',
                  textTransform: 'uppercase',
                }}>
                  Notable Landmarks Nearby
                </h2>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {neighborhood.landmarks.map((landmark) => (
                    <li key={landmark} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 9,
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      color: 'var(--text-mid)',
                      lineHeight: 1.6,
                    }}>
                      <span style={{ color: 'var(--magenta)', flexShrink: 0, marginTop: 1 }}>◆</span>
                      <span>{landmark}</span>
                    </li>
                  ))}
                </ul>
                <p style={{
                  fontFamily: "'DM Mono', ui-monospace, monospace",
                  fontSize: 9,
                  color: 'var(--text-ghost)',
                  letterSpacing: '.1em',
                  marginTop: 16,
                  lineHeight: 1.6,
                }}>
                  Distances are calculated live via Google Maps Distance Matrix when you generate a listing —
                  real driving distance, not straight-line.
                </p>
              </section>
            </div>

            {/* Vocabulary block */}
            <section style={{
              background: 'var(--cyan-ghost)',
              border: '1px solid var(--cyan-border)',
              borderRadius: 16,
              padding: '22px 24px',
              marginBottom: 36,
            }}>
              <h2 style={{
                fontFamily: "'DM Mono', ui-monospace, monospace",
                fontSize: 10,
                color: 'var(--cyan)',
                letterSpacing: '.16em',
                margin: '0 0 14px',
                textTransform: 'uppercase',
              }}>
                Lowcountry Vocabulary We Use Here
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {neighborhood.vocab.map((term) => (
                  <span key={term} style={{
                    fontFamily: "'DM Mono', ui-monospace, monospace",
                    fontSize: 11,
                    color: 'var(--text-hi)',
                    padding: '5px 12px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--cyan-border)',
                    borderRadius: 999,
                    letterSpacing: '.04em',
                  }}>
                    {term}
                  </span>
                ))}
              </div>
            </section>

            {/* Price + property-type context */}
            <section style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              marginBottom: 44,
            }}>
              <div style={{
                background: 'var(--space-card)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: '18px 20px',
              }}>
                <div style={{
                  fontFamily: "'DM Mono', ui-monospace, monospace",
                  fontSize: 9,
                  color: 'var(--text-lo)',
                  letterSpacing: '.14em',
                  marginBottom: 6,
                }}>
                  TYPICAL PRICE RANGE
                </div>
                <div style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 700,
                  fontSize: 22,
                  color: 'var(--cyan)',
                }}>
                  {priceRangeLabel(neighborhood)}
                </div>
              </div>
              <div style={{
                background: 'var(--space-card)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: '18px 20px',
              }}>
                <div style={{
                  fontFamily: "'DM Mono', ui-monospace, monospace",
                  fontSize: 9,
                  color: 'var(--text-lo)',
                  letterSpacing: '.14em',
                  marginBottom: 6,
                }}>
                  COMMON PROPERTY TYPES
                </div>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13,
                  color: 'var(--text-hi)',
                  lineHeight: 1.55,
                }}>
                  {neighborhood.property_types
                    .map((t) => t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
                    .join(' · ')}
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="glass-featured" style={{ padding: '34px 32px', textAlign: 'center', marginBottom: 36 }}>
              <div className="tag tag-magenta">Generate Listing Copy</div>
              <h2 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 800,
                fontSize: 'clamp(24px, 3.5vw, 34px)',
                color: 'var(--text-hi)',
                letterSpacing: '-.02em',
                margin: '12px 0 14px',
                lineHeight: 1.15,
              }}>
                Generate a listing in <span style={{ color: 'var(--cyan)' }}>{neighborhood.name}</span>
              </h2>
              <p style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 15,
                color: 'var(--text-mid)',
                lineHeight: 1.75,
                margin: '0 auto 24px',
                maxWidth: 520,
              }}>
                Start with the address — we&rsquo;ll prefill the {neighborhood.name} vocabulary, verified
                landmark distances, and Lowcountry tone the moment you begin.
              </p>
              <Link to={generateHref} className="btn btn-primary" style={{ fontSize: 14, padding: '14px 30px' }}>
                Generate {neighborhood.name} Listing →
              </Link>
              <p style={{
                fontFamily: "'DM Mono', ui-monospace, monospace",
                fontSize: 9,
                color: 'var(--text-ghost)',
                letterSpacing: '.12em',
                marginTop: 14,
              }}>
                10 free generations · No credit card · Charleston metro only
              </p>
            </section>

            {/* Footer link back */}
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <Link to="/neighborhoods" style={{
                fontFamily: "'DM Mono', ui-monospace, monospace",
                fontSize: 11,
                color: 'var(--cyan)',
                letterSpacing: '.14em',
                textDecoration: 'none',
                borderBottom: '1px solid var(--cyan-border)',
                paddingBottom: 2,
              }}>
                ← All Charleston Neighborhoods
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
