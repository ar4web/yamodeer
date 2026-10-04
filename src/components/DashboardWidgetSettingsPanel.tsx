import React, { useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarClock,
  CircleAlert,
  FileClock,
  Info,
  ListTodo,
  Receipt,
  ShieldCheck,
  Users,
  WalletCards
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrentRole } from "@/context/RBACGeofenceContext";
import {
  DashboardWidgetId,
  loadDashboardPreferences,
  saveDashboardPreferences
} from "@/services/dashboardPreferences";

const WIDGETS: Array<{
  id: DashboardWidgetId;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  iconTone: string;
}> = [
  {
    id: "workforce_headcount",
    titleKey: "set.dashboard.widget.headcount.title",
    descriptionKey: "set.dashboard.widget.headcount.desc",
    icon: <Users className="h-5 w-5" />,
    iconTone: "bg-primary-soft text-primary"
  },
  {
    id: "saudi_workforce_share",
    titleKey: "set.dashboard.widget.saudi.title",
    descriptionKey: "set.dashboard.widget.saudi.desc",
    icon: <ShieldCheck className="h-5 w-5" />,
    iconTone: "bg-success-soft text-success"
  },
  {
    id: "attendance_latest_day",
    titleKey: "set.dashboard.widget.attendance.title",
    descriptionKey: "set.dashboard.widget.attendance.desc",
    icon: <Activity className="h-5 w-5" />,
    iconTone: "bg-accent-soft text-accent"
  },
  {
    id: "needs_attention_total",
    titleKey: "set.dashboard.widget.attention.title",
    descriptionKey: "set.dashboard.widget.attention.desc",
    icon: <CircleAlert className="h-5 w-5" />,
    iconTone: "bg-warning-soft text-warning"
  },
  {
    id: "workforce_by_department",
    titleKey: "set.dashboard.widget.departments.title",
    descriptionKey: "set.dashboard.widget.departments.desc",
    icon: <BarChart3 className="h-5 w-5" />,
    iconTone: "bg-primary-soft text-primary"
  },
  {
    id: "attendance_mix",
    titleKey: "set.dashboard.widget.attendance_mix.title",
    descriptionKey: "set.dashboard.widget.attendance_mix.desc",
    icon: <CalendarClock className="h-5 w-5" />,
    iconTone: "bg-accent-soft text-accent"
  },
  {
    id: "pending_employee_requests",
    titleKey: "set.dashboard.widget.employee_requests.title",
    descriptionKey: "set.dashboard.widget.employee_requests.desc",
    icon: <ListTodo className="h-5 w-5" />,
    iconTone: "bg-warning-soft text-warning"
  },
  {
    id: "pending_expenses",
    titleKey: "set.dashboard.widget.expenses.title",
    descriptionKey: "set.dashboard.widget.expenses.desc",
    icon: <Receipt className="h-5 w-5" />,
    iconTone: "bg-warning-soft text-warning"
  },
  {
    id: "document_renewals",
    titleKey: "set.dashboard.widget.renewals.title",
    descriptionKey: "set.dashboard.widget.renewals.desc",
    icon: <FileClock className="h-5 w-5" />,
    iconTone: "bg-danger-soft text-danger"
  },
  {
    id: "financial_workflows",
    titleKey: "set.dashboard.widget.finance.title",
    descriptionKey: "set.dashboard.widget.finance.desc",
    icon: <WalletCards className="h-5 w-5" />,
    iconTone: "bg-accent-soft text-accent"
  }
];

export const DashboardWidgetSettingsPanel: React.FC = () => {
  const { t } = useLanguage();
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-dynamic-lg font-bold text-foreground">{t("set.dashboard.title")}</h2>
            <p className="mt-1 max-w-3xl text-dynamic-sm leading-relaxed text-muted">
              {t("set.dashboard.description")}
            </p>
          </div>
          {!canManage && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-warning-soft px-3 py-1.5 text-dynamic-xs font-bold text-warning">
              <Info className="h-3.5 w-3.5" />
              <span>{t("set.dashboard.super_admin_only")}</span>
            </span>
          )}
        </div>
        <div role="note" className="mt-4 flex items-start gap-2 rounded-xl bg-surface-elevated p-3 text-dynamic-xs leading-relaxed text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{t("set.dashboard.local_storage_note")}</span>
        </div>
      </section>

      <section aria-label={t("set.dashboard.title")} className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {WIDGETS.map((widget) => {
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
                    <h3 className="text-dynamic-sm font-bold text-foreground">{t(widget.titleKey)}</h3>
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
                  <p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{t(widget.descriptionKey)}</p>
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
      </section>
    </div>
  );
};
