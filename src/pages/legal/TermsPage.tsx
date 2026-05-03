import LegalShell from './LegalShell';

const SUPPORT_EMAIL = 'support@lowcountrylistings.ai';

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" lastUpdated="May 3, 2026">
      <p>
        By creating an account or using Lowcountry Listings AI ("the Service") you agree to
        these Terms. If you don't agree, don't use the Service.
      </p>

      <h2 style={h2}>1. Eligibility & Scope</h2>
      <p>
        The Service is intended for licensed real estate professionals and short-term rental
        hosts working in Charleston, Berkeley, and Dorchester counties, South Carolina.
        Properties outside the Charleston metro are not supported in Phase 1.
      </p>

      <h2 style={h2}>2. Your Account</h2>
      <ul style={ul}>
        <li>You're responsible for keeping your credentials secure.</li>
        <li>You may not share a single account across multiple agents — Team plans exist for that.</li>
        <li>You must provide accurate property information. The Service generates copy from your inputs; the accuracy of the output depends on the accuracy of the inputs.</li>
      </ul>

      <h2 style={h2}>3. AI Output & Your Responsibility</h2>
      <p>
        The Service produces draft listing copy with the help of AI. <strong>You are the
        author of record</strong> for any listing you publish. Before posting to the MLS,
        Airbnb, or any other platform, you are responsible for:
      </p>
      <ul style={ul}>
        <li>Verifying every factual claim (square footage, beds/baths, distances, amenities).</li>
        <li>Ensuring the copy complies with the Fair Housing Act, your local MLS rules, NAR Code of Ethics, and your brokerage's policies.</li>
        <li>Disclosing virtual staging clearly, as the Service does — virtually staged images include both an on-image label and written disclosure per MLS/NAR guidance.</li>
      </ul>

      <h2 style={h2}>4. Plans, Quotas & Billing</h2>
      <ul style={ul}>
        <li>Plans (Free, Starter, Pro, Pro+, Team) include monthly generation and staging quotas. Quotas reset on your billing cycle.</li>
        <li>Subscriptions auto-renew until canceled. You can cancel anytime in the Stripe-hosted billing portal; your plan stays active through the end of the paid period.</li>
        <li>Pay-per-use credit packs are non-refundable once consumed.</li>
        <li>Refunds for unused subscription periods are at our discretion — contact us within 14 days of charge.</li>
      </ul>

      <h2 style={h2}>5. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul style={ul}>
        <li>Generate listings for properties you don't have authorization to market.</li>
        <li>Use the Service to violate Fair Housing law (no protected-class steering, "exclusive" community language, etc.).</li>
        <li>Reverse-engineer, scrape, or attempt to extract our prompts, models, or vendor keys.</li>
        <li>Resell the Service or wrap it in a competing product.</li>
      </ul>

      <h2 style={h2}>6. Ownership</h2>
      <p>
        You own the listing copy you generate. We retain ownership of the Service itself,
        including the prompts, scoring logic, neighborhood data, and UI.
      </p>

      <h2 style={h2}>7. Disclaimers</h2>
      <p>
        The Service is provided "as is." AI output may contain errors. Landmark distances are
        sourced from Google Maps and may be revised. We do not guarantee specific business
        outcomes (listing speed, booking volume, sale price).
      </p>

      <h2 style={h2}>8. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, our aggregate liability for any claim arising
        from your use of the Service is limited to the amount you paid us in the 12 months
        preceding the claim.
      </p>

      <h2 style={h2}>9. Termination</h2>
      <p>
        You may close your account at any time by emailing{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} style={a}>{SUPPORT_EMAIL}</a>. We may suspend or
        terminate accounts that violate these Terms.
      </p>

      <h2 style={h2}>10. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the State of South Carolina, without regard to
        conflict-of-law rules.
      </p>

      <h2 style={h2}>11. Contact</h2>
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
