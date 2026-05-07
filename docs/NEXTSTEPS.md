# Next Steps

Areas not yet addressed in the current build. Grouped by priority and effort.

---

## Caching

No caching layer exists today. Every page load hits the database directly.

- **Server-side data cache** — Add `unstable_cache` or a Redis layer for frequently read data (project lists, document metadata, sidebar queries). Particularly impactful for the dashboard and project inspect pages.
- **Static generation where possible** — Marketing pages and docs could be statically generated with ISR rather than rendered on every request.
- **API response caching** — Document list fetches and blob reads could benefit from `Cache-Control` headers or edge caching via Vercel.
- **LLM response caching** — Diligence stage outputs are deterministic for the same input. Caching completed stage results would avoid redundant token spend on retries or re-runs.

---

## Authentication — Social / OAuth Providers

Currently only email + password credentials auth is implemented.

- **Google OAuth** — High priority. Most enterprise users expect Google sign-in.
- **LinkedIn OAuth** — Relevant for the PE/VC audience. Adds credibility and reduces friction.
- **Microsoft / Azure AD** — Important for institutional investors with M365 environments.
- **Magic link / passwordless** — Lower friction alternative to passwords. next-auth supports this natively.
- **MFA / 2FA** — Not implemented. Should be added before handling sensitive deal data in production.

---

## SEO

No SEO work has been done. The app is entirely behind auth with no public-facing optimised content.

- **Meta tags** — No `<meta description>`, Open Graph tags, or Twitter cards on marketing pages.
- **Sitemap** — No `sitemap.xml` generation.
- **Robots.txt** — No `robots.txt` configured. Search engines have no crawl guidance.
- **Structured data** — No JSON-LD or schema.org markup for the marketing site.
- **Canonical URLs** — Not set. Could cause duplicate content issues if deployed across multiple domains.
- **Performance signals** — No explicit Core Web Vitals optimisation (image optimisation, font loading strategy, LCP prioritisation).
- **Marketing content** — The landing page is minimal. No blog, case studies, or keyword-targeted content exists.

---

## AEO (Answer Engine Optimisation)

No work has been done to make the product discoverable by AI agents, LLMs, or answer engines (ChatGPT, Perplexity, Google AI Overviews, etc.).

- **Public knowledge base** — No public-facing documentation, FAQs, or help centre that AI agents could index and cite.
- **llms.txt** — No `llms.txt` file to signal AI-readable content or usage policies.
- **Structured FAQs** — No FAQ schema markup that answer engines can extract.
- **API documentation** — No public API docs (OpenAPI spec) that AI coding assistants could reference.
- **Brand entity signals** — No Wikipedia presence, Crunchbase profile, or other structured sources that LLMs use to build entity understanding.
- **Conversational content format** — Marketing copy isn't structured in Q&A or problem/solution format that answer engines prefer to surface.

---

## Email

No email infrastructure exists. The app has no way to communicate with users outside the browser session.

- **Transactional email provider** — No integration with a service like Resend, SendGrid, Postmark, or AWS SES. Need to choose a provider and set up domain authentication (SPF, DKIM, DMARC).
- **Welcome email** — No confirmation or onboarding email after registration.
- **Password reset** — No "forgot password" flow. Users who lose their password have no recovery path.
- **Diligence completion notifications** — Jobs can take minutes to complete. No email is sent when a diligence run finishes, fails, or requires input.
- **Report delivery** — No option to email a generated report to stakeholders or co-investors.
- **Collaboration invites** — No way to invite team members to a project via email.
- **Digest / summary emails** — No periodic updates on project activity or new findings.
- **Email templates** — No templating system (React Email, MJML, etc.) for consistent branded emails.
- **Unsubscribe / preferences** — No email preference centre. Required for CAN-SPAM / GDPR compliance once emails are sent.

---

## Other Notable Gaps

- **Audit logging** — No record of who did what and when. Important for compliance in financial services.
- **Rate limiting on all endpoints** — Only auth routes have rate limiting. Document upload and diligence triggers are unprotected.
- **File type support** — `.pages`, `.key`, `.keynote` are accepted on upload but fall through to metadata-only extraction (no text extractor implemented).
- **Internationalisation** — Label system exists but only English locale is populated. No language switcher in the UI.
- **Accessibility audit** — No formal WCAG audit has been performed. Keyboard navigation and screen reader testing needed.
- **Error boundaries** — No React error boundaries. Unhandled errors crash the entire page.
- **Monitoring / observability** — No APM, error tracking (Sentry), or structured logging in place.
- **CI/CD pipeline** — No GitHub Actions or similar. Tests and linting aren't enforced on PRs.
- **Mobile responsive sidebar** — Sidebar is `hidden md:flex`. No mobile navigation exists.
