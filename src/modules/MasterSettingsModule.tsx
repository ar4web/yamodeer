import React, { useState } from "react";
import {
  Palette,
  AppWindow,
  ShieldAlert,
  LayoutDashboard,
  Type,
  RotateCcw,
  Check,
  Lock,
  Sparkles,
  Plug
} from "lucide-react";
import { useLanguage, BilingualText } from "@/context/LanguageContext";
import {
  useTheme,
  ThemeMode,
  ColorPalette,
  EnglishFontFamily,
  ArabicFontFamily,
  FontScale,
  MotionPreference,
  SurfaceStyle
} from "@/context/ThemeContext";
import {
  useRBACGeofence,
  CorporateRole,
  ATOMIC_SCOPE_CATALOG,
  AppStoreModuleToggles
} from "@/context/RBACGeofenceContext";
import {
  MetricCard,
  PageHeader,
  PrototypeNotice,
  formControlClassName,
  primaryButtonClass,
  quietSurfaceClassName,
  secondaryButtonClass,
  surfaceClassName,
  TabPanel
} from "@/components/DesignSystem";
import { DashboardWidgetSettingsPanel } from "@/components/DashboardWidgetSettingsPanel";
import { IntegrationCatalogPanel } from "@/components/IntegrationCatalogPanel";
import type { RosterImportBundle } from "@/services/rosterImport";

interface MasterSettingsModuleProps {
  rosterSummary: RosterImportBundle["summary"] | null;
  rosterRecordsLoaded: boolean;
  initialTab?: SettingsSection;
  onImportRoster: (bundle: RosterImportBundle) => void;
  onClearRoster: () => void;
}

const ROLE_COLUMNS: CorporateRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "HR_OPS",
  "MANAGER",
  "EMPLOYEE"
];

const SCALE_STEPS: FontScale[] = ["sm", "md", "lg", "xl"];

type SettingsSection = "theme_lab" | "app_store" | "dashboard_widgets" | "integrations" | "rbac_matrix";

const SETTINGS_SECTIONS: Array<{
  value: SettingsSection;
  labelKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
}> = [
  {
    value: "theme_lab",
    labelKey: "set.tab.theme_lab",
    descriptionKey: "set.tab.theme_lab.desc",
    icon: <Palette className="h-4 w-4" />
  },
  {
    value: "app_store",
    labelKey: "set.tab.app_store",
    descriptionKey: "set.tab.app_store.desc",
    icon: <AppWindow className="h-4 w-4" />
  },
  {
    value: "dashboard_widgets",
    labelKey: "set.tab.dashboard_widgets",
    descriptionKey: "set.tab.dashboard_widgets.desc",
    icon: <LayoutDashboard className="h-4 w-4" />
  },
  {
    value: "integrations",
    labelKey: "set.tab.integrations",
    descriptionKey: "set.tab.integrations.desc",
    icon: <Plug className="h-4 w-4" />
  },
  {
    value: "rbac_matrix",
    labelKey: "set.tab.rbac_matrix",
    descriptionKey: "set.tab.rbac_matrix.desc",
    icon: <ShieldAlert className="h-4 w-4" />
  }
];

const SettingsSidebarTabs: React.FC<{
  value: SettingsSection;
  onChange: (value: SettingsSection) => void;
}> = ({ value, onChange }) => {
  const { t } = useLanguage();

  const moveFocus = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentValue: SettingsSection
  ) => {
    const currentIndex = SETTINGS_SECTIONS.findIndex((section) => section.value === currentValue);
    let nextIndex: number | undefined;
    if (event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % SETTINGS_SECTIONS.length;
    } else if (event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + SETTINGS_SECTIONS.length) % SETTINGS_SECTIONS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = SETTINGS_SECTIONS.length - 1;
    }

    if (nextIndex === undefined) return;
    event.preventDefault();
    const next = SETTINGS_SECTIONS[nextIndex];
    onChange(next.value);
    window.requestAnimationFrame(() => {
      document.getElementById(`settings-${next.value}-tab`)?.focus();
    });
  };

  return (
    <div
      id="settings-tablist"
      role="tablist"
      aria-label={t("set.sidebar.aria")}
      aria-orientation="vertical"
      className="flex min-w-0 flex-col items-stretch gap-1.5 border-e border-theme pe-1.5 sm:pe-2"
    >
      {SETTINGS_SECTIONS.map((section) => {
        const selected = value === section.value;
        return (
          <button
            key={section.value}
            id={`settings-${section.value}-tab`}
            type="button"
            role="tab"
            aria-label={t(section.labelKey)}
            title={t(section.labelKey)}
            aria-selected={selected}
            aria-controls={`settings-${section.value}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(section.value)}
            onKeyDown={(event) => moveFocus(event, section.value)}
            className={`flex min-h-12 w-full flex-col items-center justify-center gap-1 border-s-2 px-1 py-1.5 text-center text-dynamic-xs font-semibold leading-tight transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:min-h-11 sm:flex-row sm:justify-start sm:gap-2.5 sm:px-3 sm:text-start sm:text-dynamic-sm ${
              selected
                ? "border-primary font-bold text-primary-text"
                : "border-transparent text-muted hover:bg-surface-elevated/60 hover:text-foreground"
            }`}
          >
            <span className="shrink-0" aria-hidden="true">{section.icon}</span>
            <span className="sr-only min-w-0 break-words sm:not-sr-only">{t(section.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
};

const PersonalizationPreview: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section className={`${quietSurfaceClassName} space-y-4 p-4`} aria-labelledby="settings-personalization-preview-title">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2 id="settings-personalization-preview-title" className="text-dynamic-lg font-bold text-foreground">
            {t("set.theme.preview.title")}
          </h2>
          <p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{t("set.theme.preview.note")}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-dynamic-xs font-semibold text-primary-text">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {t("set.theme.preview.live")}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <article className={`${surfaceClassName} space-y-3 p-4`}>
          <h3 className="text-dynamic-sm font-bold text-foreground">{t("set.theme.preview.controls")}</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`${primaryButtonClass} w-full min-w-0 max-w-full !shrink sm:w-auto sm:!shrink-0`}>{t("set.theme.preview.primary_button")}</button>
            <button type="button" className={`${secondaryButtonClass} w-full min-w-0 max-w-full !shrink sm:w-auto sm:!shrink-0`}>{t("set.theme.preview.secondary_button")}</button>
          </div>
          <label className="block space-y-1.5">
            <span className="text-dynamic-xs font-semibold text-muted">{t("set.theme.preview.field_label")}</span>
            <input readOnly value={t("set.theme.preview.field_value")} className={formControlClassName} />
          </label>
        </article>

        <div className="space-y-3">
          <MetricCard
            label={t("set.theme.preview.metric")}
            value="—"
            note={t("set.theme.preview.placeholder")}
            icon={<Sparkles className="h-5 w-5" />}
            surfaceVariant="quiet"
          />
          <article className={`${surfaceClassName} space-y-3 p-4`}>
            <h3 className="text-dynamic-sm font-bold text-foreground">{t("set.theme.preview.status")}</h3>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-success-soft px-2.5 py-1 text-dynamic-xs font-semibold text-success-text">{t("set.theme.preview.success")}</span>
              <span className="rounded-full bg-warning-soft px-2.5 py-1 text-dynamic-xs font-semibold text-warning-text">{t("set.theme.preview.pending")}</span>
              <span className="rounded-full bg-danger-soft px-2.5 py-1 text-dynamic-xs font-semibold text-danger-text">{t("set.theme.preview.attention")}</span>
            </div>
          </article>
        </div>

        <article className={`${surfaceClassName} space-y-3 p-4`}>
          <h3 className="text-dynamic-sm font-bold text-foreground">{t("set.theme.preview.data")}</h3>
          <div className="overflow-hidden rounded-lg border border-theme">
            <table className="w-full text-start text-dynamic-xs">
              <thead className="bg-surface-elevated text-muted">
                <tr>
                  <th scope="col" className="px-1.5 py-2 font-semibold sm:px-3">{t("set.theme.preview.column")}</th>
                  <th scope="col" className="px-1.5 py-2 font-semibold sm:px-3">{t("set.theme.preview.state")}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-theme text-foreground">
                  <td className="px-1.5 py-2 sm:px-3">{t("set.theme.preview.cell")}</td>
                  <td className="px-1.5 py-2 sm:px-3">—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div role="img" aria-label={t("set.theme.preview.chart_label")} className="flex h-3 overflow-hidden rounded-full bg-surface-muted">
            <span aria-hidden="true" className="h-full w-[62%] bg-primary" />
            <span aria-hidden="true" className="h-full w-[38%] bg-accent" />
          </div>
        </article>
      </div>
    </section>
  );
};

export const MasterSettingsModule: React.FC<MasterSettingsModuleProps> = ({
  rosterSummary,
  rosterRecordsLoaded,
  initialTab = "theme_lab",
  onImportRoster,
  onClearRoster
}) => {
  const { t, localize } = useLanguage();
  const {
    mode,
    palette,
    englishFont,
    arabicFont,
    fontScale,
    surfaceStyle,
    motionPreference,
    resolvedMode,
    activePrimaryColor,
    activeAccentColor,
    customOverrides,
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
  } = useTheme();

  const {
    rbacMatrix,
    togglePermissionCell,
    resetRbacMatrix,
    moduleToggles,
    toggleAppModule,
    hasPermission,
    activeOffice,
    updateAllowedRadius
  } = useRBACGeofence();

  const [activeTab, setActiveTab] = useState<SettingsSection>(initialTab);
  const activeSettingsSection = SETTINGS_SECTIONS.find((section) => section.value === activeTab) ?? SETTINGS_SECTIONS[0];

  const canToggleAppStore = hasPermission("system:app_store_toggles");

  const appStoreModules: Array<{
    key: keyof AppStoreModuleToggles;
    title: BilingualText;
    description: BilingualText;
    titleKey?: string;
    descriptionKey?: string;
    badge: string;
  }> = [
    {
      key: "geofencingEnabled",
      title: {
        en: "GeofencingSafetyProvider Protocol",
        ar: "بروتوكول الحماية والتحقق الجغرافي"
      },
      description: {
        en: "Enforces HTML5 GPS coordinate radius and strict ≤15m drift threshold on attendance clock-in events.",
        ar: "يفرض التحقق من نصف قطر المقر ودقة إشارة GPS (بحد أقصى 15 متر) عند تسجيل الحضور."
      },
      badge: "SEC-GEO-V2"
    },
    {
      key: "zatcaPhase2Enabled",
      title: {
        en: "ZATCA Fatoora Phase 2 Cryptographic Engine",
        ar: "محرك الفوترة الإلكترونية للمرحلة الثانية (زاتكا)"
      },
      description: {
        en: "Activates RFC 4122 UUID, SHA-256 PIH chaining, ECDSA stamps, and TLV Hex Array QR code generation.",
        ar: "يفعل التشفير الرقمي، تسلسل الفواتير، والتوقيع الإلكتروني ورمز الاستجابة السريعة بصيغة TLV."
      },
      badge: "ZATCA-P2"
    },
    {
      key: "invoicingModuleEnabled",
      title: { en: "Client Invoicing", ar: "فواتير العملاء" },
      description: { en: "Enables client lookup, received purchase orders, direct invoice drafts and review.", ar: "يفعّل البحث عن العملاء وأوامر الشراء المستلمة ومسودات الفواتير المباشرة ومراجعتها." },
      badge: "INVOICES"
    },
    {
      key: "directInvoicingAllowed",
      title: { en: "Direct invoices without a PO", ar: "الفواتير المباشرة دون أمر شراء" },
      description: { en: "Company policy switch: allow clients to be invoiced without a received PO.", ar: "إعداد سياسة الشركة: السماح بالفوترة دون وجود أمر شراء مستلم." },
      badge: "FIN-POLICY"
    },
    {
      key: "vendorPortalEnabled",
      title: {
        en: "Vendor & Contractor Supply Chain Portal",
        ar: "بوابة حوكمة الموردين والمقاولين"
      },
      description: {
        en: "Exposes the isolated B2B vendor ledger tracking MOCI CR validity, Chamber IDs, and Saudization SLAs. Disabling unmounts sidebar route.",
        ar: "يعرض سجل الموردين وعقود الإسناد وصلاحية السجل التجاري. إيقافه يزيل المسار من القائمة الجانبية فوراً."
      },
      badge: "B2B-VEN"
    },
    {
      key: "expensesModuleEnabled",
      title: { en: "Corporate Expense Claims & Reimbursement Workflow", ar: "نظام مطالبات المصروفات والتعويضات" },
      description: { en: "Enables employee reimbursements, 15% input VAT receipt capture, manager approval and WPS settlement.", ar: "يفعل تعويضات الموظفين وتوثيق ضريبة المدخلات واعتمادات المدير والتسوية عبر حماية الأجور." },
      badge: "EXPENSES"
    },
    {
      key: "accountsModuleEnabled",
      title: { en: "SOCPA Accounts & General Ledger Hub", ar: "مركز الحسابات والأستاذ العام وفق سوكبا" },
      description: { en: "Mounts the bilingual chart of accounts, balanced journal vouchers, ZATCA VAT return and statutory provision schedules.", ar: "يفتح شجرة الحسابات ثنائية اللغة وقيود اليومية المتوازنة وإقرار زاتكا والمخصصات النظامية." },
      badge: "SOCPA-GL"
    },
    {
      key: "workHubEnabled",
      title: { en: "Work Hub · My work", ar: "مركز العمل · أعمالي" },
      description: { en: "Controls personal tasks, reminders and notebooks inside Work Hub.", ar: "يتحكم في المهام والتذكيرات والدفاتر الشخصية داخل مركز العمل." },
      titleKey: "set.app.work_hub.title",
      descriptionKey: "set.app.work_hub.desc",
      badge: "WORK-HUB"
    },
    {
      key: "workspaceModuleEnabled",
      title: { en: "Work Hub · Workspace", ar: "مركز العمل · مساحة العمل" },
      description: { en: "Controls workspace overview, projects, teams and meetings inside Work Hub.", ar: "يتحكم في نظرة مساحة العمل والمشاريع والفرق والاجتماعات داخل مركز العمل." },
      titleKey: "set.app.work_hub.workspace.title",
      descriptionKey: "set.app.work_hub.workspace.desc",
      badge: "WORK-HUB"
    },
    {
      key: "laborLawEngineEnabled",
      title: {
        en: "KSA Labor Law Calculators (OT, GOSI & EOSB)",
        ar: "حاسبات نظام العمل السعودي (الإضافي، التأمينات، نهاية الخدمة)"
      },
      description: {
        en: "Provides Article 107 overtime math, 10%/2% conditional GOSI split, and Article 84/85 EOSB entitlement engine.",
        ar: "يوفر حاسبات المادة 107 للعمل الإضافي، واستقطاعات التأمينات المشروطة، ومكافأة نهاية الخدمة."
      },
      badge: "MHRSD-LAW"
    },
    {
      key: "onboardingWizardEnabled",
      title: {
        en: "4-Step KSA Legal Onboarding Wizard",
        ar: "معالج تعيين الموظفين القانوني (4 مراحل)"
      },
      description: {
        en: "Enables structured multi-step onboarding capturing Iqama/National ID, Qiwa contract, WPS IBAN, and asset custody.",
        ar: "يفعل معالج التعيين المرحلي لتوثيق الهوية وعقد قوى وآيبان حماية الأجور والعهد."
      },
      badge: "ONBOARD-WIZ"
    },
    {
      key: "ramadanModeEnabled",
      title: {
        en: "Ramadan Statutory Working Hours Mode (6h/Day)",
        ar: "جدول ساعات العمل النظامية لشهر رمضان (6 ساعات/يوم)"
      },
      description: {
        en: "Adjusts standard daily working hours from 8h (48h/week) down to 6h/day (36h/week) per KSA Labor Law Article 98.",
        ar: "يعدل الحد الأقصى لساعات العمل اليومية من 8 ساعات إلى 6 ساعات يومياً وفق المادة 98 من نظام العمل."
      },
      badge: "ART-98"
    }
  ];

  const currentScaleIndex = SCALE_STEPS.indexOf(fontScale);
  const currentRadiusPercent = Math.round((customOverrides.borderRadiusScale ?? 1) * 100);
  const primaryPickerColor = resolvedMode === "high-contrast"
    ? activePrimaryColor
    : customOverrides.primaryColor ?? activePrimaryColor;
  const accentPickerColor = resolvedMode === "high-contrast"
    ? activeAccentColor
    : customOverrides.accentColor ?? activeAccentColor;
  const surfaceStyles: SurfaceStyle[] = ["soft", "balanced", "defined"];
  const motionPreferences: MotionPreference[] = ["system", "reduced"];

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t("nav.group.company")}
        title={t("set.header.title")}
      />
      <PrototypeNotice label={t("collab.badge.local_demo")}>{t("settings.prototype.notice")}</PrototypeNotice>

      <div className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] gap-2 min-[360px]:grid-cols-[3.75rem_minmax(0,1fr)] sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="sticky top-4 max-h-[calc(100vh-2rem)] min-w-0 self-start overflow-y-auto">
          <SettingsSidebarTabs value={activeTab} onChange={setActiveTab} />
        </aside>
        <div className="min-w-0 space-y-4">
          {activeSettingsSection && (
            <div className="border-b border-theme pb-3 sm:hidden">
              <h2 className="text-dynamic-base font-bold text-foreground">{t(activeSettingsSection.labelKey)}</h2>
              <p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{t(activeSettingsSection.descriptionKey)}</p>
            </div>
          )}
      {/* VIEW 1: DYNAMIC THEME & TYPOGRAPHY LAB */}
      <TabPanel hidden={activeTab !== "theme_lab"} id="settings-theme_lab-panel" labelledBy="settings-theme_lab-tab">
        <div role="note" className="rounded-xl bg-primary-soft px-4 py-3 text-dynamic-xs leading-relaxed text-primary-text">
          {t("set.theme.global_note")}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Left 7 Cols: Mode & Palette Matrix */}
          <div className="xl:col-span-7 min-w-0 space-y-4">
            {/* 1. Display Mode Engine */}
            <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
                <h2 className="text-dynamic-lg font-bold text-foreground">
                  {t("set.theme.mode_title")}
                </h2>
                <button
                  type="button"
                  onClick={resetThemeDefaults}
                  className={`${secondaryButtonClass} w-full min-w-0 max-w-full !shrink sm:w-auto sm:!shrink-0`}
                >
                  <RotateCcw className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-words">{t("set.reset_short")}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 sm:grid-cols-4">
                {(["light", "dark", "high-contrast", "auto"] as ThemeMode[]).map(
                  (m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={mode === m}
                      onClick={() => setMode(m)}
                      className={`p-3.5 rounded-xl border text-start transition flex flex-col justify-between gap-2 ${
                        mode === m
                          ? "bg-primary-soft border-primary text-foreground"
                          : "bg-surface-elevated border-theme text-muted hover:border-primary"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="break-words text-dynamic-xs font-mono uppercase">
                          {m}
                        </span>
                        {mode === m && (
                          <Check className="w-4 h-4 text-primary-text" />
                        )}
                      </div>
                      <div className="break-words text-dynamic-sm font-bold text-foreground">
                        {t(`set.mode.${m}`)}
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 2. Color Palettes */}
            <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
              <h2 className="text-dynamic-lg font-bold text-foreground">
                {t("set.theme.palette_title")}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    ["dark-goldenrod", "#91713b", "#6d552c"],
                    ["soft-charcoal", "#626a74", "#756f65"],
                    ["oasis-mint", "#185b43", "#b18a50"],
                    ["classic-corporate", "#1e3a8a", "#0284c7"],
                    ["royal-gold", "#b45309", "#d97706"],
                    ["stealth-midnight", "#4f46e5", "#06b6d4"],
                    ["modern-matte", "#3d5cc9", "#b7472d"]
                  ] as Array<[ColorPalette, string, string]>
                ).map(([palKey, primaryHex, accentHex]) => (
                  <button
                    key={palKey}
                    type="button"
                    aria-pressed={palette === palKey}
                    onClick={() => setPalette(palKey)}
                    className={`p-4 rounded-xl border text-start transition flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${
                      palette === palKey
                        ? "bg-primary-soft border-primary text-foreground"
                        : "bg-surface-elevated border-theme text-muted hover:border-primary"
                    }`}
                  >
                    <div className="w-full min-w-0 space-y-1 sm:w-auto sm:flex-1">
                      <div className="break-words text-dynamic-sm font-bold text-foreground">
                        {t(`set.palette.${palKey}`)}
                      </div>
                      <div className="break-words text-dynamic-xs font-mono text-muted">
                        {primaryHex} • {accentHex}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className="w-6 h-6 rounded-full border border-theme"
                        style={{ backgroundColor: primaryHex }}
                      />
                      <span
                        className="w-6 h-6 rounded-full border border-theme"
                        style={{ backgroundColor: accentHex }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Micro-Theming CSS Variable Override Studio */}
            <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-text" />
                <h2 className="text-dynamic-lg font-bold text-foreground">
                  {t("set.theme.custom_vars")}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-surface-elevated border border-theme flex items-center justify-between">
                  <div>
                    <div className="text-dynamic-xs font-mono text-muted">
                      --color-primary
                    </div>
                    <div className="text-dynamic-sm font-bold text-foreground">
                      {primaryPickerColor}
                    </div>
                    <button
                      type="button"
                      disabled={!customOverrides.primaryColor}
                      onClick={() => resetCustomColor("primaryColor")}
                      className="mt-1 inline-flex min-h-8 items-center gap-1 rounded-md text-dynamic-xs font-semibold text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                      {t("set.theme.use_palette_default")}
                    </button>
                  </div>
                  <input
                    type="color"
                    aria-label={t("set.theme.primary_color")}
                    value={primaryPickerColor}
                    disabled={resolvedMode === "high-contrast"}
                    onChange={(e) => setCustomOverrides({ primaryColor: e.target.value })}
                    className="h-10 w-10 cursor-pointer rounded-lg bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="p-4 rounded-xl bg-surface-elevated border border-theme flex items-center justify-between">
                  <div>
                    <div className="text-dynamic-xs font-mono text-muted">
                      --color-accent
                    </div>
                    <div className="text-dynamic-sm font-bold text-foreground">
                      {accentPickerColor}
                    </div>
                    <button
                      type="button"
                      disabled={!customOverrides.accentColor}
                      onClick={() => resetCustomColor("accentColor")}
                      className="mt-1 inline-flex min-h-8 items-center gap-1 rounded-md text-dynamic-xs font-semibold text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                      {t("set.theme.use_palette_default")}
                    </button>
                  </div>
                  <input
                    type="color"
                    aria-label={t("set.theme.accent_color")}
                    value={accentPickerColor}
                    disabled={resolvedMode === "high-contrast"}
                    onChange={(e) => setCustomOverrides({ accentColor: e.target.value })}
                    className="h-10 w-10 cursor-pointer rounded-lg bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              <p role="note" className="text-dynamic-xs leading-relaxed text-muted">
                {t("set.theme.contrast_note")}
              </p>
            </div>
          </div>

          {/* Right 5 Cols: Multi-Font Bilingual Typography Suite & Scaling Engine */}
          <div className="xl:col-span-5 min-w-0 space-y-4">
            {/* 3. Multi-Font Suite */}
            <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
              <div className="flex items-center gap-2">
                <Type className="w-5 h-5 text-primary-text" />
                <h2 className="text-dynamic-lg font-bold text-foreground">
                  {t("set.theme.font_title")}
                </h2>
              </div>

              <div className="space-y-3">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("set.font.en_label")}
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(["Inter", "Roboto", "SF Pro"] as EnglishFontFamily[]).map(
                    (f) => (
                      <button
                        key={f}
                        type="button"
                        aria-pressed={englishFont === f}
                        onClick={() => setEnglishFont(f)}
                        className={`py-2.5 px-3 rounded-xl border text-dynamic-sm font-bold transition ${
                          englishFont === f
                            ? "bg-primary text-on-primary border-primary"
                            : "bg-surface-elevated text-foreground border-theme"
                        }`}
                      >
                        {f}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("set.font.ar_label")}
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(
                    [
                      "Cairo",
                      "IBM Plex Sans Arabic",
                      "Tajawal"
                    ] as ArabicFontFamily[]
                  ).map((f) => (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={arabicFont === f}
                      onClick={() => setArabicFont(f)}
                      className={`py-2.5 px-2 rounded-xl border text-dynamic-xs font-bold transition ${
                        arabicFont === f
                          ? "bg-primary text-on-primary border-primary"
                          : "bg-surface-elevated text-foreground border-theme"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Global Font Scaling Slider */}
            <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
              <h2 className="text-dynamic-lg font-bold text-foreground">
                {t("set.theme.scale_title")}
              </h2>

              <div className="space-y-3">
                <input
                  type="range"
                  aria-label={t("set.theme.scale_title")}
                  min={0}
                  max={3}
                  step={1}
                  value={currentScaleIndex}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setFontScale(SCALE_STEPS[idx] || "md");
                  }}
                  className="w-full accent-primary cursor-pointer"
                />

                <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
                  {SCALE_STEPS.map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      aria-pressed={fontScale === sc}
                      onClick={() => setFontScale(sc)}
                      className={`p-3 rounded-xl border text-start transition ${
                        fontScale === sc
                          ? "bg-primary-soft border-primary text-foreground"
                          : "bg-surface-elevated border-theme text-muted"
                      }`}
                    >
                      <div className="break-words text-dynamic-xs font-bold">
                        {t(`set.scale.${sc}`)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <section className="space-y-4 rounded-2xl border border-theme bg-surface p-4 shadow-card">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary-text" aria-hidden="true" />
                <h2 className="text-dynamic-lg font-bold text-foreground">{t("set.theme.component_style_title")}</h2>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <label htmlFor="settings-radius-scale" className="min-w-0 break-words text-dynamic-xs font-bold text-muted">{t("set.theme.radius_title")}</label>
                  <output htmlFor="settings-radius-scale" className="shrink-0 rounded-lg bg-surface-elevated px-2.5 py-1 text-dynamic-xs font-bold tabular-nums text-foreground">{currentRadiusPercent}%</output>
                </div>
                <input
                  id="settings-radius-scale"
                  type="range"
                  min={75}
                  max={125}
                  step={5}
                  value={currentRadiusPercent}
                  aria-valuetext={`${currentRadiusPercent}%`}
                  onChange={(event) => setCustomOverrides({ borderRadiusScale: Number(event.target.value) / 100 })}
                  className="w-full cursor-pointer accent-primary"
                />
                <p className="text-dynamic-xs leading-relaxed text-muted">{t("set.theme.radius_note")}</p>
              </div>

              <div className="space-y-2">
                <div className="text-dynamic-xs font-bold text-muted">{t("set.theme.surface_title")}</div>
                <div role="group" aria-label={t("set.theme.surface_title")} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {surfaceStyles.map((style) => (
                    <button
                      key={style}
                      type="button"
                      aria-pressed={surfaceStyle === style}
                      disabled={resolvedMode === "high-contrast"}
                      onClick={() => setSurfaceStyle(style)}
                      className={`min-h-10 rounded-xl border px-3 py-2 text-dynamic-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${
                        surfaceStyle === style
                          ? "border-primary bg-primary-soft text-primary-text"
                          : "border-theme bg-surface-elevated text-foreground hover:border-primary"
                      }`}
                    >
                      {t(`set.theme.surface.${style}`)}
                    </button>
                  ))}
                </div>
                <p className="text-dynamic-xs leading-relaxed text-muted">{t("set.theme.surface_note")}</p>
              </div>

              <div className="space-y-2">
                <div className="text-dynamic-xs font-bold text-muted">{t("set.theme.motion_title")}</div>
                <div role="group" aria-label={t("set.theme.motion_title")} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {motionPreferences.map((preference) => (
                    <button
                      key={preference}
                      type="button"
                      aria-pressed={motionPreference === preference}
                      onClick={() => setMotionPreference(preference)}
                      className={`min-h-10 rounded-xl border px-3 py-2 text-dynamic-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        motionPreference === preference
                          ? "border-primary bg-primary-soft text-primary-text"
                          : "border-theme bg-surface-elevated text-foreground hover:border-primary"
                      }`}
                    >
                      {t(`set.theme.motion.${preference}`)}
                    </button>
                  ))}
                </div>
                <p className="text-dynamic-xs leading-relaxed text-muted">{t("set.theme.motion_note")}</p>
              </div>
            </section>
          </div>
        </div>
        <div className="mt-4">
          <PersonalizationPreview />
        </div>
        </TabPanel>

      {/* VIEW 2: THE APP STORE TOGGLE (MODULAR COMPONENT ACTIVATION) */}
      <TabPanel hidden={activeTab !== "app_store"} id="settings-app_store-panel" labelledBy="settings-app_store-tab">
        <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-theme pb-4">
            <div>
              <h2 className="text-dynamic-lg font-bold text-foreground">
                {t("set.appstore.title")}
              </h2>
            </div>
            {!canToggleAppStore && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-warning-soft text-warning-text text-dynamic-xs font-bold">
                <Lock className="w-3.5 h-3.5" />
                <span>{t("set.appstore.super_admin_only")}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {appStoreModules.map((mod) => {
              const isEnabled = moduleToggles[mod.key];
              return (
                <div
                  key={mod.key}
                  className={`min-w-0 p-4 rounded-2xl border flex flex-col justify-between gap-4 transition ${
                    isEnabled
                      ? "bg-surface-elevated border-primary"
                      : "bg-surface border-theme opacity-75"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="max-w-full break-all px-2.5 py-0.5 rounded-md bg-primary-soft text-primary-text font-mono font-bold text-dynamic-xs">
                        {mod.badge}
                      </span>
                      <span
                        className={`max-w-full break-words px-3 py-1 rounded-full text-center font-bold text-dynamic-xs ${
                          isEnabled
                            ? "bg-success text-on-success"
                            : "bg-surface-muted text-muted"
                        }`}
                      >
                        {isEnabled
                          ? t("set.appstore.status_active")
                          : t("set.appstore.status_disabled")}
                      </span>
                    </div>
                    <h3 className="break-words text-dynamic-base font-bold text-foreground">
                      {mod.titleKey ? t(mod.titleKey) : localize(mod.title)}
                    </h3>
                    <p className="break-words text-dynamic-xs text-muted">
                      {mod.descriptionKey ? t(mod.descriptionKey) : localize(mod.description)}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-pressed={isEnabled}
                    disabled={!canToggleAppStore}
                    onClick={() => toggleAppModule(mod.key)}
                    className={`w-full min-w-0 break-words py-2 rounded-xl font-semibold text-dynamic-xs border transition ${
                      isEnabled
                        ? "bg-surface border-theme text-foreground hover:border-danger"
                        : "bg-primary text-on-primary border-primary"
                    } disabled:opacity-50`}
                  >
                    {isEnabled
                      ? t("set.appstore.btn_deactivate")
                      : t("set.appstore.btn_activate")}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Geofence Office Radius Slider inside App Store */}
          <div className="p-4 rounded-2xl bg-surface-elevated border border-theme flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-dynamic-sm font-bold text-foreground">
                {localize(activeOffice.name)} — {t("geo.allowed_radius")}
              </div>
              <div className="text-dynamic-xs text-muted">
                {t("set.appstore.perimeter_variance")}: {activeOffice.allowedRadiusMeters}m
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-64">
              <input
                type="range"
                aria-label={t("geo.allowed_radius")}
                min={25}
                max={250}
                step={5}
                value={activeOffice.allowedRadiusMeters}
                onChange={(e) => updateAllowedRadius(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <span className="font-mono font-bold text-dynamic-sm text-primary-text">
                {activeOffice.allowedRadiusMeters}m
              </span>
            </div>
          </div>
        </div>
        </TabPanel>

      {/* VIEW 3: DASHBOARD WIDGET VISIBILITY AND EMPTY-STATE PREFERENCES */}
      <TabPanel hidden={activeTab !== "dashboard_widgets"} id="settings-dashboard_widgets-panel" labelledBy="settings-dashboard_widgets-tab">
        <DashboardWidgetSettingsPanel
          rosterSummary={rosterSummary}
          rosterRecordsLoaded={rosterRecordsLoaded}
          onImportRoster={onImportRoster}
          onClearRoster={onClearRoster}
        />
      </TabPanel>

      {/* VIEW 4: GOVERNMENT, INSURANCE AND OPEN-DATA INTEGRATION CATALOG */}
      <TabPanel hidden={activeTab !== "integrations"} id="settings-integrations-panel" labelledBy="settings-integrations-tab">
        <IntegrationCatalogPanel />
      </TabPanel>

      {/* VIEW 5: THE GLOBAL RBAC PERMISSION ASSIGNMENT MATRIX */}
      <TabPanel hidden={activeTab !== "rbac_matrix"} id="settings-rbac_matrix-panel" labelledBy="settings-rbac_matrix-tab">
        <div className="bg-surface border border-theme rounded-2xl p-3 shadow-card space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-theme pb-3">
            <div>
              <h2 className="text-dynamic-lg font-bold text-foreground">
                {t("set.rbac.title")}
              </h2>
            </div>
            <button
              type="button"
              onClick={resetRbacMatrix}
              className={secondaryButtonClass}
            >
              <RotateCcw className="h-4 w-4 text-primary-text" />
              <span>{t("set.rbac.reset_btn")}</span>
            </button>
          </div>

          <div role="region" aria-label={t("set.rbac.title")} tabIndex={0} className="max-w-full overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
            <table className="min-w-[720px] w-full text-start border-collapse">
              <thead>
                <tr className="bg-surface-elevated border-b border-theme text-muted text-dynamic-xs">
                  <th className="py-2 ps-3 pe-2 text-start font-bold">
                    {t("set.rbac.scope_col")}
                  </th>
                  {ROLE_COLUMNS.map((role) => (
                    <th
                      key={role}
                      className="py-2 px-2 text-center font-bold"
                    >
                      <div>{t(`role.short.${role}`)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {ATOMIC_SCOPE_CATALOG.map((item) => (
                  <tr
                    key={item.scope}
                    className="transition-colors hover:bg-primary-soft/30"
                  >
                    <td className="py-2 ps-3 pe-2">
                      <div className="text-dynamic-sm font-bold text-foreground">
                        {localize(item.label)}
                      </div>
                      <div className="text-dynamic-xs font-mono text-muted">
                        {item.scope} • {localize(item.category)}
                      </div>
                    </td>
                    {ROLE_COLUMNS.map((role) => {
                      const allowed = rbacMatrix[role][item.scope];
                      return (
                        <td
                          key={role}
                          className="py-2 px-2 text-center align-middle"
                        >
                          <button
                            type="button"
                            title={`${t("set.rbac.toggle_permission")}: ${t(`role.short.${role}`)} — ${localize(item.label)}`}
                            aria-label={`${t("set.rbac.toggle_permission")}: ${t(`role.short.${role}`)} — ${localize(item.label)}`}
                            aria-pressed={allowed}
                            onClick={() =>
                              togglePermissionCell(role, item.scope)
                            }
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${
                              allowed
                                ? "bg-success text-on-success"
                                : "bg-surface text-muted hover:bg-surface-muted"
                            }`}
                          >
                            {allowed ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <span className="text-dynamic-xs font-mono">
                                —
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </TabPanel>
        </div>
      </div>
    </div>
  );
};
