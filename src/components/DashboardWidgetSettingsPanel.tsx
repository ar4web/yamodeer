import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  FileClock,
  FileUp,
  Globe,
  Info,
  ListTodo,
  PieChart,
  Receipt,
  ShieldCheck,
  Trash2,
  Users,
  WalletCards
} from "lucide-react";
import { AccessibleTooltip } from "@/components/DesignSystem";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrentRole } from "@/context/RBACGeofenceContext";
import {
  DashboardWidgetId,
  loadDashboardPreferences,
  saveDashboardPreferences
} from "@/services/dashboardPreferences";
import {
  previewRosterImportFile,
  type RosterImportBundle,
  type RosterImportPreview,
  type RosterImportSummary
} from "@/services/rosterImport";

interface RosterImportPanelProps {
  summary: RosterImportSummary | null;
  recordsLoaded: boolean;
  onImport: (bundle: RosterImportBundle) => void;
  onClear: () => void;
  canManage: boolean;
}

const RosterImportPanel: React.FC<RosterImportPanelProps> = ({ summary, recordsLoaded, onImport, onClear, canManage }) => {
  const { t } = useLanguage();
  const [preview, setPreview] = useState<RosterImportPreview | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setBusy(true);
    setPreview(null);
    try {
      setPreview(await previewRosterImportFile(file));
    } catch {
      setPreview({
        ok: false,
        rowCount: 0,
        blankRowsSkipped: 0,
        summary: null,
        records: null,
        errors: [{ code: "EMPTY_FILE" }],
        warnings: []
      });
    } finally {
      setBusy(false);
    }
  };

  const tWith = (key: string, values: Record<string, number | string>) =>
    Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), t(key));

  const issueText = (issue: RosterImportPreview["errors"][number], category: "error" | "warning") => {
    const base = t(`set.roster.import.${category}.${issue.code.toLocaleLowerCase()}`);
    const count = issue.count && issue.count > 1 ? ` (${issue.count})` : "";
    const fields = issue.fields?.length ? `: ${issue.fields.join(", ")}` : "";
    return `${base}${count}${fields}`;
  };

  return (
    <section className="rounded-2xl border border-theme bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text" aria-hidden="true">
          <FileUp className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="min-w-0 flex-1 break-words text-dynamic-base font-bold text-foreground">{t("set.roster.import.title")}</h2>
            <AccessibleTooltip label={t("set.roster.import.help_label")}>
              <p>{t("set.roster.import.description")}</p>
              <div role="note" className="mt-3 flex items-start gap-2 border-t border-theme pt-3 text-warning-text">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t("set.roster.import.privacy_note")}</span>
              </div>
            </AccessibleTooltip>
          </div>
        </div>
      </div>

      {summary && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-success/30 bg-success-soft p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-dynamic-xs font-semibold text-success-text">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{tWith(recordsLoaded ? "set.roster.import.active_summary" : "set.roster.import.summary_only", { count: summary.sourceRecordCount })}</span>
          </div>
          <button
            type="button"
            onClick={onClear}
            disabled={!canManage}
            className="inline-flex min-h-9 items-center justify-center gap-2 self-start rounded-lg border border-theme bg-surface px-3 py-1.5 text-dynamic-xs font-semibold text-foreground transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("set.roster.import.clear")}
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="inline-flex min-h-10 w-full max-w-full cursor-pointer flex-wrap items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-dynamic-xs font-bold text-on-primary shadow-card transition hover:bg-primary-hover focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 sm:w-auto sm:px-4">
          <FileUp className="h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">{busy ? t("set.roster.import.reading") : t("set.roster.import.choose_file")}</span>
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={handleFileChange}
            disabled={!canManage || busy}
            className="sr-only"
          />
        </label>
        <span className="text-dynamic-xs text-muted">{t("set.roster.import.file_types")}</span>
      </div>

      {preview && (
        <div className={`mt-4 rounded-xl border p-3 ${preview.ok ? "border-theme bg-surface-elevated" : "border-danger/30 bg-danger-soft"}`}>
          {preview.ok && preview.summary ? (
            <>
              <div className="flex items-start gap-2 text-dynamic-xs font-bold text-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-text" />
                <span>{tWith("set.roster.import.preview_title", { count: preview.rowCount })}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  [t("set.roster.import.active"), preview.summary.activeCount],
                  [t("set.roster.import.on_leave"), preview.summary.onLeaveCount],
                  [t("set.roster.import.inactive"), preview.summary.inactiveCount],
                  [t("set.roster.import.companies"), preview.summary.companies.length]
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg bg-surface p-2.5">
                    <p className="text-dynamic-xs text-muted">{label}</p>
                    <p className="mt-1 text-dynamic-base font-bold tabular-nums text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-dynamic-xs leading-relaxed text-muted">
                {tWith("set.roster.import.preview_details", {
                  workforce: preview.summary.workforceCount,
                  departments: preview.summary.departments.length,
                  skipped: preview.blankRowsSkipped
                })}
              </p>
              {preview.warnings.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-theme pt-3 text-dynamic-xs leading-relaxed text-warning-text">
                  {preview.warnings.map((issue, index) => <li key={`${issue.code}-${index}`}>• {issueText(issue, "warning")}</li>)}
                </ul>
              )}
              <button
                type="button"
                disabled={!canManage}
                onClick={() => {
                  if (preview.summary && preview.records) {
                    onImport({ summary: preview.summary, records: preview.records });
                    setPreview(null);
                  }
                }}
                className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-dynamic-xs font-bold text-on-primary shadow-card transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("set.roster.import.apply")}
              </button>
            </>
          ) : (
            <div className="text-dynamic-xs leading-relaxed text-danger-text">
              <p className="font-bold">{t("set.roster.import.invalid_title")}</p>
              <ul className="mt-2 space-y-1">
                {preview.errors.map((issue, index) => <li key={`${issue.code}-${index}`}>• {issueText(issue, "error")}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

type DashboardWidgetGroupId = "workforce" | "attendance" | "workflows";
type DashboardWidgetAccessKey = "employees" | "expenses" | "accounts" | "permitted_sources";

const WIDGETS: Array<{
  id: DashboardWidgetId;
  group: DashboardWidgetGroupId;
  accessKey: DashboardWidgetAccessKey;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  iconTone: string;
}> = [
  {
    id: "workforce_headcount",
    group: "workforce",
    accessKey: "employees",
    titleKey: "set.dashboard.widget.headcount.title",
    descriptionKey: "set.dashboard.widget.headcount.desc",
    icon: <Users className="h-5 w-5" />,
    iconTone: "bg-primary-soft text-primary-text"
  },
  {
    id: "saudi_workforce_share",
    group: "workforce",
    accessKey: "employees",
    titleKey: "set.dashboard.widget.saudi.title",
    descriptionKey: "set.dashboard.widget.saudi.desc",
    icon: <ShieldCheck className="h-5 w-5" />,
    iconTone: "bg-success-soft text-success-text"
  },
  {
    id: "workforce_status_mix",
    group: "workforce",
    accessKey: "employees",
    titleKey: "set.dashboard.widget.status_mix.title",
    descriptionKey: "set.dashboard.widget.status_mix.desc",
    icon: <PieChart className="h-5 w-5" />,
    iconTone: "bg-warning-soft text-warning-text"
  },
  {
    id: "workforce_nationality_mix",
    group: "workforce",
    accessKey: "employees",
    titleKey: "set.dashboard.widget.nationality_mix.title",
    descriptionKey: "set.dashboard.widget.nationality_mix.desc",
    icon: <Globe className="h-5 w-5" />,
    iconTone: "bg-accent-soft text-accent-text"
  },
  {
    id: "attendance_latest_day",
    group: "attendance",
    accessKey: "employees",
    titleKey: "set.dashboard.widget.attendance.title",
    descriptionKey: "set.dashboard.widget.attendance.desc",
    icon: <Activity className="h-5 w-5" />,
    iconTone: "bg-accent-soft text-accent-text"
  },
  {
    id: "needs_attention_total",
    group: "workflows",
    accessKey: "permitted_sources",
    titleKey: "set.dashboard.widget.attention.title",
    descriptionKey: "set.dashboard.widget.attention.desc",
    icon: <CircleAlert className="h-5 w-5" />,
    iconTone: "bg-warning-soft text-warning-text"
  },
  {
    id: "workforce_by_department",
    group: "workforce",
    accessKey: "employees",
    titleKey: "set.dashboard.widget.departments.title",
    descriptionKey: "set.dashboard.widget.departments.desc",
    icon: <BarChart3 className="h-5 w-5" />,
    iconTone: "bg-primary-soft text-primary-text"
  },
  {
    id: "attendance_mix",
    group: "attendance",
    accessKey: "employees",
    titleKey: "set.dashboard.widget.attendance_mix.title",
    descriptionKey: "set.dashboard.widget.attendance_mix.desc",
    icon: <CalendarClock className="h-5 w-5" />,
    iconTone: "bg-accent-soft text-accent-text"
  },
  {
    id: "pending_employee_requests",
    group: "workflows",
    accessKey: "employees",
    titleKey: "set.dashboard.widget.employee_requests.title",
    descriptionKey: "set.dashboard.widget.employee_requests.desc",
    icon: <ListTodo className="h-5 w-5" />,
    iconTone: "bg-warning-soft text-warning-text"
  },
  {
    id: "pending_expenses",
    group: "workflows",
    accessKey: "expenses",
    titleKey: "set.dashboard.widget.expenses.title",
    descriptionKey: "set.dashboard.widget.expenses.desc",
    icon: <Receipt className="h-5 w-5" />,
    iconTone: "bg-warning-soft text-warning-text"
  },
  {
    id: "document_renewals",
    group: "workflows",
    accessKey: "employees",
    titleKey: "set.dashboard.widget.renewals.title",
    descriptionKey: "set.dashboard.widget.renewals.desc",
    icon: <FileClock className="h-5 w-5" />,
    iconTone: "bg-danger-soft text-danger-text"
  },
  {
    id: "financial_workflows",
    group: "workflows",
    accessKey: "accounts",
    titleKey: "set.dashboard.widget.finance.title",
    descriptionKey: "set.dashboard.widget.finance.desc",
    icon: <WalletCards className="h-5 w-5" />,
    iconTone: "bg-accent-soft text-accent-text"
  }
];

const WIDGET_GROUPS = ([
  { id: "workforce", titleKey: "set.dashboard.group.workforce" },
  { id: "attendance", titleKey: "set.dashboard.group.attendance" },
  { id: "workflows", titleKey: "set.dashboard.group.workflows" }
] as const).map((group) => ({
  ...group,
  widgets: WIDGETS.filter((widget) => widget.group === group.id)
}));

interface DashboardWidgetSettingsPanelProps {
  rosterSummary: RosterImportSummary | null;
  rosterRecordsLoaded: boolean;
  onImportRoster: (bundle: RosterImportBundle) => void;
  onClearRoster: () => void;
}

export const DashboardWidgetSettingsPanel: React.FC<DashboardWidgetSettingsPanelProps> = ({
  rosterSummary,
  rosterRecordsLoaded,
  onImportRoster,
  onClearRoster
}) => {
  const { t, language } = useLanguage();
  const { hasPermission } = useCurrentRole();
  const [preferences, setPreferences] = useState(loadDashboardPreferences);
  const canManage = hasPermission("system:app_store_toggles");

  const updateWidget = (
    id: DashboardWidgetId,
    patch: Partial<(typeof preferences)[DashboardWidgetId]>
  ) => {
    const next = {
      ...preferences,
      [id]: { ...preferences[id], ...patch }
    };
    setPreferences(saveDashboardPreferences(next));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-theme bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <h2 className="min-w-0 break-words text-dynamic-lg font-bold text-foreground">{t("set.dashboard.title")}</h2>
            <AccessibleTooltip label={t("set.dashboard.help_label")}>
              <p>{t("set.dashboard.description")}</p>
              <p className="mt-3 border-t border-theme pt-3">{t("set.dashboard.access.note")}</p>
              <p className="mt-3 border-t border-theme pt-3">{t("set.dashboard.local_storage_note")}</p>
            </AccessibleTooltip>
          </div>
          {!canManage && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-warning-soft px-3 py-1.5 text-dynamic-xs font-bold text-warning-text">
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("set.dashboard.super_admin_only")}</span>
            </span>
          )}
        </div>
      </section>

      <RosterImportPanel
        summary={rosterSummary}
        recordsLoaded={rosterRecordsLoaded}
        onImport={onImportRoster}
        onClear={onClearRoster}
        canManage={canManage}
      />

      {WIDGET_GROUPS.map((group) => (
        <section
          key={group.id}
          aria-labelledby={`dashboard-widget-group-${group.id}`}
          className="space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-theme pb-2">
            <h3 id={`dashboard-widget-group-${group.id}`} className="min-w-0 break-words text-dynamic-sm font-bold text-foreground">
              {t(group.titleKey)}
            </h3>
            <span className="max-w-full break-words rounded-full bg-surface-elevated px-2.5 py-1 text-dynamic-xs font-semibold tabular-nums text-muted">
              {group.widgets.length.toLocaleString(language === "ar" ? "ar-SA" : "en-SA")} {t("set.dashboard.group.widget_count")}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {group.widgets.map((widget) => {
              const preference = preferences[widget.id];
              return (
                <article
                  key={widget.id}
                  className={`min-w-0 rounded-2xl border p-4 transition ${
                    preference.enabled
                      ? "border-theme bg-surface shadow-card"
                      : "border-theme bg-surface-elevated/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${widget.iconTone}`} aria-hidden="true">
                      {widget.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h4 className="min-w-0 flex-1 break-words text-dynamic-sm font-bold text-foreground">{t(widget.titleKey)}</h4>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={preference.enabled}
                          aria-label={`${t(widget.titleKey)} — ${t("set.dashboard.enabled")}`}
                          disabled={!canManage}
                          onClick={() => updateWidget(widget.id, { enabled: !preference.enabled })}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                            preference.enabled ? "bg-primary" : "bg-surface-muted"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-surface shadow transition-transform ${
                              preference.enabled ? "translate-x-6 rtl:-translate-x-6" : "translate-x-1 rtl:-translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                      <p className="mt-1 break-words text-dynamic-xs leading-relaxed text-muted">{t(widget.descriptionKey)}</p>
                      <span className="mt-2 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-lg bg-surface-elevated px-2.5 py-1.5 text-dynamic-xs font-medium text-muted">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary-text" aria-hidden="true" />
                        <span className="min-w-0 break-words">{t("set.dashboard.access.label")}: {t(`set.dashboard.access.${widget.accessKey}`)}</span>
                      </span>
                      <div className="mt-3 flex flex-col gap-1.5 border-t border-theme pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <label htmlFor={`empty-behavior-${widget.id}`} className="text-dynamic-xs font-semibold text-muted">
                          {t("set.dashboard.empty_behavior")}
                        </label>
                        <select
                          id={`empty-behavior-${widget.id}`}
                          value={preference.emptyBehavior}
                          disabled={!canManage || !preference.enabled}
                          onChange={(event) => updateWidget(widget.id, {
                            emptyBehavior: event.target.value === "SHOW_EMPTY_STATE" ? "SHOW_EMPTY_STATE" : "HIDE"
                          })}
                          className="min-h-10 w-full rounded-xl border border-theme bg-surface px-3 py-2 text-dynamic-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-52"
                        >
                          <option value="HIDE">{t("set.dashboard.empty.hide")}</option>
                          <option value="SHOW_EMPTY_STATE">{t("set.dashboard.empty.show")}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
