import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("page hierarchy and metric cards use a restrained, palette-derived accent", async () => {
  const [designSystem, dashboard] = await Promise.all([
    readSource("../src/components/DesignSystem.tsx"),
    readSource("../src/modules/DashboardModule.tsx")
  ]);
  assert.match(designSystem, /border-s-2 border-accent ps-3/);
  assert.match(designSystem, /iconToneClassName\?: string/);
  assert.match(dashboard, /<MetricCard[\s\S]*?iconToneClassName=\{iconTone\}/);
  assert.match(dashboard, /tone=\"neutral\"/);
  assert.match(dashboard, /surfaceVariant=\"outlined\"/);
  assert.match(designSystem, /neutral: \{ icon: "bg-surface-muted text-muted", marker: "bg-surface-muted" \}/);
  assert.doesNotMatch(dashboard, /bg-gradient-to-r from-primary to-accent/);
  assert.doesNotMatch(dashboard, /hover:-translate-y/);
});

test("dashboard uses a full-width number-first layout and quieter nested surfaces", async () => {
  const [dashboard, designSystem] = await Promise.all([
    readSource("../src/modules/DashboardModule.tsx"),
    readSource("../src/components/DesignSystem.tsx")
  ]);
  assert.match(dashboard, /import \{ (?:AccessibleTooltip, )?formControlClassName, inlineFormControlClassName, MetricCard,[\s\S]*?secondaryButtonClass, surfaceClassName \}/);
  assert.match(dashboard, /max-w-screen-2xl/);
  assert.match(dashboard, /xl:grid-cols-2/);
  assert.match(dashboard, /sm:grid-cols-2 xl:grid-cols-4/);
  assert.match(dashboard, /className=\{`\$\{surfaceClassName\} p-5`\}/);
  assert.match(dashboard, /className=\{`\$\{inlineFormControlClassName\} min-w-40 text-dynamic-xs font-semibold`\}/);
  assert.doesNotMatch(dashboard, /rounded-lg border border-theme bg-surface-elevated p-3 text-start/);
  assert.match(designSystem, /export const surfaceClassName = \"rounded-lg border border-theme bg-surface shadow-card\"/);
  assert.match(designSystem, /export const quietSurfaceClassName = \"rounded-lg bg-surface shadow-card\"/);
  assert.match(designSystem, /surfaceVariant\?: \"standard\" \| \"quiet\" \| \"outlined\"/);
  assert.match(designSystem, /cardHoverClassName = surfaceVariant === \"standard\" \? \"transition-colors duration-200 hover:border-accent\"/);
  assert.match(designSystem, /noteBoundaryClassName = surfaceVariant === \"quiet\" \|\| !showNoteSeparator \? \"\" : \"border-t border-theme\"/);
});

test("shell search and navigation use consistent, accessible boundaries", async () => {
  const shell = await readSource("../src/components/MasterShell.tsx");
  assert.match(shell, /className=\{`\$\{formControlClassName\} h-10 ps-10 pe-4`\}/);
  assert.match(shell, /sticky top-0 z-30 border-b border-theme bg-surface/);
  assert.match(shell, /<header className=\"[^\"]*flex-col[^\"]*sm:flex-row/);
  assert.match(shell, /<footer className=\"[^\"]*border-t border-theme bg-surface/);
  assert.match(shell, /role=\"group\"\s+aria-label=\{t\(group\.labelKey\)\}/);
  assert.doesNotMatch(shell, /<p aria-hidden=\"true\" className=\"px-3 pt-3[^\"]*\">\s*\{t\(group\.labelKey\)\}/);
  assert.match(shell, /<nav className=\{`min-h-0 flex-1 space-y-1\.5 overflow-y-auto \$\{isMobileViewport \? "px-1\.5" : "px-3"\} py-3`\} aria-label=\{t\("shell\.navigation"\)\}>/);
  assert.match(shell, /groupIndex < sidebarGroups\.length - 1 \? "border-b border-shell-nav-border pb-2"/);
  assert.match(shell, /<IconComp aria-hidden="true" className="h-4 w-4" \/>/);
  assert.match(shell, /<IconComp aria-hidden=\"true\" className=\"h-4 w-4\" \/>/);
});

test("top toolbar, sidebar footer, brand area and shared action buttons use consistent responsive spacing", async () => {
  const [shell, settings, designSystem] = await Promise.all([
    readSource("../src/components/MasterShell.tsx"),
    readSource("../src/modules/MasterSettingsModule.tsx"),
    readSource("../src/components/DesignSystem.tsx")
  ]);
  assert.match(shell, /<header className="[^\"]*flex-col[^\"]*gap-2[^\"]*sm:flex-row[^\"]*sm:gap-3/);
  assert.match(shell, /shell-topbar-controls[^\"]*flex-wrap[^\"]*justify-end[^\"]*gap-1[^\"]*sm:w-auto[^\"]*sm:gap-2/);
  assert.match(shell, /mx-2 flex min-h-16 items-center gap-3 border-b/);
  assert.match(shell, /min-h-0 flex-1 space-y-1\.5 overflow-y-auto/);
  assert.doesNotMatch(shell, /space-y-2\.5 border-t border-shell-nav-border/);
  assert.match(shell, /id="workspace-role"/);
  assert.match(settings, /flex min-w-0 flex-col items-stretch gap-1\.5 border-e border-theme/);
  assert.match(designSystem, /primaryButtonClass =\s*"[^\"]*min-h-11[^\"]*gap-2\.5/);
  assert.match(designSystem, /secondaryButtonClass =\s*"[^\"]*min-h-11[^\"]*gap-2\.5/);
});
