import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { ensureContrast, getAccessibleForeground, getContrastRatio, mixHexColors } from "@/services/themeContrast";
import { getBorderRadiusTokens, normalizeBorderRadiusScale } from "@/services/themeShape";

export type ThemeMode = "light" | "dark" | "high-contrast" | "auto";
export type ResolvedThemeMode = "light" | "dark" | "high-contrast";

export type ColorPalette =
  | "soft-charcoal"
  | "classic-corporate"
  | "oasis-mint"
  | "royal-gold"
  | "stealth-midnight"
  | "modern-matte"
  | "dark-goldenrod";

export type EnglishFontFamily = "Inter" | "Roboto" | "SF Pro";
export type ArabicFontFamily = "Cairo" | "IBM Plex Sans Arabic" | "Tajawal";
export type FontScale = "sm" | "md" | "lg" | "xl";
export type SurfaceStyle = "soft" | "balanced" | "defined";
export type MotionPreference = "system" | "reduced";

export interface ThemeCustomOverrides {
  primaryColor?: string;
  accentColor?: string;
  borderRadiusScale?: number;
}

export interface ThemePreferences {
  mode: ThemeMode;
  palette: ColorPalette;
  englishFont: EnglishFontFamily;
  arabicFont: ArabicFontFamily;
  fontScale: FontScale;
  surfaceStyle: SurfaceStyle;
  motionPreference: MotionPreference;
  customOverrides: ThemeCustomOverrides;
}

interface PaletteTokens {
  primary: string;
  primaryHover: string;
  primarySoftLight: string;
  primarySoftDark: string;
  onPrimary: string;
  primaryDark?: string;
  primaryHoverDark?: string;
  onPrimaryDark?: string;
  accent: string;
  accentSoftLight: string;
  accentSoftDark: string;
  accentDark?: string;
}

const PALETTE_DICTIONARY: Record<ColorPalette, PaletteTokens> = {
  "soft-charcoal": {
    primary: "#626a74",
    primaryHover: "#545b64",
    primaryDark: "#a0a6af",
    primaryHoverDark: "#b2b7bf",
    primarySoftLight: "#eceef1",
    primarySoftDark: "#35383d",
    onPrimary: "#ffffff",
    onPrimaryDark: "#1d1f23",
    accent: "#756f65",
    accentDark: "#b1a89a",
    accentSoftLight: "#f2efe9",
    accentSoftDark: "#3a3732"
  },
  "dark-goldenrod": {
    primary: "#91713b",
    primaryHover: "#6d552c",
    primaryDark: "#c4a46e",
    primaryHoverDark: "#d3bb92",
    primarySoftLight: "#f0e8db",
    primarySoftDark: "#48391e",
    onPrimary: "#ffffff",
    onPrimaryDark: "#19140a",
    accent: "#6d552c",
    accentDark: "#b58e4a",
    accentSoftLight: "#e1d2b7",
    accentSoftDark: "#48391e"
  },
  "oasis-mint": {
    primary: "#185b43", // Deep YaModeer evergreen
    primaryHover: "#124833",
    primaryDark: "#2f7a63",
    primaryHoverDark: "#3a8a73",
    primarySoftLight: "#eaf3ed",
    primarySoftDark: "#2b4a3d",
    onPrimary: "#ffffff",
    onPrimaryDark: "#e8f1ec",
    accent: "#b18a50", // Warm date-palm brass
    accentDark: "#c7a366",
    accentSoftLight: "#f7f1e6",
    accentSoftDark: "#4a3e2f"
  },
  "classic-corporate": {
    primary: "#1e3a8a", // Executive Navy
    primaryHover: "#1e40af",
    primaryDark: "#2a3c7a",
    primaryHoverDark: "#3b4f9e",
    primarySoftLight: "#eff6ff",
    primarySoftDark: "#2a3c7a",
    onPrimary: "#ffffff",
    onPrimaryDark: "#e8efff",
    accent: "#0284c7", // Corporate Sky
    accentDark: "#0c4a6e",
    accentSoftLight: "#f0f9ff",
    accentSoftDark: "#0f4a6e"
  },
  "royal-gold": {
    primary: "#b45309", // Diriyah Royal Amber Gold
    primaryHover: "#92400e",
    primarySoftLight: "#fffbeb",
    primarySoftDark: "#451a03",
    onPrimary: "#ffffff",
    accent: "#d97706",
    accentSoftLight: "#fef3c7",
    accentSoftDark: "#78350f"
  },
  "stealth-midnight": {
    primary: "#4f46e5", // Cyber Indigo
    primaryHover: "#4338ca",
    primaryDark: "#26235c",
    primaryHoverDark: "#4338ca",
    primarySoftLight: "#eef2ff",
    primarySoftDark: "#26235c",
    onPrimary: "#ffffff",
    onPrimaryDark: "#e8ecff",
    accent: "#06b6d4", // Telemetry Cyan
    accentDark: "#164e63",
    accentSoftLight: "#ecfeff",
    accentSoftDark: "#164e63"
  },
  "modern-matte": {
    primary: "#3d5cc9", // Matte cobalt
    primaryHover: "#304dae",
    primaryDark: "#a8b7f2",
    primaryHoverDark: "#bbc7f7",
    primarySoftLight: "#e9edff",
    primarySoftDark: "#252d4a",
    onPrimary: "#ffffff",
    onPrimaryDark: "#1a2137",
    accent: "#b7472d", // Matte coral
    accentDark: "#e99079",
    accentSoftLight: "#fff0e9",
    accentSoftDark: "#4a2e28"
  }
};

const DARK_GOLDENROD_SCALE = {
  50: "#f8f4ed",
  100: "#f0e8db",
  200: "#e1d2b7",
  300: "#d3bb92",
  400: "#c4a46e",
  500: "#b58e4a",
  600: "#91713b",
  700: "#6d552c",
  800: "#48391e",
  900: "#241c0f",
  950: "#19140a"
} as const;

interface ModeSurfaceTokens {
  canvas: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  foreground: string;
  muted: string;
  border: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  shellNav: string;
  shellNavElevated: string;
  shellNavBorder: string;
  shellNavForeground: string;
  shellNavMuted: string;
  shellNavActive: string;
  shadowShell: string;
  shadowCard: string;
}

const MODE_SURFACES: Record<ResolvedThemeMode, ModeSurfaceTokens> = {
  light: {
    canvas: "#f0f2f5",
    surface: "#ffffff",
    surfaceElevated: "#f7f8fa",
    surfaceMuted: "#e9edf2",
    foreground: "#202226",
    muted: "#4c535d",
    border: "#c7ced8",
    success: "#537864",
    successSoft: "#e8f0eb",
    warning: "#8b7857",
    warningSoft: "#f3efe7",
    danger: "#955f64",
    dangerSoft: "#f5eaeb",
    shellNav: "#e9edf2",
    shellNavElevated: "#dde3eb",
    shellNavBorder: "#b9c3d0",
    shellNavForeground: "#202226",
    shellNavMuted: "#4c535d",
    shellNavActive: "rgba(32, 34, 38, 0.07)",
    shadowShell: "0 20px 56px -34px rgba(25, 27, 31, 0.24)",
    shadowCard: "0 3px 12px -7px rgba(25, 27, 31, 0.14)"
  },
  dark: {
    canvas: "#14161b",
    surface: "#21252d",
    surfaceElevated: "#2c323d",
    surfaceMuted: "#39414e",
    foreground: "#edf0f5",
    muted: "#bac1cb",
    border: "#525a69",
    success: "#8fafa0",
    successSoft: "#2a3731",
    warning: "#baa882",
    warningSoft: "#393329",
    danger: "#c18b92",
    dangerSoft: "#3b2a2d",
    shellNav: "#101113",
    shellNavElevated: "#1a1c1f",
    shellNavBorder: "#2c2e32",
    shellNavForeground: "#f2f3f4",
    shellNavMuted: "#a6a9ae",
    shellNavActive: "rgba(255, 255, 255, 0.075)",
    shadowShell: "0 24px 56px -34px rgba(0, 0, 0, 0.52)",
    shadowCard: "0 3px 12px -7px rgba(0, 0, 0, 0.38)"
  },
  "high-contrast": {
    canvas: "#000000",
    surface: "#0a0a0a",
    surfaceElevated: "#171717",
    surfaceMuted: "#262626",
    foreground: "#ffffff",
    muted: "#e5e5e5",
    border: "#facc15",
    success: "#22c55e",
    successSoft: "#052e16",
    warning: "#facc15",
    warningSoft: "#422006",
    danger: "#ff4d4d",
    dangerSoft: "#450a0a",
    shellNav: "#000000",
    shellNavElevated: "#171717",
    shellNavBorder: "#facc15",
    shellNavForeground: "#ffffff",
    shellNavMuted: "#ffffff",
    shellNavActive: "#292200",
    shadowShell: "0 0 0 2px #facc15",
    shadowCard: "0 0 0 1px #facc15"
  }
};

const DARK_GOLDENROD_MODE_SURFACES: Record<"light" | "dark", ModeSurfaceTokens> = {
  light: {
    ...MODE_SURFACES.light,
    canvas: "#f6f1e8",
    surface: "#ffffff",
    surfaceElevated: DARK_GOLDENROD_SCALE[100],
    surfaceMuted: DARK_GOLDENROD_SCALE[200],
    foreground: DARK_GOLDENROD_SCALE[950],
    muted: DARK_GOLDENROD_SCALE[700],
    border: DARK_GOLDENROD_SCALE[300],
    shellNav: DARK_GOLDENROD_SCALE[100],
    shellNavElevated: DARK_GOLDENROD_SCALE[200],
    shellNavBorder: DARK_GOLDENROD_SCALE[400],
    shellNavForeground: DARK_GOLDENROD_SCALE[950],
    shellNavMuted: DARK_GOLDENROD_SCALE[700],
    shellNavActive: "rgba(109, 85, 44, 0.1)",
    shadowShell: "0 20px 56px -34px rgba(36, 28, 15, 0.28)",
    shadowCard: "0 3px 12px -7px rgba(36, 28, 15, 0.2)"
  },
  dark: {
    ...MODE_SURFACES.dark,
    canvas: DARK_GOLDENROD_SCALE[950],
    surface: "#302516",
    surfaceElevated: "#40321d",
    surfaceMuted: "#4e3d22",
    foreground: DARK_GOLDENROD_SCALE[50],
    muted: DARK_GOLDENROD_SCALE[200],
    border: "#705a31",
    shellNav: "#231a0d",
    shellNavElevated: "#40321d",
    shellNavBorder: "#705a31",
    shellNavForeground: DARK_GOLDENROD_SCALE[50],
    shellNavMuted: DARK_GOLDENROD_SCALE[300],
    shellNavActive: "rgba(248, 244, 237, 0.12)",
    shadowShell: "0 24px 56px -34px rgba(8, 6, 3, 0.58)",
    shadowCard: "0 3px 12px -7px rgba(8, 6, 3, 0.45)"
  }
};

interface FontScaleTokens {
  xs: string;
  sm: string;
  base: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
  lineXs: string;
  lineSm: string;
  lineBase: string;
  lineLg: string;
  lineXl: string;
  line2xl: string;
  line3xl: string;
}

const FONT_SCALE_MATRIX: Record<FontScale, FontScaleTokens> = {
  sm: {
    xs: "0.6875rem", // 11px
    sm: "0.75rem", // 12px
    base: "0.84375rem", // 13.5px
    lg: "0.9375rem", // 15px
    xl: "1.0625rem", // 17px
    "2xl": "1.25rem", // 20px
    "3xl": "1.5rem", // 24px
    lineXs: "1rem",
    lineSm: "1.15rem",
    lineBase: "1.35rem",
    lineLg: "1.45rem",
    lineXl: "1.55rem",
    line2xl: "1.75rem",
    line3xl: "2rem"
  },
  md: {
    xs: "0.8rem", // 12.8px — readable labels and table metadata
    sm: "0.9rem", // 14.4px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "2rem", // 32px
    lineXs: "1.15rem",
    lineSm: "1.3rem",
    lineBase: "1.5rem",
    lineLg: "1.65rem",
    lineXl: "1.75rem",
    line2xl: "2rem",
    line3xl: "2.35rem"
  },
  lg: {
    xs: "0.8125rem", // 13px
    sm: "0.9375rem", // 15px
    base: "1.08rem", // 17.3px
    lg: "1.225rem", // 19.6px
    xl: "1.375rem", // 22px
    "2xl": "1.65rem", // 26.4px
    "3xl": "2.05rem", // 32.8px
    lineXs: "1.2rem",
    lineSm: "1.35rem",
    lineBase: "1.6rem",
    lineLg: "1.75rem",
    lineXl: "1.85rem",
    line2xl: "2.15rem",
    line3xl: "2.45rem"
  },
  xl: {
    xs: "0.875rem", // 14px
    sm: "1.025rem", // 16.4px
    base: "1.1875rem", // 19px
    lg: "1.35rem", // 21.6px
    xl: "1.525rem", // 24.4px
    "2xl": "1.85rem", // 29.6px
    "3xl": "2.25rem", // 36px
    lineXs: "1.3rem",
    lineSm: "1.45rem",
    lineBase: "1.75rem",
    lineLg: "1.9rem",
    lineXl: "2.05rem",
    line2xl: "2.35rem",
    line3xl: "2.65rem"
  }
};

const FONT_STACK_MAP: Record<EnglishFontFamily | ArabicFontFamily, string> = {
  Inter: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  Roboto: "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
  "SF Pro": "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', sans-serif",
  Cairo: "'Cairo', 'Inter', sans-serif",
  "IBM Plex Sans Arabic": "'IBM Plex Sans Arabic', 'Inter', sans-serif",
  Tajawal: "'Tajawal', 'Inter', sans-serif"
};

export interface ThemeContextValue extends ThemePreferences {
  resolvedMode: ResolvedThemeMode;
  activeFontFamily: string;
  activePrimaryColor: string;
  activeAccentColor: string;
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: ColorPalette) => void;
  setEnglishFont: (font: EnglishFontFamily) => void;
  setArabicFont: (font: ArabicFontFamily) => void;
  setFontScale: (scale: FontScale) => void;
  setSurfaceStyle: (style: SurfaceStyle) => void;
  setMotionPreference: (preference: MotionPreference) => void;
  setCustomOverrides: (overrides: ThemeCustomOverrides) => void;
  resetCustomColor: (color: "primaryColor" | "accentColor") => void;
  resetThemeDefaults: () => void;
}

const DEFAULT_PREFERENCES: ThemePreferences = {
  mode: "dark",
  palette: "soft-charcoal",
  englishFont: "Inter",
  arabicFont: "Cairo",
  fontScale: "md",
  surfaceStyle: "balanced",
  motionPreference: "system",
  customOverrides: {}
};

const STORAGE_KEY_THEME = "ksa_hrms_theme_v4";
const LEGACY_STORAGE_KEY_THEME = "ksa_hrms_theme_v3";
const OLDER_STORAGE_KEY_THEME = "ksa_hrms_theme_v2";

const THEME_MODES: ThemeMode[] = ["light", "dark", "high-contrast", "auto"];
const COLOR_PALETTES: ColorPalette[] = [
  "soft-charcoal",
  "classic-corporate",
  "oasis-mint",
  "royal-gold",
  "stealth-midnight",
  "modern-matte",
  "dark-goldenrod"
];
const ENGLISH_FONTS: EnglishFontFamily[] = ["Inter", "Roboto", "SF Pro"];
const ARABIC_FONTS: ArabicFontFamily[] = ["Cairo", "IBM Plex Sans Arabic", "Tajawal"];
const FONT_SCALES: FontScale[] = ["sm", "md", "lg", "xl"];
const SURFACE_STYLES: SurfaceStyle[] = ["soft", "balanced", "defined"];
const MOTION_PREFERENCES: MotionPreference[] = ["system", "reduced"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isColorHex = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

const normalizeThemePreferences = (value: unknown): ThemePreferences => {
  const raw = isRecord(value) ? value : {};
  const rawOverrides = isRecord(raw.customOverrides) ? raw.customOverrides : {};
  const customOverrides: ThemeCustomOverrides = {};
  if (isColorHex(rawOverrides.primaryColor)) customOverrides.primaryColor = rawOverrides.primaryColor;
  if (isColorHex(rawOverrides.accentColor)) customOverrides.accentColor = rawOverrides.accentColor;
  if (typeof rawOverrides.borderRadiusScale === "number" && Number.isFinite(rawOverrides.borderRadiusScale)) {
    customOverrides.borderRadiusScale = normalizeBorderRadiusScale(rawOverrides.borderRadiusScale);
  }

  return {
    mode: THEME_MODES.includes(raw.mode as ThemeMode) ? raw.mode as ThemeMode : DEFAULT_PREFERENCES.mode,
    palette: COLOR_PALETTES.includes(raw.palette as ColorPalette) ? raw.palette as ColorPalette : DEFAULT_PREFERENCES.palette,
    englishFont: ENGLISH_FONTS.includes(raw.englishFont as EnglishFontFamily) ? raw.englishFont as EnglishFontFamily : DEFAULT_PREFERENCES.englishFont,
    arabicFont: ARABIC_FONTS.includes(raw.arabicFont as ArabicFontFamily) ? raw.arabicFont as ArabicFontFamily : DEFAULT_PREFERENCES.arabicFont,
    fontScale: FONT_SCALES.includes(raw.fontScale as FontScale) ? raw.fontScale as FontScale : DEFAULT_PREFERENCES.fontScale,
    surfaceStyle: SURFACE_STYLES.includes(raw.surfaceStyle as SurfaceStyle) ? raw.surfaceStyle as SurfaceStyle : DEFAULT_PREFERENCES.surfaceStyle,
    motionPreference: MOTION_PREFERENCES.includes(raw.motionPreference as MotionPreference) ? raw.motionPreference as MotionPreference : DEFAULT_PREFERENCES.motionPreference,
    customOverrides
  };
};

const resolvePaletteColors = (prefs: ThemePreferences, resolvedMode: ResolvedThemeMode) => {
  const paletteTokens = PALETTE_DICTIONARY[prefs.palette];
  const modeTokens = prefs.palette === "dark-goldenrod" && resolvedMode !== "high-contrast"
    ? DARK_GOLDENROD_MODE_SURFACES[resolvedMode]
    : MODE_SURFACES[resolvedMode];
  const isDarkLike = resolvedMode === "dark" || resolvedMode === "high-contrast";
  const componentSurfaces = [modeTokens.canvas, modeTokens.surface, modeTokens.surfaceElevated, modeTokens.surfaceMuted];
  const preferredPrimary = resolvedMode === "high-contrast"
    ? "#facc15"
    : prefs.customOverrides.primaryColor || (isDarkLike ? paletteTokens.primaryDark ?? paletteTokens.primary : paletteTokens.primary);
  const preferredAccent = resolvedMode === "high-contrast"
    ? "#38bdf8"
    : prefs.customOverrides.accentColor || (isDarkLike ? paletteTokens.accentDark ?? paletteTokens.accent : paletteTokens.accent);
  return {
    primary: ensureContrast(preferredPrimary, componentSurfaces, 3),
    accent: ensureContrast(preferredAccent, componentSurfaces, 3)
  };
};

const borderForSurfaceStyle = (
  base: string,
  surfaces: string[],
  style: SurfaceStyle,
  resolvedMode: ResolvedThemeMode
): string => {
  if (resolvedMode === "high-contrast" || style === "balanced") return base;
  if (style === "soft") return mixHexColors(base, surfaces[0], 0.18);
  return ensureContrast(base, surfaces, 3);
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage();

  const [prefs, setPrefs] = useState<ThemePreferences>(() => {
    try {
      const currentRaw = localStorage.getItem(STORAGE_KEY_THEME);
      if (currentRaw) {
        return normalizeThemePreferences(JSON.parse(currentRaw));
      }

      const legacyRaw =
        localStorage.getItem(LEGACY_STORAGE_KEY_THEME) ??
        localStorage.getItem(OLDER_STORAGE_KEY_THEME);
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw) as Partial<ThemePreferences>;
        // Preserve accessibility and typography choices while applying the new Night Mode default.
        return {
          ...DEFAULT_PREFERENCES,
          mode: legacy.mode === "high-contrast" ? "high-contrast" : DEFAULT_PREFERENCES.mode,
          englishFont: legacy.englishFont ?? DEFAULT_PREFERENCES.englishFont,
          arabicFont: legacy.arabicFont ?? DEFAULT_PREFERENCES.arabicFont,
          fontScale: legacy.fontScale ?? DEFAULT_PREFERENCES.fontScale
        };
      }
    } catch {
      // ignore storage error
    }
    return DEFAULT_PREFERENCES;
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  const resolvedMode: ResolvedThemeMode = useMemo(() => {
    if (prefs.mode === "auto") {
      return systemPrefersDark ? "dark" : "light";
    }
    return prefs.mode;
  }, [prefs.mode, systemPrefersDark]);

  const activeFontFamily = useMemo(() => {
    const selectedFont = language === "ar" ? prefs.arabicFont : prefs.englishFont;
    return FONT_STACK_MAP[selectedFont];
  }, [language, prefs.arabicFont, prefs.englishFont]);
  const activePaletteColors = useMemo(
    () => resolvePaletteColors(prefs, resolvedMode),
    [prefs, resolvedMode]
  );

  // Inject CSS custom properties dynamically onto :root without requiring any external .css file
  useEffect(() => {
    const root = document.documentElement;
    for (const [token, radius] of Object.entries(getBorderRadiusTokens(prefs.customOverrides.borderRadiusScale))) {
      root.style.setProperty(`--radius-${token}`, radius);
    }
    for (const [shade, color] of Object.entries(DARK_GOLDENROD_SCALE)) {
      root.style.setProperty(`--color-dark-goldenrod-${shade}`, color);
    }
    const paletteTokens = PALETTE_DICTIONARY[prefs.palette];
    const modeTokens =
      prefs.palette === "dark-goldenrod" && resolvedMode !== "high-contrast"
        ? DARK_GOLDENROD_MODE_SURFACES[resolvedMode]
        : MODE_SURFACES[resolvedMode];
    const scaleTokens = FONT_SCALE_MATRIX[prefs.fontScale];

    const isDarkLike = resolvedMode === "dark" || resolvedMode === "high-contrast";
    const componentSurfaces = [modeTokens.canvas, modeTokens.surface, modeTokens.surfaceElevated, modeTokens.surfaceMuted];
    const activePrimarySoft = isDarkLike ? paletteTokens.primarySoftDark : paletteTokens.primarySoftLight;
    const activeAccentSoft = isDarkLike ? paletteTokens.accentSoftDark : paletteTokens.accentSoftLight;
    const activePrimary = activePaletteColors.primary;
    const activeAccent = activePaletteColors.accent;
    const activeBorder = borderForSurfaceStyle(
      modeTokens.border,
      [modeTokens.surface, modeTokens.surfaceElevated],
      prefs.surfaceStyle,
      resolvedMode
    );
    const activeShellNavBorder = borderForSurfaceStyle(
      modeTokens.shellNavBorder,
      [modeTokens.shellNav, modeTokens.shellNavElevated],
      prefs.surfaceStyle,
      resolvedMode
    );
    const activeCardShadow = prefs.surfaceStyle === "defined" && resolvedMode !== "high-contrast"
      ? "none"
      : modeTokens.shadowCard;
    const preferredPrimaryHover = resolvedMode === "high-contrast"
      ? "#eab308"
      : prefs.customOverrides.primaryColor
        ? mixHexColors(activePrimary, isDarkLike ? "#ffffff" : "#000000", 0.12)
        : isDarkLike ? paletteTokens.primaryHoverDark ?? paletteTokens.primaryHover : paletteTokens.primaryHover;
    const candidatePrimaryHover = ensureContrast(preferredPrimaryHover, componentSurfaces, 3);
    const activeOnPrimary = getAccessibleForeground([activePrimary]);
    const activePrimaryHover = getContrastRatio(activeOnPrimary, candidatePrimaryHover) >= 4.5
      ? candidatePrimaryHover
      : activePrimary;
    const textBackgrounds = [
      modeTokens.canvas,
      ...componentSurfaces,
      activePrimarySoft,
      activeAccentSoft,
      modeTokens.successSoft,
      modeTokens.warningSoft,
      modeTokens.dangerSoft
    ];
    const activePrimaryText = ensureContrast(activePrimary, textBackgrounds);
    const activeAccentText = ensureContrast(activeAccent, textBackgrounds);
    const activeSuccessText = ensureContrast(modeTokens.success, textBackgrounds);
    const activeWarningText = ensureContrast(modeTokens.warning, textBackgrounds);
    const activeDangerText = ensureContrast(modeTokens.danger, textBackgrounds);
    const activeOnSuccess = getAccessibleForeground([modeTokens.success]);
    const activeOnWarning = getAccessibleForeground([modeTokens.warning]);
    const activeOnDanger = getAccessibleForeground([modeTokens.danger]);

    root.style.setProperty("--color-canvas", modeTokens.canvas);
    root.style.setProperty("--color-document-paper", "#ffffff");
    root.style.setProperty("--color-document-ink", "#1f2937");
    root.style.setProperty("--color-document-line", "#d7dde5");
    root.style.setProperty("--color-surface", modeTokens.surface);
    root.style.setProperty("--color-surface-elevated", modeTokens.surfaceElevated);
    root.style.setProperty("--color-surface-muted", modeTokens.surfaceMuted);
    root.style.setProperty("--color-foreground", modeTokens.foreground);
    root.style.setProperty("--color-muted", modeTokens.muted);
    root.style.setProperty("--color-border", activeBorder);
    root.style.setProperty("--color-shell-nav", modeTokens.shellNav);
    root.style.setProperty("--color-shell-nav-elevated", modeTokens.shellNavElevated);
    root.style.setProperty("--color-shell-nav-border", activeShellNavBorder);
    root.style.setProperty("--color-shell-nav-foreground", modeTokens.shellNavForeground);
    root.style.setProperty("--color-shell-nav-muted", modeTokens.shellNavMuted);
    root.style.setProperty("--color-shell-nav-active", modeTokens.shellNavActive);

    root.style.setProperty("--color-primary", activePrimary);
    root.style.setProperty("--color-primary-text", activePrimaryText);
    root.style.setProperty("--color-primary-hover", activePrimaryHover);
    root.style.setProperty("--color-primary-soft", activePrimarySoft);
    root.style.setProperty("--color-on-primary", activeOnPrimary);

    root.style.setProperty("--color-accent", activeAccent);
    root.style.setProperty("--color-accent-text", activeAccentText);
    root.style.setProperty("--color-accent-soft", activeAccentSoft);

    root.style.setProperty("--color-success", modeTokens.success);
    root.style.setProperty("--color-success-text", activeSuccessText);
    root.style.setProperty("--color-success-soft", modeTokens.successSoft);
    root.style.setProperty("--color-on-success", activeOnSuccess);
    root.style.setProperty("--color-warning", modeTokens.warning);
    root.style.setProperty("--color-warning-text", activeWarningText);
    root.style.setProperty("--color-warning-soft", modeTokens.warningSoft);
    root.style.setProperty("--color-on-warning", activeOnWarning);
    root.style.setProperty("--color-danger", modeTokens.danger);
    root.style.setProperty("--color-danger-text", activeDangerText);
    root.style.setProperty("--color-danger-soft", modeTokens.dangerSoft);
    root.style.setProperty("--color-on-danger", activeOnDanger);

    root.style.setProperty("--shadow-shell", modeTokens.shadowShell);
    root.style.setProperty("--shadow-card", activeCardShadow);
    root.dataset.motionPreference = prefs.motionPreference;

    // Dynamic Typography Suite
    root.style.setProperty("--font-family-active", activeFontFamily);
    root.style.setProperty("--font-size-xs", scaleTokens.xs);
    root.style.setProperty("--font-size-sm", scaleTokens.sm);
    root.style.setProperty("--font-size-base", scaleTokens.base);
    root.style.setProperty("--font-size-lg", scaleTokens.lg);
    root.style.setProperty("--font-size-xl", scaleTokens.xl);
    root.style.setProperty("--font-size-2xl", scaleTokens["2xl"]);
    root.style.setProperty("--font-size-3xl", scaleTokens["3xl"]);

    root.style.setProperty("--line-height-xs", scaleTokens.lineXs);
    root.style.setProperty("--line-height-sm", scaleTokens.lineSm);
    root.style.setProperty("--line-height-base", scaleTokens.lineBase);
    root.style.setProperty("--line-height-lg", scaleTokens.lineLg);
    root.style.setProperty("--line-height-xl", scaleTokens.lineXl);
    root.style.setProperty("--line-height-2xl", scaleTokens.line2xl);
    root.style.setProperty("--line-height-3xl", scaleTokens.line3xl);

    try {
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(prefs));
    } catch {
      // ignore storage error
    }
  }, [prefs, resolvedMode, activeFontFamily, activePaletteColors]);

  const setMode = useCallback((mode: ThemeMode) => {
    setPrefs((prev) => ({ ...prev, mode }));
  }, []);

  const setPalette = useCallback((palette: ColorPalette) => {
    setPrefs((prev) => {
      const customOverrides = prev.customOverrides.borderRadiusScale === undefined
        ? {}
        : { borderRadiusScale: prev.customOverrides.borderRadiusScale };
      return { ...prev, palette, customOverrides };
    });
  }, []);

  const setEnglishFont = useCallback((englishFont: EnglishFontFamily) => {
    setPrefs((prev) => ({ ...prev, englishFont }));
  }, []);

  const setArabicFont = useCallback((arabicFont: ArabicFontFamily) => {
    setPrefs((prev) => ({ ...prev, arabicFont }));
  }, []);

  const setFontScale = useCallback((fontScale: FontScale) => {
    setPrefs((prev) => ({ ...prev, fontScale }));
  }, []);

  const setSurfaceStyle = useCallback((surfaceStyle: SurfaceStyle) => {
    setPrefs((prev) => ({ ...prev, surfaceStyle }));
  }, []);

  const setMotionPreference = useCallback((motionPreference: MotionPreference) => {
    setPrefs((prev) => ({ ...prev, motionPreference }));
  }, []);

  const setCustomOverrides = useCallback((overrides: ThemeCustomOverrides) => {
    setPrefs((prev) => {
      const customOverrides = { ...prev.customOverrides };
      if (isColorHex(overrides.primaryColor)) customOverrides.primaryColor = overrides.primaryColor;
      if (isColorHex(overrides.accentColor)) customOverrides.accentColor = overrides.accentColor;
      if (typeof overrides.borderRadiusScale === "number" && Number.isFinite(overrides.borderRadiusScale)) {
        customOverrides.borderRadiusScale = normalizeBorderRadiusScale(overrides.borderRadiusScale);
      }
      return { ...prev, customOverrides };
    });
  }, []);

  const resetCustomColor = useCallback((color: "primaryColor" | "accentColor") => {
    setPrefs((prev) => {
      const customOverrides = { ...prev.customOverrides };
      delete customOverrides[color];
      return { ...prev, customOverrides };
    });
  }, []);

  const resetThemeDefaults = useCallback(() => {
    setPrefs(DEFAULT_PREFERENCES);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...prefs,
      resolvedMode,
      activeFontFamily,
      activePrimaryColor: activePaletteColors.primary,
      activeAccentColor: activePaletteColors.accent,
      setMode,
      setPalette,
      setEnglishFont,
      setArabicFont,
      setFontScale,
      setSurfaceStyle,
      setMotionPreference,
      setCustomOverrides,
      resetCustomColor,
      resetThemeDefaults
    }),
    [
      prefs,
      resolvedMode,
      activeFontFamily,
      activePaletteColors,
      setMode,
      setPalette,
      setEnglishFont,
      setArabicFont,
      setFontScale,
      setSurfaceStyle,
      setMotionPreference,
      setCustomOverrides,
      resetCustomColor,
      resetThemeDefaults
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
};
