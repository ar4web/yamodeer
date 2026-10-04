# YaModeer HRMS — System Overview & Complete Blueprint

**Product:** YaModeer — People · Finance · Compliance  
**Repository:** `ksa-enterprise-hrms-core-v2`  
**Blueprint date:** 3 October 2026  
**Status:** React/TypeScript front-end prototype with sample data and browser-local state. It is not yet a deployed, multi-user enterprise service.

> This document separates the **implemented prototype** from the **production target**. A screen, rule simulation or client-side role check is not equivalent to a backend integration, legal certification or server-side security control.

---

## 1. Executive overview

YaModeer is a bilingual Saudi-enterprise HRMS workspace organized around people operations, finance, compliance, documents and personal productivity. It is a single-page React application with a modular shell, route-level permission checks, shared React context providers, reusable design-system components and English/Arabic interface dictionaries.

### Product domains

1. **Workforce:** employee directory, onboarding, payroll estimates, attendance, performance, transfers and employee requests.
2. **Finance:** expenses and reimbursements, chart of accounts, journals, VAT, supplier invoices and payment workflow summaries.
3. **Compliance:** Saudi labor-law calculations, geofenced attendance validation and ZATCA invoice/QR workflows.
4. **Documents:** company files, searchable folders, upload/download and a bridge to the bilingual document studio.
5. **Productivity:** tasks, date/time reminders and notebooks in Work Hub.
6. **Communication & AI:** a bilingual mail workspace with provider setup flows and writing assistance.
7. **Governance:** theme/language preferences, module toggles and a role-permission matrix.

### Current implementation boundary

The current app is a **browser prototype**. Core screens, sample datasets and local interactions are implemented, but the repository has no deployed production API, authentication server, job scheduler or production object store. A local-only PostgreSQL/Docker and Node API scaffold now exists for Work Hub, using a demo role header rather than real authentication; it must not be exposed or used with real personal data. Work Hub can run in browser-local demo mode or opt into that local API, while Mail demo data remains in browser `localStorage` by selected workspace role. The role selector and RBAC matrix are UI prototype controls, not production identity/security controls.

---

## 2. Runtime and technology architecture

### Stack in the repository

| Layer | Current technology |
|---|---|
| UI | React 19, TypeScript, Vite 6 |
| Styling | Tailwind CSS 3.4 utilities and theme tokens; generated through `virtual:tailwind.css` |
| Icons | `lucide-react` |
| Document libraries | `docx`, `exceljs`, `mammoth` |
| QR rendering | `qrcode` |
| State | React Context providers and local component state |
| Persistence | `localStorage` for language/theme and demo Mail; Work Hub uses browser storage by default and has an opt-in local PostgreSQL adapter |
| Backend/API | Local-only Node HTTP API for Work Hub demo snapshots plus a Docker Compose PostgreSQL service; no production API or auth |

Build command: `npm run build` → `tsc -b && vite build`.

### Application entry and provider composition

`src/main.tsx` mounts `App` and imports the virtual Tailwind entry. `App` composes the shared providers in this order:

```text
React.StrictMode
└── LanguageProvider
    └── ThemeProvider
        └── GeofencingSafetyProvider   (RBAC, module toggles, offices, GPS and audit state)
            └── OperationsProvider    (shared HR/expense/finance workflow state)
                └── WorkHubProvider  (role-scoped tasks, reminders and notebooks)
                    └── MailProvider     (role-scoped demo mailboxes and messages)
                        └── MasterShell
```

The provider order matters: `WorkHubProvider` and `MailProvider` read the current role from the geofencing/RBAC context, while modules consume language, theme, permissions and shared operational state through hooks. `WorkHubProvider` can optionally sync its fake-data workspace through the local PostgreSQL API; `MailProvider` partitions its browser-local demo workspace by selected role.

### Main source tree

```text
src/
├── App.tsx
├── main.tsx
├── components/
│   ├── DesignSystem.tsx
│   └── MasterShell.tsx
├── context/
│   ├── LanguageContext.tsx
│   ├── ThemeContext.tsx
│   ├── RBACGeofenceContext.tsx
│   ├── OperationsContext.tsx
│   ├── WorkHubContext.tsx
│   └── MailContext.tsx
├── services/
│   └── mailAi.ts
├── data/
│   ├── mockBlueprints.ts
│   └── workspaceBlueprints.ts
└── modules/
    ├── DashboardModule.tsx
    ├── EmployeeModule.tsx
    ├── VendorModule.tsx
    ├── ExpenseModule.tsx
    ├── AccountsModule.tsx
    ├── FilesManagerModule.tsx
    ├── DocMakerModule.tsx
    ├── ComplianceZatcaModule.tsx
    ├── MasterSettingsModule.tsx
    ├── WorkHubModule.tsx
    └── MailModule.tsx
```

### Local backend scaffold (development only)

`backend/server.mjs` exposes a local-only Work Hub snapshot API; `backend/migrations/001_workhub.sql` creates role-partitioned relational task/reminder/notebook tables; `docker-compose.yml` runs a PostgreSQL 16 container bound to loopback. The API accepts a demo role header only when started in explicit local-demo mode and rejects `NODE_ENV=production`. The Vite proxy uses relative `/api` paths. This is an integration spike for synthetic data, not real identity, tenant isolation or a production deployment. See `backend/README.md` for setup.

---

## 3. Shell, navigation and routing

### Navigation groups

`MasterShell` owns the active route and renders a grouped responsive sidebar:

- **Workspace:** Overview / Dashboard
- **Productivity:** Work Hub
- **Communication:** Mail
- **People:** People / Employee directory; Vendors
- **Finance:** Expenses; Accounting
- **Documents:** Files; Document studio
- **Company:** Compliance; Settings

The current route is held in React state (`activeRoute`); navigation is currently **in-app state-based**, not URL/deep-link routing. A future production version should use URL routes and preserve browser history/deep links.

### Route lifecycle

Every active page is wrapped by `RBACRouteGuard`:

1. Check whether the module is enabled in the App Store toggle state.
2. Check `canAccessRoute(route)` against the current role-permission matrix.
3. If disabled, render the module-disabled fallback.
4. If unauthorized, render the restricted-access fallback and return-to-dashboard action.
5. Otherwise render the selected module.

These checks are client-side prototype controls. A production API must independently enforce authorization on every request.

### Default route access matrix

`✓` means allowed by the current prototype matrix at default settings; `—` means denied. Work Hub is on by default and can be disabled in Settings by a role with the app-store permission.

| Route | Super Admin | HR Admin | HR Ops | Manager | Employee |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Work Hub | ✓ | ✓ | ✓ | ✓ | ✓ |
| Mail | ✓ | ✓ | ✓ | ✓ | ✓ |
| People / Employees | ✓ | ✓ | ✓ | ✓ | — |
| Vendors | ✓ | ✓ | ✓ | — | — |
| Expenses | ✓ | ✓ | ✓ | ✓ | ✓* |
| Accounting | ✓ | ✓ | — | — | — |
| Files | ✓ | ✓ | ✓ | — | — |
| Document studio | ✓ | ✓ | ✓ | ✓ | ✓ |
| Compliance | ✓ | ✓ | ✓ | ✓ | — |
| Settings | ✓ | ✓ | — | — | — |

`*` The Expenses page applies an employee-specific view filter in the prototype; it is not a substitute for server-side row-level authorization.

### Atomic permission families

The permission catalog includes:

- Route access: dashboard, work hub, mail, employees, vendors, expenses, accounts, files, document studio, compliance and settings.
- System governance: multi-tenant controls, App Store toggles and raw audit-log inspection.
- HR: full directory governance, onboarding and leave-balance overrides.
- Payroll: payroll/EOSB constants.
- Line management: direct-report leave and overtime actions.
- Vendor/ZATCA: B2B invoice emission.
- Self-service: personal dossier and geofenced attendance punch.

The Settings role matrix can change permission cells in the prototype. Super Admin and Admin have broad HR controls; HR Ops has onboarding and operational workflows; Managers have team-leave permissions; Employees have dashboard, self-service, expenses and Work Hub routes. Exact route access is listed above.

### App Store/module toggles

The current toggle model includes geofencing, ZATCA Phase 2, vendor portal, expenses, accounts, files manager, document studio, Work Hub, Mail & AI, labor-law engine, onboarding wizard and Ramadan-hours mode. Some toggles hide sidebar routes; compliance remains enabled when either the labor-law engine or ZATCA module is active. Toggle state is currently client-side.

---

## 4. Module blueprint

| Module | Primary purpose | Important current interactions / shared dependencies |
|---|---|---|
| **Dashboard** | Executive and self-service landing page | KPI cards, workforce/payroll/expense/attendance charts, operational queues and route links. Financial figures/queues are gated by route permissions. Consumes employee, expense, transfer, request, attendance and payable sample data. |
| **People / Employee** | Employee operations | Directory and onboarding plus Payroll, Attendance, Performance, Transfers and Requests tabs. Payroll is role-gated; onboarding uses the onboarding permission/toggle; transfer/request actions are permission-checked. Attendance entry opens the shared geofence flow. |
| **Vendors** | Vendor and contractor records | Vendor CRUD-style prototype and invoice hand-off to the Compliance/ZATCA view. Uses MasterShell-owned vendor/invoice state. |
| **Expenses** | Employee expense claims | Claim submission, claim statuses, VAT capture and reimbursement workflow. Government-fee categories are VAT-exempt; other categories validate the Saudi VAT-number pattern and calculate 15% input VAT. Claims are shared with Dashboard through `OperationsContext`. |
| **Accounting** | General ledger and financial summaries | Chart of accounts, double-entry journal entries, VAT/statutory summaries and an Invoices & Payments tab. Payment status is shared with Dashboard; current state is simulated in memory. |
| **Files** | Company document library | Searchable folders, file upload/download and “open in document studio” bridge. File metadata is held by MasterShell; current storage is not a secure server vault. |
| **Document studio** | Bilingual document creation | Template-based editing, page/layout controls and Office/PDF exchange are the intended scope; saves can hand a generated asset back to Files. Verify each format/export path before production. |
| **Compliance / ZATCA** | Labor rules and e-invoicing workflows | KSA calculation surfaces and ZATCA invoice/QR components. QR component accepts precomputed TLV hex segments; production signing/submission still requires an approved server-side integration. |
| **Work Hub** | Personal productivity | Tasks, reminders and notebooks. Tasks can be created/edited/searched/filtered/statused; reminders can be scheduled/edited/completed/reopened/snoozed; notebooks and notes can be created, renamed, edited and deleted. Due reminders are highlighted while the page is open. Persistence is browser-local by default, with an opt-in local PostgreSQL API for fake-data testing. |
| **Mail & AI** | Bilingual mail workspace and writing assistant | Three-pane inbox, provider choices for Google/Gmail, Microsoft 365/Outlook, Yahoo, iCloud and IMAP; folders, search, filters, message actions, local drafts/sent simulation and attachment metadata. AI summary/reply/draft/polish actions use a deterministic local demo helper unless a backend endpoint is configured. Provider sign-in is only an optional OAuth-start redirect hook; messages do not sync or send to providers in this repository. |
| **Settings** | Workspace governance and preferences | Theme lab, language-related workspace experience, App Store toggles, RBAC matrix, type scale and geofence settings. App Store changes are permission-gated. |

### Work Hub data structure

Current Work Hub types in `WorkHubContext.tsx`:

```text
WorkTask
  id, title, description, dueAt?, priority, status, createdAtIso, updatedAtIso
  priority = LOW | NORMAL | HIGH | URGENT
  status   = TODO | IN_PROGRESS | DONE

WorkReminder
  id, title, details, dueAt, status, createdAtIso, updatedAtIso
  status = ACTIVE | DONE

WorkNotebook
  id, title, entries[], createdAtIso, updatedAtIso

NotebookEntry
  id, title, content, createdAtIso, updatedAtIso
```

Titles/descriptions/content may be plain user-entered text or bilingual seed data. Work Hub defaults to `localStorage` key `ksa_hrms_work_hub_v1`, partitioned by selected role. With `VITE_WORKHUB_LOCAL_API=true`, it syncs a complete role snapshot through `/api/workhub` to PostgreSQL tables. The demo API identity is the selected role, not a real user; snapshot replacement is for single-user local testing and is not a concurrency-safe production model. Reminder timing remains in-app; no background worker or push notification service is present.

### Mail prototype data boundary

`MailProvider` stores demo accounts and sample/local messages under `ksa_hrms_mail_workspace_v1`, partitioned by selected role. The UI supports provider setup for Google/Gmail, Microsoft 365/Outlook, Yahoo, Apple iCloud and generic IMAP/SMTP, but only as setup choices until a secure integration exists. Without `VITE_MAIL_OAUTH_START_URL`, a provider choice offers a local demo account; an OAuth start URL only redirects to a configured backend and does not by itself implement callback handling, mailbox sync or sending. Attachments store filenames and sizes only.

`mailAi.ts` calls `VITE_MAIL_AI_ENDPOINT` when configured; with no endpoint it uses a deterministic local demo template helper. No AI provider or mail service is configured in this repository, and the demo fallback does not transmit message content.

---

## 5. Shared state ownership and data flows

### State ownership map

| Owner | Data | Current persistence |
|---|---|---|
| `MasterShell` | Active route, employees, vendors, ZATCA invoices, file vault records, selected invoice/template and geofence exception UI state | React state; resets on reload |
| `OperationsProvider` | Expense claims, transfer requests, employee requests, financial workflow items; attendance and performance fixtures | React state; shared while app remains mounted; seeded prototype records |
| `WorkHubProvider` | Tasks, reminders, notebooks and entries per role | Browser `localStorage` by default; optional local PostgreSQL snapshot API for synthetic-data development |
| `MailProvider` | Demo accounts and messages per role; local draft/send simulation | Browser `localStorage`; demo only, not connected to provider mailboxes |
| `LanguageProvider` | `en`/`ar`, `ltr`/`rtl`, dictionary lookup, localization, SAR formatter | Language stored in localStorage |
| `ThemeProvider` | Theme mode, palette, fonts, scale, overrides | Theme preferences stored in localStorage |
| `GeofencingSafetyProvider` | Current role/matrix, module toggles, office profiles, GPS data, clock status, audit payloads | React state; prototype only |

### Cross-module data paths

```text
MasterShell employee state
  ├── People module
  ├── Dashboard workforce calculations
  ├── Expense employee selector
  └── Compliance/ZATCA employee fields

OperationsProvider
  ├── ExpenseModule adds/approves/reimburses claims
  │    └── Dashboard expense KPIs/charts/queue updates
  ├── People module reviews transfers and employee requests
  │    └── Dashboard pending queues update
  └── AccountsModule marks financial items paid
       └── Dashboard invoice/payment counts and totals update

Vendor module emits an invoice
  └── MasterShell appends/selects invoice and opens Compliance

Files module opens a record in Document studio
  └── Document studio can hand generated files back to Files

Work Hub module
  └── WorkHubProvider persists locally by default or syncs a role snapshot to local PostgreSQL when enabled

Mail module
  ├── MailProvider stores demo accounts/messages per selected role
  └── mailAi service uses local templates or an optional configured backend endpoint
```

### Principal prototype records

- **Employee:** employee ID, bilingual name, nationality, status, department/location, salary/allowances, legal IDs/expiry and Nitaqat-related attributes (see `EmployeeRecordBlueprint`).
- **Expense claim:** employee, category, merchant, VAT number, base/VAT/gross amounts, date and status (`PENDING`, `APPROVED`, `REIMBURSED`, `REJECTED`).
- **Transfer request:** employee, from/to department, requested/effective date and status.
- **Employee request:** employee, request type (`LEAVE`, `ATTENDANCE`, `DOCUMENT`), dates and status.
- **Attendance snapshot:** employee, date, status, check-in and check-out; geofence event records include GPS accuracy, distance, office radius and verification status.
- **Performance snapshot:** employee, cycle, score and goals complete/total.
- **Financial workflow item:** type (`INVOICE`, `PAYROLL`, `GOSI`, `VAT`), counterparty, reference, due date, SAR amount and pending/paid state.
- **Vault file:** filename, bilingual title, folder, format, data URL (optional), size, checksum label, PDPL tier, update date and linked template.
- **Vendor:** company/contractor record and associated B2B/invoice information.
- **Mail account:** provider key, address, display name and demo/connected status; current implementation creates demo accounts only.
- **Mail message:** account/thread IDs, folder, bilingual or user-entered sender/subject/body, recipients, status flags and attachment filename/size metadata.
- **ZATCA invoice:** bilingual invoice content, line items and TLV/QR-oriented data (see `mockBlueprints.ts`).
- **Ledger:** account code/name/class and debits/credits; journal entry has narration, date, debit/credit codes and amount.

---

## 6. KSA compliance and security rules

### Labor calculations

The shared calculation engine in `mockBlueprints.ts` covers the prototype's core math and should remain the single calculation source:

- Standard overtime: **(Basic Salary ÷ 30 ÷ 8) × Hours × 1.5**.
- Friday/public holiday work: honor the stated minimum **1.5× basic wage plus an additional 50% premium**.
- Saudi GOSI: **10% employee / 10% employer** on the defined contributory wage base.
- Expat GOSI: **0% employee / exactly 2% employer hazards-only**.
- EOSB: Article 84/85 calculation path, with termination reason reflected in the statutory modifier.
- Ramadan working-hour mode is represented by a toggle; production calculations need effective-dated policy and employee/contract applicability.

### Expense VAT

- Government-fee exemption categories should carry zero VAT and must not require a vendor VAT number.
- Taxable expense categories use 15% VAT in the prototype and validate the Saudi VAT-number pattern before submission.
- Production must preserve invoice/receipt evidence, supplier registration validation, audit history and configurable tax treatment.

### ZATCA

- Invoice display requirements call for the standard fields in English and Arabic.
- QR generation accepts a precomputed TLV hexadecimal segment array; raw invoice text must never be placed in the compliance QR payload.
- Production ZATCA Phase 2 issuance needs a server-side signing key/certificate service, invoice sequence/PIH control, durable submission and response storage, official environment/credentials and integration certification. Current UI/mock calculations alone do not establish compliance.

### Geofencing and route security

- Attendance punch is allowed only after checking GPS accuracy and distance against the active office perimeter; accuracy over 15m or an out-of-radius reading must block the punch and create an exception/audit payload.
- The current provider simulates multiple GPS conditions and stores audit payloads in client state.
- Production must calculate/revalidate geofence conditions server-side, secure coordinates, enforce access per employee/tenant, and retain immutable audit events under a defined retention policy.
- All routes are guarded in the client prototype. Production APIs must apply server-side authentication, authorization and tenant/record-level policy checks.

### UI and accessibility constraints

- Tailwind utilities only; no hand-authored vanilla CSS files.
- Use logical layout utilities (`ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`, `end-*`) for RTL/LTR.
- Put visible UI strings in the English/Arabic dictionary and use the language hook.
- Use theme tokens rather than fixed semantic colors; honor global dynamic font scale.
- Use accurate button/tab semantics, translated accessible names and labelled tab panels.

---

## 7. Production target architecture

The following is the recommended next-stage architecture, not something currently implemented in this repository.

```text
Web / Mobile clients
       │ HTTPS + OIDC session
       ▼
API Gateway / Backend-for-Frontend
       ├── Identity, tenant membership and policy enforcement
       ├── HR Core (employees, contracts, onboarding, leave, transfers)
       ├── Time & Attendance (server geofence validation, punch/audit)
       ├── Payroll & KSA Calculation service
       ├── Expense & Approval workflow
       ├── Finance / Ledger / AP / VAT service
       ├── Vendor / Procurement service
       ├── Work Hub service (tasks, reminders, notebooks)
       ├── Mail integration service (provider OAuth, sync, send, token vault)
       ├── AI gateway (policy/consent, redaction and approved model routing)
       ├── Document service (templates, conversion, secure metadata)
       ├── ZATCA adapter (sign, submit, reconcile)
       └── Notification scheduler and audit/event service
             │
             ├── PostgreSQL (transactional tenant data)
             ├── Encrypted object storage (receipts, contracts, exports)
             ├── Queue + scheduled workers (reminders, approvals, integrations)
             ├── Search index / database full-text search
             └── Central audit, metrics and security monitoring
```

### Recommended production data entities

All tenant-owned records should carry `tenant_id`; private records should also carry `owner_user_id` or `employee_id`. IDs should be opaque and stable; sensitive identifiers should be encrypted or tokenized where appropriate.

```text
Tenant 1─* UserMembership *─1 User
UserMembership 1─* RoleAssignment

Tenant 1─* Employee
Employee 1─* EmploymentContract
Employee 1─* AttendanceEvent
Employee 1─* LeaveRequest
Employee 1─* TransferRequest
Employee 1─* PerformanceReview
Employee 1─* PayrollLine ─* PayrollRun
Employee 1─* ExpenseClaim ─* ReceiptAsset

Tenant 1─* Vendor 1─* SupplierInvoice 1─* Payment
Tenant 1─* GLAccount
Tenant 1─* JournalVoucher 1─* JournalLine ─1 GLAccount
SupplierInvoice / ExpenseClaim / PayrollRun ──> ApprovalInstance

Tenant 1─* DocumentAsset ─* DocumentVersion
User 1─* MailAccount (provider, external subject, scopes, token secret reference)
MailAccount 1─* MailMessageCache (provider message/thread IDs, sync cursor, encrypted cached fields if enabled)
User 1─* AIRequestAudit (action, consent/policy result, model route, redaction metadata)
User 1─* Task
User 1─* Reminder (optionally linked to Task)
User 1─* Notebook 1─* NotebookEntry
All sensitive mutations ──> AuditEvent
```

Suggested shared fields: `id`, `tenant_id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `version` (optimistic concurrency), `status`, and audit/correlation IDs where relevant. Approval decisions should be first-class records rather than only overwriting a status.

### Recommended API surface (illustrative)

```text
GET/PUT        /api/workhub (local-demo snapshot endpoint; demo role header only)

GET/POST       /api/workhub/tasks
GET/PATCH/DELETE /api/workhub/tasks/{taskId}
GET/POST       /api/workhub/reminders
POST           /api/workhub/reminders/{reminderId}/snooze
POST           /api/workhub/reminders/{reminderId}/complete
GET/POST       /api/workhub/notebooks
GET/PATCH/DELETE /api/workhub/notebooks/{notebookId}
GET/POST       /api/workhub/notebooks/{notebookId}/entries
PATCH/DELETE   /api/workhub/notebooks/{notebookId}/entries/{entryId}

POST           /api/attendance/punch       (server revalidates geofence)
POST           /api/expenses/claims       (server recalculates/validates VAT)
POST           /api/approvals/{id}/decision
POST           /api/zatca/invoices        (server signs/submits and records response)
GET/POST       /api/mail/accounts
POST           /api/mail/oauth/{provider}/start
GET            /api/mail/messages?accountId=...&folder=...
POST           /api/mail/messages/{id}/send
POST           /api/mail/ai/{action}       (consent/policy-checked, approved model gateway)
GET/POST       /api/finance/journal-vouchers
```

API endpoints are illustrative contracts, not present in the current codebase. Use idempotency keys on submissions that can be retried; validate state transitions on the server; never accept calculated payroll, VAT or geofence outcomes from the browser as authoritative.

### Recommended event flows

- `ExpenseClaimSubmitted` → validate receipt/VAT → create approval → approve/reject → create reimbursement/payment entry → post accounting event → notify requester.
- `AttendancePunchRequested` → authenticate employee → resolve assigned office → check accuracy/radius server-side → record punch or blocked exception → append audit event.
- `ReminderDue` → scheduled worker finds due active reminders → deduplicate by reminder/occurrence → send permitted in-app/email/push/SMS notification → record delivery.
- `SupplierInvoiceReceived` → validate vendor and VAT → approval → payment scheduling → settlement → ledger posting and Dashboard event.
- `ZatcaInvoiceIssued` → allocate sequence/PIH → sign and submit through approved adapter → persist signed XML/response/QR TLV → reconcile retries and rejections.
- `MailSyncRequested` → authenticate the owner → load server-side token reference → call provider adapter → upsert/advance sync cursor → record audit state without exposing provider tokens to the client.
- `MailSendRequested` → validate sender account and recipients → process permitted attachments → send via provider adapter → persist provider message ID/status → return a non-sensitive result.
- `MailAiRequested` → confirm user action/consent and policy → minimize/redact content as configured → call approved model route → store an audit record without retaining full prompts unless explicitly approved.

---

## 8. Non-functional requirements for production

1. **Identity:** OIDC/SSO, MFA policy, session timeout, device/session revocation, role assignment by tenant and organization.
2. **Authorization:** backend permission middleware plus row/field-level policies; employees see only their own records; managers only assigned reporting lines; finance scopes remain separated.
3. **Privacy/PDPL:** purpose limitation, data minimization, retention schedules, access/export/delete procedures, data processing inventory and breach response.
4. **Data protection:** encryption in transit and at rest, secrets in a managed vault, short-lived signed file URLs, malware scanning and immutable access logs.
5. **Financial integrity:** double-entry validation, approval separation of duties, idempotent payments, reconciliations and immutable journal history.
6. **Compliance integrations:** official test/sandbox environments first; credential/certificate rotation; retry, rejection and reconciliation queues; no secrets in browser bundles.
7. **Mail and AI:** OAuth authorization-code + PKCE/state handled server-side; encrypted/rotated provider tokens in a vault; provider-specific consent/scopes; server-side sync/send; attachment malware/size controls; AI data minimization, consent, retention and model/vendor review. Never put provider secrets or refresh tokens in the browser.
8. **Reliability:** backups and restore tests, database migrations, job retry/dead-letter handling, health checks and disaster-recovery objectives.
9. **Localization:** complete Arabic/English content, RTL review of tables/forms/exported files, localized dates/numbers and SAR handling.
10. **Accessibility:** keyboard-operable tabs/forms, visible focus, dialog focus management, screen-reader labels and contrast testing.
11. **Performance:** lazy-load large document/spreadsheet code, pagination for large tables, virtualized lists if needed and server-side search.

---

## 9. Verification and roadmap

### Current validation snapshot

- `npm run build` passes after integrating the local Work Hub API adapter and the initial Chat/Workspace modules. TypeScript checking completed; Vite transformed 2,311 modules.
- The Vite development preview starts on port 5173. The app entry and Chat, Workspace and CollaborationContext source routes returned HTTP 200.
- The build reports a non-blocking large-chunk warning; ExcelJS is one of the largest bundles.
- The Chat and Workspace routes are wired through the RBAC guard, role permission matrix and separate module toggles; English/Arabic UI dictionary entries are present.
- The dashboard now has a premium executive KPI layout, current-vs-prior snapshot analysis, workforce composition, attendance pulse, priority queue and renewal radar. Payroll/GOSI detail remains permission-gated; the low-value simulator, raw GPS telemetry and fake payslip/leave widgets were removed.
- Dashboard comparisons use `DASHBOARD_PREVIOUS_SNAPSHOT_DATA` (2026-09-30) against the current workforce aggregate and latest attendance snapshot (2026-10-02).
- Collaboration state is synthetic, localStorage-only and partitioned by demo role. Direct/group/team conversations, team membership, project/task CRUD, meeting scheduling and a non-streaming conference-room preview are implemented. Files are represented by names only. There is no cross-device messaging or live audio/video.
- Full functional and acceptance testing is intentionally deferred to the deployment day, per the user. Current verification covers the production build and HTTP preview endpoints, not final end-to-end acceptance.
- Docker/PostgreSQL could not be launched in the sandbox because Docker is not installed; database integration still needs a local Docker run. No automated browser end-to-end suite, OAuth callback, provider sync or live-AI test is recorded.

### Recommended delivery sequence

**Phase 1 — Prototype QA**
- Test dashboard current-vs-prior comparisons, role-based KPI visibility, renewal links, priority queue navigation and Arabic RTL chart layout.
- Test Work Hub task/reminder/notebook CRUD, filters, snooze, deletion confirmations and persistence after reload.
- Test Chat direct/group/team conversations, local message persistence, attachment-name behavior, role separation and meeting state changes.
- Test Workspace create/edit flows for workspaces, teams, members, projects, task status/assignees and scheduled meetings.
- Confirm the conference-room UI does not imply or attempt media streaming until a provider and signaling service are approved and integrated.
- Test Mail demo account add/remove, folders/search/filters, read/star/archive/trash, compose/draft simulation, attachment metadata and AI fallback.
- Test English/Arabic toggling, RTL tables/forms and all screen sizes.
- Exercise each role against the route matrix and module toggles.
- Verify expense→Dashboard, transfer/request→Dashboard, payment→Dashboard and Files↔Document-studio hand-offs.
- Test geofence inside, >15m accuracy and outside-radius cases; assert blocked events are logged.

**Phase 2 — Backend foundation**
- Define tenant/user/employee identity and authentication.
- Establish API contracts, database schema, migrations and server-side authorization policies.
- Move operational state from React contexts/localStorage to repositories/APIs.
- Add append-only audit, approval records and document object storage.

**Phase 3 — Domain completion**
- Build HR/leave/transfer/time/payroll, expense/approval, accounting/AP and Work Hub services.
- Add scheduled reminder notifications and durable task/reminder ownership by `user_id`.
- Implement secure provider OAuth/callback, mailbox sync/send, attachment storage and backend AI gateway; validate consent, data handling and provider scopes before enabling live accounts.
- Add transaction-safe journal posting and reconciliation.

**Phase 4 — External compliance integrations**
- Validate approved ZATCA, Qiwa/MHRSD, GOSI, Muqeem and WPS/SADAD integration paths, credentials, schemas and certification requirements.
- Use adapters with sandbox/prod configuration, audit trails, retries and reconciliation; do not treat sample data as authority data.

**Phase 5 — Production readiness**
- Security threat model and penetration test; PDPL review; restore/DR tests; accessibility review.
- Unit/integration/e2e tests, load tests and compliance sign-off.
- Split large bundles and deploy frontend/API/workers/database/object storage to approved Saudi-region infrastructure according to organizational policy.

---

## 10. Source-of-truth file map

| File | Responsibility |
|---|---|
| `src/main.tsx` | React root mount and Tailwind virtual stylesheet entry |
| `src/App.tsx` | Provider composition and shell mount |
| `src/components/MasterShell.tsx` | Main navigation, app-level state, route guard and module composition |
| `src/components/DesignSystem.tsx` | Page headers, metrics, bar charts, table frames, buttons, tabs and tab panels |
| `src/context/LanguageContext.tsx` | English/Arabic dictionary, RTL/LTR direction, localization and SAR formatting |
| `src/context/ThemeContext.tsx` | Palette, mode, fonts, dynamic type scale and theme persistence |
| `src/context/RBACGeofenceContext.tsx` | Roles, atomic scopes, route permissions, module toggles, office profiles and geofence safety flow |
| `src/context/OperationsContext.tsx` | Shared expense, transfer, employee-request and financial workflow state; attendance/performance fixtures |
| `src/context/WorkHubContext.tsx` | Work Hub records, mutations, role-based local persistence and optional local PostgreSQL sync |
| `backend/server.mjs`, `backend/migrations/001_workhub.sql`, `docker-compose.yml` | Local-only Work Hub API, schema migration and PostgreSQL development container |
| `src/context/MailContext.tsx` | Role-partitioned browser-local demo accounts, sample mail, local drafts and sent-message simulation |
| `src/context/CollaborationContext.tsx` | Role-partitioned synthetic workspaces, teams, projects/tasks, conversations/messages and meeting state |
| `src/services/mailAi.ts` | Optional AI backend adapter and local deterministic demo fallback |
| `src/modules/MailModule.tsx` | Mail UI, provider setup hooks, folders, message actions, compose and AI tools |
| `src/modules/ChatModule.tsx` | Direct/group/team chat UI, local message composition, cross-team participant selection and meeting launch preview |
| `src/modules/WorkspaceModule.tsx` | Workspace/team/project/task management and local meeting schedule UI |
| `src/modules/CallRoomModal.tsx` | Conference-room UI preview; no media transport or signaling |
| `src/modules/DashboardModule.tsx` | Executive KPIs, comparison visualization, attendance/workforce analysis and role-gated priority queues |
| `src/data/mockBlueprints.ts` | Employee/vendor/ZATCA blueprints, KSA calculation engine data and current/prior dashboard snapshots |
| `src/data/workspaceBlueprints.ts` | Expense, transfer, request, attendance, performance and financial-workflow types/sample records |
| `src/modules/*` | Presentation and localized module behavior by business domain |
| `uploads/architecture-rules.json` | Project-level implementation constraints and compliance rules |

---

## 11. Blueprint decisions and assumptions

- **Work Hub is personal to a role in the prototype**, not shared collaboration and not keyed to a real authenticated user. Production identity must replace role-keyed ownership.
- **The local PostgreSQL API is a fake-data integration spike only:** role headers are not authentication, and the local snapshot replacement endpoint is not suitable for multiple users or production data.
- **Chat and Workspace are local demo prototypes:** synthetic records are saved per selected demo role in browser storage. This is not realtime or cross-device collaboration; attachment names are metadata only, and conference controls are visual UI state without audio/video streams.
- **Mail is a UI/demo prototype only:** provider choices and an optional OAuth-start URL do not establish live login, OAuth callback, message synchronization, attachment transfer or sending. Production requires a secure server-side provider integration and token storage.
- **AI is not hosted/configured by this repository:** the local deterministic helper is only a UX demo; production AI needs an approved endpoint, data-handling policy and model/vendor review.
- **In-app reminders only:** due/overdue status is evaluated while the app is open. Background alerts require a server scheduler and notification delivery channel.
- **Sample data is illustrative:** attendance, payroll, expenses, invoices, approvals and HR profiles must be replaced or reconciled with authoritative enterprise data.
- **RBAC in React is not a security boundary:** server enforcement and audit are mandatory before real employee or financial data is used.
- **Compliance UIs do not equal certification:** official integrations, legal review and environment testing are separate acceptance gates.
