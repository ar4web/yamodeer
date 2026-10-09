import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Settings exposes persisted app-wide theme, shape, surface, and motion preferences", async () => {
  const [settings, theme, language, globalStyles, entry] = await Promise.all([
    readSource("../src/modules/MasterSettingsModule.tsx"),
    readSource("../src/context/ThemeContext.tsx"),
    readSource("../src/context/LanguageContext.tsx"),
    readSource("../src/appPreferences.css"),
    readSource("../src/main.tsx")
  ]);

  assert.match(settings, /id="settings-radius-scale"[\s\S]*?min=\{75\}[\s\S]*?max=\{125\}/);
  assert.match(settings, /setCustomOverrides\(\{ borderRadiusScale: Number\(event\.target\.value\) \/ 100 \}\)/);
  assert.match(settings, /surfaceStyles: SurfaceStyle\[\] = \["soft", "balanced", "defined"\]/);
  assert.match(settings, /disabled=\{resolvedMode === "high-contrast"\}/);
  assert.match(settings, /motionPreferences: MotionPreference\[\] = \["system", "reduced"\]/);
  assert.match(settings, /<PersonalizationPreview \/>/);
  assert.match(settings, /activePrimaryColor/);
  assert.match(settings, /resetCustomColor\("primaryColor"\)/);
  assert.match(settings, /resetCustomColor\("accentColor"\)/);
  assert.match(theme, /const DEFAULT_PREFERENCES: ThemePreferences = \{[\s\S]*?mode: "dark",[\s\S]*?palette: "soft-charcoal"/);
  assert.match(theme, /const resetCustomColor = useCallback/);
  assert.match(theme, /setProperty\("--color-border", activeBorder\)/);
  assert.match(theme, /setProperty\("--color-shell-nav-border", activeShellNavBorder\)/);
  assert.match(theme, /setProperty\("--shadow-card", activeCardShadow\)/);
  assert.match(theme, /root\.dataset\.motionPreference = prefs\.motionPreference/);
  assert.match(theme, /normalizeBorderRadiusScale\(rawOverrides\.borderRadiusScale\)/);
  assert.match(theme, /borderRadiusScale === undefined[\s\S]*?customOverrides/);
  assert.match(globalStyles, /prefers-reduced-motion: reduce/);
  assert.match(globalStyles, /data-motion-preference="reduced"/);
  assert.match(entry, /@\/appPreferences\.css/);
  assert.match(language, /These preferences apply across YaModeer and are saved in this browser only/);
  assert.match(language, /تُطبق هذه التفضيلات على واجهات YaModeer وتُحفظ في هذا المتصفح فقط/);
});

test("only the top navigation notification panel gets a slim theme-aware scrollbar", async () => {
  const [styles, notificationPanel] = await Promise.all([
    readSource("../src/appPreferences.css"),
    readSource("../src/components/NotificationCenterButton.tsx")
  ]);
  assert.match(styles, /\.notification-scrollbar\s*\{[^}]*scrollbar-width:\s*thin/);
  assert.match(styles, /\.notification-scrollbar::-webkit-scrollbar\s*\{[^}]*width:\s*6px/);
  assert.match(styles, /\.notification-scrollbar::-webkit-scrollbar-thumb:hover/);
  assert.match(styles, /\.notification-scrollbar\s*\{[^}]*scrollbar-color:\s*auto/);
  assert.doesNotMatch(styles, /\*\s*\{\s*scrollbar-width:/, "other app scrollbars should keep their native styling");
  assert.match(notificationPanel, /notification-scrollbar max-h-\[min\(65vh,30rem\)\] overflow-y-auto/);
});

test("Settings sections use a vertical responsive sidebar tablist without card styling", async () => {
  const settings = await readSource("../src/modules/MasterSettingsModule.tsx");
  const tabsStart = settings.indexOf("const SettingsSidebarTabs");
  const tabsEnd = settings.indexOf("const PersonalizationPreview", tabsStart);
  assert.ok(tabsStart >= 0 && tabsEnd > tabsStart, "Settings sidebar tabs should be present");
  const tabs = settings.slice(tabsStart, tabsEnd);

  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /aria-orientation="vertical"/);
  assert.match(tabs, /role="tab"/);
  assert.match(tabs, /aria-selected=\{selected\}/);
  assert.match(tabs, /border-s-2/);
  assert.match(tabs, /event\.key === "ArrowDown"/);
  assert.match(tabs, /event\.key === "Home"/);
  assert.doesNotMatch(tabs, /rounded-(?:xl|2xl)|shadow-card|bg-primary-soft/);
  assert.match(settings, /grid-cols-\[3\.75rem_minmax\(0,1fr\)\][\s\S]*?sm:grid-cols-\[12rem_minmax\(0,1fr\)\][\s\S]*?lg:grid-cols-\[14rem_minmax\(0,1fr\)\]/);
  assert.match(tabs, /min-h-12/);
  assert.match(tabs, /sr-only min-w-0 break-words sm:not-sr-only/);
  assert.match(settings, /<aside className="sticky top-4 max-h-\[calc\(100vh-2rem\)\] min-w-0 self-start overflow-y-auto">/);
  assert.match(settings, /<SettingsSidebarTabs value=\{activeTab\} onChange=\{setActiveTab\} \/>/);
  assert.match(settings, /border-b border-theme pb-3 sm:hidden/);
});

test("the live preview covers common component families and is explicitly not workspace data", async () => {
  const [settings, language] = await Promise.all([
    readSource("../src/modules/MasterSettingsModule.tsx"),
    readSource("../src/context/LanguageContext.tsx")
  ]);

  assert.match(settings, /const PersonalizationPreview/);
  assert.match(settings, /<MetricCard/);
  assert.match(settings, /primaryButtonClass/);
  assert.match(settings, /secondaryButtonClass/);
  assert.match(settings, /formControlClassName/);
  assert.match(settings, /<table className=/);
  assert.match(settings, /role="img" aria-label=\{t\("set\.theme\.preview\.chart_label"\)\}/);
  assert.match(settings, /rounded-full bg-success-soft/);
  assert.match(language, /A visual style sample only; it does not display workspace records/);
  assert.match(language, /هذه عينة مرئية للمظهر فقط ولا تعرض سجلات مساحة العمل/);

  for (const key of [
    "set.theme.component_style_title",
    "set.theme.radius_title",
    "set.theme.surface.soft",
    "set.theme.motion.reduced",
    "set.theme.preview.title"
  ]) {
    assert.equal(language.match(new RegExp(`"${key}":`, "g"))?.length, 2, `${key} should be localized in English and Arabic`);
  }
});
