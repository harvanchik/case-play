# CasePlay.org Security and Privacy Review

Date: July 25, 2026

## Scope and limitations

This review covers the CasePlay.org SvelteKit application, its Turso/libSQL data access, Vercel deployment configuration expressed in the repository, administrator authentication, public play-builder APIs, browser storage, analytics/advertising consent code, and public privacy disclosures.

This is an engineering review, not legal advice or a guarantee against litigation. Whether a law applies can depend on facts that are not present in source code, including the operator's location, audience, revenue, visitor volume, contracts, and actual operational practices. A qualified privacy attorney should validate those facts and the final public notices.

## Executive summary

The application does not use Supabase, expose database credentials to browsers, provide public user accounts, collect payment data, or currently expose a public server-submitted contact form. Turso is accessed only from server code. The most important repository-level gaps found during this review were missing baseline response headers, no application-level throttling on login and database-writing endpoints, insufficient request-size/media-type controls, incomplete server validation on administrator forms, detailed database errors returned by some administrator actions, two vulnerable transitive dependency versions, and incomplete privacy disclosures.

Those gaps have been addressed in the current worktree. Type checking passes with zero errors and warnings, the dependency audit reports no known vulnerabilities, and both client and server compilation complete. The final local Vercel packaging step cannot create a symlink on this Windows machine because Developer Mode/elevated symlink permission is unavailable; that failure occurs after successful application compilation and is not a source-code build error.

Two notable residual risks remain:

1. Rate limiting is intentionally a zero-cost, per-instance safety layer. Serverless instances do not share its counters, so a Vercel Firewall rate-limit rule is still recommended as the durable outer layer. Enabling that feature can have plan or usage-cost consequences and therefore was not changed without the owner's approval.
2. Play-builder edit tokens are stored in browser `localStorage`, as required by the product's durable same-browser ownership design. A same-origin script compromise could read them. The token authorizes editing an unlisted/public diagram; it does not grant administrator, payment, or personal-account access. A future HttpOnly ownership-session design would reduce this exposure but requires a product and data-model change.

## Checklist mapping

| # | Article recommendation | Relevance to CasePlay.org | Status |
|---|---|---|---|
| 1 | Privacy policy and data-location awareness | Applicable | Privacy and Cookie policies now identify the operator, processed categories, purposes/legal bases, Vercel/Turso/Google, international processing, retention, rights, contact, and consent controls. Maintain an internal processing/vendor inventory and obtain legal review. |
| 2 | Supabase Row Level Security | Not applicable as written | The app does not use Supabase or connect to Turso from the browser. Database credentials are read only by `src/lib/server/db/index.ts`. Access control is enforced in server routes. |
| 3 | Authentication failure paths | Partly applicable | There is one administrator login and no public signup, reset, verification, or user-account flow. Invalid and nonexistent accounts use the same response and password-verification path; repeated attempts are throttled. The applicable wrong-credential path was exercised. |
| 4 | Security baseline and headers | Applicable | Baseline anti-framing, MIME-sniffing, referrer, permissions, and restrictive CSP directives are now set globally. Admin pages also use `no-store` and `noindex`. |
| 5 | OWASP review | Applicable | Reviewed against common OWASP web risks. Drizzle parameterizes database access, Svelte escapes normal text output, server routes validate input, mutation origins are checked, request bodies are bounded, login and write routes are throttled, and public server errors are generic. |
| 6 | Server-side validation | Applicable | Public play documents were already structurally validated on the server. Administrator text, identifiers, URLs, integer ranges, and playlist sizes now have server-enforced bounds; external film URLs must use HTTPS. |
| 7 | Credential/data leaks | Applicable | `.env` files are ignored, repository scanning found only documented placeholders, API responses do not return Turso credentials or edit-token hashes, and unexpected database failures receive generic client messages. The public Google AdSense publisher identifier is intentionally non-secret. |
| 8 | API keys in frontend | Applicable | Turso URL/token and administrator secrets remain server-only. No private API key was found in client code. |
| 9 | Rate limits | Applicable | Login, new-play creation, and play updates now have bounded application-level limits and standard rate-limit headers. Add a Vercel Firewall rule for globally durable enforcement. |
| 10 | CAPTCHA and CORS | Partly applicable | There is no public server-submitted contact/signup form, so CAPTCHA is not currently warranted. State-changing public APIs reject cross-site browser mutations and do not emit permissive CORS headers. Reassess if a public form is added. |
| 11 | Non-leaking errors | Applicable | Expected validation errors remain specific; unexpected database/server failures now return generic messages while server logs retain operational context. |

## Findings and resolutions

### SEC-001 — Missing baseline security headers

- Severity: Medium
- Status: Fixed
- Location: `src/hooks.server.ts:4`
- Evidence: Responses previously relied on platform defaults. The global hook now sets `Content-Security-Policy` with `base-uri 'self'`, `frame-ancestors 'none'`, and `object-src 'none'`; `Referrer-Policy`; `X-Content-Type-Options`; `X-Frame-Options`; and a restrictive `Permissions-Policy`. Administrator routes additionally receive `Cache-Control: no-store` and `X-Robots-Tag`.
- Impact: Without explicit policy, clickjacking, legacy MIME interpretation, referrer leakage, and unnecessary browser capability exposure are easier.
- Resolution: Added conservative directives that do not interfere with the existing Svelte, Vercel Web Analytics, or AdSense execution model.
- Residual note: A full script/style CSP with nonces is stronger but would require coordinated SvelteKit and third-party tag changes. It should be a separately tested hardening project.

### SEC-002 — Authentication and database-write endpoints lacked throttling

- Severity: Medium
- Status: Fixed with residual infrastructure recommendation
- Locations: `src/lib/server/request-security.ts:38`, `src/routes/admin/login/+page.server.ts:29`, `src/routes/api/play-builders/+server.ts:23`, `src/routes/api/play-builders/[playId]/+server.ts:25`
- Evidence: Login is limited per IP and IP/email; new-play creation is limited per client; edits are limited per client and client/diagram. Responses include limit metadata and retry timing.
- Impact: Unbounded attempts could facilitate password guessing or consume database actions.
- Resolution: Added a bounded, hashed-key, per-instance limiter with endpoint-specific policies.
- Residual risk: Counters are not shared across Vercel instances. Add an edge rate-limit rule after confirming the desired thresholds and Vercel cost/plan implications.

### SEC-003 — Public JSON requests were not bounded before parsing

- Severity: Medium
- Status: Fixed
- Locations: `src/lib/server/request-security.ts:100`, `src/routes/api/play-builders/+server.ts:31`, `src/routes/api/play-builders/[playId]/+server.ts:35`
- Evidence: Both write endpoints now require `application/json`, reject declared or streamed bodies over 1.6 MB, reject invalid UTF-8/JSON, send `no-store`, and validate mutation origin.
- Impact: Oversized or cross-site requests could waste memory/database work and increase abuse exposure.
- Resolution: Added streaming size enforcement, media-type enforcement, same-origin browser checks, and generic failures.

### SEC-004 — Login behavior could reveal account existence through timing

- Severity: Low
- Status: Fixed
- Location: `src/routes/admin/login/+page.server.ts:9`
- Evidence: Unknown accounts now verify against a precomputed dummy scrypt hash, and all invalid credentials receive the same public message.
- Impact: Large timing differences can help an attacker discover a valid administrator email before password attacks.
- Resolution: Equalized the expensive password-verification path and added throttling.

### SEC-005 — Administrator actions could expose raw database errors

- Severity: Low
- Status: Fixed
- Locations: `src/routes/admin/case-plays/new/+page.server.ts:45`, `src/routes/admin/case-plays/[id]/+page.server.ts:51`, `src/routes/admin/playlists/+page.server.ts:8`, `src/routes/admin/reference/+page.server.ts:15`
- Evidence: Known input failures return controlled validation messages; unexpected database failures now return a generic retry message.
- Impact: Raw ORM/database errors can disclose schema, constraint, or query details.
- Resolution: Separated expected form errors from unexpected server failures and retained server-side operational logging.

### SEC-006 — Server-side administrator inputs lacked consistent limits

- Severity: Medium
- Status: Fixed
- Locations: `src/lib/server/forms.ts:4`, administrator action files under `src/routes/admin`
- Evidence: Required/optional text now has explicit maximum lengths; identifiers, titles, edition/rule metadata, playlist size/positions, and URLs have route-appropriate limits. External film URLs must be valid HTTPS URLs.
- Impact: Browser-only constraints can be bypassed, enabling oversized or malformed database writes.
- Resolution: Centralized validation helpers and applied them to all reviewed administrator mutation routes.

### SEC-007 — Vulnerable transitive packages

- Severity: Low
- Status: Fixed
- Location: `package.json:52`, `pnpm-lock.yaml`
- Evidence: The initial audit found advisories through older `esbuild` and `cookie` transitive versions. Overrides now resolve `@esbuild-kit/core-utils` to `esbuild` 0.25.12 and `cookie` to 0.7.2. `pnpm audit --audit-level low` reports no known vulnerabilities.
- Impact: Development-server request exposure and older cookie parsing behavior could weaken the dependency baseline.
- Resolution: Pinned safe transitive versions and verified Drizzle Kit and `tsx` still start correctly.

### PRIV-001 — Public privacy disclosures omitted material operational detail

- Severity: Medium
- Status: Fixed in repository; legal validation still recommended
- Locations: `src/routes/privacy/+page.svelte:22`, `src/routes/cookie-policy/+page.svelte:18`
- Evidence: The policies now state the operator/contact, data categories, public nature of shared diagrams, purposes/legal bases, optional analytics/advertising behavior, providers and international processing, retention, local creator-token behavior, rights, complaint route, and consent withdrawal.
- Impact: Incomplete notice can prevent users from understanding processing and can fall short of transparency requirements where privacy laws apply.
- Resolution: Expanded both public policies to reflect the application's current implementation.
- Owner action: Confirm actual provider contracts, regions, retention schedules, and business facts with counsel; keep the policy synchronized whenever data collection changes.

### SEC-008 — Edit ownership token is readable by same-origin JavaScript

- Severity: Low
- Status: Accepted product risk
- Location: `src/lib/components/FlagFootballPlayBuilder.svelte:1633`
- Evidence: Per-play edit tokens are persisted in `localStorage` so a creator can refresh or return in the same browser and continue editing.
- Impact: Successful same-origin XSS or access to the browser profile could expose edit access for the user's saved diagrams.
- Existing mitigations: Svelte text escaping, server document validation, restrictive baseline CSP directives, unguessable tokens, token hashes stored server-side, and public disclosure that the credential must not be shared.
- Future option: Replace browser-readable tokens with an HttpOnly ownership session and server-side ownership records. This is a product/data migration, not a drop-in security patch.

## Verification performed

- `pnpm check`: passed with 0 errors and 0 warnings.
- `pnpm audit --audit-level low`: no known vulnerabilities.
- `pnpm exec drizzle-kit --version`: starts successfully.
- `pnpm exec tsx --version`: starts successfully.
- Client and server production compilation: passed.
- Local endpoint checks:
  - Cross-origin play creation: rejected with 403.
  - Non-JSON play creation: rejected with 415.
  - Invalid JSON: rejected with 400.
  - Request body over 1.6 MB: rejected with 413.
  - Sixth repeated invalid administrator credential attempt: throttled.
  - Administrator page: baseline headers plus `no-store` and `noindex` observed.
- Vercel adapter packaging: blocked locally after compilation by Windows `EPERM` symlink permission. Production/Linux packaging should not share that Windows-specific restriction, but the deployment build remains the authoritative verification.

## Operational follow-up

1. Have a qualified privacy attorney review the published notices and determine whether GDPR, CCPA/CPRA, or other regional laws apply to the actual business.
2. Keep a private inventory of providers, purposes, data categories, storage locations, contracts/data-processing terms, retention, and deletion procedures.
3. Configure a Vercel Firewall rate-limit rule after approving the plan/cost and thresholds; retain the application limits as defense in depth.
4. Periodically test administrator invalid-password and throttle behavior, public API content-type/size/origin rejection, dependency audit results, and production headers.
5. If a public contact, registration, upload, or other unauthenticated form is added, add endpoint-specific throttling and assess CAPTCHA/Turnstile at that time.
6. Never put confidential or personal information in shared play labels; saved diagrams are available to anyone who has the URL.

## Reference standards and official guidance

- European Commission, GDPR principles and data minimization: https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en
- European Commission, lawful grounds for processing: https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data_en
- California Civil Code § 1798.140, CCPA definitions and thresholds: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140
- California Attorney General, CCPA overview: https://oag.ca.gov/privacy/ccpa
- OWASP Application Security Verification Standard: https://owasp.org/www-project-application-security-verification-standard/
- OWASP REST Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- Vercel Firewall rate limiting: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
- Google consent mode: https://developers.google.com/tag-platform/security/guides/consent
- FTC, Children's Online Privacy Protection Rule guidance: https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-not-just-kids-sites
