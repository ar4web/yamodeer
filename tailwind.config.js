/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        "document-paper": "var(--color-document-paper)",
        "document-ink": "var(--color-document-ink)",
        "document-line": "var(--color-document-line)",
        surface: "var(--color-surface)",
        "surface-elevated": "var(--color-surface-elevated)",
        "surface-muted": "var(--color-surface-muted)",
        foreground: "var(--color-foreground)",
        muted: "var(--color-muted)",
        "shell-nav": "var(--color-shell-nav)",
        "shell-nav-elevated": "var(--color-shell-nav-elevated)",
        "shell-nav-border": "var(--color-shell-nav-border)",
        "shell-nav-foreground": "var(--color-shell-nav-foreground)",
        "shell-nav-muted": "var(--color-shell-nav-muted)",
        "shell-nav-active": "var(--color-shell-nav-active)",
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        "primary-soft": "var(--color-primary-soft)",
        "on-primary": "var(--color-on-primary)",
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        theme: "var(--color-border)",
        success: "var(--color-success)",
        "success-soft": "var(--color-success-soft)",
        warning: "var(--color-warning)",
        "warning-soft": "var(--color-warning-soft)",
        danger: "var(--color-danger)",
        "danger-soft": "var(--color-danger-soft)"
      },
      borderColor: {
        DEFAULT: "var(--color-border)",
        theme: "var(--color-border)",
        primary: "var(--color-primary)",
        accent: "var(--color-accent)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)"
      },
      ringColor: {
        primary: "var(--color-primary)",
        accent: "var(--color-accent)"
      },
      fontFamily: {
        sans: ["var(--font-family-active)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      fontSize: {
        "dynamic-xs": ["var(--font-size-xs)", { lineHeight: "var(--line-height-xs)" }],
        "dynamic-sm": ["var(--font-size-sm)", { lineHeight: "var(--line-height-sm)" }],
        "dynamic-base": ["var(--font-size-base)", { lineHeight: "var(--line-height-base)" }],
        "dynamic-lg": ["var(--font-size-lg)", { lineHeight: "var(--line-height-lg)" }],
        "dynamic-xl": ["var(--font-size-xl)", { lineHeight: "var(--line-height-xl)" }],
        "dynamic-2xl": ["var(--font-size-2xl)", { lineHeight: "var(--line-height-2xl)" }],
        "dynamic-3xl": ["var(--font-size-3xl)", { lineHeight: "var(--line-height-3xl)" }]
      },
      boxShadow: {
        shell: "var(--shadow-shell)",
        card: "var(--shadow-card)"
      },
      borderRadius: {
        none: "0px",
        sm: "0px",
        DEFAULT: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        "3xl": "0px",
        full: "0px"
      }
    }
  },
  plugins: []
};
