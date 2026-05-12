#!/usr/bin/env node
//
// Build-time static prerender for the Lowcountry Listings AI SPA.
//
// Runs after `vite build`. For every SEO-targeted route, it writes a
// `dist/<route>/index.html` containing route-specific meta + JSON-LD, plus
// fully-baked static body content for neighborhood pages so crawlers (and
// users on slow networks) see real content without executing JS.
//
// React boots client-side via `createRoot().render()` (NOT hydrateRoot) so
// the prerendered DOM is replaced cleanly on mount — no hydration mismatch.
//
// Routes covered:
//   /                            (landing — meta override only, content
//                                 already SEO-rich in title/meta)
//   /login, /privacy, /terms     (per-route meta override)
//   /neighborhoods               (index, full prerendered card grid)
//   /neighborhoods/<slug> × 13   (full prerendered detail)
//
// Approach (kept deliberately light — no puppeteer, no jsdom, no SSR):
//   1. Read the Vite-built `dist/index.html` as a base shell.
//   2. For each route, regex-replace title / description / canonical / OG /
//      Twitter tags and append per-route JSON-LD scripts.
//   3. For routes with prerenderable static content (neighborhoods + the
//      index), inject HTML into `<div id="root">` so the page is meaningful
//      in the initial document.
//   4. Write `dist/<route>/index.html`. Vercel serves these directly
//      (filesystem priority); the SPA rewrite rule remains a fallback for
//      anything not prerendered.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const distDir = path.join(root, 'dist');
const publicJsonPath = path.join(root, 'public', 'charleston_neighborhoods.json');

const SITE_ORIGIN = 'https://lowcountrylistings.ai';
const OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

// ─── Helpers (mirror src/lib/neighborhoodContent.ts) ────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s) {
  return escapeHtml(s);
}

function formatList(items, conjunction = 'and') {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${conjunction} ${items[items.length - 1]}`;
}

function compactPrice(n) {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const rounded = m % 1 === 0 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, '');
    return `$${rounded}M`;
  }
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function priceRangeLabel(n) {
  return `${compactPrice(n.price_range.min)} – ${compactPrice(n.price_range.max)}`;
}

function buildEditorialOverview(n) {
  const lifestyleSeed = n.lifestyle.slice(0, 3);
  const vocabSeed = n.vocab.slice(0, 4);
  const landmarkSeed = n.landmarks.slice(0, 3);

  const opener = `${n.name} is the kind of ${n.county} County address where ${formatList(
    lifestyleSeed.slice(0, 2),
  ).toLowerCase()} feel like part of the daily routine, not a once-a-year postcard.`;

  const vocabSentence = vocabSeed.length
    ? `Local listings here lean on the right Lowcountry vocabulary — ${formatList(
        vocabSeed,
      ).toLowerCase()} — so the copy actually matches the way buyers and neighbors talk about the area.`
    : '';

  const landmarkSentence = landmarkSeed.length
    ? `Reference points like ${formatList(landmarkSeed)} sit nearby and give every description a verifiable sense of place, not generic 'close to dining and shopping' filler.`
    : '';

  return [opener, vocabSentence, landmarkSentence].filter(Boolean).join(' ');
}

const META_TRIM_TRAIL = /[\s,;:.\-–—]+$/;

function clampMeta(s) {
  const cleaned = s.replace(/\s+/g, ' ').trim();
  if (cleaned.length >= 150 && cleaned.length <= 160) return cleaned;
  if (cleaned.length > 160) {
    const cut = cleaned.slice(0, 160);
    const lastSpace = cut.lastIndexOf(' ');
    const trimmed = lastSpace > 130 ? cut.slice(0, lastSpace) : cut;
    return trimmed.replace(META_TRIM_TRAIL, '') + '.';
  }
  const suffix = ' Built in Mount Pleasant, SC for Charleston metro agents.';
  const padded = cleaned + suffix;
  if (padded.length <= 160) return padded;
  return padded.slice(0, 159).replace(/\s+\S*$/, '').replace(META_TRIM_TRAIL, '') + '.';
}

function buildMetaDescription(n) {
  const lifestyle = (n.lifestyle[0] ?? '').toLowerCase();
  const landmark = n.landmarks[0] ?? 'Charleston';
  return clampMeta(
    `Write standout ${n.name} real estate listings with Lowcountry vocabulary, ${lifestyle}, and verified ${landmark} distance — Charleston-only AI copy in seconds.`,
  );
}

function buildPageTitle(n) {
  return `${n.name} Real Estate Listing Copy & Lowcountry Vocabulary | Lowcountry Listings AI`;
}

function buildIndexTitle() {
  return 'Charleston Neighborhoods — Listing Copy & Lowcountry Vocabulary | Lowcountry Listings AI';
}

function buildIndexMetaDescription() {
  return clampMeta(
    'Explore all 13 Charleston metro neighborhoods we generate listing copy for — Mount Pleasant, Daniel Island, Folly Beach, Kiawah, and more — with hyper-local vocabulary.',
  );
}

function buildBreadcrumbLd(n) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Charleston Neighborhoods', item: `${SITE_ORIGIN}/neighborhoods` },
      { '@type': 'ListItem', position: 3, name: n.name, item: `${SITE_ORIGIN}/neighborhoods/${slugify(n.name)}` },
    ],
  };
}

function buildIndexBreadcrumbLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Charleston Neighborhoods', item: `${SITE_ORIGIN}/neighborhoods` },
    ],
  };
}

function buildPlaceLd(n) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: n.name,
    address: {
      '@type': 'PostalAddress',
      addressLocality: n.name,
      addressRegion: 'SC',
      addressCountry: 'US',
    },
    containedInPlace: {
      '@type': 'AdministrativeArea',
      name: `${n.county} County, South Carolina`,
    },
    description: buildEditorialOverview(n),
  };
}

// ─── Static body builders ────────────────────────────────────────────

function renderNeighborhoodBody(n) {
  const lifestyleItems = n.lifestyle
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');
  const landmarkItems = n.landmarks
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');
  const vocabChips = n.vocab
    .map((term) => `<span class="prerender-chip">${escapeHtml(term)}</span>`)
    .join('');
  const propertyTypes = n.property_types
    .map((t) => t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(' · ');
  const generateHref = `/generate?neighborhood=${slugify(n.name)}`;

  return `<div class="prerender-shell" data-prerender-route="/neighborhoods/${slugify(n.name)}">
  <nav class="prerender-breadcrumb" aria-label="Breadcrumb">
    <a href="/">HOME</a> / <a href="/neighborhoods">NEIGHBORHOODS</a> / <span>${escapeHtml(n.name.toUpperCase())}</span>
  </nav>
  <header class="prerender-header">
    <span class="prerender-tag">${escapeHtml(n.county)} County · Charleston Metro</span>
    <h1>${escapeHtml(n.name)}</h1>
    <p class="prerender-sub">Real Estate Listing Copy &amp; Lowcountry Vocabulary</p>
    <p class="prerender-lead">${escapeHtml(buildEditorialOverview(n))}</p>
  </header>
  <section class="prerender-card">
    <h2>Lifestyle Highlights</h2>
    <ul class="prerender-list">${lifestyleItems}</ul>
  </section>
  <section class="prerender-card">
    <h2>Notable Landmarks Nearby</h2>
    <ul class="prerender-list">${landmarkItems}</ul>
    <p class="prerender-fine">Driving distances are calculated live via Google Maps Distance Matrix when you generate a listing — real driving distance, not straight-line.</p>
  </section>
  <section class="prerender-card prerender-vocab">
    <h2>Lowcountry Vocabulary We Use Here</h2>
    <div class="prerender-chips">${vocabChips}</div>
  </section>
  <section class="prerender-card">
    <h2>Typical Price Range</h2>
    <p class="prerender-price">${escapeHtml(priceRangeLabel(n))}</p>
    <h2>Common Property Types</h2>
    <p>${escapeHtml(propertyTypes)}</p>
  </section>
  <section class="prerender-cta">
    <h2>Generate a listing in ${escapeHtml(n.name)}</h2>
    <p>Start with the address — we'll prefill the ${escapeHtml(n.name)} vocabulary, verified landmark distances, and Lowcountry tone the moment you begin.</p>
    <a class="prerender-btn" href="${escapeAttr(generateHref)}">Generate ${escapeHtml(n.name)} Listing →</a>
  </section>
  <p class="prerender-footer-link"><a href="/neighborhoods">← All Charleston Neighborhoods</a></p>
</div>`;
}

function renderIndexBody(neighborhoods) {
  const cards = neighborhoods
    .map((n) => {
      const teaser = buildEditorialOverview(n).split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.');
      return `<a class="prerender-card-link" href="/neighborhoods/${slugify(n.name)}">
        <span class="prerender-chip">${escapeHtml(n.county.toUpperCase())} COUNTY · ${escapeHtml(priceRangeLabel(n))}</span>
        <h2>${escapeHtml(n.name)}</h2>
        <p>${escapeHtml(teaser)}</p>
        <span class="prerender-arrow">Explore ${escapeHtml(n.name)} →</span>
      </a>`;
    })
    .join('');

  return `<div class="prerender-shell" data-prerender-route="/neighborhoods">
  <header class="prerender-header">
    <span class="prerender-tag">Charleston Neighborhoods</span>
    <h1>Listing copy that sounds like where it's from.</h1>
    <p class="prerender-lead">Every neighborhood in the Charleston metro has its own vocabulary, rhythm, and reference points. These pages are how we train our AI — and how you preview the local intelligence you'll get when you generate a listing.</p>
  </header>
  <div class="prerender-grid">${cards}</div>
  <p class="prerender-footer-link">${neighborhoods.length} neighborhoods · Charleston · Berkeley · Dorchester</p>
</div>`;
}

function renderLandingBody() {
  return `<div class="prerender-shell" data-prerender-route="/">
  <header class="prerender-header">
    <span class="prerender-tag">Now serving the Charleston metro</span>
    <h1>Write Standout Charleston Listings in Seconds.</h1>
    <p class="prerender-lead">The only AI trained exclusively on Lowcountry voice — with verified landmark distances, hyper-local neighborhood intelligence, and virtual staging no generic tool can match.</p>
    <p class="prerender-fine">Built in Mount Pleasant, SC · Charleston · Berkeley · Dorchester counties only.</p>
  </header>
  <section class="prerender-cta">
    <a class="prerender-btn" href="/login">Start Free — 10 Listings / month</a>
    <a class="prerender-btn-ghost" href="/neighborhoods">Explore Charleston Neighborhoods →</a>
  </section>
</div>`;
}

function renderLegalBody(title, summary) {
  return `<div class="prerender-shell" data-prerender-route="${escapeAttr(title)}">
  <header class="prerender-header">
    <span class="prerender-tag">Lowcountry Listings AI</span>
    <h1>${escapeHtml(title)}</h1>
    <p class="prerender-lead">${escapeHtml(summary)}</p>
  </header>
</div>`;
}

function renderLoginBody() {
  return `<div class="prerender-shell" data-prerender-route="/login">
  <header class="prerender-header">
    <span class="prerender-tag">Sign in or create an account</span>
    <h1>Sign in to Lowcountry Listings AI</h1>
    <p class="prerender-lead">Charleston-only AI listing copy. 10 free generations per month — no credit card required.</p>
  </header>
</div>`;
}

// Minimal prerender stylesheet — invisible while the SPA boots (rootFadeIn
// reveals the React tree). Crawlers still index the content.
const PRERENDER_STYLE = `<style id="prerender-css">
.prerender-shell { font-family: 'DM Sans', system-ui, sans-serif; color: #cbd5e1; max-width: 860px; margin: 0 auto; padding: 140px 24px 80px; line-height: 1.7; }
.prerender-shell h1 { font-family: 'Playfair Display', Georgia, serif; font-weight: 800; font-size: clamp(36px, 6vw, 60px); color: #e0ffff; margin: 14px 0 14px; line-height: 1.05; }
.prerender-shell h2 { font-family: 'DM Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: oklch(0.72 0.13 195); margin: 0 0 12px; }
.prerender-shell p { margin: 0 0 14px; }
.prerender-tag { display: inline-block; font-family: 'DM Mono', ui-monospace, monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: oklch(0.72 0.13 195); padding: 5px 14px; border: 1px solid oklch(0.72 0.13 195 / 0.22); border-radius: 999px; }
.prerender-sub { font-family: 'Playfair Display', Georgia, serif; font-size: 18px; color: #94a3b8; margin: -8px 0 18px; }
.prerender-lead { font-size: 16px; color: #94a3b8; }
.prerender-fine { font-family: 'DM Mono', ui-monospace, monospace; font-size: 10px; letter-spacing: .12em; color: #64748b; }
.prerender-breadcrumb { font-family: 'DM Mono', ui-monospace, monospace; font-size: 10px; letter-spacing: .14em; color: #64748b; margin-bottom: 18px; }
.prerender-breadcrumb a { color: #94a3b8; text-decoration: none; }
.prerender-breadcrumb span { color: oklch(0.72 0.13 195); }
.prerender-card { background: rgba(17,23,32,0.94); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 22px 24px; margin: 18px 0; }
.prerender-vocab { background: oklch(0.72 0.13 195 / 0.08); border-color: oklch(0.72 0.13 195 / 0.22); }
.prerender-list { list-style: none; margin: 0; padding: 0; }
.prerender-list li { padding-left: 18px; position: relative; margin-bottom: 8px; font-size: 14px; color: #cbd5e1; }
.prerender-list li::before { content: '✓'; position: absolute; left: 0; color: oklch(0.72 0.13 195); }
.prerender-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.prerender-chip { display: inline-block; font-family: 'DM Mono', ui-monospace, monospace; font-size: 11px; color: #e0ffff; padding: 5px 12px; background: rgba(0,0,0,0.25); border: 1px solid oklch(0.72 0.13 195 / 0.22); border-radius: 999px; }
.prerender-price { font-family: 'Playfair Display', Georgia, serif; font-size: 26px; color: oklch(0.72 0.13 195); margin-bottom: 18px; }
.prerender-cta { background: rgba(17,23,32,0.94); border: 1px solid oklch(0.72 0.13 195 / 0.45); border-radius: 18px; padding: 32px; text-align: center; margin-top: 24px; }
.prerender-cta h2 { font-family: 'Playfair Display', Georgia, serif; font-size: 26px; color: #e0ffff; letter-spacing: -.02em; text-transform: none; }
.prerender-btn { display: inline-block; padding: 14px 28px; background: oklch(0.72 0.13 195); color: #0b0f14; border-radius: 10px; font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 14px; text-decoration: none; margin-right: 10px; }
.prerender-btn-ghost { display: inline-block; padding: 14px 28px; border: 1px solid oklch(0.72 0.13 195 / 0.45); color: oklch(0.72 0.13 195); border-radius: 10px; font-family: 'Playfair Display', Georgia, serif; font-weight: 600; font-size: 14px; text-decoration: none; }
.prerender-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
.prerender-card-link { display: block; background: rgba(17,23,32,0.94); border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 24px; text-decoration: none; color: inherit; }
.prerender-card-link h2 { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #e0ffff; letter-spacing: -.01em; text-transform: none; margin: 10px 0; }
.prerender-card-link p { font-size: 13.5px; color: #94a3b8; }
.prerender-arrow { font-family: 'DM Mono', ui-monospace, monospace; font-size: 10px; letter-spacing: .12em; color: oklch(0.72 0.13 195); }
.prerender-footer-link { text-align: center; margin-top: 36px; }
.prerender-footer-link a { font-family: 'DM Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: .14em; color: oklch(0.72 0.13 195); text-decoration: none; }
</style>`;

// ─── HTML transform ─────────────────────────────────────────────────

function replaceTag(html, regex, replacement) {
  if (regex.test(html)) {
    return html.replace(regex, replacement);
  }
  return html;
}

function applyMeta(baseHtml, route) {
  let html = baseHtml;
  const titleEsc = escapeHtml(route.title);
  const descEsc = escapeAttr(route.description);
  const canonicalEsc = escapeAttr(route.canonical);
  const ogImageEsc = escapeAttr(route.ogImage ?? OG_IMAGE);

  html = replaceTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${titleEsc}</title>`);

  html = replaceTag(
    html,
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${descEsc}">`,
  );

  html = replaceTag(
    html,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${canonicalEsc}">`,
  );

  html = replaceTag(
    html,
    /<meta\s+property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${titleEsc}">`,
  );

  html = replaceTag(
    html,
    /<meta\s+property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${descEsc}">`,
  );

  html = replaceTag(
    html,
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${canonicalEsc}">`,
  );

  html = replaceTag(
    html,
    /<meta\s+property=["']og:image["'](?![^>]*\balt\b)[^>]*>/i,
    `<meta property="og:image" content="${ogImageEsc}">`,
  );

  html = replaceTag(
    html,
    /<meta\s+name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${titleEsc}">`,
  );

  html = replaceTag(
    html,
    /<meta\s+name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${descEsc}">`,
  );

  html = replaceTag(
    html,
    /<meta\s+name=["']twitter:image["'][^>]*>/i,
    `<meta name="twitter:image" content="${ogImageEsc}">`,
  );

  return html;
}

function injectExtraLd(html, jsonLdBlocks) {
  if (!jsonLdBlocks.length) return html;
  const scripts = jsonLdBlocks
    .map((payload) => `<script type="application/ld+json">${JSON.stringify(payload)}</script>`)
    .join('\n    ');
  return html.replace('</head>', `    ${scripts}\n  </head>`);
}

function injectBody(html, body) {
  if (!body) return html;
  return html.replace(
    /<div\s+id=["']root["']>\s*<\/div>/i,
    `<div id="root">${body}</div>`,
  );
}

function injectPrerenderCss(html) {
  if (html.includes('id="prerender-css"')) return html;
  return html.replace('</head>', `    ${PRERENDER_STYLE}\n  </head>`);
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const baseHtml = await fs.readFile(path.join(distDir, 'index.html'), 'utf8');
  const neighborhoodsData = JSON.parse(await fs.readFile(publicJsonPath, 'utf8'));
  const neighborhoods = neighborhoodsData.neighborhoods;

  /** @type {Array<{ path: string; title: string; description: string; canonical: string; body?: string; jsonLd?: Array<Record<string, unknown>> }>} */
  const routes = [
    {
      path: '/',
      title: "Lowcountry Listings AI — Charleston's AI Listing Platform",
      description: clampMeta(
        "AI-powered listing copy built exclusively for Charleston, SC — hyper-local neighborhood intelligence, verified landmark distances, and MLS-ready output in seconds.",
      ),
      canonical: `${SITE_ORIGIN}/`,
      body: renderLandingBody(),
    },
    {
      path: '/login',
      title: 'Sign In — Lowcountry Listings AI',
      description:
        "Sign in to Lowcountry Listings AI — Charleston's AI listing copy platform. 10 free generations per month, no credit card required, Charleston metro only.",
      canonical: `${SITE_ORIGIN}/login`,
      body: renderLoginBody(),
    },
    {
      path: '/privacy',
      title: 'Privacy Policy | Lowcountry Listings AI',
      description:
        'How Lowcountry Listings AI collects, uses, and protects your information — Supabase row-level security, no model-training on your data, Charleston-only service.',
      canonical: `${SITE_ORIGIN}/privacy`,
      body: renderLegalBody(
        'Privacy Policy',
        'Read how Lowcountry Listings AI handles account, listing, and payment data — including row-level security, retention, and Charleston-only operation.',
      ),
    },
    {
      path: '/terms',
      title: 'Terms of Service | Lowcountry Listings AI',
      description:
        'Terms of Service for Lowcountry Listings AI — Charleston-only AI listing copy. Subscription tiers, pay-per-use credits, content ownership, and acceptable use.',
      canonical: `${SITE_ORIGIN}/terms`,
      body: renderLegalBody(
        'Terms of Service',
        'Subscription tiers, pay-per-use credits, content ownership, and acceptable use for Lowcountry Listings AI.',
      ),
    },
    {
      path: '/neighborhoods',
      title: buildIndexTitle(),
      description: buildIndexMetaDescription(),
      canonical: `${SITE_ORIGIN}/neighborhoods`,
      body: renderIndexBody(neighborhoods),
      jsonLd: [buildIndexBreadcrumbLd()],
    },
    ...neighborhoods.map((n) => ({
      path: `/neighborhoods/${slugify(n.name)}`,
      title: buildPageTitle(n),
      description: buildMetaDescription(n),
      canonical: `${SITE_ORIGIN}/neighborhoods/${slugify(n.name)}`,
      body: renderNeighborhoodBody(n),
      jsonLd: [buildBreadcrumbLd(n), buildPlaceLd(n)],
    })),
  ];

  let written = 0;
  for (const route of routes) {
    let html = applyMeta(baseHtml, route);
    if (route.jsonLd) html = injectExtraLd(html, route.jsonLd);
    if (route.body) {
      html = injectPrerenderCss(html);
      html = injectBody(html, route.body);
    }

    const outPath =
      route.path === '/'
        ? path.join(distDir, 'index.html')
        : path.join(distDir, route.path.replace(/^\//, ''), 'index.html');

    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, html, 'utf8');
    written += 1;
    const rel = path.relative(distDir, outPath);
    console.log(`  prerendered  ${route.path}  →  dist/${rel}`);
  }

  console.log(`\n✓ Prerendered ${written} routes (1 landing + ${routes.length - 1 - neighborhoods.length} static + ${neighborhoods.length} neighborhoods).`);
}

main().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
