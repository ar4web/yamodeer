import React, { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  FileClock,
  Receipt,
  ShieldCheck,
  Users,
  WalletCards
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrentRole, useRBACGeofence } from "@/context/RBACGeofenceContext";
import { useOperations } from "@/context/OperationsContext";
import type { AttendanceRecord } from "@/data/workspaceBlueprints";
import type { EmployeeRecordBlueprint } from "@/data/mockBlueprints";
import {
  buildAttendanceSnapshot,
  buildWorkforceSnapshot,
  getDaysUntilDate,
  getRenewalAttentionRecords
} from "@/services/dashboardMetrics";
import { PageHeader } from "@/components/DesignSystem";
import {
  DashboardWidgetId,
  loadDashboardPreferences,
  shouldShowDashboardWidget
} from "@/services/dashboardPreferences";

interface DashboardModuleProps {
  employees: EmployeeRecordBlueprint[];
  /** Supplied by authenticated session mapping when available; never guess from directory order. */
  employeeId?: string;
  onNavigateModule: (
    route: "employees" | "vendors" | "expenses" | "accounts" | "compliance" | "settings"
  ) => void;
}

interface KpiCardProps {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  iconTone: string;
}

const localeFor = (language: string): string => language === "ar" ? "ar-SA" : "en-SA";

const formatNumber = (value: number, language: string, fractionDigits = 0): string =>
  value.toLocaleString(localeFor(language), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });

const fullDate = (value: string | null | undefined, language: string): string => {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(localeFor(language), {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const KpiCard: React.FC<KpiCardProps> = ({ label, value, detail, icon, iconTone }) => (
  <article className="relative isolate min-w-0 overflow-hidden rounded-3xl bg-surface p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-shell">
    <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-accent" />
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-dynamic-sm font-semibold tracking-wide text-muted">{label}</p>
        <p className="mt-2 break-words text-dynamic-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
      </div>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconTone}`}>{icon}</span>
    </div>
    <p className="mt-4 min-h-10 border-t border-theme pt-3 text-dynamic-xs leading-relaxed text-muted">{detail}</p>
  </article>
);

interface QueueRowProps {
  icon: React.ReactNode;
  iconTone: string;
  title: string;
  subtitle: string;
  value: string;
  onClick: () => void;
}

const QueueRow: React.FC<QueueRowProps> = ({ icon, iconTone, title, subtitle, value, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-xl bg-surface-elevated p-3 text-start transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  >
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-dynamic-xs font-bold text-foreground">{title}</span>
      <span className="mt-0.5 block truncate text-dynamic-xs text-muted">{subtitle}</span>
    </span>
    <span className="shrink-0 rounded-lg bg-surface px-2.5 py-1 text-dynamic-xs font-bold tabular-nums text-foreground">{value}</span>
  </button>
);

const attendanceParts = [
  { status: "PRESENT", color: "bg-success" },
  { status: "LATE", color: "bg-warning" },
  { status: "REMOTE", color: "bg-accent" },
  { status: "ABSENT", color: "bg-danger" }
] as const;

const emptyAttendance: AttendanceRecord | undefined = undefined;

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  employees,
  employeeId,
  onNavigateModule
}) => {
  const { t, localize, formatCurrencySAR, language } = useLanguage();
  const [dashboardPreferences] = useState(loadDashboardPreferences);
  const showWidget = (id: DashboardWidgetId, hasRecords: boolean) =>
    shouldShowDashboardWidget(dashboardPreferences, id, hasRecords);
  const { currentRole, hasPermission } = useCurrentRole();
  const { setGeofenceModalOpen } = useRBACGeofence();
  const {
    expenseClaims,
    transferRequests,
    employeeRequests,
    attendanceRecords,
    financialWorkflowItems
  } = useOperations();

  const isEmployee = currentRole === "EMPLOYEE";
  const canViewEmployees = hasPermission("route:employees");
  const canViewExpenses = hasPermission("route:expenses");
  const canViewFinancials = hasPermission("route:accounts");

  const workforce = useMemo(
    () => buildWorkforceSnapshot(canViewEmployees ? employees : []),
    [canViewEmployees, employees]
  );
  const attendance = useMemo(
    () => buildAttendanceSnapshot(attendanceRecords, canViewEmployees ? employees : []),
    [attendanceRecords, canViewEmployees, employees]
  );
  const renewalAttentionRecords = useMemo(
    () => canViewEmployees ? getRenewalAttentionRecords(workforce.employees) : [],
    [canViewEmployees, workforce.employees]
  );

  const personalProfile = isEmployee && employeeId
    ? employees.find((employee) => employee.id === employeeId)
    : undefined;
  const personalAttendance = personalProfile
    ? attendanceRecords
        .filter((record) => record.employeeId === personalProfile.id)
        .sort((left, right) => left.date.localeCompare(right.date))
        .at(-1) ?? emptyAttendance
    : emptyAttendance;
  const personalExpiryDays = personalProfile
    ? getDaysUntilDate(personalProfile.idExpiryDateGregorian)
    : null;

  const pendingExpenses = canViewExpenses
    ? expenseClaims.filter((claim) => claim.status === "PENDING")
    : [];
  const pendingTransfers = canViewEmployees
    ? transferRequests.filter((request) => request.status === "PENDING")
    : [];
  const pendingRequests = canViewEmployees
    ? employeeRequests.filter((request) => request.status === "PENDING")
    : [];
  const pendingPeopleCount = pendingRequests.length + pendingTransfers.length;
  const nonFinancialWorkflowCount = pendingPeopleCount + pendingExpenses.length;
  const pendingInvoices = canViewFinancials
    ? financialWorkflowItems.filter((item) => item.type === "INVOICE" && item.status === "PENDING")
    : [];
  const pendingPayments = canViewFinancials
    ? financialWorkflowItems.filter((item) => item.type !== "INVOICE" && item.status === "PENDING")
    : [];

  const pendingExpenseTotal = pendingExpenses.reduce((total, claim) => total + claim.totalAmountSar, 0);
  const pendingFinancialCount = pendingInvoices.length + pendingPayments.length;
  const pendingFinancialTotal = [...pendingInvoices, ...pendingPayments]
    .reduce((total, item) => total + item.amountSar, 0);
  const openWorkflowCount = nonFinancialWorkflowCount + pendingFinancialCount;
  const needsAttentionCount = openWorkflowCount + renewalAttentionRecords.length;
  const attendedCount = attendance.attendedCount;
  const attendanceKpiValue = attendance.latestDate
    ? `${formatNumber(attendedCount, language)} / ${formatNumber(attendance.recordedCount, language)}`
    : "—";
  const attendanceKpiDetail = attendance.latestDate
    ? `${fullDate(attendance.latestDate, language)} · ${formatNumber(attendance.recordedCount, language)} / ${formatNumber(attendance.workforceCount, language)} ${t("dash.attendance.coverage")}`
    : t("dash.attendance.no_data");

  if (isEmployee) {
    const expiryStatus = personalExpiryDays === null
      ? "—"
      : personalExpiryDays < 0
        ? t("dash.employee.expired")
        : personalExpiryDays <= 30
          ? t("emp.expiry.critical")
          : personalExpiryDays <= 90
            ? t("emp.expiry.warning")
            : t("emp.expiry.compliant");
    const expiryValue = personalExpiryDays === null
      ? "—"
      : personalExpiryDays < 0
        ? t("dash.employee.expired")
        : personalExpiryDays === 0
          ? t("dash.renewal.due_today")
          : personalExpiryDays <= 90
            ? `${formatNumber(personalExpiryDays, language)} ${t("emp.days_remaining")}`
            : t("emp.expiry.compliant");

    return (
      <div className="space-y-4">
        <PageHeader
          title={t("dash.employee.title")}
          meta={<span className="rounded-full bg-primary-soft px-2.5 py-1 text-dynamic-xs font-semibold text-primary">{t(`role.short.${currentRole}`)}</span>}
        />
        <div role="note" className="flex items-start gap-3 rounded-2xl bg-warning-soft p-3 text-dynamic-xs leading-relaxed text-warning">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("dash.data_notice")}</span>
        </div>
        {personalProfile ? (
          <>
            <section className="relative isolate overflow-hidden rounded-3xl bg-surface p-5 shadow-shell sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-dynamic-xl font-bold text-on-primary">
                    {localize(personalProfile.name).slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-dynamic-xs font-semibold uppercase tracking-wide text-primary">{t("dash.employee.profile")}</p>
                    <h2 className="mt-1 truncate text-dynamic-xl font-bold text-foreground">{localize(personalProfile.name)}</h2>
                    <p className="mt-1 truncate text-dynamic-sm text-muted">{localize(personalProfile.jobTitle)} · {localize(personalProfile.department)}</p>
                  </div>
                </div>
                {hasPermission("self_service:geofence_punch") && (
                  <button
                    type="button"
                    onClick={() => setGeofenceModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-dynamic-sm font-semibold text-on-primary shadow-card transition hover:bg-primary-hover"
                  >
                    <CalendarClock className="h-4 w-4" />
                    <span>{t("dash.employee.review_attendance")}</span>
                  </button>
                )}
              </div>
            </section>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <KpiCard
                label={t("dash.employee.attendance")}
                value={personalAttendance ? t(`emp.attendance.status.${personalAttendance.status}`) : t("dash.employee.no_attendance")}
                detail={personalAttendance ? `${t("dash.employee.recorded_on")}: ${fullDate(personalAttendance.date, language)}` : t("dash.attendance.no_data")}
                icon={<CalendarClock className="h-5 w-5" />}
                iconTone={personalAttendance?.status === "ABSENT" || personalAttendance?.status === "LATE" ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}
              />
              <KpiCard
                label={t("dash.employee.document")}
                value={expiryValue}
                detail={`${fullDate(personalProfile.idExpiryDateGregorian, language)} · ${expiryStatus}`}
                icon={<FileClock className="h-5 w-5" />}
                iconTone={personalExpiryDays !== null && personalExpiryDays <= 30 ? "bg-danger-soft text-danger" : personalExpiryDays !== null && personalExpiryDays <= 90 ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary"}
              />
              <article className="rounded-3xl bg-surface p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-dynamic-xs font-semibold text-muted">{t("dash.employee.location")}</p>
                    <p className="mt-2 text-dynamic-lg font-bold text-foreground">{localize(personalProfile.location)}</p>
                    <p className="mt-1 text-dynamic-xs text-muted">{t("dash.employee.profile_id")}: {personalProfile.id}</p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent"><BriefcaseBusiness className="h-5 w-5" /></span>
                </div>
              </article>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-theme bg-surface p-8 text-center text-dynamic-sm text-muted">
            {t("dash.employee.profile_unavailable")}
          </div>
        )}
      </div>
    );
  }

  const departments = workforce.departments;
  const maximumDepartmentSize = Math.max(...departments.map((department) => department.total), 1);
  const topRenewals = renewalAttentionRecords.slice(0, 3);
  const hasAttentionSourceData = (canViewEmployees && (employees.length > 0 || employeeRequests.length > 0 || transferRequests.length > 0)) ||
    (canViewExpenses && expenseClaims.length > 0) ||
    (canViewFinancials && financialWorkflowItems.length > 0);
  const showHeadcountKpi = canViewEmployees && showWidget("workforce_headcount", workforce.total > 0);
  const showSaudiShareKpi = canViewEmployees && showWidget("saudi_workforce_share", workforce.total > 0);
  const showAttendanceKpi = canViewEmployees && showWidget("attendance_latest_day", attendance.recordedCount > 0);
  const showAttentionKpi = showWidget("needs_attention_total", hasAttentionSourceData);
  const showDepartmentChart = canViewEmployees && showWidget("workforce_by_department", departments.length > 0);
  const showAttendanceChart = canViewEmployees && showWidget("attendance_mix", attendance.recordedCount > 0);
  const hasEmployeeWorkflowSourceData = canViewEmployees &&
    (employeeRequests.length > 0 || transferRequests.length > 0);
  const hasExpenseWorkflowSourceData = canViewExpenses && expenseClaims.length > 0;
  const showEmployeeWorkflowWidget = canViewEmployees &&
    showWidget("pending_employee_requests", pendingPeopleCount > 0);
  const showExpenseWorkflowWidget = canViewExpenses &&
    showWidget("pending_expenses", pendingExpenses.length > 0);
  const showRenewalsWidget = canViewEmployees &&
    showWidget("document_renewals", renewalAttentionRecords.length > 0);
  const showFinancialWidget = canViewFinancials &&
    showWidget("financial_workflows", pendingFinancialCount > 0);
  const visibleWorkflowCount =
    (showEmployeeWorkflowWidget ? pendingPeopleCount : 0) +
    (showExpenseWorkflowWidget ? pendingExpenses.length : 0) +
    (showFinancialWidget ? pendingFinancialCount : 0);
  const visibleNeedsAttentionCount = visibleWorkflowCount +
    (showRenewalsWidget ? renewalAttentionRecords.length : 0);
  const showWorkflowSection = showEmployeeWorkflowWidget || showExpenseWorkflowWidget ||
    showRenewalsWidget || showFinancialWidget;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("dash.header.title")}
        actions={<span className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-2 text-dynamic-xs font-semibold text-warning"><CircleAlert className="h-3.5 w-3.5" />{t("dash.data_notice.badge")}</span>}
      />

      <div role="note" className="flex items-start gap-3 rounded-2xl bg-warning-soft p-3 text-dynamic-xs leading-relaxed text-warning">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t("dash.data_notice")}</span>
      </div>

      {(showHeadcountKpi || showSaudiShareKpi || showAttendanceKpi || showAttentionKpi) && (
        <section aria-label={t("dash.kpi.section_label")} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {showHeadcountKpi && (
            <KpiCard
              label={t("dash.kpi.headcount")}
              value={workforce.total ? formatNumber(workforce.total, language) : "—"}
              detail={workforce.total
                ? `${formatNumber(workforce.saudiCount, language)} ${t("dash.premium.saudi")} · ${formatNumber(workforce.expatCount, language)} ${t("dash.premium.expat")}`
                : t("dash.workforce.no_data")}
              icon={<Users className="h-5 w-5" />}
              iconTone="bg-primary-soft text-primary"
            />
          )}
          {showSaudiShareKpi && (
            <KpiCard
              label={t("dash.kpi.nitaqat")}
              value={workforce.saudiSharePercent !== null
                ? `${formatNumber(workforce.saudiSharePercent, language, 1)}%`
                : "—"}
              detail={workforce.total
                ? `${formatNumber(workforce.saudiCount, language)} / ${formatNumber(workforce.total, language)} · ${t("dash.kpi.nitaqat.sub")}`
                : t("dash.workforce.no_data")}
              icon={<ShieldCheck className="h-5 w-5" />}
              iconTone="bg-success-soft text-success"
            />
          )}
          {showAttendanceKpi && (
            <KpiCard
              label={t("dash.kpi.attendance")}
              value={attendanceKpiValue}
              detail={attendanceKpiDetail}
              icon={<Activity className="h-5 w-5" />}
              iconTone="bg-accent-soft text-accent"
            />
          )}
          {showAttentionKpi && (
            <KpiCard
              label={t("dash.kpi.open_actions")}
              value={hasAttentionSourceData ? formatNumber(needsAttentionCount, language) : "—"}
              detail={hasAttentionSourceData ? t("dash.kpi.open_actions.sub") : t("dash.kpi.open_actions.no_data")}
              icon={<CircleAlert className="h-5 w-5" />}
              iconTone={needsAttentionCount ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}
            />
          )}
        </section>
      )}

      {(showDepartmentChart || showAttendanceChart) && (
        <section className={`grid grid-cols-1 gap-4 ${showDepartmentChart && showAttendanceChart ? "xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]" : ""}`}>
          {showDepartmentChart && (
            <article className="rounded-3xl bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-dynamic-base font-bold text-foreground">{t("dash.chart.workforce_by_department")}</h2>
              </div>
              <p className="mt-1 text-dynamic-xs text-muted">{t("dash.chart.workforce_by_department.sub")}</p>
            </div>
            {departments.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 text-dynamic-xs">
                <span className="inline-flex items-center gap-1.5 text-muted"><span className="h-2.5 w-2.5 rounded-full bg-primary" />{t("dash.premium.saudi")}</span>
                <span className="inline-flex items-center gap-1.5 text-muted"><span className="h-2.5 w-2.5 rounded-full bg-accent" />{t("dash.premium.expat")}</span>
              </div>
            )}
          </div>
          {departments.length ? (
            <div className="mt-5 space-y-4">
              {departments.map((department) => {
                const relativeWidth = (department.total / maximumDepartmentSize) * 100;
                const saudiWidth = (department.saudiCount / department.total) * 100;
                const expatWidth = (department.expatCount / department.total) * 100;
                const departmentLabel = localize(department.label);
                return (
                  <div key={department.code}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-dynamic-xs">
                      <span className="min-w-0 truncate font-semibold text-foreground">{departmentLabel}</span>
                      <span className="shrink-0 font-bold tabular-nums text-foreground">{formatNumber(department.total, language)}</span>
                    </div>
                    <div
                      role="img"
                      aria-label={`${departmentLabel}: ${formatNumber(department.saudiCount, language)} ${t("dash.premium.saudi")}, ${formatNumber(department.expatCount, language)} ${t("dash.premium.expat")}`}
                      className="h-2.5 overflow-hidden rounded-full bg-surface-elevated"
                    >
                      <div className="flex h-full overflow-hidden rounded-full transition-[width] duration-500" style={{ width: `${relativeWidth}%` }}>
                        {department.saudiCount > 0 && <span className="h-full bg-primary" style={{ width: `${saudiWidth}%` }} />}
                        {department.expatCount > 0 && <span className="h-full bg-accent" style={{ width: `${expatWidth}%` }} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-theme p-5 text-center text-dynamic-sm text-muted">{t("dash.workforce.no_data")}</div>
          )}
            </article>
          )}

          {showAttendanceChart && (
            <article className="rounded-3xl bg-surface p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-accent" />
                <h2 className="text-dynamic-base font-bold text-foreground">{t("dash.chart.attendance_mix")}</h2>
              </div>
              <p className="mt-1 text-dynamic-xs text-muted">{fullDate(attendance.latestDate, language)}</p>
            </div>
            <div className="text-end">
              <p className="text-dynamic-xs text-muted">{t("dash.attendance.coverage_label")}</p>
              <p className="text-dynamic-sm font-bold text-foreground tabular-nums">
                {formatNumber(attendance.recordedCount, language)} / {formatNumber(attendance.workforceCount, language)}
              </p>
            </div>
          </div>
          {attendance.recordedCount ? (
            <>
              <div
                className="mt-5 flex h-3 overflow-hidden rounded-full bg-surface-elevated"
                role="img"
                aria-label={t("dash.chart.attendance_mix")}
              >
                {attendanceParts.map((part) => {
                  const count = attendance.statusCounts[part.status];
                  return count ? (
                    <span
                      key={part.status}
                      className={`h-full ${part.color}`}
                      style={{ width: `${(count / attendance.recordedCount) * 100}%` }}
                    />
                  ) : null;
                })}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {attendanceParts.map((part) => (
                  <div key={part.status} className="rounded-xl bg-surface-elevated p-3">
                    <div className="flex items-center gap-2 text-dynamic-xs text-muted">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${part.color}`} />
                      <span className="truncate">{t(`emp.attendance.status.${part.status}`)}</span>
                    </div>
                    <p className="mt-2 text-dynamic-lg font-bold text-foreground tabular-nums">{formatNumber(attendance.statusCounts[part.status], language)}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-theme p-5 text-center text-dynamic-sm text-muted">{t("dash.attendance.no_data")}</div>
          )}
            </article>
          )}
        </section>
      )}

      {showWorkflowSection && (
        <section className="rounded-3xl bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <CircleAlert className="h-5 w-5 text-warning" />
              <h2 className="text-dynamic-base font-bold text-foreground">{t("dash.workflow.title")}</h2>
            </div>
            <span className={`rounded-xl px-3 py-2 text-dynamic-sm font-bold tabular-nums ${visibleNeedsAttentionCount ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}>
              {formatNumber(visibleNeedsAttentionCount, language)}
            </span>
          </div>
          <div className={`mt-4 grid grid-cols-1 gap-5 ${showRenewalsWidget && (showEmployeeWorkflowWidget || showExpenseWorkflowWidget || showFinancialWidget) ? "lg:grid-cols-2" : ""}`}>
            {(showEmployeeWorkflowWidget || showExpenseWorkflowWidget || showFinancialWidget) && (
              <div className="space-y-2">
                <h3 className="text-dynamic-xs font-bold uppercase tracking-wide text-muted">{t("dash.premium.action_title")}</h3>
                {showEmployeeWorkflowWidget && (pendingPeopleCount > 0 ? (
                  <QueueRow
                    icon={<BriefcaseBusiness className="h-4 w-4" />}
                    iconTone="bg-primary-soft text-primary"
                    title={t("dash.action.people")}
                    subtitle={`${formatNumber(pendingRequests.length, language)} ${t("dash.workflow.requests")} · ${formatNumber(pendingTransfers.length, language)} ${t("dash.workflow.transfers")}`}
                    value={formatNumber(pendingPeopleCount, language)}
                    onClick={() => onNavigateModule("employees")}
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-dynamic-xs font-semibold text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {t(hasEmployeeWorkflowSourceData ? "dash.workflow.no_pending" : "dash.workflow.no_data")}
                  </div>
                ))}
                {showExpenseWorkflowWidget && (pendingExpenses.length > 0 ? (
                  <QueueRow
                    icon={<Receipt className="h-4 w-4" />}
                    iconTone="bg-warning-soft text-warning"
                    title={t("dash.action.expenses")}
                    subtitle={formatCurrencySAR(pendingExpenseTotal)}
                    value={formatNumber(pendingExpenses.length, language)}
                    onClick={() => onNavigateModule("expenses")}
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-dynamic-xs font-semibold text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {t(hasExpenseWorkflowSourceData ? "dash.workflow.no_pending" : "dash.workflow.no_data")}
                  </div>
                ))}
                {showFinancialWidget && (pendingFinancialCount > 0 ? (
                  <QueueRow
                    icon={<WalletCards className="h-4 w-4" />}
                    iconTone="bg-accent-soft text-accent"
                    title={t("dash.action.financials")}
                    subtitle={formatCurrencySAR(pendingFinancialTotal)}
                    value={formatNumber(pendingFinancialCount, language)}
                    onClick={() => onNavigateModule("accounts")}
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-dynamic-xs font-semibold text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {t(financialWorkflowItems.length > 0 ? "dash.workflow.no_pending" : "dash.finance.no_data")}
                  </div>
                ))}
              </div>
            )}

            {showRenewalsWidget && (
              <div className="border-t border-theme pt-4 lg:border-s lg:border-t-0 lg:pt-0 lg:ps-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-dynamic-xs font-bold uppercase tracking-wide text-muted">{t("dash.premium.renewals_title")}</h3>
                  <span className="rounded-lg bg-danger-soft px-2.5 py-1 text-dynamic-xs font-bold text-danger tabular-nums">{formatNumber(renewalAttentionRecords.length, language)}</span>
                </div>
                {topRenewals.length ? (
                  <div className="divide-y divide-theme">
                    {topRenewals.map(({ employee, daysRemaining }) => {
                      const critical = daysRemaining <= 30;
                      const dueLabel = daysRemaining < 0
                        ? `${formatNumber(Math.abs(daysRemaining), language)} ${t("dash.renewal.days_overdue")}`
                        : daysRemaining === 0
                          ? t("dash.renewal.due_today")
                          : `${formatNumber(daysRemaining, language)} ${t("emp.days_remaining")}`;
                      return (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() => onNavigateModule("employees")}
                          className="flex w-full items-center gap-3 py-3 text-start transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${critical ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}><FileClock className="h-4 w-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-dynamic-xs font-bold text-foreground">{localize(employee.name)}</span>
                            <span className="mt-0.5 block truncate text-dynamic-xs text-muted">{localize(employee.department)} · {fullDate(employee.idExpiryDateGregorian, language)}</span>
                          </span>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-dynamic-xs font-bold ${critical ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}>{dueLabel}</span>
                        </button>
                      );
                    })}
                    {renewalAttentionRecords.length > topRenewals.length && (
                      <button type="button" onClick={() => onNavigateModule("employees")} className="inline-flex items-center gap-1 py-3 text-dynamic-xs font-semibold text-primary hover:underline">
                        {t("dash.renewal.view_more")}<ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-dynamic-xs font-semibold text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {t(workforce.employees.length > 0 ? "dash.premium.no_renewals" : "dash.premium.no_renewal_data")}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <p className="flex items-start gap-2 border-t border-theme pt-3 text-dynamic-xs leading-relaxed text-muted">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <span>{t("dash.premium.as_of")}: {fullDate(attendance.latestDate, language)}</span>
      </p>
    </div>
  );
};
