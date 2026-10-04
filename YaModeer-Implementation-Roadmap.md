# YaModeer implementation roadmap

**Goal:** Complete YaModeer module by module so each workflow is usable, auditable, and ready for real operations—not merely a set of screens. The invoicing workflow is the first business vertical slice.

## Product and UI principles

- Keep product name **YaModeer** and use ordinary operational language: **Client**, **New invoice**, **Client reference / PO**, **Draft**, **Issue invoice**, **Record payment**, **Paid**, and **Overdue**.
- Do not add generic “demo,” “prototype,” or “sample data” labels throughout the product. Use natural statuses and clear validation messages at the point of action. Any production block should be a deployment/configuration safeguard, not repetitive copy inside each module.
- During development, use synthetic fixtures and a test ZATCA environment. Do not connect live credentials or submit real invoices until the invoice workflow, sign-off, and environment controls are complete.
- Every module follows the same delivery pattern: user flow → data model/API → authorization → UI → validation/audit → automated tests → integration review.

## First vertical slice: Clients → Invoices → Receipts

### 1. Client lookup and data source

- Add a searchable **Clients** master with English/Arabic legal names, VAT/CR details, address, billing contact, payment terms, status, and source/last-updated metadata.
- In **New invoice**, let the user search/select a saved client. Fetch current client details on demand from YaModeer’s client records; later, add a configured CRM/ERP connector if the business has one.
- Show what was fetched and when. Let the user review changes before applying them; never silently replace saved client details.
- Allow a user to add a client manually if no record or connected source is available. Validate required tax and address fields before issue.

### 2. Optional client document or direct invoice

The invoice form should support two natural paths:

1. **From a client reference:** attach/select a client-provided PO, contract, work order, or approved milestone; bring over the reference and approved line items/amounts where available.
2. **Direct invoice:** proceed without a client PO/reference and enter the billable lines and terms directly, subject to the company’s approval rules.

The invoice should retain the source-document type, identifier, attachment, and approval evidence when a source exists. It should not require a PO if the company permits direct billing.

### 3. Draft, review, and issue

- Start as **Draft**; keep invoice number/ICV allocation on the trusted server at the correct issuance stage, not by incrementing a browser array.
- Capture bilingual supplier/client fields and line-item descriptions, quantities, unit prices, VAT rates, discounts, supply/date/reference fields, and payment terms.
- Calculate totals at halala precision with explicit rounding rules. Validate totals and required data on both client and server.
- Provide a clear preview and a final confirmation before **Issue invoice**. Apply role-based review/approval limits where required.
- Keep an audit trail for draft changes, approval, issue attempts, submission response, and corrections. Make issue requests idempotent so a retry cannot create duplicate invoices.
- Model the outcome accurately: **Draft → Ready to issue → Issuing → Issued** or **Rejected / Action required**. Do not display “Issued” until the responsible service confirms the issue/submission state.

### 4. Payment receipt is separate from invoice issuance

Track **Unpaid**, **Partially paid**, **Paid**, and **Overdue** separately from invoice issuance. Let authorized finance users record a receipt, date, amount, payment method/reference, and allocation to one or more invoices. Preserve partial payments and unapplied receipts.

**Confirmed workflow:** the optional client document is a **purchase order (PO)**. If a PO has been received, the user can select it and prepare the invoice from its approved details; if no PO exists, the user can create a direct invoice when company policy allows. Payment received remains a separate receipt/allocation workflow.

### 5. ZATCA integration, not placeholder issuance

- Build and validate the draft/preview workflow first in a non-production environment.
- Then implement the actual applicable UBL/schema/business-rule validation, cryptographic signing, certificate/private-key handling, required hash/ICV/PIH state, TLV QR payload, and integration-phase submission/response handling.
- Keep keys out of the browser; use a controlled server-side signing service or approved key-management approach. Test against the ZATCA sandbox/conformance materials before enabling issuance.
- Add Tag 9 only for simplified tax invoices and associated notes when required; do not assume every invoice has the same QR tags.
- Keep the initial ZATCA connector in test mode until finance/tax and security owners approve production credentials and issue controls.

## Delivery sequence

### Phase 0 — Confirm workflow and production boundaries

- The client-provided prerequisite is confirmed as a **PO**; define which PO fields are authoritative and when direct invoicing without a PO is allowed.
- Decide whether client details come only from the YaModeer client master initially, or from a specific CRM/ERP connector.
- Confirm who can draft, approve, issue, record payment, and create credit notes.
- Choose the identity provider/session model, tenant model, API/database, hosting/data region, and file storage before real data is introduced.

**Exit:** one approved invoice flow and a short architecture decision record; no live ZATCA credentials.

### Phase 1 — Shared platform foundation

- Replace browser-controlled role state as the authority with authenticated server identity and server-side RBAC/tenant checks.
- Add the durable API/database and audit/event model needed by the invoice slice.
- Add secure private file storage for client documents and invoice attachments.
- Keep the browser UI presentation-oriented; failed API writes must be visible and must not fall back silently to fake/local business records.

**Exit:** authenticated test users, tenant isolation, durable CRUD, audit trail, backup/restore procedure, and authorization integration tests.

### Phase 2 — Client master and lookup

- Implement client search, create/update, validation, duplicate handling, fetch/refresh, source metadata, and client document attachments.
- Add an adapter boundary for an external CRM/ERP connector without coupling the invoice UI to one vendor.

**Exit:** a user can reliably select or create the right client and verify fetched details before billing.

### Phase 3 — Invoice draft and direct/reference paths

- Implement invoice draft persistence, optional client PO/reference linking, direct invoice entry, line-item/VAT calculations, preview, approvals, and a server-side issue state machine.
- At first, allow end-to-end development against a test issue adapter that returns realistic success/rejection responses; use ordinary invoice statuses in the UI.

**Exit:** both paths—reference-backed and direct—create a durable draft, validate, preview, approve, and produce a traceable issue result without duplicate issuance.

### Phase 4 — ZATCA and receipts

- Complete ZATCA validation/signing/submission in sandbox, then separately implement payment receipts, allocation, partial payment, reconciliation, and credit/debit-note handling.
- Only enable production issue after finance/tax/security approvals and environment controls.

**Exit:** compliant test invoices, recorded submission responses, idempotent retries, and correctly reconciled receipt states.

### Phase 5 — Next modules, one vertical slice at a time

Recommended order after invoicing foundations:

1. Employee directory and protected import/export.
2. Attendance and geofence decision/audit workflow.
3. Payroll calculators and payroll records.
4. Document/file management.
5. Vendors, expenses, accounting, and the remaining collaboration/workspace modules.

For each: define its real user workflow, server-owned data, role/object rules, persistence, validation, audit events, tests, and acceptance criteria before expanding the UI.

## Test plan

- **Now:** keep the new unit regression suite running for arithmetic, TLV, import, and validation boundaries; add tests as each module is implemented.
- **During each module:** API authorization/tenant integration tests, database transaction/idempotency tests, file/connector contract tests, and localization/accessibility checks.
- **Before deployment:** test-environment ZATCA/CRM connector checks, backup/restore, failure/retry scenarios, and the final end-to-end run on deployment day as planned. Do not use live credentials or real invoices for development E2E.

## First implementation tickets

1. Define the PO fields/statuses required for billing, how PO details map to invoice lines, and when direct invoices are permitted.
2. Write the invoice state diagram and permission matrix with Finance.
3. Choose the client-data source for v1 (YaModeer client master first is the smallest safe starting point).
4. Approve the backend/auth/hosting architecture and data-region/privacy requirements.
5. Build the client-master + invoice-draft API and persistence slice.
6. Connect the invoice UI to that slice; add tests for direct and PO-backed flows.
7. Implement ZATCA test-mode integration only after the draft/approval lifecycle is stable.

## Implementation update — 2026-10-04

### Invoice workspace slice added

- Added an **Invoices** route with route-level RBAC, a dedicated draft-creation permission, and a module activation control.
- Added bilingual client search/detail lookup, received-PO checking, PO-prefilled invoice lines, direct invoice entry, and a Super Admin company-policy switch for direct invoicing without a received PO.
- Added English/Arabic line descriptions, date and payment-term defaults, halala-safe subtotal/VAT totals, invoice preview, draft save, and draft re-open/edit flow.
- Receipt recording/allocation remains separate. No invoice issue/send action or ZATCA submission is exposed in this slice.

### Boundaries and next work

- The client/PO adapter currently uses local synthetic records; saved drafts live in MasterShell memory and are lost on reload. Replace both with authenticated, server-authorized API/database operations before real client records are introduced.
- Continue with durable client master and invoice-draft APIs, audit/idempotency, role/object/tenant checks, and integration tests; then implement ZATCA test-mode issuance and a separate receipts workflow.
- Validation run for this slice: `npm run build` passed; `npm test` passed 11/11. These are build/unit checks, not end-to-end QA.

### Document Maker UI redesign

- Replaced the persistent settings rail with one responsive **Document setup** drawer containing template, page, branding, and typography panels; templates are grouped by category with concise English/Arabic labels. The drawer anchors at inline-end on wider screens and becomes a swipe-to-dismiss bottom sheet on mobile.
- Kept title, formatting, smart fields, paper preview, and import/export actions visible. The paper preview responds to page size, orientation, margins, language layout, branding, and approval-block settings.
- Added keyboard dismissal, focus containment/restoration, body scroll lock, and a confirmation before replacing edited document content with another template. The bilingual canvas stacks safely on narrow screens and keeps Arabic RTL / English LTR.
- Consolidated formatting and smart-field insertion into one accessible toolbar, synchronized the font-size control with the style settings, and removed duplicate title headings from built-in templates and imported documents when a body heading is present.
- Kept document/worksheet import and Word, Excel, PDF, and vault export behavior. Existing saved typography presets migrate from the legacy local-storage key.
- Validation: `npm run build` passed; `npm test` passed 11/11. These are compile/unit checks, not end-to-end QA. Persistence, authorization integration, and browser-level import/print review remain separate follow-up work.
