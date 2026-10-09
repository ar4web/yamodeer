import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Compliance separates its two workflows and progressively discloses dense material", async () => {
  const source = await readSource("../src/modules/ComplianceZatcaModule.tsx");

  assert.match(source, /<ComplianceSidebarTabs[\s\S]*?laborEnabled=\{moduleToggles\.laborLawEngineEnabled\}[\s\S]*?zatcaEnabled=\{moduleToggles\.zatcaPhase2Enabled\}/);
  assert.match(source, /role="tablist" aria-label=\{t\("ui\.view_switcher"\)\} aria-orientation="vertical"/);
  assert.match(source, /grid min-w-0 grid-cols-\[3\.75rem_minmax\(0,1fr\)\] gap-2 sm:grid-cols-\[12rem_minmax\(0,1fr\)\] sm:gap-4 lg:grid-cols-\[14rem_minmax\(0,1fr\)\]/);
  assert.match(source, /xl:grid-cols-2 gap-4/);
  assert.match(source, /<details className=\{`\$\{surfaceClassName\} overflow-hidden`\}>[\s\S]*?comp\.eosb\.matrix_toggle/);
  assert.match(source, /zatca\.summary\.title[\s\S]*?zatca\.summary\.invoice[\s\S]*?zatca\.summary\.total[\s\S]*?zatca\.summary\.date/);
  assert.match(source, /<details className=\{`\$\{surfaceClassName\} overflow-hidden`\} open=\{Boolean\(selectedInvoiceNumber\)\}>/);
  assert.match(source, /zatca\.details_toggle/);
});

test("Compliance redesign preserves calculator, invoice-selection, QR, and local-builder behavior", async () => {
  const source = await readSource("../src/modules/ComplianceZatcaModule.tsx");

  for (const behavior of [
    "calculateKsaOvertime(",
    "calculateGosiContributions(",
    "calculateKsaEOSB(",
    "handleBindEmployee(e.target.value)",
    "toggleAppModule(\"ramadanModeEnabled\")",
    "setActiveInvoiceNo(e.target.value)",
    "setUblXmlModalOpen(true)",
    "handleEmitCustomTlvInvoice"
  ]) {
    assert.ok(source.includes(behavior), `Missing preserved Compliance behavior: ${behavior}`);
  }
  assert.match(source, /QRCode\.toCanvas[\s\S]*?dark: "#0f172a"[\s\S]*?light: "#ffffff"/);
  assert.match(source, /CSID-DEMO-KSA-/);
  assert.doesNotMatch(source, /CSID-PROD-KSA-/);
});

test("Compliance foregrounds pair with their semantic surfaces in both languages", async () => {
  const [source, language] = await Promise.all([
    readSource("../src/modules/ComplianceZatcaModule.tsx"),
    readSource("../src/context/LanguageContext.tsx")
  ]);

  assert.match(source, /bg-warning-soft[^\"]*text-warning-text/);
  assert.match(source, /bg-primary-soft p-3 flex items-center justify-between gap-3[\s\S]*?text-primary-text/);
  assert.match(source, /bg-surface-elevated px-4 py-4 text-dynamic-sm font-bold text-foreground/);
  assert.match(source, /bg-primary text-on-primary/);
  assert.doesNotMatch(source, /bg-warning-soft[^\"]*text-foreground/);

  assert.match(language, /"comp\.labor\.intro"[\s\S]*?All results are estimates for review/);
  assert.match(language, /"comp\.labor\.intro"[\s\S]*?جميع النتائج تقديرية للمراجعة/);
  assert.match(language, /"zatca\.sample_notice": "Sample invoice only\. Nothing is submitted to ZATCA\."/);
  assert.match(language, /"zatca\.sample_notice": "فاتورة نموذجية فقط\. لا يتم تقديم أي بيانات إلى زاتكا\."/);
  assert.equal((language.match(/"zatca\.sample_notice"/g) ?? []).length, 2);
});
