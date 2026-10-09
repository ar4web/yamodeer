const SCOPE_PATTERN = /^[a-z][a-z0-9_-]{0,63}:[a-z][a-z0-9_-]{0,127}$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isBoundedText = (value, maxLength = 512) =>
  typeof value === "string" && value.length > 0 && value.length <= maxLength && value.trim() === value && !CONTROL_CHARACTERS.test(value);
const isScope = (value) => typeof value === "string" && SCOPE_PATTERN.test(value);
const uniqueValidStrings = (values, predicate) => {
  if (!Array.isArray(values) || !values.every(predicate)) return null;
  return [...new Set(values)];
};

/**
 * Constructs an immutable principal from a verified identity and server-resolved access.
 * Call only from a trusted authentication/membership adapter; never pass request-body,
 * query-string, or user-controlled role/tenant claims here.
 *
 * @param {{ issuer: string, subject: string } | null} verifiedIdentity
 * @param {{ userId: string, tenantId: string, companyIds: string[], scopes: string[], employeeId?: string | null } | null} entitlements
 * @returns {Readonly<{ issuer: string, subject: string, userId: string, tenantId: string, companyIds: readonly string[], scopes: readonly string[], employeeId: string | null }> | null}
 */
export function createVerifiedPrincipal(verifiedIdentity, entitlements) {
  if (!isRecord(verifiedIdentity) || !isRecord(entitlements)) return null;
  if (!isBoundedText(verifiedIdentity.issuer) || !isBoundedText(verifiedIdentity.subject)) return null;
  if (!isBoundedText(entitlements.userId) || !isBoundedText(entitlements.tenantId)) return null;

  const companyIds = uniqueValidStrings(entitlements.companyIds, (value) => isBoundedText(value, 160));
  const scopes = uniqueValidStrings(entitlements.scopes, isScope);
  const employeeId = entitlements.employeeId ?? null;
  if (companyIds === null || scopes === null || !(employeeId === null || isBoundedText(employeeId, 160))) return null;

  return Object.freeze({
    issuer: verifiedIdentity.issuer,
    subject: verifiedIdentity.subject,
    userId: entitlements.userId,
    tenantId: entitlements.tenantId,
    companyIds: Object.freeze(companyIds),
    scopes: Object.freeze(scopes),
    employeeId
  });
}

/**
 * Provider-neutral seam for a future API adapter. `authenticateIdentity` must verify a
 * server-managed session or a validated token; `resolveEntitlements` must look up the
 * internal user, tenant, company memberships, and scopes server-side.
 *
 * No provider, session mechanism, role mapping, or route is installed by this module.
 */
export function createPrincipalResolver({ authenticateIdentity, resolveEntitlements } = {}) {
  if (typeof authenticateIdentity !== "function" || typeof resolveEntitlements !== "function") {
    throw new TypeError("Trusted identity and entitlement adapters are required");
  }

  return async (request) => {
    const verifiedIdentity = await authenticateIdentity(request);
    if (!isRecord(verifiedIdentity) || !isBoundedText(verifiedIdentity.issuer) || !isBoundedText(verifiedIdentity.subject)) {
      return null;
    }

    const entitlements = await resolveEntitlements(verifiedIdentity, request);
    return createVerifiedPrincipal(verifiedIdentity, entitlements);
  };
}

const denied = (reason) => Object.freeze({ allowed: false, reason });

/**
 * Exact-match, deny-by-default resource authorization. This guard requires both a tenant
 * and a company scope so callers cannot accidentally execute a cross-company query.
 * Tenant-wide resources need a separately reviewed policy function before being added.
 *
 * @param {ReturnType<typeof createVerifiedPrincipal>} principal
 * @param {{ scope: string, tenantId: string, companyId: string }} resource
 */
export function authorizeCompanyResource(principal, resource) {
  if (!principal) return denied("UNAUTHENTICATED");
  if (!isRecord(resource) || !isScope(resource.scope) || !isBoundedText(resource.tenantId, 160) || !isBoundedText(resource.companyId, 160)) {
    return denied("INVALID_RESOURCE_SCOPE");
  }
  if (principal.tenantId !== resource.tenantId) return denied("TENANT_MISMATCH");
  if (!principal.scopes.includes(resource.scope)) return denied("MISSING_PERMISSION");
  if (!principal.companyIds.includes(resource.companyId)) return denied("COMPANY_SCOPE_DENIED");
  return Object.freeze({ allowed: true, reason: "ALLOWED" });
}
