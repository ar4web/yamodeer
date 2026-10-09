# YaModeer UI Quality Review

**Date:** 7 October 2026  
**Review basis:** Archify Review skill (value, cost, impact; evidence-based findings)  
**Snapshot:** commit `b899fcb` plus pre-existing working-tree changes; the current follow-up implements the authorized findings in the shared workspace.  
**Status:** The earlier six actionable source findings and planned module first passes are implemented. The 2026-10-08 Dashboard and Settings-personalization follow-ups, Employee Actions hub, and a limited provider-neutral authorization-contract scaffold are also implemented; the latest integrated build passes, all 80 tests pass, and `git diff --check` is clean. This remains static/source verification only—**not** browser, visual, RTL, or interaction verified. Production identity, hosting, and role-policy decisions remain open.

## Executive summary

The six actionable findings from the static review are now implemented: contrast-safe theme text/control tokens (including user color overrides), shared modal focus management, the missing `PageHeader` eyebrow, translated employee/compliance labels, unused-import cleanup, and sidebar positioning/compact-width fixes. The planned Work/communication and Files/Doc Maker/Settings slices now also have source-level consistency and honest local-data boundaries. Browser-level interaction and rendered visual verification remain outstanding.

The source scan found good baseline practices: button elements have explicit types and actions/form submission; no icon-only buttons without an accessible name were flagged; no `<img>` without `alt` was flagged; and the five hidden file inputs reviewed are intentionally opened by named upload/import controls. The current build succeeds and all 80 tests pass, but they do not constitute visual or interaction coverage.

**Important limit:** no browser or browser automation is available here. Layout, overflow, responsive breakpoints, RTL rendering, actual keyboard behavior, and contrast in rendered states were not exercised. Contrast values below are calculated from the source theme tokens, not measured from screenshots.

## Findings

### UIR-01 — High: Several theme text/background pairs fail normal-text contrast

**Evidence**

- `src/context/ThemeContext.tsx:173-210` defines semantic status foreground and soft-background tokens. In light mode, the source pairs calculate to:
  - success: **4.27:1** (`#537864` on `#e8f0eb`)
  - warning: **3.72:1** (`#8b7857` on `#f3efe7`)
  - danger: **4.36:1** (`#955f64` on `#f5eaeb`)
- The default Dark Goldenrod theme's dark accent pair is **3.69:1** (`#b58e4a` on `#48391e`), used by combinations such as `bg-accent-soft text-accent`.
- `src/context/ThemeContext.tsx:79-117, 475-484` does not define dark foreground variants for Oasis Mint, Classic Corporate, Royal Gold, or Stealth Midnight. In dark mode the code falls back to each palette's light `primary` color. Calculated `text-primary` contrast against the dark surface (`#1c1e22`) is **2.08:1**, **1.61:1**, **3.32:1**, and **2.65:1**, respectively. Against each palette's `primary-soft` background it is lower still: **1.56:1**, **1.42:1**, **2.98:1**, and **2.54:1**.
- These token combinations are used for actual text/status treatments (for example, the attendance status chip in `src/modules/EmployeeModule.tsx:1297` and accent labels/cards in modules). Custom primary/accent overrides are also accepted without a contrast guard (`ThemeContext.tsx:475-484`).

**Value:** High. Users selecting light mode or one of the affected palettes can encounter difficult-to-read status labels, links, and text; this is especially consequential for low-vision users. For normal-size text, the usual WCAG AA target is 4.5:1.

**Cost:** Medium. Define and validate foreground/background pairs for every supported palette and mode; add a token-level contrast test. For user-selected overrides, provide a warning or constrain the foreground color rather than silently accepting unreadable combinations.

**Impact:** Cross-cutting: theme controls and every module that uses `text-primary`, `text-accent`, or semantic status colors. Prefer fixing the shared tokens and testing the full palette/mode matrix over one-off component overrides.

**Resolution:** Implemented a shared WCAG contrast utility (`src/services/themeContrast.ts`) and separate, contrast-checked text tokens for primary, accent, and semantic states, while keeping fill tokens distinct. Primary/accent overrides are adjusted when they do not meet the 3:1 non-text contrast target against active surfaces; text is adjusted to at least 4.5:1 against the relevant canvas, surface, and soft backgrounds. Button foregrounds are selected against their actual primary/success/warning/danger fills; borders, focus rings, and chart labels use the safe foreground tokens. A localized note in theme settings explains the automatic adjustment. Five focused tests cover reference ratios, light/dark semantic pairs, alternate palettes, and custom colors. The helper tests verify computed color values, not screenshots or rendered browser styles.

### UIR-02 — Implemented in code; browser interaction verification pending

**Implementation:** `useModalFocus` in `src/components/DesignSystem.tsx` now provides shared behavior: focus the first visible focusable control (or the dialog itself), trap Tab/Shift+Tab, close the topmost dialog on Escape, make background branches inert, lock body scrolling, and restore focus. If the opener has been removed, focus returns to the active parent dialog or the stable main-content fallback. `ResponsiveDrawer` now uses this same hook.

The hook and dialog semantics are applied to all identified full-screen overlays: MasterShell geofence; Vendor audit; Expense claim; Accounts journal voucher; Employee dossier, import, and WPS; Compliance XML and TLV; Chat new conversation; Mail accounts and compose; Work Hub; Workspace; and call-room. Primary navigation is now a persistent sidebar at every viewport, not a dialog; route buttons retain accessible names and `aria-current` state.

**Value:** High for keyboard-only and assistive-technology users. A modal now keeps keyboard interaction within the active layer and returns focus after dismissal.

**Cost:** Medium. The shared implementation centralizes behavior and avoids separate focus logic drifting across modules. The implementation is complete in source; the remaining cost is a browser keyboard walkthrough and any fixes it uncovers.

**Impact:** Shared behavior now covers the app shell and all detected custom modal overlays, including Chat, Mail, Employee, Work Hub, Workspace, Vendor, Expense, Accounts, Compliance, geofence, and call-room. The central hook also handles nested-dialog Escape ordering and focus restoration when an opener disappears.

**Verification:** `npm run build` and all 57 tests pass. No browser executable or automation is available in this environment, so initial focus, Tab/Shift+Tab, Escape, backdrop, and focus restoration have not been exercised in a real browser. The preview is available for manual verification; no browser-level verification is claimed.

### UIR-03 — Moderate: `PageHeader` silently drops the `eyebrow` supplied by nine pages

**Evidence:** `PageHeaderProps` declares `eyebrow` in `src/components/DesignSystem.tsx:16-22`, but `PageHeader` does not destructure or render it (`DesignSystem.tsx:24-50`). Nine call sites supply it: Vendor, Expense, Master Settings, Work Hub, Files Manager, Accounts, Employee, Compliance/ZATCA, and Chat.

**Value:** Moderate. The intended section/group label is absent, weakening page hierarchy and orientation on those screens.

**Cost:** Low. Render the eyebrow in the shared component with the established typography/spacing and check the RTL layout once in a browser.

**Impact:** One shared-component correction restores consistent hierarchy on nine pages; no per-page workaround is needed.

**Resolution:** `PageHeader` now renders a supplied eyebrow above the title with responsive spacing and theme-aware typography. The RTL/layout appearance still requires browser verification.

### UIR-04 — Moderate: A few visible labels bypass the English/Arabic translation dictionary

**Evidence:** The project architecture rules require UI text to use the translation hook. Two user-facing English fragments were found directly in JSX: `5-Yr EOSB Award` in `src/modules/EmployeeModule.tsx:2093-2096`, and `Yrs` in `src/modules/ComplianceZatcaModule.tsx:788-790`.

**Value:** Moderate for Arabic-language users; the surrounding screens are localized, so these fragments stand out and may be unclear.

**Cost:** Low. Add dictionary keys for both languages and use `t()`; include them in the translation-key check. Technical file-format fields, codes, and the product name were not counted as prose UI labels.

**Impact:** Small surface area, but the translation rule is systemic and should be enforced consistently.

**Resolution:** Added English and Arabic dictionary entries; the EOSB award label now uses `t()`, and the compliance tenure value now uses a localized unit and locale-aware number formatting.

### UIR-05 — Low: Two unused icon imports in Doc Maker — resolved

Removed the unused `Download` and `Signature` imports from `src/modules/DocMakerModule.tsx`.

### UIR-06 — Moderate: Sidebar drawer positioning conflict and cramped compact transition — implemented

**Evidence:** The mobile navigation `<aside>` combined a `fixed` drawer class with a base `relative` utility, while its desktop variant is `lg:sticky`. Competing position utilities make the mobile drawer's positioning dependent on generated CSS order. In addition, the compact label state was selected by snapping continuous widths to 80/176/336 px, leaving labels visible from 129–175 px, where their available text area is very narrow and truncates many names.

**Value:** Moderate. The sidebar is a primary navigation surface on every route; unreliable drawer positioning or clipped navigation names can make the whole app harder to navigate.

**Cost:** Low. Keep a compact, accessible route rail on phones and preserve the resizable, labeled sidebar on desktop.

**Resolution:** Compact mode starts below the 176 px default width, and the separator's accessible width description follows the actual compact state. The later app-wide navigation pass replaced the mobile drawer/bottom bar pattern with a persistent left sidebar at every viewport: an 80 px icon-and-label rail at widths up to 1023 px and the saved, resizable labeled sidebar from 1024 px. All routes stay in that sidebar, with active-route state, visible compact labels, and accessible names/tooltips. Regression coverage checks the responsive sidebar and that the bottom bar/drawer are absent. This is source-level verification; responsive rendering still needs a browser check.

### Production boundary — Separate from visual polish, but do not ship as authorization

The unauthorized fallback in `src/components/MasterShell.tsx:206-220` exposes a button that calls `setCurrentRole("SUPER_ADMIN")`. This is a demo/local role switch, not a trustworthy production authorization boundary. Before any real employee or attendance data is connected, remove or explicitly demo-gate this control and enforce identity, tenant scoping, and permissions on the server. The UI review does not change the existing decision to pause production implementation pending the identity-provider, hosting/data-region, and tenant-model decisions.

### Compliance usability follow-up — 2026-10-08

**Implementation:** The Compliance route now gives Labor rules and ZATCA invoices their own prominent, full-width tab controls. Labor calculators use a two-column desktop grid and concise bilingual labels; the EOSB comparison matrix is a native, keyboard-operable disclosure. ZATCA opens with a compact sample-invoice summary (number, total, date); its bilingual invoice preview and dense QR/TLV/cryptographic payload details are behind a native disclosure, which opens automatically when arriving with a selected invoice. The sample notice explicitly says nothing is submitted to ZATCA.

**Color treatment:** Warning surfaces use warning foreground tokens; the emphasized grand total uses primary-soft with primary-text, while informational values use neutral theme surfaces and readable foregrounds. QR modules intentionally keep dark-on-white contrast for scanner reliability across themes.

**Preservation and verification:** Overtime, GOSI, EOSB, employee-prefill, Ramadan toggle, invoice selection, XML preview, QR/TLV, and local builder behavior were retained. Added `tests/ui-compliance-redesign.test.mjs`. `npm run build` passed, `npm test` passed 60/60, and `git diff --check` passed. The Vite preview is available on port 5173 for manual user review; no browser, keyboard, rendered RTL, or pixel-level review was performed.

### Dashboard redesign and access audit — 2026-10-08

**Design and layout:** After measuring the existing CSS layout, kept the centered `max-w-6xl` dashboard (1152 px cap) and its existing breakpoints because the calculated widths remained practical: Dashboard content is approximately 1152 px at a 1440 px viewport, 1040 px at 1280 px, 784 px at 1024 px, and 358 px at 390 px. Workforce-status and nationality cards pair at `xl` (about 568 px each at 1440 px, about 512 px at 1280 px); they stack below that. The department/attendance pair also starts at `xl`, with a 320 px minimum for attendance. In the settings shell, the widget area is estimated at 912 px at 1440 px, 752 px at 1280 px, and 496 px at 1024 px; widget cards use two columns only at `xl` (about 450 px / 370 px each at 1440 px / 1280 px), then stack. On mobile they use the 358 px content column. All figures are CSS-derived estimates using the default 176 px desktop sidebar and shell gutters—not browser measurements.

Replaced the workforce-status, nationality, and attendance donut charts with theme-aware segmented distribution bars. The bars show totals, readable legends with counts and percentages, semantic status colors, accessible summaries, and a zero-data message instead of fabricated values. Kept the department composition visualization and existing workflow content. Widget settings are grouped into Workforce, Attendance, and Workflows; each tile shows its data-access requirement and the panel explains role-based visibility in English and Arabic.

**Permission/privacy audit:** Preserved existing access gates: workforce, attendance, employee requests, and renewals require `route:employees`; expenses require `route:expenses`; financial workflows require `route:accounts`. Employees remain on their separate personal-dashboard view. Only `SUPER_ADMIN` has `system:app_store_toggles` and can manage global dashboard settings or roster import; `ADMIN` retains the Settings route but does not gain those controls. No permission was broadened. Partial-roster CSV/TXT is parsed in the browser and individual row values remain in React memory only—not localStorage or a database. Dashboard metrics use aggregates; the optional development-preview endpoint returns aggregate counts only and must not receive employee rows. Role values are explicitly described as prototype state, not production authorization or persistence.

**Validation:** Added responsive chart, layout, access-label, and RBAC-matrix tests. `npm ci`, `npm run build`, `npm test` (64/64), and `git diff --check` pass. Vite still reports the existing >500 kB bundle warning; dependency installation reports 10 advisories (5 moderate, 5 high) and an engine warning for `nanoid@6.0.1` on Node 20.20.2. The preview is running on port 5173 for user review. No browser visual, keyboard, or RTL review was performed.

### Production auth-contract groundwork — 2026-10-08

After the user chose a production-backed direction, I added `backend/security/production-auth-contract.mjs` as a provider-neutral seam. It accepts only a server-verified identity and server-resolved entitlements, then applies exact-scope checks plus tenant/company matching with deny-by-default outcomes. Four unit tests use synthetic fixtures. The scaffold is deliberately **not** wired to the local-demo API and contains no role-to-scope assignments, provider adapter, HTTP middleware, schema, migration, database writes, temporary grants, or production path. “Build temp” was interpreted conservatively as temporary test fixtures only; no permissions were invented.

**Decisions recorded:** one tenant with five companies; explicitly validated/approved employee-import commits may persist in the eventual production system; attendance is deferred. **Still blocking production implementation:** identity provider/session policy is undecided, the selected non-default hosting region/provider and privacy approval were not named, and the revised role/scope matrix plus import approver/manager scope were not supplied. The current browser-only CSV preview remains unchanged. See `Employee-Attendance-Backend-Architecture-2026-10-07.md` and `backend/security/README.md` for the boundary and remaining gates.

### Settings personalization across app components — 2026-10-08

Expanded the existing Settings → Appearance area with app-wide controls for display mode, palette, contrast-safe primary/accent colors, English/Arabic font families, text scale, component corner radius, surface treatment (soft/balanced/defined), and motion preference (system/reduced). Palette changes preserve a user-selected radius; each custom color can be restored to the selected palette. High-contrast mode protects its stronger outlines and fixed accessible colors. The cross-mode check traced the low-contrast complaint to nearly indistinguishable surface tokens (for example, prior light cards used white and near-white `#f9fafb`, with a `#f0f1f3` border). Strengthened page/card/elevated surfaces, outlines, and muted-label colors in standard light, light-goldenrod, standard dark, and dark-goldenrod. Added source-backed contrast/hierarchy regressions for both modes. Theme preferences use the existing browser-local storage boundary; no server profile sync is claimed.

Added a live, bilingual visual preview for shared buttons, form fields, metric cards, status chips, tables, and a segmented chart. Its note clarifies that these are style samples, not workspace records. Added global reduced-motion styles that also respect the operating-system setting. Added `tests/ui-settings-personalization.test.mjs`; latest `npm run build`, 72/72 tests, and `git diff --check` pass. No browser rendering, interaction, or RTL visual review was performed.

### Shared component sizing and placement follow-up — 2026-10-08

Applied a cross-app sizing pass to reusable primitives rather than rebuilding individual pages. Shared `MetricCard`s now use responsive padding (`p-4` on narrow screens, `p-5` from `sm`), fill their grid row, reserve two-line label space so KPI values line up, and anchor optional notes to the card bottom. `PageHeader` now preserves a 13rem title area at wide breakpoints and gives wrapped toolbars up to 70% of the row; below that breakpoint, title and actions stack naturally. Common four-KPI layouts remain one column, two at `sm`, and four only at `xl`; the Dashboard's chosen two-column layout and quarter-width desktop search remain intact.

Added `tests/ui-component-sizing.test.mjs` for metric-card geometry, header layout, and KPI breakpoints. Latest production build passes, all 79 tests pass, and `git diff --check` is clean. This was a source/layout-rule review only; no browser breakpoint or pixel verification was performed.

### Employee Actions hub follow-up — 2026-10-08

Replaced the separate header shortcuts with a localized, focus-managed Employee Actions dialog opened by the plus button. Directory managers retain distinct CSV/XLSX import and export choices plus CSV/XLSX template downloads; import still uses the existing row-level preview, validation, add-only confirmation, and duplicate checks. Single-employee onboarding remains gated by `canOnboard`, while import/export remain gated by `canManageDirectory` and appear on the Directory tab as before. The WPS action is presented as a preview; both the hub and modal explicitly state that no SIF download or bank submission is performed.

Added source regressions for dialog accessibility, permission gates, separate formats, localization, and the WPS boundary. The latest integrated production build passes, all 79 tests pass, and `git diff --check` is clean. This remains source/test verification only; no browser or visual interaction review was performed.

### Settings navigation tab correction — 2026-10-08

Replaced the description-filled Settings cards with a flat vertical sidebar tablist at all viewport sizes. On phones it becomes a narrow icon-and-label rail; larger screens show full-width labels. The active section name and description remain plain supporting text on mobile; keyboard navigation and tab accessibility semantics are preserved. A source regression checks the responsive sidebar and card-free treatment. The latest integrated build passes, all 79 tests pass, and `git diff --check` is clean; no browser rendering was verified.

### Dashboard widget guidance tooltip — 2026-10-08

Moved the Dashboard widget description, role/data-access boundary, and browser-local preference note into a compact tooltip beside the section heading. The optional partial-roster importer remains available, but its description and privacy boundary now live in a separate bilingual tooltip; the file-selection control remains visible. The tooltips open on hover/focus or activation and can be dismissed with Escape; the Super Admin-only status remains visible. Added source regressions for tooltip content and copy. The latest integrated build passes, all 79 tests pass, and `git diff --check` is clean.

### App-wide navigation sidebar on mobile — 2026-10-08

Replaced the mobile bottom bar and “More” drawer with the same persistent app-wide left sidebar used on desktop. At widths up to 1023 px the shell keeps an 80 px icon-and-label rail visible beside every route; route names are compact and may wrap within the rail, with accessible names and tooltips as well. At 1024 px and above, the saved/resizable desktop sidebar and full labels remain. Sidebar width responds to viewport changes, active routes continue to use `aria-current="page"`, and the page no longer reserves bottom-bar padding. Added source regressions for the responsive sidebar and removal of the mobile bar/drawer. `npm test` passes 80/80, `npm run build` succeeds, and `git diff --check` is clean. No browser visual or touch walkthrough has been performed.

### Pinterest reference: monochrome sidebar and Dashboard refinement — 2026-10-08

**Reference:** [Black and white dashboard interface / Linear-inspired navigation](https://pin.it/2Et5yF1H8).

Applied the user-selected visual direction from the Pinterest pin to the global sidebar and Dashboard while preserving all existing routes, role gates, data, and user-saved theme preferences. The dark default now uses the neutral soft-charcoal palette. Sidebar rows are compact, border-defined, and grouped by subtle dividers; the active route uses a quiet monochrome surface instead of a colored marker. Dashboard KPI and chart panels use restrained outlines, neutral icon tiles, and theme-derived grayscale distribution shades. Labels/counts remain visible so status meaning is not conveyed by color alone; prototype/privacy notices and warning/success states retain their semantic treatment. Historical trend lines were not added because this dashboard has no historical time-series source. Added source regressions for the grayscale charts, outlined KPI cards, responsive sidebar styling, and neutral default palette. The integrated suite passes 80/80, `npm run build` succeeds, and `git diff --check` is clean; the build still reports its existing >500 kB JavaScript chunk warning. Rendered mobile/RTL visuals remain unreviewed.

## What checked well

- Static inventory across 17 module files: 192 JSX button elements, 142 form controls, and 9 forms. Automated source checks found explicit `type` values and a handler or form-submit path for buttons; no icon-only button without an accessible name was flagged.
- No `<img>` element without an `alt` attribute was flagged.
- The five hidden file inputs previously checked are intentional: each is opened by a named upload/import control. They are not missing-label findings.
- The updated literal translation-key scan found 1,083 referenced keys represented in the dictionaries (all literal keys are present in both English and Arabic). Another 148 computed-key translation calls could not be fully validated statically and need runtime/path coverage.
- No obvious physical-direction Tailwind utilities (`pl-*`, `pr-*`, `left-*`, `right-*`, etc.) or vanilla CSS/SCSS files were found in the source scan, consistent with the RTL/layout rules.
- The latest integrated production build and all 80 tests pass, including shared component sizing, light/dark Settings surface hierarchy, Compliance progressive-disclosure, Dashboard distribution/access, provider-neutral authorization-contract, color-pair, responsive navigation, and demo-boundary checks. This confirms the current working tree builds and its tests pass; it does not validate visual rendering or real interactions.

## Verification limits and environment notes

- No browser executable or browser automation is available. No page screenshots, breakpoint checks, visual regression, real keyboard walkthrough, screen-reader tree, or rendered contrast measurements were performed. Treat this as a source-level review, not a claim that every rendered detail has been verified.
- The Vite build emits a non-blocking warning for a JavaScript chunk over 500 kB. Measure real loading behavior before deciding on route-level code splitting.
- `npm ci` reported 10 dependency advisories (5 moderate, 5 high) and that `nanoid@6.0.1` expects Node `^22 || ^24 || >=26` while this environment uses Node 20.20.2; build and tests pass, and dependencies were not changed in this personalization follow-up.
- No root-level `REVIEWING.md` or `CONTRIBUTING.md` was present.
- The repository already contained modified/untracked work when reviewed; this follow-up adds the authorized UI-review fixes in addition to the previously approved modal-focus work. `git diff --check` is clean outside a pre-existing trailing-space line at `src/context/LanguageContext.tsx:1905`; that unrelated line was left untouched. `npm ci` also reported 10 dependency advisories (5 moderate, 5 high); they were not investigated as part of this UI task.

## Recommended next steps

1. Use the preview for a real-browser keyboard walkthrough of the shared modal behavior: initial focus, Tab/Shift+Tab, Escape, backdrop dismissal, background blocking, and focus restoration.
2. Complete the route-by-route visual pass at desktop/mobile widths in English and Arabic. Exercise the persistent sidebar at both sides of the 1024 px breakpoint, compact icon focus/touch targets, desktop resize behavior, every palette/mode, and extreme custom-color overrides; check page-header eyebrows, focus states, status chips, chart legends, and control boundaries. Capture screenshots and fix any rendered issues before calling the UI review fully closed.
3. Keep the client-side role switch and local/synthetic data flows outside any production claim until the identity-provider, hosting/data-region, tenant-model, and server-side authorization decisions are resolved.
