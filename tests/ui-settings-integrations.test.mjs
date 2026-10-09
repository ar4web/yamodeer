import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Settings exposes a bilingual Saudi HRMS integration catalog without live connections", async () => {
  const [settings, panel, shell, language] = await Promise.all([
    readSource("../src/modules/MasterSettingsModule.tsx"),
    readSource("../src/components/IntegrationCatalogPanel.tsx"),
    readSource("../src/components/MasterShell.tsx"),
    readSource("../src/context/LanguageContext.tsx")
  ]);

  assert.match(settings, /"integrations"/);
  assert.match(settings, /set\.tab\.integrations/);
  assert.match(settings, /id="settings-integrations-panel" labelledBy="settings-integrations-tab"/);
  assert.match(settings, /<IntegrationCatalogPanel \/>/);
  assert.match(shell, /"integrations" \| "rbac_matrix"/);
  assert.match(panel, /set\.integrations\.no_live_connections/);
  assert.match(panel, /set\.integrations\.readiness\.1/);
  assert.match(panel, /set\.integrations\.readiness\.5/);
  assert.match(panel, /target="_blank"/);
  assert.match(panel, /rel="noreferrer noopener"/);
  assert.doesNotMatch(panel, /\bfetch\s*\(|axios|XMLHttpRequest|localStorage|sessionStorage/);
  assert.doesNotMatch(panel, /type="password"|api[_-]?key|client[_-]?secret/i);

  for (const id of [
    "qiwa",
    "gosi",
    "mudad",
    "zatca",
    "muqeem",
    "absher_business",
    "chi_nphies_hidp",
    "open_data"
  ]) {
    assert.match(panel, new RegExp(`id: "${id}"`), `${id} should be present in the catalog`);
  }

  const translationKeys = new Set([
    ...[...settings.matchAll(/"(set\.tab\.integrations(?:\.[^"]+)?)"/g)].map(([, key]) => key),
    ...[...panel.matchAll(/"(set\.integrations\.[^"]+)"/g)].map(([, key]) => key),
    ...["labor", "payroll", "residency", "insurance", "open_data"].map((category) => `set.integrations.category.${category}`)
  ]);
  for (const key of translationKeys) {
    assert.equal(language.match(new RegExp(`"${key}":`, "g"))?.length, 2, `${key} should be localized in English and Arabic`);
  }

  assert.match(language, /A legally required business workflow does not mean that a public API exists/);
  assert.match(language, /لا يعني وجوب إجراء تجاري نظامي وجود واجهة API عامة/);
  assert.match(language, /A public developer API is not verified in this catalog/);
  assert.match(language, /لم يتم التحقق في هذا الفهرس من واجهة مطورين عامة/);
});
