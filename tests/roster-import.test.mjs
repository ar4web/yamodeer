import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const loadTypeScriptModule = async (path) => {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext
    }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
};

const roster = await loadTypeScriptModule("src/services/rosterImport.ts");
const fixture = [
  "ID,company,nameEn,nameAr,nationality,nationalIdOrIqama,departmentCode,jobTitle,basicSalarySar,status,,ID,,",
  'EMP-1,Alpha,Person One," Person One ",SAUDI,1000000001,HR_GOV,Analyst,"5,000",ACTIVE,,EMP-1,,10',
  "EMP-2,Alpha,Person Two,Person Two,INDIA,2000000001,HR_GOV,Analyst,4000,ON_LEAVE,,EMP-2,,10",
  "EMP-3,Beta,Person Three,Person Three,SAUDI,1000000002,FINTECH,Analyst,6000,INACTIVE,,EMP-3,,10"
].join("\n");

test("partial roster import preserves INACTIVE separately and excludes it from current workforce totals", () => {
  const result = roster.parseRosterCsvText(fixture);
  assert.equal(result.ok, true);
  assert.equal(result.rowCount, 3);
  assert.equal(result.summary.activeCount, 1);
  assert.equal(result.summary.onLeaveCount, 1);
  assert.equal(result.summary.inactiveCount, 1);
  assert.equal(result.summary.workforceCount, 2);
  assert.equal(result.summary.saudiCount, 1);
  assert.equal(result.summary.expatCount, 1);

  const allCompanies = roster.getRosterDashboardView(result.summary, null);
  assert.equal(allCompanies.workforceCount, 2);
  assert.equal(allCompanies.inactiveCount, 1);
  assert.equal(allCompanies.saudiSharePercent, 50);
  assert.equal(allCompanies.departments[0].code, "HR_GOV");

  const alpha = roster.getRosterDashboardView(result.summary, "Alpha");
  assert.equal(alpha.workforceCount, 2);
  assert.equal(alpha.activeCount, 1);
  assert.equal(alpha.onLeaveCount, 1);
  assert.equal(alpha.inactiveCount, 0);
  assert.equal(alpha.saudiCount, 1);
  assert.equal(alpha.expatCount, 1);

  const beta = roster.getRosterDashboardView(result.summary, "Beta");
  assert.equal(beta.workforceCount, 0);
  assert.equal(beta.inactiveCount, 1);
  assert.equal(beta.saudiSharePercent, null);
});

test("roster summaries retain company and department dimensions without retaining employee-level fields", () => {
  const result = roster.parseRosterCsvText(fixture);
  const summary = result.summary;
  assert.deepEqual(summary.companies.map(({ name }) => name), ["Alpha", "Beta"]);
  assert.deepEqual(summary.departments.map(({ code }) => code), ["HR_GOV"]);
  assert.equal(summary.arabicNameFieldCount, 3);
  assert.equal(summary.arabicNameArabicScriptCount, 0);
  assert.equal(result.records[0].nameAr, " Person One ");
  assert.equal(result.records[0].status, "ACTIVE");
  assert.equal(result.warnings.some(({ code }) => code === "DUPLICATE_ID_COLUMN"), true);
  assert.equal(result.warnings.some(({ code }) => code === "UNNAMED_EXTRA_COLUMNS"), true);
  assert.equal(result.warnings.some(({ code }) => code === "LATIN_TEXT_IN_ARABIC_NAME_FIELD"), true);

  const serialized = JSON.stringify(summary);
  for (const value of ["EMP-1", "1000000001", "Person One", "5000", "Analyst"]) {
    assert.equal(serialized.includes(value), false, `summary must not retain ${value}`);
  }
  const summaryKeys = new Set();
  const collectKeys = (value) => {
    if (Array.isArray(value)) value.forEach(collectKeys);
    else if (value && typeof value === "object") {
      for (const [key, nested] of Object.entries(value)) {
        summaryKeys.add(key);
        collectKeys(nested);
      }
    }
  };
  collectKeys(summary);
  for (const field of ["records", "employeeId", "nameEn", "nameAr", "nationalIdOrIqama", "jobTitle", "basicSalarySar"]) {
    assert.equal(summaryKeys.has(field), false, `summary must not contain the row-level field ${field}`);
  }
});

test("mismatched duplicate employee-ID columns reject the import instead of silently mapping it", () => {
  const mismatch = fixture.replace("EMP-2,,10", "OTHER-ID,,10");
  const result = roster.parseRosterCsvText(mismatch);
  assert.equal(result.ok, false);
  assert.equal(result.summary, null);
  assert.equal(result.errors.some(({ code }) => code === "DUPLICATE_ID_COLUMN_MISMATCH"), true);
});

test("unsupported statuses and malformed identities reject the entire roster summary", () => {
  const invalid = fixture
    .replace("INDIA,2000000001", "INDIA,1000000003")
    .replace(",ON_LEAVE,", ",SUSPENDED,");
  const result = roster.parseRosterCsvText(invalid);
  assert.equal(result.ok, false);
  assert.equal(result.summary, null);
  assert.equal(result.errors.some(({ code }) => code === "INVALID_STATUSES"), true);
  assert.equal(result.errors.some(({ code }) => code === "NATIONALITY_ID_PREFIX_MISMATCH"), true);
});
