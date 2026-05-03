import LegalShell from './LegalShell';

const SUPPORT_EMAIL = 'support@lowcountrylistings.ai';

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" lastUpdated="May 3, 2026">
      <p>
        This Privacy Policy describes how Lowcountry Listings AI ("we," "us") collects, uses,
        and protects information when you use our service. We operate exclusively in the
        Charleston, Berkeley, and Dorchester counties of South Carolina.
      </p>

      <h2 style={h2}>1. Information We Collect</h2>
      <ul style={ul}>
        <li><strong>Account information.</strong> When you sign up, we collect your email address, name (optional), and authentication credentials. If you sign up via Google, we receive your basic Google profile.</li>
        <li><strong>Listing inputs.</strong> Property addresses, neighborhood, bedrooms/bathrooms, square footage, amenities, photos, and any notes you supply to generate listings.</li>
        <li><strong>Generated outputs.</strong> The MLS, Airbnb, and social copy our AI returns, plus authenticity and confidence scores, virtual staging results, and landmark distances.</li>
        <li><strong>Usage events.</strong> Which results you view, copy, or regenerate, plus billing and quota usage.</li>
        <li><strong>Payment data.</strong> Handled by Stripe. We do not store full card numbers.</li>
      </ul>

      <h2 style={h2}>2. How We Use It</h2>
      <ul style={ul}>
        <li>To deliver the service: generate listings, run virtual staging, calculate distances, and persist your work.</li>
        <li>To enforce plan limits and process payments via Stripe.</li>
        <li>To improve the product, monitor abuse, and respond to support requests.</li>
        <li>To send transactional email (account, billing, team invites). We do not sell your data.</li>
      </ul>

      <h2 style={h2}>3. AI Processing</h2>
      <p>
        Listing inputs are sent to third-party AI providers (Anthropic, OpenAI, fal.ai, Google Maps)
        solely to produce your output. We do not use your content to train AI models, and we ask
        our providers not to retain it for training. Generated content is yours.
      </p>

      <h2 style={h2}>4. Data Security</h2>
      <p>
        Data is hosted on Supabase with row-level security so that one user's records are
        cryptographically isolated from another's. All traffic is served over HTTPS.
      </p>

      <h2 style={h2}>5. Your Rights</h2>
      <p>
        You may request a copy of your data, correct inaccuracies, or delete your account at
        any time by emailing <a href={`mailto:${SUPPORT_EMAIL}`} style={a}>{SUPPORT_EMAIL}</a>.
        We will respond within 30 days. California (CCPA) and EU (GDPR) residents have
        additional rights including the right to opt out of any "sale" of personal information
        — we do not sell personal information.
      </p>

      <h2 style={h2}>6. Cookies</h2>
      <p>
        We use a minimal set of first-party cookies for authentication and session management.
        We do not use third-party advertising cookies.
      </p>

      <h2 style={h2}>7. Children</h2>
      <p>
        The service is not directed to children under 16. We do not knowingly collect data from
        them.
      </p>

      <h2 style={h2}>8. Changes</h2>
      <p>
        We may update this policy as the product evolves. The "last updated" date at the top
        will reflect any change. Material changes will be communicated by email.
      </p>

      <h2 style={h2}>9. Contact</h2>
      <p>
        Questions: <a href={`mailto:${SUPPORT_EMAIL}`} style={a}>{SUPPORT_EMAIL}</a><br />
        Lowcountry Listings AI · Mount Pleasant, SC
      </p>
    </LegalShell>
  );
}

const h2: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700,
  fontSize: 20, color: 'var(--text-hi)', margin: '32px 0 12px',
};
const ul: React.CSSProperties = { paddingLeft: 22, margin: '0 0 16px' };
const a: React.CSSProperties = { color: 'var(--cyan)', textDecoration: 'underline' };
