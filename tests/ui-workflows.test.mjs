import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");
const dynamicWorkflowKeys = [
  ...["start", "approval", "condition", "parallel", "merge", "notification", "delay", "end"].map((key) => `workflow.step.${key}`),
  ...["draft", "active", "paused"].map((key) => `workflow.template_status.${key}`),
  ...["leave", "expense", "employee", "payroll", "contract"].map((key) => `workflow.category.${key}`),
  ...["leave", "attendance", "document"].map((key) => `workflow.request_type.${key}`),
  ...["pending", "approved", "rejected", "returned", "reimbursed"].map((key) => `workflow.status.${key}`),
  ...["on_track", "at_risk", "breached"].map((key) => `workflow.sla.${key}`),
  ...["any_one", "all", "majority", "sequential", "weighted"].map((key) => `workflow.rule.${key}`),
  ...["manager", "department_head", "hr", "finance", "budget_owner", "specific_user"].map((key) => `workflow.approver.${key}`),
  ...["equals", "not_equals", "greater_than", "less_than", "contains", "in", "between"].map((key) => `workflow.operator.${key}`),
  ...[
    "approved", "step_approved", "template_created_local", "template_created", "instance_created_local", "rejected", "returned",
    "resubmitted", "local_operation_approved", "local_operation_rejected", "manual_escalation_logged",
    "template_version_saved_local", "delegation_created_local", "delegation_enabled_local", "delegation_paused_local"
  ].map((key) => `workflow.audit_action.${key}`)
];

test("workflow center is mounted in the main shell and guarded through the route permission matrix", async () => {
  const [rbac, shell] = await Promise.all([
    readSource("../src/context/RBACGeofenceContext.tsx"),
    readSource("../src/components/MasterShell.tsx")
  ]);
  assert.match(rbac, /\| "workflows"/);
  assert.match(rbac, /\| "route:workflows"/);
  assert.equal((rbac.match(/"route:workflows": true/g) ?? []).length, 5, "all prototype roles retain the route so employees can view their own requests");
  assert.match(rbac, /workflows: "route:workflows"/);
  assert.match(rbac, /scope: "route:workflows"[\s\S]*?Access workflow templates, approvals and local activity/);
  assert.match(shell, /key: "workflows" as ModuleRouteKey[\s\S]*?labelKey: "nav\.workflows"[\s\S]*?icon: GitBranch/);
  assert.match(shell, /<RBACRouteGuard[\s\S]*?route=\{activeRoute\}/);
  assert.match(shell, /activeRoute === "workflows" && \([\s\S]*?<WorkflowEngineModule employees=\{employees\} globalSearchQuery=\{globalSearchQuery\}/);
});

test("workflow copy is fully bilingual, including dynamic statuses, step types and approval rules", async () => {
  const [moduleSource, translations, language] = await Promise.all([
    readSource("../src/modules/WorkflowEngineModule.tsx"),
    readSource("../src/data/workflowTranslations.ts"),
    readSource("../src/context/LanguageContext.tsx")
  ]);
  const keys = new Set([
    ...[...moduleSource.matchAll(/t\("((?:workflow|nav)\.[^"]+)"\)/g)].map((match) => match[1]),
    "nav.workflows",
    ...dynamicWorkflowKeys
  ]);
  const pairs = new Map();
  for (const match of translations.matchAll(/^\s*\["([^"]+)",\s*"((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)"\],?$/gm)) {
    const [, key, english, arabic] = match;
    assert.equal(pairs.has(key), false, `duplicate workflow translation: ${key}`);
    pairs.set(key, { english, arabic });
  }
  for (const key of keys) {
    const pair = pairs.get(key);
    assert.ok(pair, `missing translation pair for ${key}`);
    assert.ok(pair.english.length > 0, `English copy missing for ${key}`);
    assert.ok(pair.arabic.length > 0, `Arabic copy missing for ${key}`);
    assert.notEqual(pair.english, pair.arabic, `Arabic copy missing for ${key}`);
  }
  assert.match(language, /WORKFLOW_TRANSLATIONS\[language\]\[key\]/);
});

test("approval inbox bridges only supported local operations records and exposes real local state transitions", async () => {
  const [moduleSource, operations] = await Promise.all([
    readSource("../src/modules/WorkflowEngineModule.tsx"),
    readSource("../src/context/OperationsContext.tsx")
  ]);
  for (const operation of ["expenseClaims", "employeeRequests", "transferRequests", "updateExpenseStatus", "updateEmployeeRequestStatus", "updateTransferStatus"]) {
    assert.ok(moduleSource.includes(operation), `workflow module should connect ${operation}`);
  }
  assert.match(moduleSource, /source: "OPERATIONS"/);
  assert.match(moduleSource, /setInstances\(\(current\) => current\.map/);
  assert.match(moduleSource, /status: "PENDING",[\s\S]*?approvalStepIndex: 0/);
  assert.match(moduleSource, /handleWorkflowDecision/);
  assert.match(moduleSource, /handleResubmit/);
  assert.match(operations, /useState\(INITIAL_EXPENSE_CLAIMS\)/);
  assert.match(operations, /useState\(INITIAL_EMPLOYEE_REQUESTS\)/);
  assert.match(operations, /useState\(INITIAL_TRANSFER_REQUESTS\)/);
});

test("builder, delegation, SLA, analytics and activity features disclose the runtime boundary", async () => {
  const [moduleSource, prototype, translations] = await Promise.all([
    readSource("../src/modules/WorkflowEngineModule.tsx"),
    readSource("../src/services/workflowPrototype.ts"),
    readSource("../src/data/workflowTranslations.ts")
  ]);
  for (const feature of [
    "workflow.builder.canvas_title",
    "workflow.history.title",
    "workflow.delegation.new_title",
    "workflow.analytics.status_mix",
    "workflow.activity.audit_title",
    "workflow.activity.notices"
  ]) assert.ok(moduleSource.includes(feature), `missing UI slice ${feature}`);
  assert.match(prototype, /export const getWorkflowSlaState/);
  assert.match(prototype, /remaining <= 8 \* 60 \* 60 \* 1000/);
  assert.match(prototype, /export const supportsLinearDemoExecution/);
  assert.match(moduleSource, /MANUAL_ESCALATION_LOGGED/);
  assert.match(moduleSource, /makeVersionSnapshot/);
  assert.match(moduleSource, /DELEGATION_CREATED_LOCAL/);
  assert.match(moduleSource, /role="tablist"/);
  assert.match(moduleSource, /role="tab"/);
  assert.match(moduleSource, /window\.sessionStorage\.setItem/);
  assert.match(moduleSource, /window\.sessionStorage\.getItem/);
  assert.match(translations, /No production authorization, durable audit, automatic SLA job, email\/SMS/);
  assert.match(translations, /condition, parallel, merge and delay nodes are saved and shown but are not interpreted/);
  assert.match(translations, /does not grant another person approval authority/);
});

test("workflow audit and decision register record the documentation conflicts and safe sign-off gates", async () => {
  const [audit, register] = await Promise.all([
    readSource("../WORKFLOW_REQUIREMENTS_AUDIT.md"),
    readSource("../WORKFLOW_POLICY_DECISION_REGISTER.md")
  ]);
  assert.match(audit, /Payroll threshold is inconsistent at exactly SAR 500,000/);
  assert.match(audit, /Leave routing uses conflicting graph language/);
  assert.match(audit, /High-value expense approval is ambiguous/);
  assert.match(audit, /Production-readiness gates/);
  assert.match(audit, /OperationsContext/);
  for (const decision of ["WD-01 · Payroll threshold", "WD-02 · Leave over seven days", "WD-03 · Expense amount bands", "WD-04 · Sick-leave auto-approval", "WD-06 · SLA calendar and escalation"]) {
    assert.ok(register.includes(decision), `missing policy sign-off item ${decision}`);
  }
  assert.match(register, /Safe interim behavior: notify\/escalate for human action/);
  assert.match(register, /Minimum sign-off record/);
});
