import React, { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FileClock,
  Globe,
  BarChart3,
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
import { AccessibleTooltip, formControlClassName, MetricCard, PageHeader, primaryButtonClass, secondaryButtonClass, surfaceClassName } from "@/components/DesignSystem";
import {
  DashboardWidgetId,
  loadDashboardPreferences,
  saveDashboardPreferences,
  shouldShowDashboardWidget
} from "@/services/dashboardPreferences";
import { getRosterDashboardView, RosterImportSummary } from "@/services/rosterImport";

interface DashboardModuleProps {
  employees: EmployeeRecordBlueprint[];
  rosterSummary?: RosterImportSummary | null;
  rosterRecordsLoaded?: boolean;
  demoMode?: boolean;
  onToggleDemoMode?: () => void;
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
  accentColor?: string;
}

const localeFor = (language: string): string => language === "ar" ? "ar-SA" : "en-SA";

const DASHBOARD_SEMANTIC_COLORS = {
  primary: "var(--color-primary)",
  accent: "var(--color-accent)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)"
} as const;

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

const KpiCard: React.FC<KpiCardProps> = ({ label, value, detail, icon, iconTone, accentColor }) => (
  <MetricCard
    label={label}
    value={value}
    note={detail}
    icon={icon}
    iconToneClassName={iconTone}
    accentColor={accentColor}
    valueSize="3xl"
    tone="neutral"
    surfaceVariant="outlined"
    showNoteSeparator={false}
  />
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
    className="flex w-full items-center gap-3 rounded-md border border-theme bg-surface p-3 text-start transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  >
    <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconTone}`}>{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-dynamic-xs font-bold text-foreground">{title}</span>
      <span className="mt-0.5 block truncate text-dynamic-xs text-muted">{subtitle}</span>
    </span>
    <span className="shrink-0 rounded-lg bg-surface px-2.5 py-1 text-dynamic-xs font-bold tabular-nums text-foreground">{value}</span>
  </button>
);

interface DashboardChartSegment {
  label: string;
  value: number;
  color: string;
}

const DistributionBarChart: React.FC<{
  segments: DashboardChartSegment[];
  centerLabel: string;
  language: string;
}> = ({ segments, centerLabel, language }) => {
  const chartSegments = segments.filter((segment) => segment.value > 0);
  const total = chartSegments.reduce((sum, segment) => sum + segment.value, 0);
  const ariaSummary = segments
    .map((segment) => `${segment.label}: ${formatNumber(segment.value, language)}`)
    .join(", ");

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <span className="text-dynamic-xs font-semibold text-muted">{centerLabel}</span>
        <strong className="text-dynamic-xl font-bold tabular-nums text-foreground">
          {formatNumber(total, language)}
        </strong>
      </div>
      <div
        role="img"
        aria-label={ariaSummary || centerLabel}
        className="flex h-2 overflow-hidden rounded-full bg-surface-muted"
      >
        {chartSegments.map((segment) => (
          <span
            key={segment.label}
            aria-hidden="true"
            className="h-full transition-[width] duration-500"
            style={{
              width: `${(segment.value / total) * 100}%`,
              backgroundColor: segment.color
            }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-1 divide-y divide-theme sm:grid-cols-2 sm:divide-y-0 sm:gap-x-5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex min-w-0 items-center gap-2 py-2.5 sm:border-b sm:border-theme">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="min-w-0 flex-1 truncate text-dynamic-xs font-medium text-muted">
              {segment.label}
            </span>
            <span className="shrink-0 text-dynamic-xs tabular-nums text-muted">
              {formatNumber(total ? (segment.value / total) * 100 : 0, language, 1)}%
            </span>
            <strong className="shrink-0 text-dynamic-xs font-bold tabular-nums text-foreground">
              {formatNumber(segment.value, language)}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
};

const DonutChart: React.FC<{
  segments: DashboardChartSegment[];
  centerLabel: string;
  language: string;
}> = ({ segments, centerLabel, language }) => {
  const chartSegments = segments.filter((segment) => segment.value > 0);
  const total = chartSegments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const ariaSummary = segments
    .map((segment) => `${segment.label}: ${formatNumber(segment.value, language)}`)
    .join(", ");
  let offset = 0;
  const arcs = chartSegments.map((segment) => {
    const length = total ? (segment.value / total) * circumference : 0;
    const arc = { ...segment, length, offset };
    offset += length;
    return arc;
  });

  return (
    <div className="grid min-w-0 grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
      <div role="img" aria-label={ariaSummary || centerLabel} className="relative h-28 w-28 shrink-0 sm:h-36 sm:w-36">
        <svg aria-hidden="true" viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-surface-muted)" strokeWidth="14" />
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              className="chart-donut-segment"
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth="14"
              strokeDasharray={`${arc.length} ${circumference - arc.length}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
        </svg>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <strong className="text-dynamic-xl font-bold tabular-nums text-foreground">{formatNumber(total, language)}</strong>
          <span className="max-w-[80%] text-dynamic-xs text-muted">{centerLabel}</span>
        </div>
      </div>
      <ul className="min-w-0 space-y-2" aria-label={centerLabel}>
        {segments.map((segment) => (
          <li key={segment.label} className="flex min-w-0 items-center gap-2 text-dynamic-xs">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="min-w-0 flex-1 truncate text-muted">{segment.label}</span>
            <strong className="shrink-0 font-bold tabular-nums text-foreground">{formatNumber(segment.value, language)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
};

const attendanceParts = [
  { status: "PRESENT", color: DASHBOARD_SEMANTIC_COLORS.success },
  { status: "LATE", color: DASHBOARD_SEMANTIC_COLORS.warning },
  { status: "REMOTE", color: DASHBOARD_SEMANTIC_COLORS.accent },
  { status: "ABSENT", color: DASHBOARD_SEMANTIC_COLORS.danger }
] as const;

const emptyAttendance: AttendanceRecord | undefined = undefined;

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  employees,
  rosterSummary,
  rosterRecordsLoaded = false,
  demoMode = false,
  onToggleDemoMode,
  employeeId,
  onNavigateModule
}) => {
  const { t, localize, formatCurrencySAR, language } = useLanguage();
  const demoModeActive = demoMode && import.meta.env.DEV;
  const [dashboardPreferences, setDashboardPreferences] = useState(loadDashboardPreferences);
  const showWidget = (id: DashboardWidgetId, hasRecords: boolean) =>
    demoModeActive || shouldShowDashboardWidget(dashboardPreferences, id, hasRecords);
  const restoreRosterKpis = () => {
    setDashboardPreferences(saveDashboardPreferences({
      ...dashboardPreferences,
      workforce_headcount: { ...dashboardPreferences.workforce_headcount, enabled: true },
      saudi_workforce_share: { ...dashboardPreferences.saudi_workforce_share, enabled: true }
    }));
  };
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
  const canManageRoster = hasPermission("route:settings") && hasPermission("system:app_store_toggles");
  const hasRosterSummary = Boolean(rosterSummary && canViewEmployees);
  const hasImportedRoster = hasRosterSummary && !demoModeActive;
  const [selectedCompany, setSelectedCompany] = useState("ALL");
  const activeCompanySelection = rosterSummary?.companies.some((company) => company.name === selectedCompany)
    ? selectedCompany
    : "ALL";
  const rosterView = useMemo(
    () => hasImportedRoster && rosterSummary
      ? getRosterDashboardView(rosterSummary, activeCompanySelection === "ALL" ? null : activeCompanySelection)
      : null,
    [hasImportedRoster, rosterSummary, activeCompanySelection]
  );
  const seededWorkforce = useMemo(
    () => buildWorkforceSnapshot(canViewEmployees ? employees : []),
    [canViewEmployees, employees]
  );
  const workforce = useMemo(() => rosterView ? {
    employees: [] as EmployeeRecordBlueprint[],
    total: rosterView.workforceCount,
    saudiCount: rosterView.saudiCount,
    expatCount: rosterView.expatCount,
    onLeaveCount: rosterView.onLeaveCount,
    saudiSharePercent: rosterView.saudiSharePercent,
    departments: rosterView.departments.map((department) => ({
      code: department.code,
      label: { en: department.code, ar: department.code },
      total: department.workforceCount,
      saudiCount: department.saudiCount,
      expatCount: department.expatCount
    }))
  } : seededWorkforce, [rosterView, seededWorkforce]);
  const attendance = useMemo(
    () => buildAttendanceSnapshot(hasImportedRoster ? [] : attendanceRecords, hasImportedRoster || !canViewEmployees ? [] : employees),
    [hasImportedRoster, attendanceRecords, canViewEmployees, employees]
  );
  const renewalAttentionRecords = useMemo(
    () => canViewEmployees && !hasImportedRoster ? getRenewalAttentionRecords(workforce.employees) : [],
    [canViewEmployees, hasImportedRoster, workforce.employees]
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

  const pendingExpenses = canViewExpenses && !hasImportedRoster
    ? expenseClaims.filter((claim) => claim.status === "PENDING")
    : [];
  const pendingTransfers = canViewEmployees && !hasImportedRoster
    ? transferRequests.filter((request) => request.status === "PENDING")
    : [];
  const pendingRequests = canViewEmployees && !hasImportedRoster
    ? employeeRequests.filter((request) => request.status === "PENDING")
    : [];
  const pendingPeopleCount = pendingRequests.length + pendingTransfers.length;
  const nonFinancialWorkflowCount = pendingPeopleCount + pendingExpenses.length;
  const pendingInvoices = canViewFinancials && !hasImportedRoster
    ? financialWorkflowItems.filter((item) => item.type === "INVOICE" && item.status === "PENDING")
    : [];
  const pendingPayments = canViewFinancials && !hasImportedRoster
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
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <PageHeader
          title={t("dash.employee.title")}
          meta={<span className="rounded-full bg-primary-soft px-2.5 py-1 text-dynamic-xs font-semibold text-primary-text">{t(`role.short.${currentRole}`)}</span>}
        />
        <div role="note" className="flex items-start gap-3 rounded-2xl bg-warning-soft p-3 text-dynamic-xs leading-relaxed text-warning-text">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("dash.data_notice")}</span>
        </div>
        {personalProfile ? (
          <>
            <section className={`${surfaceClassName} relative isolate overflow-hidden p-5 sm:p-6`}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-surface-muted text-dynamic-xl font-bold text-foreground">
                    {localize(personalProfile.name).slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-dynamic-xs font-semibold uppercase tracking-wide text-primary-text">{t("dash.employee.profile")}</p>
                    <h2 className="mt-1 truncate text-dynamic-xl font-bold text-foreground">{localize(personalProfile.name)}</h2>
                    <p className="mt-1 truncate text-dynamic-sm text-muted">{localize(personalProfile.jobTitle)} · {localize(personalProfile.department)}</p>
                  </div>
                </div>
                {hasPermission("self_service:geofence_punch") && (
                  <button
                    type="button"
                    onClick={() => setGeofenceModalOpen(true)}
                    className={primaryButtonClass}
                  >
                    <CalendarClock className="h-4 w-4" />
                    <span>{t("dash.employee.review_attendance")}</span>
                  </button>
                )}
              </div>
            </section>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <KpiCard
                label={t("dash.employee.attendance")}
                value={personalAttendance ? t(`emp.attendance.status.${personalAttendance.status}`) : t("dash.employee.no_attendance")}
                detail={personalAttendance ? `${t("dash.employee.recorded_on")}: ${fullDate(personalAttendance.date, language)}` : t("dash.attendance.no_data")}
                icon={<CalendarClock className="h-5 w-5" />}
                iconTone="bg-surface-muted text-muted"
              />
              <KpiCard
                label={t("dash.employee.document")}
                value={expiryValue}
                detail={`${fullDate(personalProfile.idExpiryDateGregorian, language)} · ${expiryStatus}`}
                icon={<FileClock className="h-5 w-5" />}
                iconTone="bg-surface-muted text-muted"
              />
              <article className={`${surfaceClassName} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-dynamic-xs font-semibold text-muted">{t("dash.employee.location")}</p>
                    <p className="mt-2 text-dynamic-lg font-bold text-foreground">{localize(personalProfile.location)}</p>
                    <p className="mt-1 text-dynamic-xs text-muted">{t("dash.employee.profile_id")}: {personalProfile.id}</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-muted text-muted"><BriefcaseBusiness className="h-4 w-4" /></span>
                </div>
              </article>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-surface-elevated p-8 text-center text-dynamic-sm text-muted">
            {t("dash.employee.profile_unavailable")}
          </div>
        )}
      </div>
    );
  }

  const departments = workforce.departments;
  const maximumDepartmentSize = Math.max(...departments.map((department) => department.total), 1);
  const topRenewals = renewalAttentionRecords.slice(0, 3);
  const workforceStatusSegments: DashboardChartSegment[] = hasImportedRoster && rosterView
    ? [
        { label: t("emp.status.ACTIVE"), value: rosterView.activeCount, color: DASHBOARD_SEMANTIC_COLORS.success },
        { label: t("emp.status.ON_LEAVE"), value: rosterView.onLeaveCount, color: DASHBOARD_SEMANTIC_COLORS.warning },
        { label: t("emp.status.INACTIVE"), value: rosterView.inactiveCount, color: DASHBOARD_SEMANTIC_COLORS.danger }
      ]
    : [
        { label: t("emp.status.ACTIVE"), value: employees.filter((employee) => employee.status === "ACTIVE").length, color: DASHBOARD_SEMANTIC_COLORS.success },
        { label: t("emp.status.ON_LEAVE"), value: employees.filter((employee) => employee.status === "ON_LEAVE").length, color: DASHBOARD_SEMANTIC_COLORS.warning },
        { label: t("emp.status.SUSPENDED"), value: employees.filter((employee) => employee.status === "SUSPENDED").length, color: DASHBOARD_SEMANTIC_COLORS.danger }
      ];
  const nationalityMixSegments: DashboardChartSegment[] = [
    { label: t("dash.premium.saudi"), value: workforce.saudiCount, color: DASHBOARD_SEMANTIC_COLORS.primary },
    { label: t("dash.premium.expat"), value: workforce.expatCount, color: DASHBOARD_SEMANTIC_COLORS.accent }
  ];
  const showStatusMixChart = canViewEmployees && showWidget("workforce_status_mix", workforceStatusSegments.some((segment) => segment.value > 0));
  const showNationalityMixChart = canViewEmployees && showWidget("workforce_nationality_mix", nationalityMixSegments.some((segment) => segment.value > 0));
  const hasAttentionSourceData = !hasImportedRoster && ((canViewEmployees && (employees.length > 0 || employeeRequests.length > 0 || transferRequests.length > 0)) ||
    (canViewExpenses && expenseClaims.length > 0) ||
    (canViewFinancials && financialWorkflowItems.length > 0));
  const showHeadcountKpi = canViewEmployees && showWidget("workforce_headcount", workforce.total > 0);
  const showSaudiShareKpi = canViewEmployees && showWidget("saudi_workforce_share", workforce.total > 0);
  const showAttendanceKpi = canViewEmployees && showWidget("attendance_latest_day", attendance.recordedCount > 0);
  const showAttentionKpi = showWidget("needs_attention_total", hasAttentionSourceData);
  const showDepartmentChart = canViewEmployees && showWidget("workforce_by_department", departments.length > 0);
  const showAttendanceChart = canViewEmployees && showWidget("attendance_mix", attendance.recordedCount > 0);
  const hasEmployeeWorkflowSourceData = !hasImportedRoster && canViewEmployees &&
    (employeeRequests.length > 0 || transferRequests.length > 0);
  const hasExpenseWorkflowSourceData = !hasImportedRoster && canViewExpenses && expenseClaims.length > 0;
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
    <div className="mx-auto w-full max-w-screen-2xl space-y-5">
      <PageHeader
        title={t("dash.header.title")}
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            {demoModeActive && (
              <AccessibleTooltip label={t("dash.data_notice.demo_help_label")}>
                {t("dash.data_notice.demo")}
              </AccessibleTooltip>
            )}
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-dynamic-xs font-semibold ${demoModeActive ? "bg-warning-soft text-warning-text" : hasImportedRoster ? "bg-success-soft text-success-text" : "bg-warning-soft text-warning-text"}`}>
              {demoModeActive ? <CircleAlert className="h-3.5 w-3.5" /> : hasImportedRoster ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
              {t(demoModeActive
                ? "dash.data_notice.demo_badge"
                : hasImportedRoster
                  ? rosterRecordsLoaded ? "dash.data_notice.imported_badge" : "dash.data_notice.summary_badge"
                  : "dash.data_notice.badge")}
            </span>
            {import.meta.env.DEV && onToggleDemoMode && (
              <button
                type="button"
                onClick={onToggleDemoMode}
                className={secondaryButtonClass}
              >
                {t(demoModeActive
                  ? hasRosterSummary ? "dash.demo.use_roster" : "dash.demo.exit"
                  : "dash.demo.show")}
              </button>
            )}
          </div>
        )}
      />

      {!demoModeActive && (
        <div role="note" className="flex items-start gap-3 rounded-md border border-theme bg-surface-elevated p-3 text-dynamic-xs leading-relaxed text-muted">
          {hasImportedRoster
            ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning-text" />}
          <span>{t(hasImportedRoster
            ? rosterRecordsLoaded ? "dash.data_notice.imported" : "dash.data_notice.summary_only"
            : "dash.data_notice")}</span>
        </div>
      )}

      {hasImportedRoster && rosterSummary && rosterView && (
        <section className={`${surfaceClassName} flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between`}>
          <div className="w-full sm:max-w-sm">
            <label htmlFor="dashboard-company-filter" className="mb-1.5 block text-dynamic-xs font-bold text-foreground">
              {t("dash.roster.company_filter")}
            </label>
            <select
              id="dashboard-company-filter"
              value={activeCompanySelection}
              onChange={(event) => setSelectedCompany(event.target.value)}
              className={`${formControlClassName} font-semibold`}
            >
              <option value="ALL">{t("dash.roster.all_companies")}</option>
              {rosterSummary.companies.map((company) => <option key={company.name} value={company.name}>{company.name}</option>)}
            </select>
          </div>
          <p className="text-dynamic-xs leading-relaxed text-muted sm:text-end">
            {formatNumber(rosterView.activeCount, language)} {t("dash.roster.active")} · {formatNumber(rosterView.onLeaveCount, language)} {t("dash.roster.on_leave")} · {formatNumber(rosterView.inactiveCount, language)} {t("dash.roster.inactive_excluded")}
          </p>
        </section>
      )}

      {hasImportedRoster && workforce.total > 0 && !showHeadcountKpi && !showSaudiShareKpi && (
        <section role="note" className="flex flex-col gap-3 rounded-2xl border border-warning/25 bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning-text" />
            <div>
              <h2 className="text-dynamic-sm font-bold text-foreground">{t("dash.roster.kpis_hidden.title")}</h2>
              <p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{t("dash.roster.kpis_hidden.body")}</p>
            </div>
          </div>
          {canManageRoster && (
            <button
              type="button"
              onClick={restoreRosterKpis}
              className={primaryButtonClass}
            >
              {t("dash.roster.kpis_hidden.action")}
            </button>
          )}
        </section>
      )}

      {(showHeadcountKpi || showSaudiShareKpi || showAttendanceKpi || showAttentionKpi) && (
        <section aria-label={t("dash.kpi.section_label")} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {showHeadcountKpi && (
            <KpiCard
              label={t("dash.kpi.headcount")}
              value={workforce.total ? formatNumber(workforce.total, language) : "—"}
              detail={workforce.total
                ? hasImportedRoster && rosterView
                  ? `${formatNumber(rosterView.activeCount, language)} ${t("dash.roster.active")} · ${formatNumber(rosterView.onLeaveCount, language)} ${t("dash.roster.on_leave")} · ${formatNumber(rosterView.inactiveCount, language)} ${t("dash.roster.inactive_excluded")}`
                  : `${formatNumber(workforce.saudiCount, language)} ${t("dash.premium.saudi")} · ${formatNumber(workforce.expatCount, language)} ${t("dash.premium.expat")}`
                : t("dash.workforce.no_data")}
              icon={<Users className="h-5 w-5" />}
              iconTone="bg-primary-soft text-primary-text"
              accentColor={DASHBOARD_SEMANTIC_COLORS.primary}
            />
          )}
          {showSaudiShareKpi && (
            <KpiCard
              label={t(hasImportedRoster ? "dash.roster.saudi_share" : "dash.kpi.nitaqat")}
              value={workforce.saudiSharePercent !== null
                ? `${formatNumber(workforce.saudiSharePercent, language, 1)}%`
                : "—"}
              detail={workforce.total
                ? `${formatNumber(workforce.saudiCount, language)} / ${formatNumber(workforce.total, language)} · ${t(hasImportedRoster ? "dash.roster.saudi_share_note" : "dash.kpi.nitaqat.sub")}`
                : t("dash.workforce.no_data")}
              icon={<ShieldCheck className="h-5 w-5" />}
              iconTone="bg-success-soft text-success-text"
              accentColor={DASHBOARD_SEMANTIC_COLORS.success}
            />
          )}
          {showAttendanceKpi && (
            <KpiCard
              label={t("dash.kpi.attendance")}
              value={attendanceKpiValue}
              detail={attendanceKpiDetail}
              icon={<Activity className="h-5 w-5" />}
              iconTone="bg-accent-soft text-accent-text"
              accentColor={DASHBOARD_SEMANTIC_COLORS.accent}
            />
          )}
          {showAttentionKpi && (
            <KpiCard
              label={t("dash.kpi.open_actions")}
              value={hasAttentionSourceData ? formatNumber(needsAttentionCount, language) : "—"}
              detail={hasAttentionSourceData ? t("dash.kpi.open_actions.sub") : t("dash.kpi.open_actions.no_data")}
              icon={<CircleAlert className="h-5 w-5" />}
              iconTone="bg-warning-soft text-warning-text"
              accentColor={DASHBOARD_SEMANTIC_COLORS.warning}
            />
          )}
        </section>
      )}

      {!demoModeActive && !hasRosterSummary && canManageRoster && (
        <section className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-dynamic-sm font-bold text-foreground">{t("dash.roster.not_loaded.title")}</h2>
            <p className="mt-1 max-w-3xl text-dynamic-xs leading-relaxed text-muted">{t("dash.roster.not_loaded.body")}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateModule("settings")}
            className={primaryButtonClass}
          >
            {t("dash.roster.not_loaded.action")}
          </button>
        </section>
      )}

      {showWorkflowSection && (
        <section className={`${surfaceClassName} p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <CircleAlert className="h-5 w-5 text-warning-text" />
              <h2 className="text-dynamic-base font-bold text-foreground">{t("dash.workflow.title")}</h2>
            </div>
            <span className={`rounded-xl px-3 py-2 text-dynamic-sm font-bold tabular-nums ${visibleNeedsAttentionCount ? "bg-warning-soft text-warning-text" : "bg-success-soft text-success-text"}`}>
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
                    iconTone="bg-surface-muted text-muted"
                    title={t("dash.action.people")}
                    subtitle={`${formatNumber(pendingRequests.length, language)} ${t("dash.workflow.requests")} · ${formatNumber(pendingTransfers.length, language)} ${t("dash.workflow.transfers")}`}
                    value={formatNumber(pendingPeopleCount, language)}
                    onClick={() => onNavigateModule("employees")}
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-dynamic-xs font-semibold text-success-text">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {t(hasEmployeeWorkflowSourceData ? "dash.workflow.no_pending" : "dash.workflow.no_data")}
                  </div>
                ))}
                {showExpenseWorkflowWidget && (pendingExpenses.length > 0 ? (
                  <QueueRow
                    icon={<Receipt className="h-4 w-4" />}
                    iconTone="bg-surface-muted text-muted"
                    title={t("dash.action.expenses")}
                    subtitle={formatCurrencySAR(pendingExpenseTotal)}
                    value={formatNumber(pendingExpenses.length, language)}
                    onClick={() => onNavigateModule("expenses")}
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-dynamic-xs font-semibold text-success-text">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {t(hasExpenseWorkflowSourceData ? "dash.workflow.no_pending" : "dash.workflow.no_data")}
                  </div>
                ))}
                {showFinancialWidget && (pendingFinancialCount > 0 ? (
                  <QueueRow
                    icon={<WalletCards className="h-4 w-4" />}
                    iconTone="bg-surface-muted text-muted"
                    title={t("dash.action.financials")}
                    subtitle={formatCurrencySAR(pendingFinancialTotal)}
                    value={formatNumber(pendingFinancialCount, language)}
                    onClick={() => onNavigateModule("accounts")}
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-dynamic-xs font-semibold text-success-text">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {t(!hasImportedRoster && financialWorkflowItems.length > 0 ? "dash.workflow.no_pending" : "dash.finance.no_data")}
                  </div>
                ))}
              </div>
            )}

            {showRenewalsWidget && (
              <div className="border-t border-theme pt-4 lg:border-s lg:border-t-0 lg:pt-0 lg:ps-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-dynamic-xs font-bold uppercase tracking-wide text-muted">{t("dash.premium.renewals_title")}</h3>
                  <span className="rounded-lg bg-danger-soft px-2.5 py-1 text-dynamic-xs font-bold text-danger-text tabular-nums">{formatNumber(renewalAttentionRecords.length, language)}</span>
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
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${critical ? "bg-danger-soft text-danger-text" : "bg-warning-soft text-warning-text"}`}><FileClock className="h-4 w-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-dynamic-xs font-bold text-foreground">{localize(employee.name)}</span>
                            <span className="mt-0.5 block truncate text-dynamic-xs text-muted">{localize(employee.department)} · {fullDate(employee.idExpiryDateGregorian, language)}</span>
                          </span>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-dynamic-xs font-bold ${critical ? "bg-danger-soft text-danger-text" : "bg-warning-soft text-warning-text"}`}>{dueLabel}</span>
                        </button>
                      );
                    })}
                    {renewalAttentionRecords.length > topRenewals.length && (
                      <button type="button" onClick={() => onNavigateModule("employees")} className="inline-flex items-center gap-1 py-3 text-dynamic-xs font-semibold text-primary-text hover:underline">
                        {t("dash.renewal.view_more")}<ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-dynamic-xs font-semibold text-success-text">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {t(workforce.employees.length > 0 ? "dash.premium.no_renewals" : "dash.premium.no_renewal_data")}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {(showStatusMixChart || showNationalityMixChart || showDepartmentChart || showAttendanceChart) && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-theme bg-surface p-3 text-start text-foreground transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <span className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
                <BarChart3 className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-dynamic-sm font-bold">{t("dash.breakdowns.title")}</span>
                <span className="mt-0.5 block text-dynamic-xs text-muted">{t("dash.breakdowns.description")}</span>
              </span>
            </span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 space-y-4">
      {(showStatusMixChart || showNationalityMixChart) && (
        <section
          aria-label={showStatusMixChart && showNationalityMixChart
            ? `${t("dash.chart.workforce_status_mix")} · ${t("dash.chart.workforce_nationality_mix")}`
            : t(showStatusMixChart ? "dash.chart.workforce_status_mix" : "dash.chart.workforce_nationality_mix")}
          className={`grid grid-cols-1 gap-4 ${showStatusMixChart && showNationalityMixChart ? "xl:grid-cols-2" : ""}`}
        >
          {showStatusMixChart && (
            <article className={`${surfaceClassName} p-5`}>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted" />
                <h2 className="text-dynamic-base font-bold text-foreground">{t("dash.chart.workforce_status_mix")}</h2>
              </div>
              <p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{t("dash.chart.workforce_status_mix.sub")}</p>
              <div className="mt-5">
                {workforceStatusSegments.some((segment) => segment.value > 0) ? (
                  <DonutChart segments={workforceStatusSegments} centerLabel={t("dash.chart.total")} language={language} />
                ) : (
                  <div className="rounded-xl bg-surface-elevated p-5 text-center text-dynamic-sm text-muted">{t("dash.workforce.no_data")}</div>
                )}
              </div>
            </article>
          )}
          {showNationalityMixChart && (
            <article className={`${surfaceClassName} p-5`}>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted" />
                <h2 className="text-dynamic-base font-bold text-foreground">{t("dash.chart.workforce_nationality_mix")}</h2>
              </div>
              <p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{t("dash.chart.workforce_nationality_mix.sub")}</p>
              <div className="mt-5">
                {nationalityMixSegments.some((segment) => segment.value > 0) ? (
                  <DistributionBarChart segments={nationalityMixSegments} centerLabel={t("dash.chart.total")} language={language} />
                ) : (
                  <div className="rounded-xl bg-surface-elevated p-5 text-center text-dynamic-sm text-muted">{t("dash.workforce.no_data")}</div>
                )}
              </div>
            </article>
          )}
        </section>
      )}

      {(showDepartmentChart || showAttendanceChart) && (
        <section className={`grid grid-cols-1 gap-4 ${showDepartmentChart && showAttendanceChart ? "xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]" : ""}`}>
          {showDepartmentChart && (
            <article className={`${surfaceClassName} p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted" />
                <h2 className="text-dynamic-base font-bold text-foreground">{t("dash.chart.workforce_by_department")}</h2>
              </div>
              <p className="mt-1 text-dynamic-xs text-muted">{t("dash.chart.workforce_by_department.sub")}</p>
            </div>
            {departments.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 text-dynamic-xs">
                <span className="inline-flex items-center gap-1.5 text-muted"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DASHBOARD_SEMANTIC_COLORS.primary }} />{t("dash.premium.saudi")}</span>
                <span className="inline-flex items-center gap-1.5 text-muted"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DASHBOARD_SEMANTIC_COLORS.accent }} />{t("dash.premium.expat")}</span>
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
                        {department.saudiCount > 0 && <span className="h-full" style={{ width: `${saudiWidth}%`, backgroundColor: DASHBOARD_SEMANTIC_COLORS.primary }} />}
                        {department.expatCount > 0 && <span className="h-full" style={{ width: `${expatWidth}%`, backgroundColor: DASHBOARD_SEMANTIC_COLORS.accent }} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-surface-elevated p-5 text-center text-dynamic-sm text-muted">{t("dash.workforce.no_data")}</div>
          )}
            </article>
          )}

          {showAttendanceChart && (
            <article className={`${surfaceClassName} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-muted" />
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
                <div className="mt-5">
                  <DistributionBarChart
                    segments={attendanceParts.map((part) => ({
                      label: t(`emp.attendance.status.${part.status}`),
                      value: attendance.statusCounts[part.status],
                      color: part.color
                    }))}
                    centerLabel={t("dash.chart.total")}
                    language={language}
                  />
                </div>
              ) : (
                <div className="mt-5 rounded-xl bg-surface-elevated p-5 text-center text-dynamic-sm text-muted">{t("dash.attendance.no_data")}</div>
              )}
            </article>
          )}
        </section>
      )}
          </div>
        </details>
      )}

      {hasImportedRoster && rosterSummary ? (
        <p className="flex items-start gap-2 border-t border-theme pt-3 text-dynamic-xs leading-relaxed text-muted">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-text" />
          <span>{t("dash.roster.snapshot_time")}: {new Date(rosterSummary.importedAt).toLocaleString(localeFor(language), { dateStyle: "medium", timeStyle: "short" })}</span>
        </p>
      ) : (
        <p className="flex items-start gap-2 border-t border-theme pt-3 text-dynamic-xs leading-relaxed text-muted">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-text" />
          <span>{t("dash.premium.as_of")}: {fullDate(attendance.latestDate, language)}</span>
        </p>
      )}
    </div>
  );
};
