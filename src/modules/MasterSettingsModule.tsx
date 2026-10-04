import React, { useState } from "react";
import {
  Palette,
  AppWindow,
  ShieldAlert,
  Type,
  RotateCcw,
  Check,
  Lock,
  Sparkles
} from "lucide-react";
import { useLanguage, BilingualText } from "@/context/LanguageContext";
import {
  useTheme,
  ThemeMode,
  ColorPalette,
  EnglishFontFamily,
  ArabicFontFamily,
  FontScale
} from "@/context/ThemeContext";
import {
  useRBACGeofence,
  CorporateRole,
  ATOMIC_SCOPE_CATALOG,
  AppStoreModuleToggles
} from "@/context/RBACGeofenceContext";
import { iconButtonBaseClass, PageHeader, secondaryButtonClass, SegmentedTabs, TabPanel } from "@/components/DesignSystem";

const ROLE_COLUMNS: CorporateRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "HR_OPS",
  "MANAGER",
  "EMPLOYEE"
];

const SCALE_STEPS: FontScale[] = ["sm", "md", "lg", "xl"];

export const MasterSettingsModule: React.FC = () => {
  const { t, localize } = useLanguage();
  const {
    mode,
    palette,
    englishFont,
    arabicFont,
    fontScale,
    customOverrides,
    setMode,
    setPalette,
    setEnglishFont,
    setArabicFont,
    setFontScale,
    setCustomOverrides,
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

  const [activeTab, setActiveTab] = useState<
    "theme_lab" | "app_store" | "rbac_matrix"
  >("theme_lab");

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
      key: "filesManagerEnabled",
      title: { en: "SDAIA PDPL Enterprise Files Vault", ar: "خزنة الملفات المؤسسية وفق سدايا ونظام حماية البيانات" },
      description: { en: "Enables searchable classified folders for Qiwa, Muqeem, payroll, ZATCA and generated document assets.", ar: "يفعل مجلدات مصنفة وقابلة للبحث لعقود قوى ومقيم والرواتب وزاتكا والمستندات المنشأة." },
      badge: "PDPL-VAULT"
    },
    {
      key: "docMakerEnabled",
      title: { en: "Bilingual Enterprise Doc Maker Studio", ar: "استوديو صانع المستندات المؤسسي ثنائي اللغة" },
      description: { en: "Activates templates, RTL/LTR page layouts, paper presets, letterhead importing, custom styles and DOCX/XLSX/PDF interchange.", ar: "يفعل القوالب وتخطيطات RTL/LTR وأحجام الورق والترويسة والأنماط المخصصة وتبادل DOCX/XLSX/PDF." },
      badge: "DOC-STUDIO"
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
      key: "mailModuleEnabled",
      title: { en: "Unified Mail & AI Assistant", ar: "البريد الموحد ومساعد الذكاء الاصطناعي" },
      description: { en: "Enables the mail workspace for Gmail, Microsoft 365, Yahoo, iCloud and IMAP setup flows. Live sync requires approved OAuth/provider and backend configuration.", ar: "يفعل مساحة البريد لمسارات إعداد Gmail وMicrosoft 365 وYahoo وiCloud وIMAP. تتطلب المزامنة الفعلية إعداد OAuth ومزود وخادماً معتمداً." },
      badge: "MAIL-AI"
    },
    {
      key: "chatModuleEnabled",
      title: { en: "Internal Chat & Team Calls", ar: "المحادثات الداخلية ومكالمات الفرق" },
      description: { en: "Enables the local-demo messaging interface, team channels and conference-call preview. Messaging is not real-time across users, and calls require a configured provider.", ar: "يفعل واجهة المحادثات التجريبية وقنوات الفرق ومعاينة المؤتمرات. لا تتم مزامنة الرسائل لحظياً بين المستخدمين، وتتطلب المكالمات مزوداً مهيأً." },
      badge: "CHAT-DEMO"
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

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t("nav.group.company")}
        title={t("set.header.title")}
        
        actions={(
          <SegmentedTabs
            id="settings"
            ariaLabel={t("ui.view_switcher")}
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { value: "theme_lab", label: t("set.tab.theme_lab"), icon: <Palette className="h-4 w-4" /> },
              { value: "app_store", label: t("set.tab.app_store"), icon: <AppWindow className="h-4 w-4" /> },
              { value: "rbac_matrix", label: t("set.tab.rbac_matrix"), icon: <ShieldAlert className="h-4 w-4" /> }
            ]}
          />
        )}
      />

      {/* VIEW 1: DYNAMIC THEME & TYPOGRAPHY LAB */}
      <TabPanel hidden={activeTab !== "theme_lab"} id="settings-theme_lab-panel" labelledBy="settings-theme_lab-tab">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Left 7 Cols: Mode & Palette Matrix */}
          <div className="xl:col-span-7 space-y-4">
            {/* 1. Display Mode Engine */}
            <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-dynamic-lg font-bold text-foreground">
                  {t("set.theme.mode_title")}
                </h2>
                <button
                  type="button"
                  onClick={resetThemeDefaults}
                  className={secondaryButtonClass}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{t("set.reset_short")}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                        <span className="text-dynamic-xs font-mono uppercase">
                          {m}
                        </span>
                        {mode === m && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="text-dynamic-sm font-bold text-foreground">
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
                    ["dark-goldenrod", "#91713b", "#b58e4a"],
                    ["soft-charcoal", "#626a74", "#756f65"],
                    ["oasis-mint", "#047857", "#0d9488"],
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
                    className={`p-4 rounded-xl border text-start transition flex items-center justify-between gap-3 ${
                      palette === palKey
                        ? "bg-primary-soft border-primary text-foreground"
                        : "bg-surface-elevated border-theme text-muted hover:border-primary"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="text-dynamic-sm font-bold text-foreground">
                        {t(`set.palette.${palKey}`)}
                      </div>
                      <div className="text-dynamic-xs font-mono text-muted">
                        {primaryHex} • {accentHex}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
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
                <Sparkles className="w-5 h-5 text-primary" />
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
                      {customOverrides.primaryColor || t("set.palette_default")}
                    </div>
                  </div>
                  <input
                    type="color"
                    aria-label={t("set.theme.primary_color")}
                    value={customOverrides.primaryColor || "#047857"}
                    onChange={(e) =>
                      setCustomOverrides({ primaryColor: e.target.value })
                    }
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
                  />
                </div>

                <div className="p-4 rounded-xl bg-surface-elevated border border-theme flex items-center justify-between">
                  <div>
                    <div className="text-dynamic-xs font-mono text-muted">
                      --color-accent
                    </div>
                    <div className="text-dynamic-sm font-bold text-foreground">
                      {customOverrides.accentColor || t("set.palette_default")}
                    </div>
                  </div>
                  <input
                    type="color"
                    aria-label={t("set.theme.accent_color")}
                    value={customOverrides.accentColor || "#0d9488"}
                    onChange={(e) =>
                      setCustomOverrides({ accentColor: e.target.value })
                    }
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Multi-Font Bilingual Typography Suite & Scaling Engine */}
          <div className="xl:col-span-5 space-y-4">
            {/* 3. Multi-Font Suite */}
            <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
              <div className="flex items-center gap-2">
                <Type className="w-5 h-5 text-primary" />
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

                <div className="grid grid-cols-2 gap-2">
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
                      <div className="text-dynamic-xs font-bold">
                        {t(`set.scale.${sc}`)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-warning-soft text-warning text-dynamic-xs font-bold">
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
                  className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 transition ${
                    isEnabled
                      ? "bg-surface-elevated border-primary"
                      : "bg-surface border-theme opacity-75"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md bg-primary-soft text-primary font-mono font-bold text-dynamic-xs">
                        {mod.badge}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full font-bold text-dynamic-xs ${
                          isEnabled
                            ? "bg-success text-on-primary"
                            : "bg-surface-muted text-muted"
                        }`}
                      >
                        {isEnabled
                          ? t("set.appstore.status_active")
                          : t("set.appstore.status_disabled")}
                      </span>
                    </div>
                    <h3 className="text-dynamic-base font-bold text-foreground">
                      {mod.titleKey ? t(mod.titleKey) : localize(mod.title)}
                    </h3>
                    <p className="text-dynamic-xs text-muted">
                      {mod.descriptionKey ? t(mod.descriptionKey) : localize(mod.description)}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-pressed={isEnabled}
                    disabled={!canToggleAppStore}
                    onClick={() => toggleAppModule(mod.key)}
                    className={`w-full py-2 rounded-xl font-semibold text-dynamic-xs border transition ${
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
              <span className="font-mono font-bold text-dynamic-sm text-primary">
                {activeOffice.allowedRadiusMeters}m
              </span>
            </div>
          </div>
        </div>
        </TabPanel>

      {/* VIEW 3: THE GLOBAL RBAC PERMISSION ASSIGNMENT MATRIX */}
      <TabPanel hidden={activeTab !== "rbac_matrix"} id="settings-rbac_matrix-panel" labelledBy="settings-rbac_matrix-tab">
        <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-theme pb-4">
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
              <RotateCcw className="h-4 w-4 text-primary" />
              <span>{t("set.rbac.reset_btn")}</span>
            </button>
          </div>

          <div role="region" aria-label={t("set.rbac.title")} tabIndex={0} className="max-w-full overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
            <table className="min-w-[720px] w-full text-start border-collapse">
              <thead>
                <tr className="bg-surface-elevated border-b border-theme text-muted text-dynamic-xs">
                  <th className="py-3.5 ps-4 pe-3 text-start font-bold">
                    {t("set.rbac.scope_col")}
                  </th>
                  {ROLE_COLUMNS.map((role) => (
                    <th
                      key={role}
                      className="py-3.5 px-3 text-center font-bold"
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
                    <td className="py-3 ps-4 pe-3">
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
                          className="py-3 px-3 text-center align-middle"
                        >
                          <button
                            type="button"
                            title={`${t("set.rbac.toggle_permission")}: ${t(`role.short.${role}`)} — ${localize(item.label)}`}
                            aria-label={`${t("set.rbac.toggle_permission")}: ${t(`role.short.${role}`)} — ${localize(item.label)}`}
                            aria-pressed={allowed}
                            onClick={() =>
                              togglePermissionCell(role, item.scope)
                            }
                            className={`${iconButtonBaseClass} ${
                              allowed
                                ? "bg-success text-on-primary"
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
  );
};
