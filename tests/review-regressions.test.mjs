import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { Document, Paragraph, Packer } from "docx";
import { parseApiPort, resolveLocalApiBinding } from "../backend/config.mjs";

const typeScriptModuleUrl = async (path, importReplacements = {}) => {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  let output = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext
    }
  }).outputText;
  for (const [specifier, replacement] of Object.entries(importReplacements)) {
    output = output.replaceAll(`from "${specifier}"`, `from "${replacement}"`);
  }
  return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
};

const loadTypeScriptModule = async (path, importReplacements = {}) =>
  import(await typeScriptModuleUrl(path, importReplacements));

const domain = await loadTypeScriptModule("src/data/mockBlueprints.ts");
const mockBlueprintsModuleUrl = await typeScriptModuleUrl("src/data/mockBlueprints.ts");
const invoiceWorkspace = await loadTypeScriptModule("src/services/invoiceWorkspace.ts", {
  "@/data/mockBlueprints": mockBlueprintsModuleUrl
});
const employeeImport = await loadTypeScriptModule("src/services/employeeImport.ts");
const sidebarSizing = await loadTypeScriptModule("src/services/sidebarSizing.ts");

const createSourceRows = (values) => {
  const columns = employeeImport.EMPLOYEE_IMPORT_COLUMNS;
  return [
    { rowNumber: 1, values: columns.map((column) => column.aliases[0]) },
    { rowNumber: 2, values: columns.map((column) => values[column.key] ?? "") }
  ];
};

const newEmployeeValues = {
  id: "EMP-KSA-9911",
  nameEn: "Test User",
  nameAr: "مستخدم تجريبي",
  nationality: "SAUDI",
  nationalIdOrIqama: "1999999999",
  idExpiryDateGregorian: "2030-01-01",
  idExpiryDateHijri: "",
  jobTitleEn: "Analyst",
  jobTitleAr: "محلل",
  departmentCode: "HR_GOV",
  nitaqatClass: "PLATINUM",
  gosiNumber: "GOSI-TEST-9911",
  qiwaContractId: "QIWA-TEST-9911",
  basicSalarySar: "10000",
  housingAllowanceSar: "2000",
  transportAllowanceSar: "1000",
  ibanNumber: "SA1234567890123456789012",
  status: "ACTIVE",
  locationEn: "Riyadh",
  locationAr: "الرياض",
  laptopTag: "LT-9911",
  smartBadgeId: "BD-9911",
  corporateSim: "SIM-9911"
};

test("standard overtime follows the documented 1.5x formula", () => {
  const result = domain.calculateKsaOvertime(24000, 8, 0);
  assert.equal(result.hourlyBasicRate, 100);
  assert.equal(result.standardOvertimePay, 1200);
  assert.equal(result.grandTotalOvertimePay, 1200);
});

test("overtime, GOSI, and EOSB reject negative and non-finite inputs", () => {
  assert.throws(() => domain.calculateKsaOvertime(24000, -8, 0), RangeError);
  assert.throws(() => domain.calculateKsaOvertime(Number.NaN, 1, 0), RangeError);
  assert.throws(() => domain.calculateGosiContributions(true, -1000, 0), RangeError);
  assert.throws(() => domain.calculateGosiContributions(false, 1000, Number.POSITIVE_INFINITY), RangeError);
  assert.throws(() => domain.calculateKsaEOSB(10000, -1, "RESIGNATION"), RangeError);
});

test("Saudi and expatriate GOSI rates remain correct for valid inputs", () => {
  const saudi = domain.calculateGosiContributions(true, 20000, 5000);
  const expat = domain.calculateGosiContributions(false, 20000, 5000);
  assert.equal(saudi.employeeDeductionSar, 2500);
  assert.equal(saudi.employerContributionSar, 2500);
  assert.equal(expat.employeeDeductionSar, 0);
  assert.equal(expat.employerContributionSar, 500);
});

test("VAT calculation preserves halala precision and rejects invalid values", () => {
  assert.equal(domain.calculateVatAmountSar(12.34), 1.85);
  assert.equal(domain.calculateVatAmountSar(240000), 36000);
  assert.equal(domain.calculateVatAmountSar(1.005, 1), 1.01);
  assert.throws(() => domain.calculateVatAmountSar(-1), RangeError);
  assert.throws(() => domain.calculateVatAmountSar(1, 1.5), RangeError);
});

test("client lookup and received-PO selection keep pending orders separate", async () => {
  const matches = await invoiceWorkspace.searchClients("310123456700003");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, "CLIENT-1001");

  const orders = await invoiceWorkspace.fetchClientPurchaseOrders("CLIENT-1001");
  assert.equal(orders.filter((order) => order.status === "RECEIVED").length, 1);
  assert.equal(orders.filter((order) => order.status === "AWAITING_RECEIPT").length, 1);
});

test("invoice line and total calculations preserve halala precision", () => {
  const lines = invoiceWorkspace.calculateInvoiceLines([
    {
      id: "line-1",
      descriptionEn: "Managed services",
      descriptionAr: "الخدمات المُدارة",
      quantity: 2,
      unitPriceSar: 150.125,
      vatRatePercent: 15
    },
    {
      id: "line-2",
      descriptionEn: "Configuration",
      descriptionAr: "التهيئة",
      quantity: 1,
      unitPriceSar: 0.04,
      vatRatePercent: 15
    }
  ]);
  assert.deepEqual(
    lines.map(({ netAmountSar, vatAmountSar, totalAmountSar }) => ({ netAmountSar, vatAmountSar, totalAmountSar })),
    [
      { netAmountSar: 300.25, vatAmountSar: 45.04, totalAmountSar: 345.29 },
      { netAmountSar: 0.04, vatAmountSar: 0.01, totalAmountSar: 0.05 }
    ]
  );
  assert.deepEqual(invoiceWorkspace.calculateInvoiceTotals(lines), {
    taxableSubtotalSar: 300.29,
    totalVatSar: 45.05,
    grandTotalSar: 345.34
  });
});

test("invoice payment terms calculate due dates and expired or unreceived POs are ineligible", () => {
  assert.equal(invoiceWorkspace.calculateInvoiceDueDate("2026-10-07", 30), "2026-11-06");
  assert.equal(invoiceWorkspace.calculateInvoiceDueDate("2026-12-31", 0), "2026-12-31");
  assert.throws(() => invoiceWorkspace.calculateInvoiceDueDate("2026-02-30", 30), RangeError);
  assert.throws(() => invoiceWorkspace.calculateInvoiceDueDate("2026-10-07", -1), RangeError);

  const receivedOrder = invoiceWorkspace.CLIENT_PURCHASE_ORDERS.find((order) => order.status === "RECEIVED");
  const awaitingOrder = invoiceWorkspace.CLIENT_PURCHASE_ORDERS.find((order) => order.status === "AWAITING_RECEIPT");
  assert.ok(receivedOrder);
  assert.ok(awaitingOrder);
  assert.equal(invoiceWorkspace.isPurchaseOrderInvoiceEligible(receivedOrder, receivedOrder.validUntilIso), true);
  assert.equal(invoiceWorkspace.isPurchaseOrderInvoiceEligible(receivedOrder, "2027-01-01"), false);
  assert.equal(invoiceWorkspace.isPurchaseOrderInvoiceEligible(awaitingOrder, "2026-10-07"), false);
});

test("invoice drafts reject incomplete bilingual lines and invalid amounts", () => {
  assert.throws(
    () => invoiceWorkspace.calculateInvoiceLines([{
      id: "line-bad",
      descriptionEn: "Service",
      descriptionAr: "",
      quantity: 1,
      unitPriceSar: 100,
      vatRatePercent: 15
    }]),
    TypeError
  );
  assert.throws(
    () => invoiceWorkspace.calculateInvoiceLines([{
      id: "line-bad",
      descriptionEn: "Service",
      descriptionAr: "خدمة",
      quantity: 0,
      unitPriceSar: 100,
      vatRatePercent: 15
    }]),
    RangeError
  );
});

test("TLV UTF-8 lengths round-trip at the one-byte boundaries", () => {
  for (const size of [1, 254, 255]) {
    const value = "A".repeat(size);
    const segment = domain.encodeZatcaTlvHexSegment(1, value);
    assert.equal(segment.slice(2, 4), size.toString(16).padStart(2, "0").toUpperCase());
    const [decoded] = domain.decodeZatcaTlvHexArray([segment]);
    assert.equal(decoded.byteLength, size);
    assert.equal(decoded.utf8Value, value);
  }
  const arabicSegment = domain.encodeZatcaTlvHexSegment(1, "مرحبا");
  assert.equal(domain.decodeZatcaTlvHexArray([arabicSegment])[0].utf8Value, "مرحبا");
});

test("seeded invoice TLV arrays remain structurally valid", () => {
  for (const invoice of domain.ZATCA_INVOICE_BLUEPRINTS) {
    assert.equal(domain.decodeZatcaTlvHexArray(invoice.tlvHexArray).length, 8);
    assert.ok(domain.tlvHexArrayToBase64(invoice.tlvHexArray).length > 0);
  }
});

test("TLV encoder and Base64 conversion fail closed for overflow or malformed hex", () => {
  assert.throws(() => domain.encodeZatcaTlvHexSegment(1, "A".repeat(256)), RangeError);
  assert.throws(() => domain.encodeZatcaTlvHexSegment(1, ""), TypeError);
  assert.throws(() => domain.encodeZatcaTlvHexSegment(256, "x"), RangeError);
  assert.throws(() => domain.decodeZatcaTlvHexArray(["GGGG"]), TypeError);
  assert.throws(() => domain.decodeZatcaTlvHexArray(["0102AA"]), RangeError);
  assert.throws(() => domain.tlvHexArrayToBase64(["GGGG"]), TypeError);
  assert.throws(() => domain.tlvHexArrayToBase64([]), TypeError);
  assert.equal(domain.tlvHexArrayToBase64([domain.encodeZatcaTlvHexSegment(1, "A")]), "AQFB");
});

test("employee import preview rejects existing records and impossible dates", () => {
  const existing = employeeImport.buildEmployeeImportPreview(
    createSourceRows({
      ...newEmployeeValues,
      id: "EMP-KSA-1001",
      nationalIdOrIqama: "1084920174",
      qiwaContractId: "QIWA-2026-88412"
    }),
    domain.EMPLOYEE_GRID_BLUEPRINT
  );
  assert.equal(existing.validEmployees.length, 0);
  assert.ok(existing.errorCount > 0);

  const impossibleDate = employeeImport.buildEmployeeImportPreview(
    createSourceRows({
      ...newEmployeeValues,
      id: "EMP-KSA-9912",
      nationalIdOrIqama: "1999999998",
      qiwaContractId: "QIWA-TEST-9912",
      idExpiryDateGregorian: "2030-02-30"
    }),
    domain.EMPLOYEE_GRID_BLUEPRINT
  );
  assert.equal(impossibleDate.validEmployees.length, 0);
  assert.ok(impossibleDate.errorCount > 0);
});

test("local API binding ignores non-loopback host overrides", () => {
  assert.deepEqual(resolveLocalApiBinding(undefined), {
    host: "127.0.0.1",
    ignoredHostOverride: false
  });
  assert.deepEqual(resolveLocalApiBinding("127.0.0.1"), {
    host: "127.0.0.1",
    ignoredHostOverride: false
  });
  assert.deepEqual(resolveLocalApiBinding("0.0.0.0"), {
    host: "127.0.0.1",
    ignoredHostOverride: true
  });
});

test("local API port parsing accepts TCP ports and rejects invalid values", () => {
  assert.equal(parseApiPort(), 8787);
  assert.equal(parseApiPort("1"), 1);
  assert.equal(parseApiPort("65535"), 65535);
  for (const value of ["", "not-a-port", "0", "65536", "1.5"]) {
    assert.throws(() => parseApiPort(value), RangeError);
  }
});

test("sidebar drag widths persist continuously and clamp within the saved range", () => {
  assert.equal(sidebarSizing.clampSidebarWidth(207.4), 207);
  assert.equal(sidebarSizing.clampSidebarWidth(40), 80);
  assert.equal(sidebarSizing.clampSidebarWidth(400), 336);
  assert.equal(sidebarSizing.restoreSidebarWidth(207), 207);
  assert.equal(sidebarSizing.restoreSidebarWidth(336), 336);
  assert.equal(sidebarSizing.restoreSidebarWidth(Number.NaN), 176);
  assert.equal(sidebarSizing.snapSidebarWidth(336), 336);
  assert.equal(sidebarSizing.isSidebarCompactWidth(80), true);
  assert.equal(sidebarSizing.isSidebarCompactWidth(159), true);
  assert.equal(sidebarSizing.isSidebarCompactWidth(175), true);
  assert.equal(sidebarSizing.isSidebarCompactWidth(176), false);
});

test("primary app navigation stays in a responsive sidebar on every viewport", async () => {
  const source = await readFile(new URL("../src/components/MasterShell.tsx", import.meta.url), "utf8");
  const asideClass = source.match(/id="primary-navigation"[\s\S]*?className="([^"]+)"/)?.[1];
  assert.ok(asideClass);
  assert.match(asideClass, /sticky top-0 z-10 flex h-screen w-20 shrink-0 flex-col/);
  assert.match(asideClass, /lg:w-\[var\(--sidebar-width\)\]/);
  assert.match(source, /matchMedia\("\(max-width: 1023px\)"\)/);
  assert.match(source, /const isSidebarCompact = isMobileViewport \|\| isSidebarCompactWidth\(sidebarWidth\)/);
  assert.match(source, /title=\{isSidebarCompact \? t\(item\.labelKey\) : undefined\}/);
  assert.match(source, /isMobileViewport \? \([\s\S]*?className="max-w-full min-w-0 break-words text-center text-dynamic-xs leading-tight"/);
  assert.match(source, /aria-label=\{t\("shell\.navigation"\)\}/);
});

test("mobile navigation no longer switches to a bottom bar or modal drawer", async () => {
  const source = await readFile(new URL("../src/components/MasterShell.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /mobileSidebarOpen|mobileSidebarDialogRef|data-mobile-bottom-nav/);
  assert.doesNotMatch(source, /fixed inset-x-0 bottom-0/);
  assert.doesNotMatch(source, /shell\.bottom_nav_more/);
  assert.match(source, /onClick=\{\(\) => setActiveRoute\(item\.key\)\}/);
});

test("DOCX generation works on the documented Node 20 development runtime", async () => {
  const document = new Document({
    sections: [{ children: [new Paragraph("YaModeer DOCX compatibility smoke test")] }]
  });
  const output = await Packer.toBuffer(document);
  assert.ok(output.byteLength > 0);
});
