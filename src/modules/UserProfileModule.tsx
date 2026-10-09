import React, { useEffect, useState } from "react";
import { Accessibility, Monitor, RotateCcw, Save, ShieldCheck, UserRound } from "lucide-react";
import {
  formControlClassName,
  PageHeader,
  primaryButtonClass,
  PrototypeNotice,
  secondaryButtonClass,
  surfaceClassName
} from "@/components/DesignSystem";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme, type FontScale, type MotionPreference, type ThemeMode } from "@/context/ThemeContext";
import { useCurrentRole } from "@/context/RBACGeofenceContext";
import { useNotificationCenter } from "@/context/NotificationCenterContext";

type DemoProfile = {
  displayName: string;
  jobTitle: string;
  department: string;
  email: string;
};

const PROFILE_STORAGE_KEY = "yamodeer.profile.prototype.v1";
const DEFAULT_PROFILE: DemoProfile = {
  displayName: "YaModeer Demo User",
  jobTitle: "HR Operations",
  department: "People Operations",
  email: "demo.user@example.test"
};
const fieldLabelClass = "mb-1.5 block text-dynamic-xs font-semibold text-muted";
const PROFILE_OPTION_NUMBERS = [1, 2, 3, 4, 5, 6] as const;

const readProfile = (): DemoProfile => {
  if (typeof window === "undefined") return { ...DEFAULT_PROFILE };
  try {
    const raw = window.sessionStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      const value = JSON.parse(raw) as Partial<DemoProfile>;
      if (typeof value.displayName === "string" && typeof value.jobTitle === "string" && typeof value.department === "string" && typeof value.email === "string") {
        return { displayName: value.displayName, jobTitle: value.jobTitle, department: value.department, email: value.email };
      }
    }
  } catch {
    // Use the safe illustrative profile if browser storage is unavailable.
  }
  return { ...DEFAULT_PROFILE };
};

export const UserProfileModule: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { currentRole } = useCurrentRole();
  const {
    mode,
    setMode,
    fontScale,
    setFontScale,
    motionPreference,
    setMotionPreference,
    resolvedMode
  } = useTheme();
  const { preferences, setNotificationPreference } = useNotificationCenter();
  const [profile, setProfile] = useState<DemoProfile>(readProfile);
  const [draft, setDraft] = useState<DemoProfile>(readProfile);
  const [savedMessage, setSavedMessage] = useState("");
  const [saveHasError, setSaveHasError] = useState(false);
  const [selectedProfileOption, setSelectedProfileOption] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Keep profile edits usable in memory when storage is blocked.
    }
  }, [profile]);

  const initials = profile.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toLocaleUpperCase(language === "ar" ? "ar-SA" : "en-US") || "D";
  const updateDraft = (key: keyof DemoProfile, value: string) => {
    setSavedMessage("");
    setSaveHasError(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const saveProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = {
      displayName: draft.displayName.trim(),
      jobTitle: draft.jobTitle.trim(),
      department: draft.department.trim(),
      email: draft.email.trim()
    };
    if (!next.displayName || !next.jobTitle || !next.department) {
      setSaveHasError(true);
      setSavedMessage(t("profile.validation.required"));
      return;
    }
    setSaveHasError(false);
    setProfile(next);
    setDraft(next);
    setSavedMessage(t("profile.saved"));
  };
  const resetProfile = () => {
    const restored = { ...DEFAULT_PROFILE };
    setProfile(restored);
    setDraft(restored);
    setSaveHasError(false);
    setSavedMessage(t("profile.reset_done"));
  };

  return (
    <div className="space-y-4">
      <PageHeader eyebrow={t("nav.group.personal")} title={t("profile.header.title")} meta={<span className="inline-flex items-center gap-1.5 rounded-full border border-theme bg-surface-elevated px-2.5 py-1 text-dynamic-xs font-semibold text-muted"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />{t("profile.header.meta")}</span>} />
      <PrototypeNotice label={t("app.badge.demo_data")}>{t("profile.prototype.notice")}</PrototypeNotice>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <section className={`${surfaceClassName} overflow-hidden`} aria-labelledby="profile-card-title">
            <div className="border-b border-theme bg-surface-elevated p-5">
              <div className="flex items-center gap-4">
                <div aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary-soft text-dynamic-xl font-extrabold text-primary-text">{initials}</div>
                <div className="min-w-0"><h2 id="profile-card-title" className="truncate text-dynamic-lg font-bold text-foreground">{profile.displayName}</h2><p className="mt-1 truncate text-dynamic-sm text-muted">{profile.jobTitle}</p><p className="mt-1 text-dynamic-xs font-semibold text-primary-text">{t(`role.${currentRole}`)}</p></div>
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              <div><dt className="text-dynamic-xs text-muted">{t("profile.field.department")}</dt><dd className="mt-1 break-words text-dynamic-sm font-semibold text-foreground">{profile.department}</dd></div>
              <div><dt className="text-dynamic-xs text-muted">{t("profile.field.email")}</dt><dd className="mt-1 break-all text-dynamic-sm font-semibold text-foreground">{profile.email || t("profile.field.not_set")}</dd></div>
              <div className="sm:col-span-2"><dt className="text-dynamic-xs text-muted">{t("profile.field.account_status")}</dt><dd className="mt-1 text-dynamic-sm font-semibold text-warning-text">{t("profile.field.demo_identity")}</dd></div>
            </dl>
          </section>

          <section className={`${surfaceClassName} space-y-3 p-4`} aria-labelledby="profile-options-title">
            <div>
              <h2 id="profile-options-title" className="text-dynamic-base font-bold text-foreground">{t("profile.options.title")}</h2>
              <p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{t("profile.options.description")}</p>
            </div>
            <fieldset>
              <legend className="sr-only">{t("profile.options.title")}</legend>
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                {PROFILE_OPTION_NUMBERS.map((option) => {
                  const selected = selectedProfileOption === option;
                  return (
                    <label
                      key={option}
                      className={`flex min-h-11 min-w-0 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-dynamic-sm transition-colors focus-within:ring-2 focus-within:ring-primary ${selected ? "border-primary bg-primary-soft/40 text-primary-text" : "border-theme bg-surface-elevated text-foreground hover:border-primary/50"}`}
                    >
                      <input
                        type="radio"
                        name="profile-option"
                        value={option}
                        checked={selected}
                        onChange={() => setSelectedProfileOption(option)}
                        className="h-4 w-4 shrink-0 accent-primary"
                      />
                      <span className="min-w-0 break-words font-semibold">{t(`profile.options.option_${option}`)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {selectedProfileOption !== null && (
              <p role="status" aria-live="polite" className="text-dynamic-xs font-semibold text-primary-text">
                {t("profile.options.selected").replace("{option}", t(`profile.options.option_${selectedProfileOption}`))}
              </p>
            )}
          </section>

          <section className={`${surfaceClassName} space-y-3 p-4`} aria-labelledby="profile-keyboard-title">
            <div className="flex items-center gap-2"><Accessibility className="h-5 w-5 text-primary-text" aria-hidden="true" /><h2 id="profile-keyboard-title" className="text-dynamic-base font-bold text-foreground">{t("profile.keyboard.title")}</h2></div>
            <p className="text-dynamic-xs leading-relaxed text-muted">{t("profile.keyboard.instructions")}</p>
            <div className="flex flex-wrap gap-2 text-dynamic-xs"><kbd className="rounded border border-theme bg-surface-elevated px-2 py-1 font-mono text-foreground">Tab</kbd><kbd className="rounded border border-theme bg-surface-elevated px-2 py-1 font-mono text-foreground">Shift + Tab</kbd><kbd className="rounded border border-theme bg-surface-elevated px-2 py-1 font-mono text-foreground">Esc</kbd><kbd className="rounded border border-theme bg-surface-elevated px-2 py-1 font-mono text-foreground">← →</kbd></div>
            <a href="#workspace-main" className="inline-flex min-h-9 items-center rounded-md px-2 text-dynamic-xs font-semibold text-primary-text underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t("profile.keyboard.skip_link")}</a>
          </section>
        </div>

        <div className="space-y-4">
          <form onSubmit={saveProfile} className={`${surfaceClassName} space-y-4 p-4 sm:p-5`} aria-labelledby="profile-edit-title">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-primary-text" aria-hidden="true" /><h2 id="profile-edit-title" className="text-dynamic-lg font-bold text-foreground">{t("profile.edit.title")}</h2></div><button type="button" onClick={resetProfile} className={secondaryButtonClass}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t("profile.edit.reset")}</button></div>
            <p className="text-dynamic-xs leading-relaxed text-muted">{t("profile.edit.description")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2"><span className={fieldLabelClass}>{t("profile.field.display_name")}</span><input required maxLength={80} className={formControlClassName} value={draft.displayName} onChange={(event) => updateDraft("displayName", event.target.value)} /></label>
              <label className="block"><span className={fieldLabelClass}>{t("profile.field.job_title")}</span><input required maxLength={80} className={formControlClassName} value={draft.jobTitle} onChange={(event) => updateDraft("jobTitle", event.target.value)} /></label>
              <label className="block"><span className={fieldLabelClass}>{t("profile.field.department")}</span><input required maxLength={80} className={formControlClassName} value={draft.department} onChange={(event) => updateDraft("department", event.target.value)} /></label>
              <label className="block sm:col-span-2"><span className={fieldLabelClass}>{t("profile.field.email")}</span><input type="email" maxLength={120} className={formControlClassName} value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} placeholder="demo.user@example.test" /></label>
            </div>
            {savedMessage && <p role={saveHasError ? "alert" : "status"} aria-live={saveHasError ? "assertive" : "polite"} className={`text-dynamic-xs font-semibold ${saveHasError ? "text-danger-text" : "text-success-text"}`}>{savedMessage}</p>}
            <div className="flex justify-end"><button type="submit" className={primaryButtonClass}><Save className="h-4 w-4" aria-hidden="true" />{t("profile.edit.save_local")}</button></div>
          </form>

          <section className={`${surfaceClassName} space-y-4 p-4 sm:p-5`} aria-labelledby="profile-preferences-title">
            <div className="flex items-center gap-2"><Monitor className="h-5 w-5 text-primary-text" aria-hidden="true" /><div><h2 id="profile-preferences-title" className="text-dynamic-lg font-bold text-foreground">{t("profile.preferences.title")}</h2><p className="mt-1 text-dynamic-xs text-muted">{t("profile.preferences.subtitle")}</p></div></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block"><span className={fieldLabelClass}>{t("profile.preferences.language")}</span><select className={formControlClassName} value={language} onChange={(event) => setLanguage(event.target.value as "en" | "ar")}><option value="en">{t("profile.language.en")}</option><option value="ar">{t("profile.language.ar")}</option></select></label>
              <label className="block"><span className={fieldLabelClass}>{t("profile.preferences.color_mode")}</span><select className={formControlClassName} value={mode} onChange={(event) => setMode(event.target.value as ThemeMode)}><option value="auto">{t("profile.theme.auto")}</option><option value="light">{t("profile.theme.light")}</option><option value="dark">{t("profile.theme.dark")}</option><option value="high-contrast">{t("profile.theme.high_contrast")}</option></select></label>
              <label className="block"><span className={fieldLabelClass}>{t("profile.preferences.text_size")}</span><select className={formControlClassName} value={fontScale} onChange={(event) => setFontScale(event.target.value as FontScale)}>{(["sm", "md", "lg", "xl"] as FontScale[]).map((scale) => <option key={scale} value={scale}>{t(`profile.scale.${scale}`)}</option>)}</select></label>
              <label className="block"><span className={fieldLabelClass}>{t("profile.preferences.motion")}</span><select className={formControlClassName} value={motionPreference} onChange={(event) => setMotionPreference(event.target.value as MotionPreference)}><option value="system">{t("profile.motion.system")}</option><option value="reduced">{t("profile.motion.reduced")}</option></select></label>
            </div>
            <p className="rounded-lg border border-theme bg-surface-elevated p-3 text-dynamic-xs leading-relaxed text-muted">{t("profile.preferences.active_mode").replace("{mode}", t(`profile.theme.${resolvedMode === "high-contrast" ? "high_contrast" : resolvedMode}`))}</p>
          </section>

          <section className={`${surfaceClassName} space-y-3 p-4 sm:p-5`} aria-labelledby="profile-notifications-title">
            <div><h2 id="profile-notifications-title" className="text-dynamic-lg font-bold text-foreground">{t("profile.notifications.title")}</h2><p className="mt-1 text-dynamic-xs text-muted">{t("profile.notifications.subtitle")}</p></div>
            <fieldset className="space-y-2"><legend className="sr-only">{t("profile.notifications.title")}</legend>
              {(["workflow", "system", "product"] as const).map((key) => <label key={key} className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-theme bg-surface-elevated px-3 py-2"><span className="text-dynamic-sm font-medium text-foreground">{t(`profile.notifications.${key}`)}</span><input type="checkbox" checked={preferences[key]} onChange={(event) => setNotificationPreference(key, event.target.checked)} aria-label={t(`profile.notifications.${key}`)} /></label>)}
            </fieldset>
          </section>
        </div>
      </div>
    </div>
  );
};
