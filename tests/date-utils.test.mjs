import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("date-only application values use the browser-local calendar date and timezone-free arithmetic", async () => {
  const [dateUtils, docMaker, files, workflows, invoicing, employees, vendors] = await Promise.all([
    readSource("../src/services/dateUtils.ts"),
    readSource("../src/modules/DocMakerModule.tsx"),
    readSource("../src/modules/FilesManagerModule.tsx"),
    readSource("../src/modules/WorkflowEngineModule.tsx"),
    readSource("../src/modules/InvoicingModule.tsx"),
    readSource("../src/modules/EmployeeModule.tsx"),
    readSource("../src/modules/VendorModule.tsx")
  ]);

  assert.match(dateUtils, /export const getLocalISODate = \(date: Date = new Date\(\)\): string => \{[\s\S]*?date\.getFullYear\(\)[\s\S]*?date\.getMonth\(\) \+ 1[\s\S]*?date\.getDate\(\)/);
  assert.match(dateUtils, /export const addISOCalendarDays[\s\S]*?setUTCDate/);
  assert.match(dateUtils, /export const addISOCalendarYears[\s\S]*?setUTCFullYear/);
  assert.match(docMaker, /\["Issue Date", getLocalISODate\(\)\]/);
  assert.match(docMaker, /updatedAt: getLocalISODate\(\)/);
  assert.match(files, /updatedAt: getLocalISODate\(\)/);
  assert.match(workflows, /const today = getLocalISODate\(\)/);
  assert.match(workflows, /addISOCalendarDays\(today, 7\)/);
  assert.match(invoicing, /const todayIsoDate = \(\): string => getLocalISODate\(\)/);
  assert.match(employees, /addISOCalendarYears\(emp\.idExpiryDateGregorian, 1\)/);
  assert.match(vendors, /addISOCalendarYears\(ven\.crExpiryDate, 1\)/);
});
