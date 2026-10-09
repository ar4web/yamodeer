import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("shared metric cards use compact responsive padding and align content across grid rows", async () => {
  const designSystem = await readSource("../src/components/DesignSystem.tsx");
  assert.match(designSystem, /relative isolate flex h-full min-w-0 flex-col overflow-hidden p-4 sm:p-5/);
  assert.match(designSystem, /flex min-w-0 flex-1 items-start justify-between gap-3 sm:gap-4/);
  assert.match(designSystem, /min-h-10 break-words text-dynamic-sm font-semibold leading-snug text-muted/);
  assert.match(designSystem, /mt-auto min-h-10 pt-3/);
  assert.match(designSystem, /break-words leading-tight/);
});

test("page headers preserve title width and let toolbars wrap instead of squeezing titles", async () => {
  const designSystem = await readSource("../src/components/DesignSystem.tsx");
  assert.match(designSystem, /flex flex-col gap-4 pb-2 xl:flex-row/);
  assert.match(designSystem, /xl:min-w-\[13rem\] xl:flex-1/);
  assert.match(designSystem, /w-full max-w-full flex-wrap items-center gap-2 xl:w-auto xl:max-w-\[70%\]/);
});

test("common four-card KPI grids stay single/two-column until the wide-screen breakpoint", async () => {
  const pages = await Promise.all([
    readSource("../src/modules/AccountsModule.tsx"),
    readSource("../src/modules/EmployeeModule.tsx"),
    readSource("../src/modules/ExpenseModule.tsx"),
    readSource("../src/modules/VendorModule.tsx"),
    readSource("../src/modules/WorkHubModule.tsx")
  ]);
  for (const page of pages) {
    assert.match(page, /grid-cols-1\s+gap-4\s+sm:grid-cols-2\s+xl:grid-cols-4/);
  }
});
