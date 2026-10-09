import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeCompanyResource,
  createPrincipalResolver,
  createVerifiedPrincipal
} from "../backend/security/production-auth-contract.mjs";

const verifiedIdentity = Object.freeze({
  issuer: "https://id.example.test/",
  subject: "oidc-subject-001"
});

const approvedEntitlements = () => ({
  userId: "user-001",
  tenantId: "tenant-001",
  companyIds: ["company-a", "company-b"],
  scopes: ["route:employees", "hr:directory_full_manage"],
  employeeId: null
});

const principal = () => createVerifiedPrincipal(verifiedIdentity, approvedEntitlements());

test("principal construction requires verified identity and server-resolved access", () => {
  assert.equal(createVerifiedPrincipal(null, approvedEntitlements()), null);
  assert.equal(createVerifiedPrincipal(verifiedIdentity, null), null);
  assert.equal(createVerifiedPrincipal({ issuer: "", subject: "subject" }, approvedEntitlements()), null);
  assert.equal(createVerifiedPrincipal(verifiedIdentity, { ...approvedEntitlements(), tenantId: "" }), null);
  assert.equal(createVerifiedPrincipal(verifiedIdentity, { ...approvedEntitlements(), scopes: ["*"] }), null);

  const result = principal();
  assert.ok(result);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.companyIds), true);
  assert.equal(Object.isFrozen(result.scopes), true);
});

test("principal resolver delegates identity verification and server-side entitlements", async () => {
  const request = { headers: { "x-demo-role": "SUPER_ADMIN" } };
  let entitlementCalls = 0;
  const resolvePrincipal = createPrincipalResolver({
    authenticateIdentity: async (receivedRequest) => {
      assert.equal(receivedRequest, request);
      return verifiedIdentity;
    },
    resolveEntitlements: async (identity) => {
      entitlementCalls += 1;
      assert.equal(identity, verifiedIdentity);
      return approvedEntitlements();
    }
  });

  const result = await resolvePrincipal(request);
  assert.equal(result.userId, "user-001");
  assert.equal(entitlementCalls, 1);

  let shouldNotResolveEntitlements = false;
  const anonymousResolver = createPrincipalResolver({
    authenticateIdentity: async () => null,
    resolveEntitlements: async () => {
      shouldNotResolveEntitlements = true;
      return approvedEntitlements();
    }
  });
  assert.equal(await anonymousResolver(request), null);
  assert.equal(shouldNotResolveEntitlements, false);
});

test("missing identity or entitlement adapters cannot create an authenticated principal", () => {
  assert.throws(() => createPrincipalResolver(), /Trusted identity and entitlement adapters are required/);
  assert.throws(() => createPrincipalResolver({ authenticateIdentity: async () => verifiedIdentity }), /Trusted identity and entitlement adapters are required/);
});

test("company resource authorization denies by default and checks exact scope, tenant, and company", () => {
  const currentPrincipal = principal();
  const resource = { scope: "route:employees", tenantId: "tenant-001", companyId: "company-a" };

  assert.deepEqual(authorizeCompanyResource(null, resource), { allowed: false, reason: "UNAUTHENTICATED" });
  assert.deepEqual(authorizeCompanyResource(currentPrincipal, { ...resource, scope: "route:accounts" }), { allowed: false, reason: "MISSING_PERMISSION" });
  assert.deepEqual(authorizeCompanyResource(currentPrincipal, { ...resource, scope: "route:*" }), { allowed: false, reason: "INVALID_RESOURCE_SCOPE" });
  assert.deepEqual(authorizeCompanyResource(currentPrincipal, { ...resource, tenantId: "tenant-other" }), { allowed: false, reason: "TENANT_MISMATCH" });
  assert.deepEqual(authorizeCompanyResource(currentPrincipal, { ...resource, companyId: "company-other" }), { allowed: false, reason: "COMPANY_SCOPE_DENIED" });
  assert.deepEqual(authorizeCompanyResource(currentPrincipal, { scope: "route:employees", tenantId: "tenant-001" }), { allowed: false, reason: "INVALID_RESOURCE_SCOPE" });
  assert.deepEqual(authorizeCompanyResource(currentPrincipal, resource), { allowed: true, reason: "ALLOWED" });
});
