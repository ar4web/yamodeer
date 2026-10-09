import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("search bars use quarter-width desktop layouts while staying usable on narrow screens", async () => {
  const [shell, roster, invoices] = await Promise.all([
    readSource("../src/components/MasterShell.tsx"),
    readSource("../src/modules/PartialRosterDirectoryModule.tsx"),
    readSource("../src/modules/InvoicingModule.tsx")
  ]);

  assert.equal(shell.match(/type="search"/g)?.length, 1);
  assert.equal(roster.match(/type="search"/g)?.length, 1);
  assert.equal(invoices.match(/type="search"/g)?.length, 2);
  assert.match(shell, /lg:w-1\/4 lg:min-w-\[12rem\] lg:flex-none/);
  assert.match(roster, /w-full xl:w-1\/4 xl:min-w-\[12rem\] xl:max-w-none/);
  assert.match(invoices, /md:grid-cols-\[minmax\(12rem,25%\)_12rem_12rem\]/);
  assert.match(invoices, /w-full space-y-1\.5 md:w-1\/2 xl:w-1\/4 xl:min-w-\[12rem\]/);
});
