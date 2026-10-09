import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const loadThemeContrast = async () => {
  const source = await readFile(new URL("../src/services/themeContrast.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    fileName: "src/services/themeContrast.ts",
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
};

const contrast = await loadThemeContrast();

const assertReadableOnEveryBackground = (foreground, backgrounds, minimum = 4.5) => {
  for (const background of backgrounds) {
    assert.ok(
      contrast.getContrastRatio(foreground, background) >= minimum,
      `${foreground} on ${background} must meet ${minimum}:1`
    );
  }
};

test("contrast utility matches known WCAG reference ratios", () => {
  assert.equal(contrast.getContrastRatio("#ffffff", "#000000"), 21);
  assert.ok(Math.abs(contrast.getContrastRatio("#777777", "#ffffff") - 4.478) < 0.01);
});

test("theme text colors can be corrected for light semantic status chips", () => {
  const cases = [
    ["#537864", "#e8f0eb"],
    ["#8b7857", "#f3efe7"],
    ["#955f64", "#f5eaeb"]
  ];
  for (const [foreground, background] of cases) {
    const safe = contrast.ensureContrast(foreground, ["#ffffff", "#f9fafb", background]);
    assertReadableOnEveryBackground(safe, ["#ffffff", "#f9fafb", background]);
  }
});

test("theme text colors can be corrected for light accent and dark soft-surface pairs", () => {
  const lightCases = [
    ["#756f65", "#f2efe9"],
    ["#b18a50", "#f7f1e6"],
    ["#0284c7", "#f0f9ff"],
    ["#d97706", "#fef3c7"],
    ["#06b6d4", "#ecfeff"]
  ];
  for (const [foreground, softSurface] of lightCases) {
    const safe = contrast.ensureContrast(foreground, ["#ffffff", softSurface]);
    assertReadableOnEveryBackground(safe, ["#ffffff", softSurface]);
  }

  const darkSafe = contrast.ensureContrast("#b58e4a", ["#1c1e22", "#48391e"]);
  assertReadableOnEveryBackground(darkSafe, ["#1c1e22", "#48391e"]);
});

test("dark-mode primary text remains readable across alternate palettes", () => {
  const cases = [
    ["#185b43", "#1d392d"],
    ["#1e3a8a", "#172554"],
    ["#b45309", "#451a03"],
    ["#4f46e5", "#1e1b4b"]
  ];
  for (const [foreground, softSurface] of cases) {
    const safe = contrast.ensureContrast(foreground, ["#1c1e22", "#24262b", softSurface]);
    assertReadableOnEveryBackground(safe, ["#1c1e22", "#24262b", softSurface]);
  }
});

test("dark-mode non-accent palette primary text stays readable (fixes unreadable -text tokens)", () => {
  const cases = [
    ["#185b43", "#2b4a3d"],   // oasis-mint
    ["#1e3a8a", "#2a3c7a"],   // classic-corporate
    ["#4f46e5", "#26235c"]    // stealth-midnight
  ];
  for (const [foreground, softSurface] of cases) {
    const safe = contrast.ensureContrast(foreground, ["#1c1e22", "#24262b", softSurface]);
    assertReadableOnEveryBackground(safe, ["#1c1e22", "#24262b", softSurface]);
  }
});

test("dark-mode standard palette primary text stays readable on dark scrollbars", () => {
  const safe = contrast.ensureContrast("#626a74", ["#1c1e22", "#24262b", "#35383d"]);
  assertReadableOnEveryBackground(safe, ["#1c1e22", "#24262b", "#35383d"]);
});

test("custom theme colors and semantic buttons receive readable foregrounds", () => {
  const textColor = contrast.ensureContrast("#00c8d7", ["#ffffff", "#f9fafb", "#ecfeff"]);
  assertReadableOnEveryBackground(textColor, ["#ffffff", "#f9fafb", "#ecfeff"]);

  const primaryButtonForeground = contrast.getAccessibleForeground(["#facc15", "#eab308"]);
  assertReadableOnEveryBackground(primaryButtonForeground, ["#facc15", "#eab308"]);

  const customPrimary = contrast.ensureContrast("#777777", ["#ffffff", "#f9fafb", "#eef0f3"], 3);
  const buttonText = contrast.getAccessibleForeground([customPrimary]);
  const hoverCandidate = contrast.ensureContrast(
    contrast.mixHexColors(customPrimary, "#000000", 0.12),
    ["#ffffff", "#f9fafb", "#eef0f3"],
    3
  );
  const hoverFill = contrast.getContrastRatio(buttonText, hoverCandidate) >= 4.5
    ? hoverCandidate
    : customPrimary;
  assertReadableOnEveryBackground(buttonText, [customPrimary, hoverFill]);

  for (const fill of ["#537864", "#8b7857", "#955f64", "#80a68e", "#baa882", "#be858a"]) {
    const foreground = contrast.getAccessibleForeground([fill]);
    assertReadableOnEveryBackground(foreground, [fill]);
  }
});

test("dark-mode settings surfaces have visible hierarchy and readable labels", async () => {
  const themeSource = await readFile(new URL("../src/context/ThemeContext.tsx", import.meta.url), "utf8");
  const defaultDarkBlock = themeSource.match(
    /const MODE_SURFACES:[\s\S]*?\bdark:\s*\{([\s\S]*?)\n  \},\n  "high-contrast"/
  )?.[1];
  const goldenrodDarkBlock = themeSource.match(
    /const DARK_GOLDENROD_MODE_SURFACES:[\s\S]*?\bdark:\s*\{([\s\S]*?)\n  \}\n};/
  )?.[1];
  const goldenrodScaleBlock = themeSource.match(
    /const DARK_GOLDENROD_SCALE = \{([\s\S]*?)\} as const;/
  )?.[1];
  assert.ok(defaultDarkBlock, "default dark surface tokens should be present");
  assert.ok(goldenrodDarkBlock, "dark-goldenrod surface tokens should be present");
  assert.ok(goldenrodScaleBlock, "dark-goldenrod color scale should be present");

  const goldenrodScale = Object.fromEntries(
    [...goldenrodScaleBlock.matchAll(/^\s*(\d+):\s*"(#[\da-f]{6})"/gim)]
      .map(([, shade, color]) => [shade, color])
  );
  const readColor = (block, key) => {
    const match = block.match(new RegExp(`(?:^|\\n)\\s*${key}:\\s*(?:"(#[\\da-f]{6})"|DARK_GOLDENROD_SCALE\\[(\\d+)\\])`, "i"));
    return match?.[1] ?? goldenrodScale[match?.[2]];
  };

  for (const [name, block] of [
    ["standard dark", defaultDarkBlock],
    ["dark goldenrod", goldenrodDarkBlock]
  ]) {
    const colors = Object.fromEntries(
      ["canvas", "surface", "surfaceElevated", "surfaceMuted", "foreground", "muted", "border"]
        .map((key) => [key, readColor(block, key)])
    );
    for (const [key, color] of Object.entries(colors)) {
      assert.ok(color, `${name} ${key} token should resolve to a solid color`);
    }
    assert.ok(contrast.getContrastRatio(colors.surface, colors.canvas) >= 1.15, `${name} cards should separate from the page canvas`);
    assert.ok(contrast.getContrastRatio(colors.surfaceElevated, colors.surface) >= 1.15, `${name} controls should separate from their card`);
    assert.ok(contrast.getContrastRatio(colors.surfaceMuted, colors.surfaceElevated) >= 1.15, `${name} muted surfaces should remain distinct`);
    assert.ok(contrast.getContrastRatio(colors.border, colors.surface) >= 2, `${name} card outlines should remain visible`);
    assertReadableOnEveryBackground(colors.foreground, [colors.canvas, colors.surface, colors.surfaceElevated, colors.surfaceMuted]);
    assertReadableOnEveryBackground(colors.muted, [colors.canvas, colors.surface, colors.surfaceElevated, colors.surfaceMuted]);
  }
});

test("light-mode settings surfaces remain layered instead of disappearing into the page", async () => {
  const themeSource = await readFile(new URL("../src/context/ThemeContext.tsx", import.meta.url), "utf8");
  const defaultLightBlock = themeSource.match(
    /const MODE_SURFACES:[\s\S]*?\blight:\s*\{([\s\S]*?)\n  \},\n  dark:/
  )?.[1];
  const goldenrodLightBlock = themeSource.match(
    /const DARK_GOLDENROD_MODE_SURFACES:[\s\S]*?\blight:\s*\{([\s\S]*?)\n  \},\n  dark:/
  )?.[1];
  const goldenrodScaleBlock = themeSource.match(
    /const DARK_GOLDENROD_SCALE = \{([\s\S]*?)\} as const;/
  )?.[1];
  assert.ok(defaultLightBlock, "default light surface tokens should be present");
  assert.ok(goldenrodLightBlock, "light-goldenrod surface tokens should be present");
  assert.ok(goldenrodScaleBlock, "dark-goldenrod color scale should be present");

  const goldenrodScale = Object.fromEntries(
    [...goldenrodScaleBlock.matchAll(/^\s*(\d+):\s*"(#[\da-f]{6})"/gim)]
      .map(([, shade, color]) => [shade, color])
  );
  const readColor = (block, key) => {
    const match = block.match(new RegExp(`(?:^|\\n)\\s*${key}:\\s*(?:"(#[\\da-f]{6})"|DARK_GOLDENROD_SCALE\\[(\\d+)\\])`, "i"));
    return match?.[1] ?? goldenrodScale[match?.[2]];
  };

  for (const [name, block] of [
    ["standard light", defaultLightBlock],
    ["light goldenrod", goldenrodLightBlock]
  ]) {
    const colors = Object.fromEntries(
      ["canvas", "surface", "surfaceElevated", "surfaceMuted", "foreground", "muted", "border"]
        .map((key) => [key, readColor(block, key)])
    );
    for (const [key, color] of Object.entries(colors)) {
      assert.ok(color, `${name} ${key} token should resolve to a solid color`);
    }
    assert.ok(contrast.getContrastRatio(colors.surface, colors.canvas) >= 1.1, `${name} cards should separate from the page canvas`);
    assert.ok(contrast.getContrastRatio(colors.surfaceElevated, colors.surface) >= 1.05, `${name} controls should separate from their card`);
    assert.ok(contrast.getContrastRatio(colors.surfaceMuted, colors.surfaceElevated) >= 1.1, `${name} muted surfaces should remain distinct`);
    assert.ok(contrast.getContrastRatio(colors.border, colors.surface) >= 1.5, `${name} card outlines should remain visible`);
    assertReadableOnEveryBackground(colors.foreground, [colors.canvas, colors.surface, colors.surfaceElevated, colors.surfaceMuted]);
    assertReadableOnEveryBackground(colors.muted, [colors.canvas, colors.surface, colors.surfaceElevated, colors.surfaceMuted]);
  }
});
