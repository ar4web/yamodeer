import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("the shell keeps identity chrome out of the workspace and routes preferences through Settings", async () => {
  const [shell, app, settings] = await Promise.all([
    readSource("../src/components/MasterShell.tsx"),
    readSource("../src/App.tsx"),
    readSource("../src/modules/MasterSettingsModule.tsx")
  ]);
  assert.doesNotMatch(shell, /UserProfileMenu/);
  assert.doesNotMatch(shell, /UserProfileModule/);
  assert.doesNotMatch(shell, /setActiveRoute\("profile"\)/);
  assert.doesNotMatch(shell, /key: "profile" as ModuleRouteKey/);
  assert.doesNotMatch(shell, /shell\.clock_in_btn/);
  assert.match(shell, /id="workspace-role"/);
  assert.match(shell, /<RBACRouteGuard[\s\S]*?route=\{activeRoute\}/);
  assert.match(settings, /setFontScale/);
  assert.match(settings, /setMotionPreference/);
  assert.match(app, /<NotificationCenterProvider>[\s\S]*?<MasterShell \/>[\s\S]*?<\/NotificationCenterProvider>/);
});

test("accessibility foundations include skip navigation, global focus treatment, forced colors and user controls", async () => {
  const [shell, css, settings, theme] = await Promise.all([
    readSource("../src/components/MasterShell.tsx"),
    readSource("../src/appPreferences.css"),
    readSource("../src/modules/MasterSettingsModule.tsx"),
    readSource("../src/context/ThemeContext.tsx")
  ]);
  assert.match(shell, /className="skip-link"/);
  assert.match(shell, /id="workspace-main"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /--ui-motion-ease/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)/);
  assert.match(css, /data-motion-preference="reduced"/);
  assert.match(shell, /app-page-enter/);
  assert.match(css, /app-panel-enter/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(settings, /setFontScale/);
  assert.match(settings, /setMotionPreference/);
  assert.match(settings, /"high-contrast"/);
  assert.match(theme, /type MotionPreference = "system" \| "reduced"/);
});

test("notification center is local, accessible, bilingual and connected to workflow demo actions", async () => {
  const [context, component, workflow, translations] = await Promise.all([
    readSource("../src/context/NotificationCenterContext.tsx"),
    readSource("../src/components/NotificationCenterButton.tsx"),
    readSource("../src/modules/WorkflowEngineModule.tsx"),
    readSource("../src/data/sharedUiTranslations.ts")
  ]);
  assert.match(context, /window\.sessionStorage/);
  assert.match(context, /setNotifications\(\(current\) => \[record, \.\.\.current\]\.slice\(0, 50\)\)/);
  assert.match(context, /setNotificationPreference/);
  assert.match(component, /aria-expanded=\{open\}/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /event\.key === "Escape"/);
  assert.match(component, /markAllNotificationsRead/);
  assert.match(workflow, /addNotification\(/);
  assert.match(translations, /"notifications\.panel_note": "Local in-app notices only/);
  assert.match(translations, /"notifications\.panel_note": "تنبيهات محلية داخل التطبيق فقط/);
  assert.match(translations, /"profile\.preferences\.title": "Accessibility & preferences/);
  assert.match(translations, /"profile\.preferences\.title": "إمكانية الوصول والتفضيلات/);
});

test("profile edits and notification settings clearly stay within the local browser prototype", async () => {
  const [profile, context, translations] = await Promise.all([
    readSource("../src/modules/UserProfileModule.tsx"),
    readSource("../src/context/NotificationCenterContext.tsx"),
    readSource("../src/data/sharedUiTranslations.ts")
  ]);
  assert.match(profile, /sessionStorage\.setItem\(PROFILE_STORAGE_KEY/);
  assert.doesNotMatch(profile, /<MetricCard|<article/, "the redundant profile display-mode article should not render in the first grid column");
  assert.match(profile, /setNotificationPreference\(key, event\.target\.checked\)/);
  assert.match(profile, /setMode\(event\.target\.value as ThemeMode\)/);
  assert.match(context, /yamodeer\.notifications\.v1/);
  assert.match(translations, /not a verified identity/);
  assert.match(translations, /do not update an employee record or identity provider/);
  assert.match(translations, /لا تُدخل بيانات شخصية حساسة/);
});
