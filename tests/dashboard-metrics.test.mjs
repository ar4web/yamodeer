import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const loadTypeScriptModule = async (path) => {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext
    }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
};

const [domain, workspace, metrics, preferences] = await Promise.all([
  loadTypeScriptModule("src/data/mockBlueprints.ts"),
  loadTypeScriptModule("src/data/workspaceBlueprints.ts"),
  loadTypeScriptModule("src/services/dashboardMetrics.ts"),
  loadTypeScriptModule("src/services/dashboardPreferences.ts")
]);

test("workforce KPIs and department composition derive from current employee records", () => {
  const snapshot = metrics.buildWorkforceSnapshot(domain.EMPLOYEE_GRID_BLUEPRINT);

  assert.equal(snapshot.total, 5); // The suspended sixth record is excluded; on-leave staff remain in headcount.
  assert.equal(snapshot.saudiCount, 3);
  assert.equal(snapshot.expatCount, 2);
  assert.equal(snapshot.onLeaveCount, 1);
  assert.equal(snapshot.saudiSharePercent, 60);
  assert.equal(snapshot.departments.reduce((total, department) => total + department.total, 0), 5);
});

test("attendance uses the latest recorded date, excludes suspended employees, and exposes roster coverage", () => {
  const snapshot = metrics.buildAttendanceSnapshot(
    workspace.ATTENDANCE_BLUEPRINT_DATA,
    domain.EMPLOYEE_GRID_BLUEPRINT
  );

  assert.equal(snapshot.latestDate, "2026-10-02");
  assert.equal(snapshot.workforceCount, 5);
  assert.equal(snapshot.recordedCount, 5);
  assert.equal(snapshot.attendedCount, 4);
  assert.deepEqual(snapshot.statusCounts, {
    PRESENT: 2,
    LATE: 1,
    REMOTE: 1,
    ABSENT: 1
  });
});

test("employees without attendance are not silently counted as absent", () => {
  const importedEmployee = {
    ...domain.EMPLOYEE_GRID_BLUEPRINT[0],
    id: "EMP-IMPORTED-9001",
    departmentCode: "HR_GOV"
  };
  const snapshot = metrics.buildAttendanceSnapshot(
    workspace.ATTENDANCE_BLUEPRINT_DATA,
    [...domain.EMPLOYEE_GRID_BLUEPRINT, importedEmployee]
  );

  assert.equal(snapshot.workforceCount, 6);
  assert.equal(snapshot.recordedCount, 5);
  assert.equal(snapshot.statusCounts.ABSENT, 1);
});

test("document renewal countdowns use the actual date and surface expired, upcoming, and valid records", () => {
  const asOf = new Date(2026, 9, 4, 12, 0, 0);
  const overdueEmployee = {
    ...domain.EMPLOYEE_GRID_BLUEPRINT[0],
    id: "EMP-OVERDUE-9001",
    idExpiryDateGregorian: "2026-09-28"
  };
  const invalidDateEmployee = {
    ...domain.EMPLOYEE_GRID_BLUEPRINT[0],
    id: "EMP-INVALID-DATE",
    idExpiryDateGregorian: "2026-02-30"
  };
  const records = metrics.getRenewalAttentionRecords(
    [...domain.EMPLOYEE_GRID_BLUEPRINT, overdueEmployee, invalidDateEmployee],
    asOf
  );

  assert.deepEqual(
    records.map(({ employee, daysRemaining }) => [employee.id, daysRemaining]),
    [
      ["EMP-OVERDUE-9001", -6],
      ["EMP-KSA-1002", 15],
      ["EMP-KSA-1004", 55],
      ["EMP-KSA-1005", 72]
    ]
  );
});

test("dashboard widget preferences default to enabled and hide empty widgets", () => {
  const defaults = preferences.normalizeDashboardPreferences(null);
  assert.equal(defaults.workforce_headcount.enabled, true);
  assert.equal(defaults.workforce_headcount.emptyBehavior, "HIDE");
  assert.equal(preferences.shouldShowDashboardWidget(defaults, "workforce_headcount", false), false);
  assert.equal(preferences.shouldShowDashboardWidget(defaults, "workforce_headcount", true), true);
});

test("dashboard widget preferences normalize partial or malformed saved data safely", () => {
  const normalized = preferences.parseDashboardPreferences(JSON.stringify({
    widgets: {
      workforce_headcount: { enabled: false, emptyBehavior: "SHOW_EMPTY_STATE" },
      attendance_mix: { enabled: "no", emptyBehavior: "INVALID" },
      ignored_widget: { enabled: false }
    }
  }));

  assert.deepEqual(normalized.workforce_headcount, {
    enabled: false,
    emptyBehavior: "SHOW_EMPTY_STATE"
  });
  assert.deepEqual(normalized.attendance_mix, { enabled: true, emptyBehavior: "HIDE" });
  assert.equal(preferences.parseDashboardPreferences("{bad json").pending_employee_requests.enabled, true);
  assert.equal(preferences.parseDashboardPreferences(null).financial_workflows.enabled, false);
});

test("dashboard widget preferences round-trip through browser-like storage", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const changed = preferences.normalizeDashboardPreferences({
    ...preferences.DEFAULT_DASHBOARD_PREFERENCES,
    attendance_mix: { enabled: false, emptyBehavior: "SHOW_EMPTY_STATE" }
  });

  preferences.saveDashboardPreferences(changed, storage);
  const loaded = preferences.loadDashboardPreferences(storage);
  assert.equal(loaded.attendance_mix.enabled, false);
  assert.equal(loaded.attendance_mix.emptyBehavior, "SHOW_EMPTY_STATE");
  assert.equal(preferences.shouldShowDashboardWidget(loaded, "attendance_mix", false), false);
});

test("dashboard no longer renders hardcoded snapshot totals or fake historical comparisons", async () => {
  const source = await readFile(new URL("../src/modules/DashboardModule.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /DASHBOARD_BLUEPRINT_DATA|DASHBOARD_PREVIOUS_SNAPSHOT_DATA/);
});
