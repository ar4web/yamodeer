import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("optional development roster data does not produce a noisy 404 when unconfigured", async () => {
  const [vite, shell] = await Promise.all([
    readSource("../vite.config.ts"),
    readSource("../src/components/MasterShell.tsx")
  ]);

  assert.match(vite, /if \(!sourcePath\) \{[\s\S]*?response\.statusCode = 204;[\s\S]*?response\.end\(\);/);
  assert.match(shell, /response\.status === 204 \? null : response\.ok \? response\.json\(\) : null/);
});

test("Settings stays a vertical tab sidebar and its appearance controls can wrap on narrow screens", async () => {
  const settings = await readSource("../src/modules/MasterSettingsModule.tsx");

  assert.match(settings, /role="tablist"[\s\S]*?aria-orientation="vertical"/);
  assert.match(settings, /grid-cols-\[3rem_minmax\(0,1fr\)\] gap-2 min-\[360px\]:grid-cols-\[3\.75rem_minmax\(0,1fr\)\]/);
  assert.match(settings, /grid-cols-1 min-\[360px\]:grid-cols-2/);
  assert.match(settings, /flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap/);
  assert.match(settings, /w-full min-w-0 max-w-full !shrink sm:w-auto sm:!shrink-0/);
  assert.match(settings, /flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3/);
  assert.match(settings, /px-1\.5 py-2 font-semibold sm:px-3/);
});

test("shared prototype notices wrap their label and copy in narrow panels", async () => {
  const designSystem = await readSource("../src/components/DesignSystem.tsx");
  assert.match(designSystem, /<span className="min-w-0 break-words font-bold">\{label\}<\/span>/);
  assert.match(designSystem, /<span className="min-w-0 break-words">\{children\}<\/span>/);
});

test("Compliance calculator summaries wrap currency values instead of widening the page", async () => {
  const compliance = await readSource("../src/modules/ComplianceZatcaModule.tsx");

  assert.equal(compliance.match(/surfaceClassName\} min-w-0 p-4 space-y-4/g)?.length, 3);
  assert.ok(compliance.match(/flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-dynamic-xs/g));
  assert.equal(compliance.match(/border-t border-theme pt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1/g)?.length, 3);
});
