import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("every route shares a toolbar under the topbar with tools aligned to the end", async () => {
  const [shell, toolbar, designSystem, language] = await Promise.all([
    readSource("../src/components/MasterShell.tsx"),
    readSource("../src/components/WorkspaceToolbar.tsx"),
    readSource("../src/components/DesignSystem.tsx"),
    readSource("../src/context/LanguageContext.tsx")
  ]);

  assert.match(shell, /<WorkspaceToolbarProvider>/);
  assert.match(shell, /<WorkspaceToolbar fallbackTitle=\{t\(fallbackTitleKey\)\} \/>/);
  assert.match(shell, /<WorkspaceHelperMenu/);
  assert.match(shell, /sticky top-0 z-30 border-b border-theme bg-surface/);
  assert.match(toolbar, /data-workspace-toolbar="true"/);
  assert.match(toolbar, /ms-auto flex min-w-0 max-w-\[72%\] flex-wrap items-center justify-end gap-2/);
  assert.match(toolbar, /border-s-2 border-accent ps-3/);
  assert.match(toolbar, /data-workspace-helper="true"/);
  assert.match(toolbar, /role="dialog"/);
  assert.match(toolbar, /aria-modal="false"/);
  assert.match(toolbar, /fixed end-3 top-\[min\(52%,calc\(100dvh-8rem\)\)\]/);
  assert.doesNotMatch(toolbar, /from ["']@\/components\/DesignSystem["']/);
  assert.match(designSystem, /createPortal\(heading, targets.headingNode\)/);
  assert.match(designSystem, /createPortal\(tools, targets.toolsNode\)/);
  assert.match(designSystem, /createPortal\(helper, targets.helperNode\)/);
  assert.match(language, /"shell.workspace_toolbar": "Page toolbar"/);
  assert.match(language, /"shell.workspace_toolbar": "شريط أدوات الصفحة"/);
  assert.match(language, /"shell.helper.button": "Work menu"/);
  assert.match(language, /"shell.helper.button": "قائمة العمل"/);
});

test("Work Hub opens filters as a right-click menu instead of an edge rail", async () => {
  const [workHub, menu, language] = await Promise.all([
    readSource("../src/modules/WorkHubModule.tsx"),
    readSource("../src/components/ContextMenu.tsx"),
    readSource("../src/context/LanguageContext.tsx")
  ]);
  assert.match(workHub, /onContextMenu=\{openContextMenu\}/);
  assert.match(menu, /role="menu"/);
  assert.match(menu, /data-context-menu="true"/);
  assert.match(language, /"ui.context_menu": "Page menu"/);
  assert.match(language, /"ui.context_menu": "قائمة الصفحة"/);
});

test("page chrome keeps actions, not list filters", async () => {
  const [files, expenses, employees, vendors] = await Promise.all([
    readSource("../src/modules/FilesManagerModule.tsx"),
    readSource("../src/modules/ExpenseModule.tsx"),
    readSource("../src/modules/EmployeeModule.tsx"),
    readSource("../src/modules/VendorModule.tsx")
  ]);
  const headerOf = (source) => source.slice(source.indexOf("<PageHeader"), source.indexOf("<PrototypeNotice") === -1 ? source.indexOf("<ResponsiveFilterDrawer") : source.indexOf("<PrototypeNotice"));
  assert.doesNotMatch(headerOf(files), /file\.filter\.button|ui\.filters/);
  assert.doesNotMatch(headerOf(expenses), /ui\.filters/);
  assert.doesNotMatch(headerOf(employees), /ui\.filters/);
  assert.doesNotMatch(files, /FilterDrawerEdgeTrigger/);
  assert.doesNotMatch(expenses, /FilterDrawerEdgeTrigger/);
  assert.doesNotMatch(employees, /FilterDrawerEdgeTrigger/);
  assert.doesNotMatch(vendors, /FilterDrawerEdgeTrigger/);
  assert.match(files, /helper=\{/);
  assert.match(expenses, /helper=\{/);
  assert.match(employees, /helper=\{/);
});

test("dashboard surfaces status before the rest of the workspace", async () => {
  const dashboard = await readSource("../src/modules/DashboardModule.tsx");
  assert.match(dashboard, /aria-label=\{t\("dash.status.strip_label"\)\}/);
  assert.match(dashboard, /id="dashboard-attention-queue"/);
  assert.match(dashboard, /id="dashboard-company-filter"/);
  assert.match(dashboard, /onClick=\{\(\) => onNavigateModule\("employees"\)\}/);
});
