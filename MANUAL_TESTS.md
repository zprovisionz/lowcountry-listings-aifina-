# 10 manual tests before launch

Run these in a production-like environment (or staging with real Supabase + Stripe test mode) before going live.

---

1. **Sign up and sign in**
   - Sign up with email/password. Confirm you receive the email and can verify.
   - Sign in with the same credentials. Confirm you land on the dashboard and the app does not stay on “Authenticating…” indefinitely.
   - If Google OAuth is enabled: sign in with Google and confirm redirect back to the app and dashboard.

2. **Address search and generate flow**
   - Go to **Generate** and in step 1 type a Charleston-area address. Confirm Google Places suggestions appear and you can select one; if Maps is slow or unavailable, confirm the fallback allows typing an address after ~10 seconds.
   - Select property type, complete the wizard (photos optional), choose at least one output format in Review, and click **Generate Listing**. Confirm either the real generation completes and you are redirected to the results page, or the 90s timeout triggers and you see the fallback copy and are still redirected (no infinite “Generating…”).

3. **Results page and copy**
   - On the results page, confirm MLS, Airbnb, and Social tabs show content when available. Click **Copy** on a section; confirm the success toast and that the text is in the clipboard. Confirm “Copied” state and any success animation (e.g. success-pop) appear as designed.

4. **Virtual staging (if enabled)**
   - From results, upload a room photo and select a staging style. Start staging. Confirm progress or completion is shown and a staged image appears (or an error toast if something fails). Confirm no permanent loading state.

5. **History and navigation**
   - Open **History**. Confirm the list loads (skeleton while loading, then rows). Search by address or neighborhood. Click a completed row and confirm navigation to the correct results page. Confirm delete (and any confirmation) works and the list updates.

6. **Bulk CSV (Starter+ tier)**
   - As a user on Starter or above, go to **Bulk CSV**. Upload a valid CSV with address and optional fields. Start bulk generation. Confirm jobs are created and progress/results appear (or a clear error message). If on Free tier, confirm the upgrade/modal or message appears when trying to use bulk.

7. **Account and billing**
   - Go to **Account**. Confirm profile and plan display correctly. Click **Manage Subscription & Billing** and confirm redirect to Stripe Customer Portal (or login prompt if not configured). If you have “Upgrade” or credit pack buttons, confirm they open Stripe Checkout (or show a clear error) and do not leave the UI stuck.

8. **Landing and pricing CTAs**
   - Log out and open the landing page. Scroll to pricing. Click a tier CTA (e.g. “Go Pro”); confirm redirect to login (or to account/checkout if already logged in). After login, confirm redirect back to account or checkout as intended. On landing, confirm “Start Free” and “View Pricing” (and any auth-aware CTAs when logged in) go to the correct targets.

9. **Mobile responsiveness**
   - Resize the window to a mobile width (~375px) or use a real device. Confirm: navigation (sidebar or hamburger), forms (address, wizard steps), tables (e.g. History) scroll or stack without horizontal overflow; toasts are visible and not cut off; buttons and CTAs are tappable and readable.

10. **Error handling and toasts**
    - Trigger an error where possible (e.g. disconnect network and submit, or use invalid input). Confirm an error toast appears and the UI does not hang (e.g. generation submit shows error and button returns to “Generate Listing”). Confirm the global error boundary by forcing a React error (e.g. temporarily throw in a component); the fallback “Something went wrong” screen and Reload button should appear.

---

After all 10 pass, do a final smoke test: sign in, generate one listing, copy one block, open Account and Billing, then sign out. Document any known limitations (e.g. “Staging only in production if FAL_KEY is set”) for your team.
