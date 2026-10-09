import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const loadThemeShape = async () => {
  const source = await readFile(new URL("../src/services/themeShape.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    fileName: "src/services/themeShape.ts",
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
};

const themeShape = await loadThemeShape();

test("professional radius tokens are non-zero, restrained, and keep circular pills", () => {
  assert.deepEqual(themeShape.getBorderRadiusTokens(), {
    sm: "2px",
    default: "3px",
    md: "4px",
    lg: "6px",
    xl: "8px",
    "2xl": "10px",
    "3xl": "12px",
    full: "9999px"
  });
});

test("radius scale safely clamps extreme and malformed user overrides", () => {
  assert.equal(themeShape.normalizeBorderRadiusScale(0.5), 0.75);
  assert.equal(themeShape.normalizeBorderRadiusScale(9), 1.25);
  assert.equal(themeShape.normalizeBorderRadiusScale(Number.NaN), 1);
  assert.equal(themeShape.normalizeBorderRadiusScale("large"), 1);
  assert.equal(themeShape.getBorderRadiusTokens(1.25)["3xl"], "15px");
  assert.equal(themeShape.getBorderRadiusTokens(0.75).sm, "1.5px");
});

test("theme radius tokens are connected to Tailwind utilities and shared UI primitives", async () => {
  const [tailwindConfig, themeContext, designSystem] = await Promise.all([
    readFile(new URL("../tailwind.config.js", import.meta.url), "utf8"),
    readFile(new URL("../src/context/ThemeContext.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/DesignSystem.tsx", import.meta.url), "utf8")
  ]);

  assert.match(tailwindConfig, /DEFAULT:\s*"var\(--radius-default, 3px\)"/);
  assert.match(tailwindConfig, /full:\s*"var\(--radius-full, 9999px\)"/);
  assert.doesNotMatch(tailwindConfig, /(?:sm|md|lg|xl|"2xl"|"3xl"|full):\s*"0px"/);
  assert.match(themeContext, /getBorderRadiusTokens\(prefs\.customOverrides\.borderRadiusScale\)/);
  assert.match(designSystem, /border-s-2 border-accent ps-3/);
  assert.match(designSystem, /transition-colors duration-200 hover:border-accent/);
  assert.match(designSystem, /<section className=\{`\$\{surfaceClassName\} overflow-hidden`\}>/);
  assert.match(designSystem, /rounded-md border border-theme bg-surface-elevated/);
  assert.doesNotMatch(designSystem, /hover:-translate-y/);
});
