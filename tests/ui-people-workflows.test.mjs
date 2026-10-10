import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

const EMPLOYEE_MODULES = [
  "../src/modules/EmployeeModule.tsx",
  "../src/modules/EmployeeDirectoryModule.tsx",
  "../src/modules/EmployeePayrollModule.tsx",
  "../src/modules/EmployeeAttendanceModule.tsx",
  "../src/modules/EmployeeOnboardingModule.tsx"
];

const readPersonModules = async () => {
  const [shell, directory, payroll, attendance, onboarding] = await Promise.all([
    readSource("../src/modules/EmployeeModule.tsx"),
    readSource("../src/modules/EmployeeDirectoryModule.tsx"),
    readSource("../src/modules/EmployeePayrollModule.tsx"),
    readSource("../src/modules/EmployeeAttendanceModule.tsx"),
    readSource("../src/modules/EmployeeOnboardingModule.tsx")
  ]);
  return { shell, directory, payroll, attendance, onboarding };
};

test("employee module keeps its shell responsibilities and delegates tab panels to sub-modules", async () => {
  const { shell } = await readPersonModules();

  assert.match(shell, /formControlClassName, HorizontalBarChart/);
  assert.match(shell, /inlineFormControlClassName/);
  assert.match(shell, /className=\{`xl:col-span-4 \$\{surfaceClassName\} p-4 space-y-4`\}/);
  assert.match(shell, /className=\{`\$\{surfaceClassName\} p-4 space-y-4`\}/);

  assert.match(shell, /import \{ EmployeeDirectoryModule \} from "\.\/EmployeeDirectoryModule"/);
  assert.match(shell, /import \{ EmployeePayrollModule \} from "\.\/EmployeePayrollModule"/);
  assert.match(shell, /import \{ EmployeeAttendanceModule \} from "\.\/EmployeeAttendanceModule"/);
  assert.match(shell, /import \{ EmployeeOnboardingModule \} from "\.\/EmployeeOnboardingModule"/);

  assert.match(shell, /<EmployeeDirectoryModule/);
  assert.match(shell, /<EmployeePayrollModule/);
  assert.match(shell, /<EmployeeAttendanceModule/);
  assert.match(shell, /<EmployeeOnboardingModule/);
});

test("employee directory and onboarding share themed panels and form controls", async () => {
  const { shell, directory, onboarding } = await readPersonModules();

  assert.match(directory, /DataTableFrame, secondaryButtonClass/);
  assert.match(directory, /secondaryButtonClass\} min-h-9 gap-1.5 px-3 py-1.5 text-dynamic-xs/);

  assert.match(shell, /className=\{`\$\{surfaceClassName\} p-4 space-y-4`\}/);

  assert.match(onboarding, /formControlClassName, primaryButtonClass, secondaryButtonClass, surfaceClassName/);
  assert.match(onboarding, /className=\{formControlClassName\}/);
});

test("geofence status panel respects the selected page theme instead of sidebar colors", async () => {
  const { attendance } = await readPersonModules();
  assert.match(attendance, /<section className=\{`\$\{surfaceClassName\} space-y-4 p-4`\}>/);
  assert.match(attendance, /isGeoVerified \? "text-success-text" : "text-warning-text"/);
  assert.doesNotMatch(attendance, /bg-shell-nav|text-shell-nav/);
});

test("employee actions are consolidated in a focused, accessible hub with existing permission gates", async () => {
  const employee = await readSource("../src/modules/EmployeeModule.tsx");
  const hubStart = employee.indexOf("{employeeActionsOpen && (");
  const hubEnd = employee.indexOf("{/* RBAC-GATED EMPLOYEE IMPORT", hubStart);
  assert.ok(hubStart >= 0 && hubEnd > hubStart, "action hub JSX should exist before the existing import dialog");
  const hub = employee.slice(hubStart, hubEnd);

  assert.match(employee, /aria-haspopup="dialog"/);
  assert.match(employee, /aria-expanded=\{employeeActionsOpen\}/);
  assert.match(employee, /const employeeActionsDialogRef = useModalFocus\(employeeActionsOpen/);
  assert.match(hub, /role="dialog"/);
  assert.match(hub, /aria-modal="true"/);
  assert.match(hub, /ref=\{employeeActionsDialogRef\}/);
  assert.match(hub, /\{canOnboard && \(/);
  assert.equal((hub.match(/\{visibleTab === "directory" && canManageDirectory && \(/g) ?? []).length, 2);
  assert.match(employee, /if \(!canManageDirectory\) return;/);
  assert.match(employee, /if \(!canOnboard\) return;/);
  assert.match(hub, /setWpsBatchModalOpen\(true\)/);
});

test("employee action hub keeps CSV and XLSX workflows distinct and localized", async () => {
  const [employee, language] = await Promise.all([
    readSource("../src/modules/EmployeeModule.tsx"),
    readSource("../src/context/LanguageContext.tsx")
  ]);
  const hubStart = employee.indexOf("{employeeActionsOpen && (");
  const hubEnd = employee.indexOf("{/* RBAC-GATED EMPLOYEE IMPORT", hubStart);
  const hub = employee.slice(hubStart, hubEnd);

  assert.match(hub, /handleOpenImportModal\("CSV"\)/);
  assert.match(hub, /handleOpenImportModal\("XLSX"\)/);
  assert.match(employee, /accept=\{importFileAccept\}/);
  assert.match(employee, /fileExtension !== "csv"/);
  assert.match(employee, /fileExtension !== "xlsx"/);
  assert.match(hub, /handleDownloadEmployeeTemplate\("CSV"\)/);
  assert.match(hub, /handleDownloadEmployeeTemplate\("XLSX"\)/);
  assert.match(hub, /handleExportEmployees\("CSV"\)/);
  assert.match(hub, /handleExportEmployees\("XLSX"\)/);
  assert.match(language, /"emp.actions.title": "Employee actions"/);
  assert.match(language, /"emp.actions.title": "إجراءات الموظفين"/);
  assert.match(language, /"emp.import.accepted_csv": "CSV only/);
  assert.match(language, /"emp.import.accepted_xlsx": "XLSX only/);
  assert.match(language, /"emp.actions.wps_desc": "Open the existing preview\. It does not download a SIF file or submit anything to a bank\."/);
  assert.match(language, /"emp.actions.wps_desc": "افتح المعاينة الحالية\. لا يتم تنزيل ملف SIF أو إرساله إلى أي بنك\."/);
});

test("partial-roster views share the design system and retain their data notice", async () => {
  const partial = await readSource("../src/modules/PartialRosterDirectoryModule.tsx");
  assert.match(partial, /formControlClassName, PageHeader, primaryButtonClass, surfaceClassName/);
  assert.match(partial, /role="note" className="[^"]*border border-warning bg-warning-soft/);
  assert.match(partial, /className=\{`\$\{surfaceClassName\} min-w-0 overflow-hidden`\}/);
  assert.match(partial, /<caption className="sr-only">\{t\("emp\.partial\.table_caption"\)\}<\/caption>/);
});
