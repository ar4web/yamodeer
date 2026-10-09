import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("the full dashboard demo disclosure is compact and available from an accessible tooltip", async () => {
  const [dashboard, designSystem, language] = await Promise.all([
    readSource("../src/modules/DashboardModule.tsx"),
    readSource("../src/components/DesignSystem.tsx"),
    readSource("../src/context/LanguageContext.tsx")
  ]);

  assert.match(dashboard, /<AccessibleTooltip label=\{t\("dash\.data_notice\.demo_help_label"\)\}>\s*\{t\("dash\.data_notice\.demo"\)\}\s*<\/AccessibleTooltip>/);
  assert.match(dashboard, /!demoModeActive && \(\s*<div role="note"/);
  assert.match(dashboard, /"dash\.data_notice\.demo_badge"/);
  assert.match(designSystem, /aria-describedby=\{tooltipId\}/);
  assert.match(designSystem, /aria-expanded=\{isOpen\}/);
  assert.match(designSystem, /const handleTooltipMouseEnter = useCallback\(\(\) => \{[\s\S]*?setHovered\(true\)/);
  assert.match(designSystem, /onMouseEnter=\{handleTooltipMouseEnter\}/);
  assert.match(designSystem, /onFocus=\{\(\) => setFocused\(true\)\}/);
  assert.match(designSystem, /event\.key === "Escape"/);
  assert.match(designSystem, /role="tooltip"/);
  assert.match(designSystem, /useLayoutEffect/);
  assert.match(designSystem, /const maxLeft = Math\.max\(margin, viewportWidth - margin - width\)/);
  assert.match(designSystem, /className=\{`fixed z-50 rounded-xl/);
  assert.doesNotMatch(designSystem, /className=\{`absolute start-0 top-full z-50 mt-2/);
  assert.equal(language.match(/"dash\.data_notice\.demo_help_label":/g)?.length, 2);
  assert.match(language, /"dash\.data_notice\.demo_badge": "DEMO PREVIEW"/);
  assert.match(language, /"dash\.data_notice\.demo_help_label": "تفاصيل بيانات المعاينة التجريبية"/);
});
