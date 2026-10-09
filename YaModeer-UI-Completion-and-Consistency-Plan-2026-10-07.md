# YaModeer — UI Completion & Consistency Plan

**Prepared:** 7 October 2026  
**Scope:** Existing product UI, route completion, visual consistency, and final QA.  
**Guiding rule:** Improve the current YaModeer experience without replacing user-selected palettes, breaking English/Arabic direction, changing permissions/navigation behavior, or presenting local/demo data as live.  
**Progress:** Steps 0–6 are complete as source/build/test passes. The Dashboard visualisation and widget-access follow-up is implemented. A limited provider-neutral auth/authorization seam and deny-by-default tests have also been added; there is still no production identity adapter, API, database migration, or real-data path. The Employee Actions hub is now implemented with preserved permission gates and distinct CSV/XLSX workflows. Current integrated checks pass (`npm run build`, 80 tests, `git diff --check`). Step 7 production workflows remain gated on outstanding security/product decisions; Step 8's browser-level visual and interaction review remains pending because no browser tooling is installed in this workspace.

## What the initial source audit found

### Existing UI coverage

The app already has a shell and 14 route keys. Several are combined into one visible route or implemented as tabs/subviews rather than separate menu pages.

| Area | Current entry | Source-level status / review focus |
|---|---|---|
| Dashboard | Dashboard | Existing role-specific views and KPIs; verify hierarchy, data states, and consistency with the shared metric system. |
| People | Employees | Directory plus payroll, attendance, performance, transfers, requests, and onboarding tabs. Some data comes from synthetic blueprints or a manually imported partial roster; real HR/payroll persistence is not established. |
| Vendors | Vendors | Existing ledger, onboarding, and pipeline; verify actions, filters, empty/error states, and data provenance. |
| Invoices | Invoices | Practical bilingual draft/review flow is present. Client/PO records are sample data; drafts are in app memory; no invoice is issued or sent to ZATCA. |
| Expenses | Expenses | Existing claims workflow; verify decision states, permissions, calculations, and persistence boundary. |
| Accounting | Accounts | Existing chart of accounts, journal, VAT, and payment views; verify totals, validation, and seeded/local data boundaries. |
| Compliance | Compliance/ZATCA | Labor-law and invoice/TLV-related screens exist; do not imply production ZATCA submission or legal sign-off. |
| My Work + Workspace | Work Hub / Workspace | Work Hub is served through Work Suite; Workspace is a subview. Work Hub can use an optional local API but also supports browser storage/fallback; other collaboration state is local/demo. |
| Mail + Chat | Mail / Chat | UI and workflows exist; verify provider/integration boundaries and clearly distinguish demo/local actions from real messages. |
| Files | Files Manager | Current vault data is local app state; secure server-side file storage is not established. |
| Documents | Doc Maker | Editor and exports exist; review saved-style persistence, import/export states, and responsive document preview. |
| Settings | Settings | Theme, modules, dashboard widgets, and RBAC views exist; UI role switching is not production authorization. |

### System-level consistency issues to fix first

- A palette-derived **accent token already exists**, but accent is not a dependable page-level hierarchy cue. Do not force a single hard-coded brand color; consistently use the accent chosen by the user's active palette.
- Shared components are present, but their treatments drift: metric cards have no border and lift on hover; the common table frame has no outline; several pages use different surface levels and control treatments.
- `tailwind.config.js` currently sets every border radius (including `rounded-full`) to `0px`, even though the UI uses many rounded classes. `ThemeCustomOverrides.borderRadiusScale` is also defined but not applied. This makes source-level component intent and actual rendered shape disagree.
- The application has light, dark, and high-contrast themes and multiple palettes. Surface roles must remain deliberate and consistent within each mode; do not mix one-off colors into page components.
- Browser tooling is not installed in the current workspace. Build, tests, contrast calculations, and source review are available; exact screenshot/pixel verification must be done in a browser preview when tooling is available or by using the user's preview feedback. No visual/browser check will be claimed unless performed.

## Design acceptance criteria

1. **Professional and calm:** compact hierarchy, restrained accent, predictable spacing, and no playful motion or decorative color overload.
2. **One visual system:** one shared page heading, surface/card, metric, button, form control, table, badge, and modal treatment. Exceptions require a clear workflow reason.
3. **Palette respect:** accent and primary colors come from the user's current palette/custom settings. Semantic success/warning/danger colors are reserved for actual statuses and alerts.
4. **Mode respect:** canvas, surface, elevated surface, and borders have consistent roles in light, dark, and high-contrast modes.
5. **Bilingual and responsive:** English LTR and Arabic RTL; desktop and narrow/mobile layouts; no clipped actions, values, tables, or navigation.
6. **Operational clarity:** every data-dependent page shows honest loading, empty, error, permission, and sample/local states; never claim an operation happened if it did not.
7. **Keyboard/accessibility:** semantic controls, visible focus, accessible tables/dialogs, sensible reading order, and contrast checks for text and controls.
8. **Production boundary:** do not connect real employee/client data, credentials, payments, or ZATCA issuance until identity provider, tenant model, hosting/data region, and server-side authorization decisions are made.

## Build sequence

### Step 0 — Inventory and protect user requirements — **done**

- Map routes, subviews, data provenance, and the shared design tokens.
- Use a persistent app-wide sidebar at every viewport: a compact 80 px icon-and-label rail below 1024 px and the saved/resizable, labeled desktop sidebar at 1024 px and wider.
- Preserve the invoice decision: practical drafting/review workflow, not recurring billing.
- Keep synthetic/local data clearly distinguished from production data.

**Exit:** this plan records current coverage and system boundaries.

### Step 1 — Shared visual foundation — **first pass complete; browser review pending**

- Added a restrained page-title accent cue that follows the active user palette.
- Standardized shared metric cards, table frames, buttons, and form controls with deliberate surface borders; removed the metric-card hover lift.
- Replaced the broken all-zero radius mapping with a restrained 2–12 px scale (pills remain circular) and bounded/applied the existing radius override.
- Kept semantic status colors separate from the palette accent.
- Added three radius/theme regression tests. `npm run build` passed and `npm test` passed 38/38.

**Remaining:** browser-level review across modes, palettes, widths, and English/Arabic; then migrate the next page group. The current sandbox has no installed browser automation, so no screenshot/pixel claim is made.

### Step 2 — Shell and Dashboard — **first pass complete; browser review pending**

- Kept navigation groups labeled for assistive technology, then removed the visible category headings at the user’s request to reduce sidebar height; tightened group spacing while preserving the app-wide sidebar on desktop and mobile. The mobile bottom bar/More drawer was subsequently removed in favor of a persistent 80 px icon-and-label rail below 1024 px. Global search and header/footer boundaries use shared styling. The user requested search controls at 25% width (not 25% narrower): they use a quarter-width desktop layout with practical minimums and remain wider on smaller screens.
- Moved Dashboard KPI cards onto the shared metric primitive; removed its decorative gradient and hover lift. After preview feedback, capped Dashboard content at a centered max-width, used two-column KPI grids on wider screens, and introduced a quieter shared surface variant with fewer nested outlines. The roster filter/actions keep shared controls.
- Preserved role-based views, data provenance notices, widget settings, and existing route behavior.
- Pinterest reference follow-up (2026-10-08): refined the global shell and Dashboard toward a monochrome, dark data-first visual. The default/reset palette is now soft charcoal; existing saved palette choices are preserved. The sidebar uses quieter active rows and section dividers; Dashboard KPI/chart panels use thin borders, neutral icons, and theme-derived grayscale chart shades. Semantic prototype/privacy and warning/success copy remains, and no historical trends are fabricated.
- Dashboard follow-up (2026-10-08): measured the existing CSS layout before changing visualizations. The dashboard remains capped at 1152 px; KPI cards use one column until `md`; workforce status/nationality cards pair only at `xl`; the department/attendance pair keeps a 320 px minimum for attendance. CSS-derived content-width estimates are 1152 px at a 1440 px viewport, about 1040 px at 1280 px, 784 px at 1024 px, and 358 px at 390 px (default 176 px sidebar and existing shell gutters). Settings cards remain one column below `xl`; at `xl` they are about 450 px each at 1440 px, 370 px at 1280 px, and one 496 px column at 1024 px. These are layout estimates, not browser pixel measurements.
- Replaced the workforce-status, nationality, and attendance donut charts with responsive segmented distribution bars, semantic theme colors, totals, per-segment counts/percentages, accessible labels, and honest zero-data states; retained the existing department composition view.
- Grouped widget controls into Workforce, Attendance, and Workflows, labeled their data-access requirements, and added bilingual role/prototype-boundary copy. Audited and preserved the existing route and global-toggle gates; only Super Admin retains widget/roster administration. Partial-roster CSV/TXT is parsed in the browser; employee row values remain in React memory only (not localStorage or a database). Dashboard uses aggregates, and the optional dev-preview endpoint returns aggregate counts only and must not receive rows. No production authorization or persistence was added.
- Added Dashboard source and RBAC regression coverage. Latest integrated `npm run build` passes, `npm test` passes 64/64, and `git diff --check` passes.

**Remaining:** screenshot, keyboard, RTL, and breakpoint review in a real browser. No pixel-level visual verification is claimed from this source-only pass.

### Step 3 — People workflows — **first pass complete; browser review pending**

- Standardized employee directory filters, onboarding inputs, analytics panels, and partial-roster search/forms on shared controls and surfaces.
- Reworked the attendance geofence panel to follow the selected page theme rather than using the dark sidebar palette; aligned verification status and action button with semantic colors/shared controls.
- Kept the partial-roster warning, sensitive-data fields, table caption, and summary-only distinction visible. Existing calculations, permissions, routes, and persistence were not changed.
- `npm run build` passed and `npm test` passed 44/44.

**Remaining:** review directory, attendance, payroll, onboarding, requests, transfers, and performance at real breakpoints and in RTL. This source-only pass does not claim browser, keyboard, or pixel verification. Payroll remains sample/basic-salary-derived and must not be presented as a complete payroll source.

### Step 4 — Finance and compliance — **first pass complete; browser review pending**

- Standardized vendor/expense filters and entry fields, accounting/compliance panels, and journal inputs on shared form/surface primitives. Reused compact semantic success/danger buttons for expense settlement and people/finance approvals.
- Added the same bilingual prototype notice to Vendors, Expenses, Accounting, and Compliance: figures are illustrative, actions remain local, and no ERP, bank, payment, or ZATCA service is connected. Invoices retain their specific draft/data notice.
- Removed production-looking ZATCA sample identifiers (`CSID-PROD` → `CSID-DEMO`) and replaced “live/sign/issue” builder copy with an explicit local preview flow. No ZATCA issuance or financial integration is claimed.
- Existing calculations, permissions, routes, and invoice-vs-receipt separation were preserved. `npm run build` passed and `npm test` passed 48/48 in the initial pass.
- Compliance usability follow-up (2026-10-08): separated the two workflows into dedicated tabs, shortened calculator and ZATCA labels in English/Arabic, arranged the calculators in a more readable two-column layout, and made the EOSB comparison optional. ZATCA now opens with a sample-invoice summary; the full bilingual preview, QR, TLV and cryptographic details are available on demand, and remain expanded when reached from a selected invoice. Explicit semantic foreground/background pairs are used for warning and primary surfaces; QR rendering remains dark-on-white for scanner contrast. Calculations and invoice behavior were preserved.
- Added `tests/ui-compliance-redesign.test.mjs`. The latest `npm run build` passed, `npm test` passed 60/60, and `git diff --check` passed.

**Remaining:** walk the entire vendor → expense → invoice → accounting → compliance journey in a browser, including Arabic/RTL, empty data, approvals, and responsive tables. This source-only pass does not claim visual or interaction verification.

### Step 5 — Work and communication — **first pass complete; browser review pending**

- Kept Work Hub's storage-state notice and standardized its filters, form controls, and key panels. Workspace now displays a visible localized **Local demo** notice for browser-stored sample data and uses shared controls in its forms.
- Reused the shared prototype notice on Chat, retained Mail's local compose/send and provider-security notices, and marked the Call Room demo notice as a semantic note. The hang-up action uses the shared semantic-danger button style.
- Kept messaging, task, project, and meeting storage/provider behavior unchanged; no real-time sync or media service was added or implied.
- Follow-up after preview feedback: the Chat contact list now has a responsive 240–320 px desktop pane, more compact rows and filters, fewer row outlines, and presence dots that reflect direct-contact status. Mobile list/detail switching remains unchanged.
- `npm run build` passed and `npm test` passed 57/57.

**Remaining:** validate browser behavior for switching Work Hub/Workspace, narrow message panes, Arabic/RTL, focus handling, and mail/provider/demo flows. No browser interaction or pixel-level verification is claimed.

### Step 6 — Files, Doc Maker, and Settings — **first pass complete; browser review pending**

- Files now has a visible bilingual local-vault boundary: seeded entries are metadata only, uploads last only for the current app session, and exporting a manifest does not provide an original document. The desktop folder surface and sort select use shared design-system primitives.
- Doc Maker labels browser-generated exports as drafts and clarifies that saving to the vault is session-only—not a Qiwa/ZATCA signature or government filing. Existing editor/export behavior is unchanged.
- Settings clarifies that role/module controls are client-side prototype state, not server-enforced access control or live integrations; identity, tenant, and data-region decisions remain prerequisites for real data.
- Appearance-settings follow-up (2026-10-08): the existing Settings route now exposes app-wide mode/palette and contrast-safe custom colors; English/Arabic font choices and text scale; global corner radius; soft/balanced/defined surface treatments; and system/reduced-motion options. A live preview covers shared buttons, fields, metric cards, status chips, table, and chart treatments. High-contrast mode protects its outlines and colors. A light/dark audit found the former light card/elevated/border values were nearly identical, so surface hierarchy and muted-label contrast were strengthened in both light and dark themes, including the goldenrod variants. Preferences remain browser-local. No route permissions were changed.
- Added localized appearance-preview, preference, and light/dark surface-contrast regression checks. Latest integrated `npm run build` passes, `npm test` passes 72/72, and `git diff --check` passes.

**Remaining:** exercise file upload/download and manifest actions, Doc Maker import/export/print/RTL canvas, settings tabs and keyboard behavior, theme preferences, and narrow breakpoints in a real browser. No visual or interaction verification is claimed.

### Shared component sizing and placement follow-up — 2026-10-08

- Improved the shared metric-card geometry for compact screens and aligned labels/notes across KPI rows. The page-header title retains a usable minimum width while toolbar actions wrap; it stacks below the wide-screen breakpoint.
- Audited common KPI grids and kept their one/two/four-column progression, the Dashboard's two-column direction, and 25%-width desktop search rule. No page workflows or access gates were rebuilt.
- Added three sizing/placement regression checks. Latest integrated build passes, all 79 tests pass, and `git diff --check` is clean. Browser and pixel review remain outstanding.

### Employee Actions hub follow-up — 2026-10-08

- Consolidated employee onboarding, CSV/XLSX import and export, blank templates, and the existing WPS batch preview behind the plus-button action hub.
- Kept `canOnboard` and `canManageDirectory` gates and the original import preview/validation/add-only flow; CSV and XLSX choices now remain distinct through file selection. The WPS/SIF view is accurately described as a preview only, with no downloadable SIF or bank submission.
- Added two source-level regressions for accessibility, permissions, formats, and bilingual copy. The current integrated build passes, all 79 tests pass, and `git diff --check` is clean; browser/visual review remains pending.

### Settings navigation tab correction — 2026-10-08

- Replaced the card-styled Settings area list with a flat vertical sidebar tablist at all viewport sizes. Phones use a narrow icon-and-label rail; larger screens show full labels. The active section's name and description remain plain supporting text on mobile.
- Preserved accessible tab roles, selected state, vertical keyboard navigation, and Home/End behavior. Added a source regression for the responsive, card-free sidebar.
- Latest integrated build passes, all 79 tests pass, and `git diff --check` is clean; browser/visual review remains pending.

### Dashboard widget guidance tooltip — 2026-10-08

- Moved the Dashboard widget description, role/data-access boundary, and browser-local preference note into a bilingual info tooltip beside the heading. The partial-roster importer remains available, with its description and privacy boundary tucked into a second tooltip; its file input stays visible. Tooltips support hover, keyboard focus, activation, and Escape; the Super Admin-only status remains visible.
- Added source regressions for the tooltip content and copy. The current integrated build passes, all 79 tests pass, and `git diff --check` is clean.

### Step 7 — Product capabilities not represented as complete pages — **scope inventoried; production implementation gated**

These are workflow/data capabilities, not a request to create duplicate pages or imply production readiness. No new routes were added. On 2026-10-08, the user selected one tenant containing five companies, approved explicitly validated and authorized employee-import commits for the eventual production system, and deferred attendance until its policy is decided. The identity provider remains undecided; an other/non-default hosting region was selected without the exact provider/region or approval details; and the requested revised role/scope matrix was not supplied.

A limited provider-neutral seam now exists at `backend/security/production-auth-contract.mjs`: principal construction expects verified identity plus server-resolved access, and company-resource checks fail closed on missing scope, tenant mismatch, or company mismatch. It is not an OIDC adapter, not wired to `backend/server.mjs`, contains no role grants, and is not production authentication or authorization. Synthetic tests only.

Plan the remaining work as separate vertical slices after the required product/security decisions:

1. Client master and durable client search/detail source.
2. Durable invoice drafts, approval/audit lifecycle, server-owned numbering, and a separate receipts/allocation workflow.
3. ZATCA sandbox validation/signing/submission with idempotency and controlled server-side keys; production only after Finance/Tax/Security approval.
4. Authenticated identity, server-side RBAC and tenant isolation, API/database, hosting/data-region, backup, and secure file storage.
5. Durable APIs/integrations for the other operational modules, one workflow at a time.

**Exit:** each proposed page has an owner, user flow, data model/source, permissions, acceptance criteria, and tests. Do not invent integrations or policies. Before production database migrations or API wiring, resolve the identity provider/session policy, exact hosting/data region and privacy approval, revised role/scope assignments (including import approvers and manager scope), and approved employee/source mapping. Keep attendance deferred until its site, accuracy, freshness, clock-transition, and correction rules are explicit.

### Step 8 — Final review and small-detail pass

For each route, review:

- 1440px desktop, 1024px tablet, 390px mobile, and 320px narrow layout;
- light, dark, high-contrast, and supported palettes;
- English and Arabic direction, text wrapping, date/currency/ID isolation;
- heading/action alignment, card/table borders, row height, spacing, truncation, sticky/fixed elements, overlays, and empty/error/loading/disabled states;
- keyboard focus, dialog lifecycle, semantic tables/forms, and contrast;
- console/build/test failures and regression coverage.

Fix the exact issue on the shared primitive when it appears across routes; use a local exception only when the interaction genuinely differs.

## Delivery cadence

Work one step at a time. At each step: inspect → define acceptance checks → implement → run tests/build → review the diff → record what passed and what could not be verified. Do not call the whole product complete until the route review and browser-level visual pass are actually complete.
