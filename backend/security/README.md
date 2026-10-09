# Provider-neutral authorization seam (temporary development groundwork)

`production-auth-contract.mjs` is an **unwired interface and policy helper**, not a production authentication system. It provides:

- a principal shape for verified identity plus server-resolved user, tenant, company memberships, and exact permission scopes;
- a resolver seam for a future identity-provider adapter and a server-side membership/entitlement lookup;
- a deny-by-default guard for a resource identified by tenant, company, and one exact scope.

The tests use synthetic fixtures only. They do not establish production roles, grants, identity, or a trusted session. The phrase “build temp” was treated conservatively: test fixtures are temporary; no temporary role permissions were invented.

## Not implemented or approved

- No OIDC provider, session cookie, token validation, MFA, CSRF handling, secret, HTTP middleware, database migration, import endpoint, deployment configuration, or real-data connection is present.
- No role-to-scope assignments are encoded. Entitlements must be loaded from a reviewed server-side policy; missing identity or scope denies access.
- The helper is not wired into `backend/server.mjs`, which remains explicitly local-demo-only and uses its separate `X-Demo-Role` test mechanism.
- Tenant-wide routes are intentionally not covered. `authorizeCompanyResource` requires an exact tenant and company so future routes must make their company boundary explicit.
- Import commits and persistent employee storage remain unimplemented until the production identity, exact hosting/data region, and revised role/import-approver policy are settled. Validated import persistence was approved in principle, but the current client-only CSV preview still does not write rows to a database.
- Attendance is deferred until its site assignment, geofence, freshness, clock-transition, and correction rules are approved.

Do not use this scaffold with real data or describe it as production authorization. Before wiring it into an API, add provider-specific session verification, server-side membership resolution, reviewed role assignments, database-level tenant/company scoping, audit logging, and integration tests for the selected hosting environment.
