# YaModeer Employee & Attendance Backend — Architecture Proposal

**Prepared:** 7 October 2026  
**Status (updated 8 October 2026):** A provider-neutral identity/authorization contract and deny-by-default tests exist, but there is still no production API, identity adapter, database migration, or real-data path. The scaffold is not wired to the local-demo server.  
**Scope selected:** Employee records first; attendance is deferred until its policy is approved. The user requested eventual conversion of all modules.  
**Data mapping:** User approved the documented mapping and caveats on 7 October 2026. This does not verify auxiliary-file provenance or approve unsupported joins/semantics.  
**Decisions recorded 8 October:** One tenant contains five companies. Explicitly validated and approved employee-import commits may persist in the eventual production system; the current browser-only importer remains unchanged.  
**Still blocking production work:** The identity provider is undecided; a non-default hosting region was selected in principle but the provider/region/approval were not supplied; the requested revised role/scope matrix was not supplied; attendance policy remains undecided. Do not load real personal data or expose the existing local-only API until these decisions are resolved.

## 1. Recommended first slice

Build the first secure, server-backed slice for:

1. Authenticated user and tenant/company context.
2. Employee directory read/create/update and explicitly approved, validated roster-import commit.
3. Durable audit history, validation, and tests.

Attendance is a follow-on slice after its policy is approved; the user deferred that decision on 8 October 2026. Do not include payroll, leave-balance calculations, performance reviews, mail, uploaded auxiliary metrics, or ZATCA in the first slice. The uploaded 27-file mapping remains pending approval. Do not join its unmatched attendance/activity files to employee records or infer their metric definitions.

## 2. Proposed technical shape

Start with a **modular monolith**, not microservices:

```text
React web app
   │ HTTPS, same-origin API, authenticated session
   ▼
Node.js API service
   ├── Authentication/session adapter (chosen OIDC provider)
   ├── Tenant membership and server-side RBAC policy
   ├── Employee service ── validation/import preview/commit
   ├── Attendance service ── punch decision/state machine
   ├── Audit service ── append-only events
   └── Health/readiness endpoints
          │ parameterized SQL, tenant-scoped transactions
          ▼
      PostgreSQL
```

**Recommended starting stack:** Node.js LTS, TypeScript for new API/domain code, PostgreSQL, versioned SQL migrations, and JSON REST endpoints under `/api/v1`. The repository already uses Node, `pg`, PostgreSQL, and SQL migrations for a **local Work Hub demo**. Reuse the database/tooling where useful, but do **not** treat `backend/server.mjs`, its `X-Demo-Role` header, or its role-partitioned Work Hub tables as a production security or data model.

Keep the employee and attendance modules in separate domain/service folders while they share one deployable API and database. Add object storage only when secure document/receipt handling is separately designed.

## 3. Identity, tenant isolation, and permissions

### Authentication

- Use an approved OIDC identity provider with Authorization Code + PKCE.
- Prefer a backend-managed session using `Secure`, `HttpOnly`, `SameSite` cookies and CSRF protection for browser writes. Keep provider tokens and secrets out of browser storage.
- Resolve `user_id`, tenant memberships, roles, and employee mapping on the server from the authenticated identity. Never trust a role, employee ID, tenant ID, or company ID supplied by the browser as proof of access.
- Remove the demo role switch and `X-Demo-Role` from the production path. Deny requests without a valid session.

### Authorization

- Use the existing five roles and 26-scope catalog as the starting permission vocabulary. Preserve separate `route:work_hub` / `route:workspace` scopes and the separate module toggles.
- Enforce every action on the API, not only in route/UI visibility. Apply tenant and record-level checks to every database query.
- Do not infer new per-role permissions. Keep assignments deny-by-default until the supplied role/scope assignments are explicitly confirmed.
- For managers, define a server-owned reporting-line relationship before allowing manager access to employee records; do not use a client-provided list.

### Tenant/company decision

**Decision (8 October 2026):** one tenant contains the five companies; company access must remain explicitly scoped within that tenant. Do not model each company as a separate tenant. Confirm the approved company identifiers and user/company assignments before migrations or import.

## 4. Initial data model

All business rows should be scoped by `tenant_id`. Use UUID/opaque IDs, database foreign keys, unique constraints, timestamps, `created_by`, `updated_by`, and a `version` for optimistic concurrency where edits are allowed.

| Entity | Purpose and safeguards |
|---|---|
| `tenants` | Organization/security boundary. Tenant creation and membership are administrative operations. |
| `users` | Internal user ID plus OIDC issuer/subject mapping; no password copies from the identity provider. |
| `tenant_memberships` | User-to-tenant membership, enabled state, and audit metadata. |
| `role_assignments` | Existing role/scope assignments associated to a tenant membership; do not add inferred grants. |
| `companies` | Legal/operating company values within a tenant, once the mapping confirms their meaning. |
| `departments` | Stable department codes and localized labels; import joins must be explicit and validated. |
| `employees` | Only fields agreed from the approved roster mapping; include company/department references and source metadata. Avoid storing fields not supplied or approved. |
| `attendance_sites` / `geofence_policy_versions` | Authorized sites and versioned radius/accuracy rules, changed only by permitted administrators. |
| `attendance_punches` | Accepted attendance events, with server timestamp, actor/employee, site, action, policy version, and idempotency key. Append-only after acceptance; corrections are separate records. |
| `attendance_punch_attempts` | Accepted/rejected request decision and safe reason code. A rejected attempt must never mutate accepted attendance state. Minimize exact location retention. |
| `attendance_daily_summaries` | Rebuildable, derived view for UI/reporting; never the only evidence of an attendance punch. Do not count missing records as absence. |
| `audit_events` | Append-only actor, tenant, operation, entity, timestamp, request/correlation ID, and redacted change metadata. Do not log secrets or unnecessary precise location data. |
| `import_batches` | Preview/commit provenance, row counts, validation results, approver/actor and source-file metadata. Do not retain the raw workbook unless secure storage and retention have been approved. |

### Employee status and source fidelity

- Preserve source statuses as separate values. The supported partial-roster values are `ACTIVE`, `ON_LEAVE`, and `INACTIVE`; `INACTIVE` must not be rewritten as `SUSPENDED`.
- If another source later requires `SUSPENDED`, it must remain a distinct value with its own documented semantics.
- Current workforce convention remains `ACTIVE + ON_LEAVE`; `INACTIVE` is separately counted and excluded.
- Preserve `nameAr` exactly as supplied, including Latin-script values; do not translate or fabricate missing profile fields.
- Encrypt/tokenize highly sensitive identity values if approved as necessary. Define field-level access, retention, and key management before storing them.

## 5. API contract proposal

All endpoints require an authenticated session and tenant context. Use cursor pagination for lists, validated query parameters, consistent error codes, request IDs, and no-store caching for sensitive responses.

### Employee directory

```text
GET    /api/v1/me
GET    /api/v1/companies
GET    /api/v1/departments?companyId=...
GET    /api/v1/employees?query=&companyId=&departmentId=&status=&cursor=&limit=
GET    /api/v1/employees/{employeeId}
POST   /api/v1/employees
PATCH  /api/v1/employees/{employeeId}       (If-Match/version required)
POST   /api/v1/employee-imports/preview
POST   /api/v1/employee-imports/{batchId}/commit
```

Import preview returns counts and validation issues without committing rows. Commit requires a fresh authorization check and an idempotency key. Unknown columns are rejected or reported as unmapped; they are never guessed. The 27 uploaded files are not an import source until the user approves their mapping.

### Attendance

```text
GET    /api/v1/attendance/me/today
GET    /api/v1/attendance/records?employeeId=&from=&to=&cursor=&limit=
POST   /api/v1/attendance/punches
POST   /api/v1/attendance/corrections
GET    /api/v1/attendance/sites
GET    /api/v1/attendance/policies/current
```

For an employee self-punch, the server derives the employee from the authenticated session. A caller cannot clock in/out another employee by changing JSON. Manager/HR corrections use a distinct permission-checked endpoint with a reason and audit event.

Example punch request (policy thresholds and exact required fields must be confirmed):

```json
{
  "action": "CLOCK_IN",
  "clientCapturedAt": "2026-10-07T12:00:00.000Z",
  "latitude": 24.7136,
  "longitude": 46.6753,
  "accuracyMeters": 12.5,
  "idempotencyKey": "client-generated-unique-key"
}
```

The response reports a server decision and recorded event identifier. The client may display that result, but it cannot declare a punch verified by itself.

## 6. Attendance decision flow

1. Authenticate the user and derive tenant and employee mapping.
2. Validate request schema, action, timestamp, coordinates, accuracy and idempotency key.
3. Load the employee’s assigned site and the active, versioned policy from the database.
4. Use server time and server-computed distance; reject stale fixes, low accuracy, outside-radius locations, missing policy/site, or invalid employment state. A disabled UI toggle must not make a punch automatically pass.
5. In a single database transaction, lock the relevant attendance state, enforce valid clock transitions, and insert the accepted punch plus audit event.
6. If rejected, write a restricted attempt/audit event and return a clear reason code. **Do not change the accepted punch state.**
7. Apply corrections as new, auditable records referencing the original event; do not silently rewrite evidence.

Location is sensitive personal data. Store only what the approved attendance purpose needs, restrict access, define retention/deletion, and avoid duplicating coordinates in application logs. Geolocation alone is not unspoofable proof of physical presence; security owners should decide whether managed-device controls or a documented exception process are needed.

## 7. Migration and delivery sequence

### Phase A — Confirm architecture decisions

Before production migrations, confirm:

- OIDC provider, MFA/session policy, and admin user lifecycle.
- Hosting provider and approved data region; privacy/PDPL and processor review.
- Whether the five roster companies are companies within one tenant or separate tenants.
- Confirm source provenance for the auxiliary files, clarify actuals vs forecasts and resolve the employee-key crosswalk before importing/aggregating them. The documented mapping is approved, but these source facts remain unresolved.
- Attendance site assignment source, acceptable accuracy threshold, geofence radius, stale-fix window, shift/clock transition rules, and correction approvers.
- Existing role/scope assignments; no grants are inferred.

### Phase B — Secure foundation

- Add API composition, configuration validation, OIDC/session middleware, CSRF protection, tenant context, permission middleware, request validation, rate limits, correlation IDs, and security headers.
- Add database migrations, least-privilege database credentials, transaction helpers, audit event writes, backups, and restore procedure.
- Add tests for authentication, tenant isolation, row-level authorization, and deny-by-default behavior before connecting the browser.

### Phase C — Employee directory

- Implement company/department reference data and employee CRUD for agreed fields.
- Implement validated roster preview and explicit commit with idempotency and audit.
- Replace browser-only row authority with API pagination/search; retain the row-table UI and bilingual fidelity.

### Phase D — Attendance

- Implement versioned work-site/geofence policy and server punch state machine.
- Add accepted-event and rejected-attempt audit flows; correct the existing client bug where a rejected punch can change displayed clock state.
- Connect the UI to the API and add role/tenant-specific views and correction actions only after policy assignments are confirmed.

### Phase E — Controlled rollout

- Use synthetic fixtures in a non-production environment first.
- After security/privacy review and mapping approval, import a small, approved test batch; reconcile row counts and status/company/department aggregates before any broader cutover.
- Keep the current local-demo API isolated; do not expose it or use it with real data.

## 8. Acceptance criteria

- Anonymous, expired-session, wrong-tenant, and unauthorized requests fail closed.
- A user cannot gain access by changing browser state, URL, headers, role, tenant, or employee IDs.
- Employee list and detail queries are tenant/record scoped, paginated, and preserve source values.
- Import preview does not write rows; commit is explicit, idempotent, auditable, and rejects ambiguous/unmapped fields.
- `INACTIVE` remains distinct; current workforce excludes it; no missing attendance rows are silently labeled absent.
- A rejected punch leaves accepted and displayed attendance state unchanged; retries are idempotent; every accepted punch and correction is auditable.
- Stale, inaccurate, forged, outside-radius, and unassigned-site attempts are denied under the agreed policy.
- English/Arabic API validation and UI flows pass browser tests, including RTL, keyboard and screen-reader checks.
- Backups can be restored and tenant-isolation/security tests run in CI before any production deployment.

## 9. Open decisions before production implementation

**Resolved 8 October 2026:** one tenant contains five companies. The user also approved explicit, validated, authorized employee-import commits for the eventual production system; commit authorization is not implemented until the role policy is approved.

| Decision | Why it blocks final implementation |
|---|---|
| Identity provider and MFA/session approach | Determines authentication, callback/session design, user provisioning and account recovery. |
| Exact hosting provider and approved data region | A non-default/other region was selected in principle, but the provider, exact region, backup location, and cross-border/privacy approval were not specified. |
| Auxiliary data provenance and employee-key crosswalk | The mapping is approved, but source actuals vs samples/forecasts and unmatched employee IDs still prevent treating those auxiliary metrics as live employee-linked facts. |
| Attendance policy details | Radius, accuracy threshold, freshness, work-site assignment and correction rules determine server validation. |
| Explicit role/scope assignments | API access must follow assigned permissions; this plan adds no per-role grants. |

## Current repository boundary

The repository has a loopback-only Node/PostgreSQL Work Hub development spike with a role header, not production authentication. A provider-neutral identity/principal and company-scope contract now lives in `backend/security/production-auth-contract.mjs`, with synthetic unit tests only. It is not an OIDC implementation, is not wired to any HTTP server, contains no role grants, and cannot authenticate real users. The frontend employee importer still parses selected files in the browser; a development roster endpoint returns aggregate summaries only. No production employee/attendance API, database schema/migration, import-commit endpoint, server-authoritative punch service, or production identity system is wired yet. Do not use the current preview or local demo API for real HR records.
