import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("financial prototype notice is explicit and localized in both languages", async () => {
  const [designSystem, language] = await Promise.all([
    readSource("../src/components/DesignSystem.tsx"),
    readSource("../src/context/LanguageContext.tsx")
  ]);
  assert.match(designSystem, /export const PrototypeNotice[\s\S]*?role=\"note\"/);
  assert.match(designSystem, /border-warning\/40 bg-warning-soft[\s\S]*?text-warning-text/);
  assert.equal((language.match(/\"finance\.data_notice\"/g) ?? []).length, 2);
  assert.match(language, /Records and figures are illustrative[\s\S]*?local demo state/);
  assert.match(language, /السجلات والأرقام توضيحية[\s\S]*?حالة العرض المحلية/);
});

test("vendor, expenses, accounting, and compliance disclose their local-demo boundary", async () => {
  const modules = await Promise.all([
    readSource("../src/modules/VendorModule.tsx"),
    readSource("../src/modules/ExpenseModule.tsx"),
    readSource("../src/modules/AccountsModule.tsx"),
    readSource("../src/modules/ComplianceZatcaModule.tsx")
  ]);
  for (const source of modules) {
    assert.match(source, /<PrototypeNotice label=\{t\(\"app\.badge\.demo_data\"\)\}>\{t\(\"finance\.data_notice\"\)\}<\/PrototypeNotice>/);
  }
});

test("ZATCA sample identifiers and action copy cannot be mistaken for production issuance", async () => {
  const [blueprints, vendor, compliance, language] = await Promise.all([
    readSource("../src/data/mockBlueprints.ts"),
    readSource("../src/modules/VendorModule.tsx"),
    readSource("../src/modules/ComplianceZatcaModule.tsx"),
    readSource("../src/context/LanguageContext.tsx")
  ]);
  for (const source of [blueprints, vendor, compliance]) {
    assert.match(source, /CSID-DEMO-KSA-/);
    assert.doesNotMatch(source, /CSID-PROD-KSA-/);
  }
  assert.match(language, /nothing is submitted to ZATCA/);
  assert.match(language, /إضافة الفاتورة النموذجية إلى المعاينة المحلية/);
  assert.doesNotMatch(language, /Live ZATCA Phase 2 Invoice|Sign & Append Invoice to Phase 2 Chain/);
});

test("finance forms, panels, and semantic actions use shared design primitives", async () => {
  const [vendors, expenses, accounts, compliance, invoices] = await Promise.all([
    readSource("../src/modules/VendorModule.tsx"),
    readSource("../src/modules/ExpenseModule.tsx"),
    readSource("../src/modules/AccountsModule.tsx"),
    readSource("../src/modules/ComplianceZatcaModule.tsx"),
    readSource("../src/modules/InvoicingModule.tsx")
  ]);
  assert.match(vendors, /inlineFormControlClassName[\s\S]*?surfaceClassName/);
  assert.match(expenses, /successButtonClass[\s\S]*?dangerButtonClass/);
  assert.match(accounts, /formControlClassName[\s\S]*?surfaceClassName/);
  assert.match(compliance, /formControlClassName[\s\S]*?surfaceClassName/);
  assert.match(invoices, /invoice\.prototype\.notice/);
});
