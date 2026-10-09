import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("dashboard distributions are responsive, data-driven, and have readable labels", async () => {
  const dashboard = await readSource("../src/modules/DashboardModule.tsx");

  assert.match(dashboard, /const DistributionBarChart/);
  assert.match(dashboard, /const DonutChart/);
  assert.match(dashboard, /role="img"[\s\S]*?aria-label=\{ariaSummary \|\| centerLabel\}/);
  assert.match(dashboard, /strokeDasharray=\{`\$\{arc\.length\} \$\{circumference - arc\.length\}`\}/);
  assert.match(dashboard, /<DonutChart segments=\{workforceStatusSegments\}/);
  assert.match(dashboard, /width: `\$\{\(segment\.value \/ total\) \* 100\}%`/);
  assert.match(dashboard, /formatNumber\(total \? \(segment\.value \/ total\) \* 100 : 0, language, 1\)/);
  assert.equal((dashboard.match(/<DistributionBarChart/g) ?? []).length, 2);
  const attendancePalette = dashboard.match(/const attendanceParts = \[([\s\S]*?)\] as const;/)?.[1];
  assert.ok(attendancePalette);
  for (const color of ["success", "warning", "accent", "danger"]) {
    assert.match(attendancePalette, new RegExp(`DASHBOARD_SEMANTIC_COLORS\\.${color}`));
  }
  assert.match(dashboard, /const DASHBOARD_SEMANTIC_COLORS = \{/);
  for (const color of ["primary", "accent", "success", "warning", "danger"]) {
    assert.match(dashboard, new RegExp(`${color}: "var\\(--color-${color}\\)"`));
  }
  assert.doesNotMatch(dashboard, /DASHBOARD_PREVIOUS_SNAPSHOT_DATA|vs last week|vs last month/);
});

test("dashboard color coding follows semantic meaning and keeps detailed charts collapsible", async () => {
  const [dashboard, designSystem] = await Promise.all([
    readSource("../src/modules/DashboardModule.tsx"),
    readSource("../src/components/DesignSystem.tsx")
  ]);

  assert.match(dashboard, /<article className=\{`\$\{surfaceClassName\} p-5`\}>/);
  assert.match(dashboard, /divide-y divide-theme sm:grid-cols-2/);
  assert.match(dashboard, /backgroundColor: DASHBOARD_SEMANTIC_COLORS\.primary/);
  assert.match(dashboard, /backgroundColor: DASHBOARD_SEMANTIC_COLORS\.accent/);
  assert.match(dashboard, /DASHBOARD_SEMANTIC_COLORS\.success/);
  assert.match(dashboard, /DASHBOARD_SEMANTIC_COLORS\.warning/);
  assert.match(dashboard, /DASHBOARD_SEMANTIC_COLORS\.danger/);
  assert.match(designSystem, /neutral: \{ icon: "bg-surface-muted text-muted", marker: "bg-surface-muted" \}/);
  assert.match(designSystem, /surfaceVariant\?: "standard" \| "quiet" \| "outlined"/);
  assert.match(dashboard, /showNoteSeparator=\{false\}/);
  assert.match(dashboard, /valueSize="3xl"/);
  const workflowIndex = dashboard.indexOf("{showWorkflowSection && (");
  const breakdownIndex = dashboard.indexOf("<details className=\"group\">");
  assert.ok(breakdownIndex > workflowIndex, "detailed charts should follow the primary metrics and workflow items");
});

test("dashboard and widget-settings widths stay comfortable across the existing shell breakpoints", async () => {
  const [dashboard, settings] = await Promise.all([
    readSource("../src/modules/DashboardModule.tsx"),
    readSource("../src/components/DashboardWidgetSettingsPanel.tsx")
  ]);

  assert.match(dashboard, /max-w-screen-2xl/);
  assert.match(dashboard, /grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4/);
  assert.match(dashboard, /showStatusMixChart && showNationalityMixChart \? "xl:grid-cols-2"/);
  assert.match(dashboard, /minmax\(0,1\.15fr\)_minmax\(320px,0\.85fr\)/);
  assert.match(settings, /grid grid-cols-1 gap-3 xl:grid-cols-2/);
  assert.match(settings, /set\.dashboard\.group\.workforce/);
  assert.match(settings, /set\.dashboard\.group\.attendance/);
  assert.match(settings, /set\.dashboard\.group\.workflows/);
});

test("dashboard and roster guidance are available through bilingual accessible tooltips", async () => {
  const [settings, language, designSystem] = await Promise.all([
    readSource("../src/components/DashboardWidgetSettingsPanel.tsx"),
    readSource("../src/context/LanguageContext.tsx"),
    readSource("../src/components/DesignSystem.tsx")
  ]);

  assert.match(settings, /import \{ AccessibleTooltip \} from "@\/components\/DesignSystem"/);
  assert.doesNotMatch(settings, /const InfoTooltip/);
  assert.match(settings, /<AccessibleTooltip label=\{t\("set\.dashboard\.help_label"\)\}>[\s\S]*?t\("set\.dashboard\.description"\)[\s\S]*?t\("set\.dashboard\.access\.note"\)[\s\S]*?t\("set\.dashboard\.local_storage_note"\)/);
  assert.match(designSystem, /aria-describedby=\{tooltipId\}/);
  assert.match(designSystem, /role="tooltip"/);
  assert.match(designSystem, /onFocus=\{\(\) => setFocused\(true\)\}/);
  assert.match(designSystem, /aria-expanded=\{isOpen\}/);
  assert.match(designSystem, /event\.key === "Escape"/);
  assert.match(designSystem, /className=\{`fixed z-50 rounded-xl/);
  const rosterStart = settings.indexOf("const RosterImportPanel");
  const rosterEnd = settings.indexOf("type DashboardWidgetGroupId", rosterStart);
  const rosterPanel = settings.slice(rosterStart, rosterEnd);
  assert.match(rosterPanel, /<AccessibleTooltip label=\{t\("set\.roster\.import\.help_label"\)\}>[\s\S]*?t\("set\.roster\.import\.description"\)[\s\S]*?t\("set\.roster\.import\.privacy_note"\)/);
  assert.match(rosterPanel, /accept="\.csv,\.txt,text\/csv,text\/plain"/);
  assert.doesNotMatch(rosterPanel, /role="note" className="mt-4/);
  assert.match(language, /"set\.roster\.import\.help_label": "About partial roster import"/);
  assert.match(language, /"set\.roster\.import\.help_label": "حول استيراد سجل جزئي للموظفين"/);
  const headerStart = settings.indexOf("export const DashboardWidgetSettingsPanel");
  const headerEnd = settings.indexOf("<RosterImportPanel", headerStart);
  assert.doesNotMatch(settings.slice(headerStart, headerEnd), /role="note"/);
  assert.match(language, /"set\.dashboard\.help_label": "Dashboard widget information"/);
  assert.match(language, /"set\.dashboard\.help_label": "معلومات عناصر لوحة المعلومات"/);
});

test("dashboard source and editing access continue to follow existing role permissions", async () => {
  const [dashboard, settings, language] = await Promise.all([
    readSource("../src/modules/DashboardModule.tsx"),
    readSource("../src/components/DashboardWidgetSettingsPanel.tsx"),
    readSource("../src/context/LanguageContext.tsx")
  ]);

  assert.match(dashboard, /const canViewEmployees = hasPermission\("route:employees"\)/);
  assert.match(dashboard, /const canViewExpenses = hasPermission\("route:expenses"\)/);
  assert.match(dashboard, /const canViewFinancials = hasPermission\("route:accounts"\)/);
  assert.match(dashboard, /if \(isEmployee\)/);
  assert.match(dashboard, /hasPermission\("route:settings"\) && hasPermission\("system:app_store_toggles"\)/);
  assert.match(settings, /const canManage = hasPermission\("system:app_store_toggles"\)/);
  assert.match(settings, /set\.dashboard\.access\.note/);
  assert.match(settings, /set\.dashboard\.access\.\$\{widget\.accessKey\}/);
  assert.match(language, /"set\.dashboard\.access\.note"[\s\S]*?prototype state in this browser/);
  assert.match(language, /"set\.dashboard\.access\.note"[\s\S]*?حالة نموذجية في هذا المتصفح/);

  const widgetDefinitions = settings.slice(settings.indexOf("const WIDGETS"), settings.indexOf("const WIDGET_GROUPS"));
  for (const [widgetId, accessKey] of [
    ["workforce_headcount", "employees"],
    ["saudi_workforce_share", "employees"],
    ["workforce_status_mix", "employees"],
    ["workforce_nationality_mix", "employees"],
    ["attendance_latest_day", "employees"],
    ["workforce_by_department", "employees"],
    ["attendance_mix", "employees"],
    ["pending_employee_requests", "employees"],
    ["document_renewals", "employees"],
    ["pending_expenses", "expenses"],
    ["financial_workflows", "accounts"],
    ["needs_attention_total", "permitted_sources"]
  ]) {
    const entry = new RegExp(`\\{\\s*id: "${widgetId}",([\\s\\S]*?)\\n  \\}`).exec(widgetDefinitions)?.[1];
    assert.ok(entry, `Expected a settings card for ${widgetId}`);
    assert.match(entry, new RegExp(`accessKey: "${accessKey}"`));
  }
});

test("dashboard widget visibility preserves the RBAC permission matrix by role", async () => {
  const source = await readSource("../src/context/RBACGeofenceContext.tsx");
  const matrixSource = source.slice(
    source.indexOf("export const RBAC_ACCESS_MATRIX"),
    source.indexOf("export interface OfficeGeofenceProfile")
  );
  const rolePermissions = (role) => {
    const roleBlock = new RegExp(`\\b${role}: \\{([\\s\\S]*?)\\n  \\}`).exec(matrixSource)?.[1];
    assert.ok(roleBlock, `Expected an RBAC block for ${role}`);
    return Object.fromEntries(
      [...roleBlock.matchAll(/^\s+"([^"]+)": (true|false),?$/gm)].map(([, scope, allowed]) => [scope, allowed === "true"])
    );
  };
  const roles = Object.fromEntries(["SUPER_ADMIN", "ADMIN", "HR_OPS", "MANAGER", "EMPLOYEE"].map((role) => [role, rolePermissions(role)]));

  for (const role of ["SUPER_ADMIN", "ADMIN", "HR_OPS", "MANAGER"]) {
    assert.equal(roles[role]["route:employees"], true, `${role} keeps workforce dashboard access`);
    assert.equal(roles[role]["route:expenses"], true, `${role} keeps expense dashboard access`);
  }
  for (const role of ["SUPER_ADMIN", "ADMIN"]) {
    assert.equal(roles[role]["route:accounts"], true, `${role} keeps financial dashboard access`);
    assert.equal(roles[role]["route:settings"], true, `${role} keeps settings access`);
  }
  assert.equal(roles.SUPER_ADMIN["system:app_store_toggles"], true);
  for (const role of ["ADMIN", "HR_OPS", "MANAGER", "EMPLOYEE"]) {
    assert.equal(roles[role]["system:app_store_toggles"], false, `${role} must not gain widget/roster administration`);
  }
  for (const role of ["HR_OPS", "MANAGER", "EMPLOYEE"]) {
    assert.equal(roles[role]["route:accounts"], false, `${role} keeps financial dashboard data hidden`);
  }
  assert.equal(roles.EMPLOYEE["route:employees"], false, "employee remains on the personal dashboard view");
  assert.equal(roles.EMPLOYEE["route:expenses"], true, "the prototype expense route permission remains unchanged");
});
