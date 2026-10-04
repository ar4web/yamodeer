# YaModeer — System Review & Remediation Plan

**Review date:** 4 October 2026  
**Overall assessment:** **Not ready for production use with real employee, attendance, payroll, confidential-file, or statutory-invoice data.**  
**Review basis:** repository/source review, successful production build, dependency audits, focused ad-hoc probes, and a built-preview HTTP smoke check. The initial review was source-only; the follow-up implementation work is recorded below.

## Post-review implementation update — 4 October 2026

A first containment/regression-test patch has since been applied:

- **Production build gate:** a production build now renders a translated readiness notice instead of mounting the client-only application. Local development still opens the sample workspace. This is a deployment guard, **not authentication or authorization**; do not treat it as a substitute for the backend trust boundary.
- **Invoice containment and labels:** invoice append/emission actions are development-only; the ZATCA screen uses ordinary invoice language instead of prototype labels. The QR component no longer draws fake QR artwork when rendering fails.
- **Document HTML:** added DOMPurify with an explicit allowlist, sanitization of the dual-language print layout and pasted rich text, and a sandboxed print iframe.
- **Financial/TLV correctness:** payroll calculators reject negative/non-finite inputs; the interactive calculator inputs block negative values; VAT is rounded to halala precision; TLV tag/byte-length/hex/Base64 validation now fails closed.
- **Regression tests:** the `test` script now runs 23 Node test cases for payroll/GOSI/EOSB validation, Saudi/expat GOSI rates, VAT precision, invoice/TLV boundaries, employee-import safeguards, local API host/port validation, persistent sidebar sizing, DOCX generation compatibility, and dashboard metric calculations.
- **Dashboard redesign:** removed static snapshot totals and invented historical deltas; current workforce composition, latest recorded attendance coverage/status, pending workflows, and document renewals now derive from available records. Finance queues remain permission-gated; demo-data and persistence limitations are stated in the UI. Sales revenue/pipeline KPIs remain excluded until issued/paid invoice history and pipeline data exist.
- **Local network boundary:** the demo API is pinned to `127.0.0.1`, rejects invalid ports, and checks PostgreSQL in its health response. Vite dev/preview host checks allow the Arena `.e2b.app` preview domain rather than every Host header.
- **Repository hygiene:** added ignore rules for local environment files, dependencies, build output, npm cache, and runtime uploads while retaining the architecture rules file.

**Follow-up checks:** `npm test` passes **23/23** and `npm run build` passes. The build emits a 485.16 kB JS bundle and 38.26 kB CSS bundle. A Vite host smoke test returned 200 for `5173-test-sandbox.e2b.app` and 403 for `untrusted.example`. `npm audit --omit=dev` reports zero production dependency findings; the full audit reports five high-severity findings in Tailwind CSS 3 development dependencies (including `braces`, `chokidar`, `fast-glob`, and `micromatch`). The automated fix requires a Tailwind CSS 4 major upgrade, so no forced upgrade was applied. `nanoid@6.0.1` declares Node `^22 || ^24 || >=26` while this review runtime is Node 20.20.2; a minimal Node 20 DOCX smoke test nevertheless generated a non-empty file, but the actual browser export flow still needs testing. No browser/E2E or exploit test was run, so HTML editor/print mitigations remain in need of browser security tests.

**Still open / not solved:** production authentication and server-side RBAC; durable core-record APIs/database; server-authoritative attendance and the rejected-punch state mutation; real ZATCA signing/schema/integration; upload size/content limits and truthful SHA-256 fallback; privacy/data-flow review; PostgreSQL/API integration and full release testing. The production build gate and local network controls reduce accidental exposure; they are not a production security boundary.

### Settings navigation and dashboard widget preferences — 4 October 2026

- Replaced Settings' top segmented tabs with a responsive, keyboard-navigable in-page sidebar: Appearance, Modules, Dashboard, and Roles & access. Existing theme, geofence, module-toggle, and RBAC controls remain in their original panels.
- Added Dashboard settings for ten implemented widgets. Each has an enable switch and an empty-data behavior (hide or show an empty state); those preferences are read by the actual Dashboard render paths rather than being presentation-only controls.
- Preferences use versioned browser-local storage for this prototype. The Settings UI explicitly warns that they are not synced to a company account or other device; production-grade shared persistence still requires authenticated server storage.
- The Dashboard continues to derive metrics from the currently available records and does not fabricate historical comparisons. In the prototype, seeded data remains sample data and must not be treated as the user's imported workbook or live production data.
- Updated the workbook's `Dashboard Widgets` planning sheet to list the implemented widget IDs/defaults and clarify that workbook preferences are not imported or synced to the browser-local Settings.
- Latest verification: `npm test` passes **23/23** and `npm run build` passes. The Vite dev preview on port 5173 returned HTTP 200 and served the updated settings/widget modules and English/Arabic labels. This is an HTTP/module smoke check, not browser/E2E validation.

## Executive summary

The repository currently behaves primarily as a **client-side demo/prototype**, not a production HRMS. The highest-value release work is to establish a real identity and data boundary, persist authoritative business records on a server, make attendance decisions server-authoritative, and replace the ZATCA demo generator before enabling statutory invoicing.

### Release blockers

1. **No production authentication or trusted authorization boundary.** The active role and permission matrix live in browser state; the UI includes a route to switch to `SUPER_ADMIN`. The optional API is explicitly local-demo-only and trusts `X-Demo-Role`. The current route guard is useful presentation logic, not server-side access control.
2. **Attendance evidence and state are client-controlled.** Geofencing starts with a pre-filled “inside” coordinate/accuracy, can report verified when the geofence feature toggle is off, and only uses browser geolocation. Attendance and exception logs are in memory. A rejected punch also sets `isClockedIn` to `false`, so the failed attempt can alter displayed attendance state.
3. **Core business records are not durably stored.** Employees, vendors, invoices, and vault-file records are held in `MasterShell` React state. A refresh resets them to seed data. The optional PostgreSQL demo API serves only Work Hub, not the core HR, attendance, payroll, or invoice records.
4. **The ZATCA flow is demonstrative, not suitable for statutory submission.** It creates placeholder hashes/signatures/stamps, a fixed timestamp, and a skeletal XML preview. TLV input validation and encoding boundaries have regression coverage now, but that does not create a compliant issuer. Do not treat generated invoices or QR codes as compliant outputs.

### High-priority security and correctness risks

- **HTML/XSS mitigation still needs browser verification:** the initial review found editor HTML passed to a print iframe and custom blacklist sanitization in other layouts. DOMPurify allowlists, paste/print sanitization, and a sandboxed print iframe were added, but no browser exploit or E2E test was run.
- **Payroll/tax correctness fixes have unit coverage:** negative/non-finite payroll inputs are rejected and VAT is rounded to halala precision. This does not establish legal correctness for every employee case or effective date.
- **File handling and privacy risks remain:** general file uploads have no observed size cap or content-signature verification and duplicate the file in memory as an ArrayBuffer and data URL. Browser storage is not authenticated-user isolation or encryption. A configured mail-AI URL is not checked against an allowlist in code.
- **Automated test coverage is still incomplete:** 23 Node regression tests now cover focused domain cases; there are no browser/E2E or PostgreSQL/API integration tests. A green build/test run must not be interpreted as release or security QA.

### Positive findings

- The TypeScript/Vite production build passes; all **23** Node regression tests pass.
- The employee import flow has a 10 MiB file-size limit, preview, explicit commit, duplicate checks, and useful row-level error reporting. Focused probes confirmed that an existing employee/identity/contract and an impossible Gregorian date are rejected.
- The documented OT/GOSI example calculations passed focused probes. The standard overtime formula in the source matches the requested formula; this does not establish legal correctness for every employee case or effective date.
- Literal translation calls were checked against both dictionaries: **919 literal keys** were present in both English and Arabic dictionaries. **45 computed-key calls** remain outside that static check.
- The optional demo API is now pinned to loopback, has a production-mode guard, validates its port, checks database availability in health responses, bounds request bodies, validates snapshots, and uses parameterized SQL. Those are useful demo safeguards; they do not make it a production API.
- Vite host checks reject arbitrary Host headers while allowing the `.e2b.app` preview domain. `npm audit --omit=dev` reports no production dependency findings; the full audit reports five high-severity findings in development dependencies.

## Scope, method, and confidence

The review used the repository’s available `archify-review` skill and its evidence/value/cost/impact approach. I did not find a repository skill named “Superpower.” Source findings below identify the relevant file/line range so they can be checked directly.

Review covered the UI shell, RBAC/geofencing context, employee import, document/file handling, ZATCA/compliance, calculators, persistence, mail-AI configuration, local demo API, dependency scripts, and available tests. Findings are classified as:

- **P0 — release blocker:** resolve or explicitly remove/disable the affected capability before using it with real operational or statutory data.
- **P1 — high:** fix before production data or as part of the first security/correctness release.
- **P2 — medium:** production hardening, reliability, and maintainability work.

This is a **source-level engineering review**, not legal advice, a PDPL certification, a browser exploit demonstration, a penetration test, or a review of an actual deployed environment. Where an issue depends on configuration or deployment, that condition is called out.

## Initial review test and verification results (before the follow-up patch)

| Check | Result | What it establishes / does not establish |
|---|---|---|
| `npm run build` | **Pass** | TypeScript project build and Vite production bundle complete. Vite reports large chunks, including an approximately 940 kB ExcelJS chunk and an approximately 995 kB JS chunk. No browser workflow is exercised. |
| Built-preview HTTP smoke check | **Pass** | The built preview returned HTTP 200 and the YaModeer document title. This is an HTTP smoke check, not UI/E2E validation. The preview server was stopped after the check. |
| `npm test` / package scripts | **Not available** | `package.json` has no test script and no test files/framework were found. The command therefore cannot run a project suite. |
| Full dependency audit | **Five high findings, dev dependencies** | Review and update compatible development dependencies; do not blindly take a breaking major upgrade. |
| Production dependency audit (`npm audit --omit=dev`) | **Zero reported findings** | A point-in-time package audit only; it does not test application security or indirect runtime exposure. |
| Focused calculator/TLV probes | **Mixed** | Standard OT/GOSI examples passed. A negative 8-hour OT input produced **−SAR 1,200** at SAR 24,000 basic salary; negative SAR 1,000 basic salary produced **−SAR 100** employee GOSI. A 256-byte TLV value advertises only `0x10` bytes in its one-byte length field; malformed hex `GGGG` silently encodes as Base64 `AAA=`. |
| Focused employee-import probes | **Pass** | Existing employee/identity/contract duplicates and an impossible date (`2030-02-30`) were rejected. This is not a complete import fuzz or decompression-bomb test. |
| Localization AST scan | **Partial pass** | 919 literal translation keys matched both language dictionaries; 45 computed-key calls were not statically verified. No visual Arabic/RTL browser test was run. |
| Browser/E2E/security tests | **Not run** | No browser automation package or browser binary was available. No browser exploit, full workflow, or penetration test was performed. |
| PostgreSQL/API integration | **Not run** | Docker CLI was unavailable, so the optional local database/API integration was not started. The API was source-reviewed only. |

## Prioritized findings

### P0 — Release blockers

#### YMD-01 — Client-controlled roles are not authorization

**Severity:** Critical if exposed to real data  
**Value / cost / impact:** Very high value; high implementation cost; protects every tenant and privileged operation.

**Evidence:**

- `src/context/RBACGeofenceContext.tsx:462–466` initializes `currentRole` to `SUPER_ADMIN` and keeps the permission matrix in React state.
- `src/components/MasterShell.tsx:165–224` performs route gating in the client; its unauthorized fallback includes a button that calls `setCurrentRole("SUPER_ADMIN")` at line 216.
- `src/modules/MasterSettingsModule.tsx:658` changes permission cells in local state.
- `src/context/WorkHubContext.tsx:256,285–289` sends the selected role in `X-Demo-Role`.
- `backend/server.mjs:15–20,107–113` explicitly identifies itself as local-demo-only and accepts an allowed caller-provided demo role.

**Impact:** Anyone who can modify browser state or requests can bypass a client-side role matrix. A future production endpoint must not infer identity or permissions from this UI state/header. The repository’s API guard is a positive control for the demo, but the real production authorization service is absent.

**Implementation:** Add a real identity provider (OIDC/SAML as appropriate) and a server-validated session or token. Derive user, tenant, and roles only from that authenticated identity. Authorize **every API operation** server-side with deny-by-default role/action/object checks; enforce tenant ownership in queries or database row-level controls. Make the UI role matrix a view/configuration of server-authoritative policy, never the policy itself. Remove role-switch controls and `X-Demo-Role` from production builds. Add API integration tests for anonymous access, privilege escalation, cross-tenant object IDs, and every sensitive action.

**Acceptance test:** A user cannot gain privileges by changing React state, URL, request body, headers, local storage, or object identifiers; denied operations return 401/403 and create no state change.

#### YMD-02 — Attendance is not a trusted record, and rejected punches mutate state

**Severity:** Critical for real attendance/payroll  
**Value / cost / impact:** Very high; medium/high effort; affects payroll, disputes, and audit credibility.

**Evidence:**

- `src/context/RBACGeofenceContext.tsx:493–503` starts with a fixed Riyadh coordinate and 6 m accuracy, with `isClockedIn` initialized in browser memory.
- `src/context/RBACGeofenceContext.tsx:559–576` treats disabled geofencing as `VERIFIED_INSIDE_ZONE`.
- `src/context/RBACGeofenceContext.tsx:686–702` obtains coordinates only from browser geolocation and, on failure, selects a preset coordinate; no server freshness proof is shown.
- `src/context/RBACGeofenceContext.tsx:704–727` creates a client-side log. If the verification fails, line 725 sets `isClockedIn(false)` before returning `allowed: false`.

**Impact:** Browser coordinates can be stale or spoofed; a client can modify the verifier, toggle, coordinate, or request. A failed punch can change the displayed clock state. Punches and logs disappear when the client state resets. Browser geolocation alone cannot prove physical presence.

**Implementation:** Move punch authorization and state transitions to an authenticated server service. Require a fresh, timestamped location fix with accuracy ≤15 m, office ID, user/session binding, nonce/idempotency key, and server-computed distance; record the raw evidence and decision append-only. Reject stale/low-accuracy/out-of-radius fixes without changing attendance state. Treat geofencing as risk evidence, not unspoofable proof; if stronger assurance is needed, use managed-device controls/attestation and a documented exception path. Never let a feature flag in the client bypass server policy. Preserve KSA labor review, corrections, supervisor approval, and immutable audit history.

**Acceptance test:** Attempted blocked punch leaves both persisted and displayed attendance unchanged; duplicate requests are idempotent; missing, stale, inaccurate, forged, and outside-radius fixes are rejected and logged; geofence configuration changes require authorized server-side permission.

#### YMD-03 — Core HR and statutory records are in-memory demo state

**Severity:** Critical for production operations  
**Value / cost / impact:** Very high; high effort to introduce a proper service/data layer; prevents lost or inconsistent employee, invoice, and file records.

**Evidence:** `src/components/MasterShell.tsx:265–276` initializes employees, vendors, invoices, and vault files from blueprints with React `useState`. Child modules update these state values, but the repository’s only optional PostgreSQL endpoint is Work Hub (`src/context/WorkHubContext.tsx:246–300`, `backend/server.mjs:238–260`). No core employee, attendance, payroll, invoice, or file API is wired in the inspected client code.

**Impact:** Changes such as adding/importing employees, issuing an invoice, or uploading a file are lost on refresh/restart. Concurrent users have no authoritative shared record. This is a functional and data-integrity blocker even if the UI looks complete.

**Implementation:** Define server-owned domain APIs and a migration-backed relational schema for employee records, attendance events, payroll inputs/calculations, invoices, and file metadata. Use database transactions, tenant-scoped constraints, optimistic concurrency/versioning, idempotency keys for writes, append-only audit events for statutory changes, backups, restore tests, and retention rules. Keep mock/demo data behind a development-only feature flag and visibly separate it from production data. Do not silently fall back to browser storage for a failed business-data write.

**Acceptance test:** A committed employee/import, punch, and invoice survives reload, a second authenticated session, and service restart; concurrent edits produce a conflict instead of silent overwrite; a failed write is visible and recoverable.

#### YMD-04 — ZATCA generator uses placeholders and is not a compliant invoice issuer

**Severity:** Critical for statutory invoicing  
**Value / cost / impact:** Very high regulatory/financial impact; high effort; can be mitigated immediately by disabling issuance until implemented.

**Evidence:**

- `src/modules/ComplianceZatcaModule.tsx:225–245` creates a fixed timestamp (`2026-10-02T14:20:00Z`) and strings such as `sha256_icv_…`, `ECDSA_SIG_ICV_…`, and `CSID-PROD-KSA-…` rather than calculating/signing a real invoice.
- Lines 279–284 generate a constructed UUID and Base64-encode those placeholder strings as the cryptographic hash/signature.
- Lines 1116–1152 render a skeletal UBL-like XML preview; there is no observed schema/business-rule validation or submission/clearance/reporting integration.
- The TLV helper at `src/data/mockBlueprints.ts:517–525` does not enforce the one-byte length limit or reject invalid input. The focused probe showed a 256-byte field is decoded as 16 bytes and malformed hex is silently converted to a Base64 payload.
- `src/modules/ComplianceZatcaModule.tsx:65–79` draws a patterned canvas if QR generation throws; that pattern is not a valid QR code.

**Impact:** A plausible-looking QR, hash, signature, CSID stamp, or XML preview can be mistaken for a legally issued/compliant invoice. It can fail validation, break invoice-chain integrity, and create incorrect records. The review did not submit invoices to ZATCA or certify legal compliance.

**Implementation:** Either disable production invoice issuance and label the screen as a non-issuance demo, or implement against the applicable ZATCA UBL 2.1 schema, business rules, security standard, and integration-phase workflow. Compute the actual invoice hash over the canonical required representation; sign with a protected private key/certificate service (HSM/KMS or approved secure signer), never ship private keys to the browser; maintain durable ICV/PIH state and retry/idempotency; validate XML against the applicable schema and business rules before submission. Encode/decode TLV as bytes with strict tag, UTF-8/byte-length, hex, and 0–255 length validation; render a clear “QR unavailable” error instead of fake QR artwork. Add Tag 9 only for simplified tax invoices and their associated notes where required; the requirement is not universally nine tags. Use integer halala/decimal arithmetic with documented rounding rules. Test using official ZATCA conformance fixtures/sandbox and have the responsible Saudi tax/compliance specialist sign off.

**Acceptance test:** No invoice can be marked issued or exported as compliant unless required UBL validation, correct cryptographic signing, QR/TLV validation, durable counter/hash-chain rules, and the relevant sandbox/integration workflow succeed. Invalid QR payloads fail closed.

### P1 — Fix before production data or first secure release

#### YMD-05 — Dual-language document printing has an unsanitized `srcdoc` sink

**Severity:** High (source-level; exploitability not browser-tested)  
**Value / cost / impact:** High value; low/moderate implementation cost; a crafted document may execute active content in a same-origin unsandboxed frame.

**Evidence:** `src/modules/DocMakerModule.tsx:911–934` sanitizes content for stacked/English-only/Arabic-only layouts, but the dual-column branch at lines 931–934 inserts `contentRef.current[lang]` directly. The generated document is assigned to `frame.srcdoc` at line 959; the iframe is created without a `sandbox` attribute at lines 943–949. The editor reads `innerHTML` at lines 1082–1114. The custom sanitizer at lines 247–264 is a blacklist and also returns input unchanged if `DOMParser` is unavailable.

**Impact:** If hostile HTML is pasted or imported and printed in the dual-language layout, event handlers or other active markup may execute in the unsandboxed `srcdoc` frame. Same-origin script execution could expose app-accessible browser data. This path was identified by source inspection; no payload was run in a browser.

**Implementation:** Use a maintained HTML sanitizer such as DOMPurify with a narrowly defined allowlist and safe URL-protocol policy. Sanitize immediately before **every** HTML sink, including every print layout and imported document. Prefer a structured document model over storing arbitrary HTML. Add an iframe `sandbox` with only the minimum needed permissions; avoid granting same-origin/script access together unless justified. Consider a restrictive production CSP and Trusted Types. Keep user text escaped and block remote image/style URLs if not required.

**Acceptance test:** Pasted/imported `<script>`, event-handler attributes, SVG payloads, `javascript:` URLs, malformed markup, and external resource URLs cannot execute or leak information in every print layout; legitimate formatting still prints.

#### YMD-06 — Financial calculators accept invalid values; VAT loses halala precision

**Severity:** High for payroll/tax calculations  
**Value / cost / impact:** High; moderate cost; can produce negative or incorrect payroll/tax outputs.

**Evidence:** `src/data/mockBlueprints.ts:65–99` applies the standard OT formula but has no input guards. Lines 116–142 compute GOSI contributions without rejecting negative wage bases. Probes confirmed negative outputs. In `src/modules/ComplianceZatcaModule.tsx:225–228`, VAT is `Math.round(subtotal * 0.15)`, which rounds to whole SAR even though the input is an unrestricted number field and totals display decimals.

**Impact:** Negative hours/salary, `NaN`, infinity, extreme values, or fractional-SAR invoices may produce nonsensical amounts. The normal formula examples passing does not cover payroll eligibility, caps, leave, allowances, date ranges, or legal exceptions.

**Implementation:** Validate all numeric inputs at UI and server boundaries: finite, nonnegative, and within documented domain limits. Reject invalid requests rather than silently coerce them to zero. Use integer halala or a decimal arithmetic library; apply documented per-line/per-invoice rounding once at the correct statutory stage. Version statutory rates and effective dates, record the inputs/rule version used, and require legal/payroll owner review. Add property/boundary tests for negative, zero, max, fractional, non-finite, and effective-date cases.

**Acceptance test:** Invalid inputs return a localized validation error and never produce/post a payroll amount; representative whole- and fractional-SAR invoice totals match approved expected results to halala precision.

#### YMD-07 — General uploads are unbounded and integrity metadata can be false

**Severity:** High (availability/integrity), medium (data exposure)  
**Value / cost / impact:** High; moderate effort; protects user browsers and file integrity claims.

**Evidence:** `src/modules/FilesManagerModule.tsx:170–208` reads any selected file fully into an `ArrayBuffer`, then again as a data URL, with no observed file-size cap or content-signature check. Unknown extensions are retained as generic `FILE`. `src/modules/DocMakerModule.tsx:627–648,1005–1015` imports office files/Excel workbooks and image data without an observed general size cap. Employee imports do cap the upload at 10 MiB (`EmployeeModule.tsx:82,513`), but XLSX is decompressed/loaded at `employeeImport.ts:202` before the row-count limit at line 327. In Files Manager, if Web Crypto is unavailable, the digest is a size/extension placeholder (`FilesManagerModule.tsx:176–183`) but is still displayed as a SHA-256 short hash and included in a manifest labeled “SHA-256 Integrity” at line 217.

**Impact:** Large/malicious files or highly compressed XLSX files can consume memory and freeze/crash a browser. Extension-only assumptions do not establish file type. A placeholder digest must not be relied upon as integrity evidence.

**Implementation:** Add per-format size limits before reading; check MIME and file signatures; allowlist only needed formats; parse office formats in a worker or isolated backend with decompression/resource limits; surface parser failures clearly. Store files server-side in private object storage with authorization, malware scanning/quarantine as appropriate, generated names, encryption at rest, retention/deletion, and audit logs. Only label a digest SHA-256 when an actual hash operation succeeded; otherwise show “not calculated.” Treat user-supplied file names as untrusted display text.

**Acceptance test:** Oversized, renamed, malformed, and decompression-heavy files fail safely without freezing the UI; accepted file hashes match an independent SHA-256; digest failure is never reported as an integrity hash.

#### YMD-08 — Browser storage and configurable integrations need a data-protection boundary

**Severity:** High before handling personal/confidential data  
**Value / cost / impact:** High; medium/high architecture cost; impacts confidentiality, retention, access, and PDPL governance.

**Evidence:** Mail and collaboration contexts persist role-keyed records in `localStorage` (`MailContext.tsx:233–268`; `CollaborationContext.tsx:251–283`); Work Hub also persists locally (`WorkHubContext.tsx:204–244`). Role keys are not authenticated-user isolation. The theme loader merges arbitrary parsed JSON into preferences (`ThemeContext.tsx:323–328`) rather than validating a versioned schema. `src/services/mailAi.ts:12–15,65–74` accepts any non-empty configured `VITE_MAIL_AI_ENDPOINT` and posts message subject/body/sender data with `credentials: "include"`; the source comment describes an approved/same-origin endpoint, but no allowlist check is implemented. `index.html:7–12` loads Google Fonts from third-party origins.

**Impact:** Same-profile access and same-origin script can access localStorage; browser storage has no server-side identity/retention controls. A misconfigured AI endpoint can receive message content and browser credentials permitted for its origin. External fonts disclose ordinary connection metadata such as IP address/user-agent to the font provider. PDPL applicability and cross-border transfer assessment depend on actual processing and deployment, not merely a hosting-region label.

**Implementation:** Keep authoritative personal data on authenticated server APIs; store only necessary low-sensitivity preferences in browser storage. Use schema-versioned parsing and migrations. Enforce a server-side allowlist/proxy for AI providers; do not send employee/email content without a documented purpose, approved processor, appropriate notice/consent where applicable, minimization/redaction, retention controls, and transfer assessment. Self-host fonts if appropriate. Complete a data inventory, classification, retention schedule, access/deletion workflow, incident plan, processor agreements, and a PDPL review before real data is loaded. This review is not a legal determination.

**Acceptance test:** Unauthorized browser profiles cannot access another user’s records; stale/corrupt local state is safely migrated/reset; unapproved outbound endpoints are rejected; sensitive data flows are documented and covered by privacy/security tests.

### P2 — Production hardening and operational quality

#### YMD-09 — Demo/runtime configuration must remain isolated from production

**Severity:** Medium; configuration-dependent  
**Value / cost / impact:** Moderate value; low/moderate effort; reduces accidental exposure during deployment.

**Initial evidence / current status:** the initial review found that `API_HOST` could override the backend’s loopback default and Vite used `allowedHosts: true`. The follow-up patch now hard-pins the API to `127.0.0.1`, validates `API_PORT`, and restricts Vite dev/preview Host checks to `.e2b.app`; a smoke test accepted the preview host and rejected an unrelated host. The optional API still has no production authentication by design, and the sandbox allowlist is not a production edge control.

**Implementation:** Keep Vite dev/preview and the demo API out of public production deployments. Use an explicit production reverse proxy/API gateway with TLS, exact host/origin allowlists, security headers (CSP, HSTS, frame policy, referrer policy, MIME sniffing protection), rate limits, request validation, and centralized logs. Keep demo credentials and fake-data flags in non-production environments only; add a CI check that prevents demo flags and `X-Demo-Role` code paths from shipping in production.

**Acceptance test:** Production artifact/config fails closed if demo mode, demo roles, or a development server is enabled; deployment scan verifies headers, TLS, and allowed origins.

#### YMD-10 — Automated quality gates are missing and bundle/dependency maintenance needs a plan

**Severity:** Medium  
**Value / cost / impact:** High cumulative value; low initial test-framework cost; improves regression detection across legal arithmetic, RTL, and security fixes.

**Evidence / current status:** the initial review had no test script or test suite. The follow-up adds 23 passing Node regression tests, including dashboard metric calculations, continuous sidebar-width persistence, and a minimal DOCX generation smoke test, but browser/E2E and PostgreSQL/API integration coverage remain absent. Full `npm audit` reports five high-severity **development dependency** findings in the Tailwind CSS 3 toolchain; `npm audit --omit=dev` reports zero. npm reports the automated fix only through the Tailwind CSS 4 major upgrade, so it was not forced without a compatibility migration. The latest build emits a 485.16 kB JS bundle and a 38.26 kB CSS bundle. `docx@9.8.1` resolves `nanoid@6.0.1`, which declares Node `^22 || ^24 || >=26`; this review ran on Node 20.20.2. A minimal `Packer.toBuffer` DOCX smoke test passed on Node 20, but the UI’s actual browser export flow still needs an E2E test.

**Implementation:** The focused Node unit/regression layer is now present (23 passing tests for payroll/GOSI/EOSB/VAT/TLV/import, dashboard metric calculations, local API config, persistent sidebar sizing, and DOCX generation). Remaining: wire CI; add API authorization/tenant integration tests; component tests for import preview/explicit commit and geofence outcomes; browser E2E for English/Arabic RTL, critical HR workflows, and accessible keyboard controls; security regression tests for XSS/uploads. Pin and update dependencies through a reviewed lockfile PR; fix compatible dev advisories and document exceptions. Do not force Tailwind CSS 4 without a compatibility migration. Lazy-load route-specific modules and isolate ExcelJS/import parsing from the initial bundle. Pin a supported Node version and test the dynamic DOCX path in the actual target runtime.

**Acceptance test:** CI runs the unit/integration/E2E layers on every change, captures build/audit results, enforces a documented chunk budget, and fails on unreviewed critical/high runtime advisories.

## Ordered remediation plan

1. **Immediate containment:** keep the product in demo-only mode; do not load real employee data or issue statutory invoices. Disable/rename the invoice “emit” action so it cannot be mistaken for compliant issuance. Keep the demo API on loopback and never deploy Vite preview as a production server.
2. **Choose the production trust boundary:** select identity provider/session model, tenant model, API framework, database, file storage, hosting region, and privacy/processors. Threat-model RBAC, attendance, email/AI, documents, and invoices.
3. **Build the authoritative backend:** authenticate every request; implement server-side role/action/object and tenant checks; add migrations, audit trail, transactions, idempotency, backups, restore tests, and core HR APIs. Remove client role switching from production.
4. **Fix attendance before payroll integration:** server-authoritative state machine; fresh accuracy-checked fix; immutable evidence/audit trail; no client bypass; blocked punches leave persisted state unchanged; documented exception approvals.
5. **Resolve XSS and file risks:** replace the blacklist sanitizer, sanitize every HTML sink, sandbox print frames, bound/validate uploads, isolate parsers, and stop presenting fake hashes as SHA-256.
6. **Implement or defer ZATCA properly:** schema/business-rule validation, actual signing/hash-chain/certificate workflow, correct decimal calculations and TLV handling, valid QR generation, durable ICV/PIH, sandbox tests, and business/legal approval. Until then, clearly mark all artifacts as samples and do not export/submit them as real invoices.
7. **Harden calculations and privacy:** server-side input validation, halala-safe arithmetic, effective-dated statutory rules, privacy inventory/retention/processor review, approved AI endpoint policy, and secure storage.
8. **Add release gates and performance work:** unit/API/E2E security and RTL tests; dependency updates; Node-version pinning; route-level lazy loading; deployment headers and configuration checks.

## Minimum release acceptance checklist

- [ ] Every production route/API requires authenticated identity; authorization is checked server-side and tenant/object scoped.
- [ ] Role switching and demo-role headers are absent from production artifacts.
- [ ] Employee, attendance, payroll, file, and invoice records persist transactionally on the server with backups and restore verification.
- [ ] A rejected attendance punch cannot modify attendance; stale/low-accuracy/out-of-radius fixes are rejected and audited.
- [ ] Hostile HTML cannot execute in editor, import, preview, or print; every HTML sink is sanitized and print frames are sandboxed.
- [ ] Upload format/signature/size/resource limits are enforced before expensive parsing; file access and retention are authorized; hash labels are truthful.
- [ ] Payroll and tax arithmetic validates finite nonnegative inputs, preserves halala precision, and passes approved effective-date/boundary tests.
- [ ] ZATCA output passes applicable schema/business-rule and sandbox/integration validation with genuine cryptographic signing; fake/demo artifacts cannot be represented as issued invoices.
- [ ] English and Arabic RTL workflows pass browser tests; all literal and computed translations are verified.
- [ ] Production data flows, processors, retention, and cross-border processing have documented security/privacy approval.
- [ ] CI runs unit, API integration, browser/E2E, security regression, dependency audit, and production build checks.

## External guidance referenced

- [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard) — application security verification baseline.
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — authorize every request; least privilege and deny by default.
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) — maintained sanitization for user-authored HTML and safe handling of sinks.
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) — allowlists, signature/content validation, size limits, authorized storage, and scanning.
- [ZATCA E-Invoice Security Features Implementation Standards v1.2](https://zatca.gov.sa/ar/E-Invoicing/SystemsDevelopers/Documents/20230519_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards_vF.pdf) — cryptographic-stamp/signature requirements and QR TLV fields; Tag 9 applies to simplified tax invoices and associated notes, not universally to every invoice.
- [ZATCA E-Invoice XML Implementation Standard](https://zatca.gov.sa/ar/E-Invoicing/SystemsDevelopers/Documents/20230519_ZATCA_Electronic_Invoice_XML_Implementation_Standard_%20vF.pdf) — UBL 2.1/schema and business-rule validation requirements.
- [SDAIA guide to the Saudi Personal Data Protection Law](https://dgp.sdaia.gov.sa/wps/wcm/connect/f579bc32-fda8-47bd-bc6f-66b8cb77985c/ENG-Guide+to+the+saudi+PDP+law+for+controllersprocessors.pdf?MOD=AJPERES) — scope and cross-border processing considerations; this report is not a legal compliance determination.
