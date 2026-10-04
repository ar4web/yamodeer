import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";

export type ThemeMode = "light" | "dark" | "high-contrast" | "auto";
export type ResolvedThemeMode = "light" | "dark" | "high-contrast";

export type ColorPalette =
  | "soft-charcoal"
  | "classic-corporate"
  | "oasis-mint"
  | "royal-gold"
  | "stealth-midnight"
  | "modern-matte";

export type EnglishFontFamily = "Inter" | "Roboto" | "SF Pro";
export type ArabicFontFamily = "Cairo" | "IBM Plex Sans Arabic" | "Tajawal";
export type FontScale = "sm" | "md" | "lg" | "xl";

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
  "oasis-mint": {
    primary: "#185b43", // Deep YaModeer evergreen
    primaryHover: "#124833",
    primarySoftLight: "#eaf3ed",
    primarySoftDark: "#1d392d",
    onPrimary: "#ffffff",
    accent: "#b18a50", // Warm date-palm brass
    accentSoftLight: "#f7f1e6",
    accentSoftDark: "#3a3020"
  },
  "classic-corporate": {
    primary: "#1e3a8a", // Executive Navy
    primaryHover: "#1e40af",
    primarySoftLight: "#eff6ff",
    primarySoftDark: "#172554",
    onPrimary: "#ffffff",
    accent: "#0284c7", // Corporate Sky
    accentSoftLight: "#f0f9ff",
    accentSoftDark: "#0c4a6e"
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
    primarySoftLight: "#eef2ff",
    primarySoftDark: "#1e1b4b",
    onPrimary: "#ffffff",
    accent: "#06b6d4", // Telemetry Cyan
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
    canvas: "#f3f4f6",
    surface: "#ffffff",
    surfaceElevated: "#f9fafb",
    surfaceMuted: "#eef0f3",
    foreground: "#202226",
    muted: "#70747c",
    border: "#f0f1f3",
    success: "#537864",
    successSoft: "#e8f0eb",
    warning: "#8b7857",
    warningSoft: "#f3efe7",
    danger: "#955f64",
    dangerSoft: "#f5eaeb",
    shellNav: "#eef0f3",
    shellNavElevated: "#e3e6ea",
    shellNavBorder: "#dfe2e7",
    shellNavForeground: "#202226",
    shellNavMuted: "#70747c",
    shellNavActive: "rgba(32, 34, 38, 0.06)",
    shadowShell: "0 20px 56px -34px rgba(25, 27, 31, 0.24)",
    shadowCard: "0 3px 12px -7px rgba(25, 27, 31, 0.14)"
  },
  dark: {
    canvas: "#151619",
    surface: "#1c1e22",
    surfaceElevated: "#24262b",
    surfaceMuted: "#2b2e33",
    foreground: "#e7e8eb",
    muted: "#a2a5ab",
    border: "#2a2c31",
    success: "#8fafa0",
    successSoft: "#2a3731",
    warning: "#baa882",
    warningSoft: "#393329",
    danger: "#c18b92",
    dangerSoft: "#3b2a2d",
    shellNav: "#1c1e22",
    shellNavElevated: "#24262b",
    shellNavBorder: "rgba(255, 255, 255, 0.08)",
    shellNavForeground: "#e7e8eb",
    shellNavMuted: "#a2a5ab",
    shellNavActive: "rgba(255, 255, 255, 0.06)",
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
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: ColorPalette) => void;
  setEnglishFont: (font: EnglishFontFamily) => void;
  setArabicFont: (font: ArabicFontFamily) => void;
  setFontScale: (scale: FontScale) => void;
  setCustomOverrides: (overrides: ThemeCustomOverrides) => void;
  resetThemeDefaults: () => void;
}

const DEFAULT_PREFERENCES: ThemePreferences = {
  mode: "dark",
  palette: "soft-charcoal",
  englishFont: "Inter",
  arabicFont: "Cairo",
  fontScale: "md",
  customOverrides: {}
};

const STORAGE_KEY_THEME = "ksa_hrms_theme_v3";
const LEGACY_STORAGE_KEY_THEME = "ksa_hrms_theme_v2";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage();

  const [prefs, setPrefs] = useState<ThemePreferences>(() => {
    try {
      const currentRaw = localStorage.getItem(STORAGE_KEY_THEME);
      if (currentRaw) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(currentRaw) };
      }

      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY_THEME);
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw) as Partial<ThemePreferences>;
        // Keep accessibility and typography choices while moving the old green/light preset
        // to the requested calm, charcoal default.
        return {
          ...DEFAULT_PREFERENCES,
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

  // Inject CSS custom properties dynamically onto :root without requiring any external .css file
  useEffect(() => {
    const root = document.documentElement;
    const paletteTokens = PALETTE_DICTIONARY[prefs.palette];
    const modeTokens = MODE_SURFACES[resolvedMode];
    const scaleTokens = FONT_SCALE_MATRIX[prefs.fontScale];

    const isDarkLike = resolvedMode === "dark" || resolvedMode === "high-contrast";

    const activePrimary =
      resolvedMode === "high-contrast"
        ? "#facc15"
        : prefs.customOverrides.primaryColor ||
          (isDarkLike ? paletteTokens.primaryDark ?? paletteTokens.primary : paletteTokens.primary);
    const activeAccent =
      resolvedMode === "high-contrast"
        ? "#38bdf8"
        : prefs.customOverrides.accentColor ||
          (isDarkLike ? paletteTokens.accentDark ?? paletteTokens.accent : paletteTokens.accent);

    root.style.setProperty("--color-canvas", modeTokens.canvas);
    root.style.setProperty("--color-document-paper", "#ffffff");
    root.style.setProperty("--color-document-ink", "#1f2937");
    root.style.setProperty("--color-document-line", "#d7dde5");
    root.style.setProperty("--color-surface", modeTokens.surface);
    root.style.setProperty("--color-surface-elevated", modeTokens.surfaceElevated);
    root.style.setProperty("--color-surface-muted", modeTokens.surfaceMuted);
    root.style.setProperty("--color-foreground", modeTokens.foreground);
    root.style.setProperty("--color-muted", modeTokens.muted);
    root.style.setProperty("--color-border", modeTokens.border);
    root.style.setProperty("--color-shell-nav", modeTokens.shellNav);
    root.style.setProperty("--color-shell-nav-elevated", modeTokens.shellNavElevated);
    root.style.setProperty("--color-shell-nav-border", modeTokens.shellNavBorder);
    root.style.setProperty("--color-shell-nav-foreground", modeTokens.shellNavForeground);
    root.style.setProperty("--color-shell-nav-muted", modeTokens.shellNavMuted);
    root.style.setProperty("--color-shell-nav-active", modeTokens.shellNavActive);

    root.style.setProperty("--color-primary", activePrimary);
    root.style.setProperty(
      "--color-primary-hover",
      isDarkLike ? paletteTokens.primaryHoverDark ?? paletteTokens.primaryHover : paletteTokens.primaryHover
    );
    root.style.setProperty(
      "--color-primary-soft",
      isDarkLike ? paletteTokens.primarySoftDark : paletteTokens.primarySoftLight
    );
    root.style.setProperty(
      "--color-on-primary",
      resolvedMode === "high-contrast"
        ? "#000000"
        : isDarkLike
          ? paletteTokens.onPrimaryDark ?? paletteTokens.onPrimary
          : paletteTokens.onPrimary
    );

    root.style.setProperty("--color-accent", activeAccent);
    root.style.setProperty(
      "--color-accent-soft",
      isDarkLike ? paletteTokens.accentSoftDark : paletteTokens.accentSoftLight
    );

    root.style.setProperty("--color-success", modeTokens.success);
    root.style.setProperty("--color-success-soft", modeTokens.successSoft);
    root.style.setProperty("--color-warning", modeTokens.warning);
    root.style.setProperty("--color-warning-soft", modeTokens.warningSoft);
    root.style.setProperty("--color-danger", modeTokens.danger);
    root.style.setProperty("--color-danger-soft", modeTokens.dangerSoft);

    root.style.setProperty("--shadow-shell", modeTokens.shadowShell);
    root.style.setProperty("--shadow-card", modeTokens.shadowCard);

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
  }, [prefs, resolvedMode, activeFontFamily]);

  const setMode = useCallback((mode: ThemeMode) => {
    setPrefs((prev) => ({ ...prev, mode }));
  }, []);

  const setPalette = useCallback((palette: ColorPalette) => {
    setPrefs((prev) => ({ ...prev, palette, customOverrides: {} }));
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

  const setCustomOverrides = useCallback((customOverrides: ThemeCustomOverrides) => {
    setPrefs((prev) => ({
      ...prev,
      customOverrides: { ...prev.customOverrides, ...customOverrides }
    }));
  }, []);

  const resetThemeDefaults = useCallback(() => {
    setPrefs(DEFAULT_PREFERENCES);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...prefs,
      resolvedMode,
      activeFontFamily,
      setMode,
      setPalette,
      setEnglishFont,
      setArabicFont,
      setFontScale,
      setCustomOverrides,
      resetThemeDefaults
    }),
    [
      prefs,
      resolvedMode,
      activeFontFamily,
      setMode,
      setPalette,
      setEnglishFont,
      setArabicFont,
      setFontScale,
      setCustomOverrides,
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
