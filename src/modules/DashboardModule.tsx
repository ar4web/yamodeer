import React, { useMemo } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  FileClock,
  Landmark,
  Receipt,
  ShieldCheck,
  Users,
  WalletCards
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrentRole, useRBACGeofence } from "@/context/RBACGeofenceContext";
import { useOperations } from "@/context/OperationsContext";
import { AttendanceStatus } from "@/data/workspaceBlueprints";
import {
  DASHBOARD_BLUEPRINT_DATA,
  DASHBOARD_PREVIOUS_SNAPSHOT_DATA,
  EmployeeRecordBlueprint
} from "@/data/mockBlueprints";
import { PageHeader } from "@/components/DesignSystem";

interface DashboardModuleProps {
  employees: EmployeeRecordBlueprint[];
  onNavigateModule: (
    route: "employees" | "vendors" | "expenses" | "accounts" | "compliance" | "settings"
  ) => void;
}

type TrendTone = "positive" | "caution" | "neutral";

interface KpiCardProps {
  label: string;
  value: string;
  detail: string;
  delta: string;
  deltaTone: TrendTone;
  icon: React.ReactNode;
  iconTone: string;
  comparisonLabel: string;
}

const localeFor = (language: string): string => language === "ar" ? "ar-SA" : "en-SA";

const formatNumber = (value: number, language: string, fractionDigits = 0): string =>
  value.toLocaleString(localeFor(language), { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });

const compactCurrency = (value: number, language: string): string =>
  new Intl.NumberFormat(localeFor(language), { style: "currency", currency: "SAR", notation: "compact", maximumFractionDigits: 1 }).format(value);

const fullDate = (value: string, language: string): string => {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(localeFor(language), { day: "numeric", month: "short", year: "numeric" });
};

const monthLabel = (value: string, language: string): string => {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(localeFor(language), { month: "short", year: "numeric" });
};

const percentageChange = (current: number, previous: number): number =>
  previous === 0 ? 0 : ((current - previous) / Math.abs(previous)) * 100;

const changeText = (change: number, language: string, suffix = ""): string => {
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  return `${sign}${formatNumber(Math.abs(change), language, Number.isInteger(Math.abs(change)) ? 0 : 1)}${suffix}`;
};

const deltaTone = (change: number, higherIsBetter: boolean | null): TrendTone => {
  if (change === 0 || higherIsBetter === null) return "neutral";
  return (change > 0) === higherIsBetter ? "positive" : "caution";
};

const TrendBadge: React.FC<{ text: string; tone: TrendTone; label: string }> = ({ text, tone, label }) => {
  const color = tone === "positive" ? "bg-success-soft text-success" : tone === "caution" ? "bg-warning-soft text-warning" : "bg-surface-elevated text-muted";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-dynamic-xs font-bold tabular-nums ${color}`}><span aria-hidden="true">{text.startsWith("−") ? <ArrowDownRight className="h-3.5 w-3.5" /> : text.startsWith("+") ? <ArrowUpRight className="h-3.5 w-3.5" /> : null}</span><span>{text}</span><span className="font-medium opacity-80">{label}</span></span>;
};

const KpiCard: React.FC<KpiCardProps> = ({ label, value, detail, delta, deltaTone, icon, iconTone, comparisonLabel }) => (
  <article className="group relative isolate overflow-hidden rounded-3xl bg-surface p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-shell">
    <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-accent" />
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-dynamic-sm font-semibold tracking-wide text-muted">{label}</p>
        <p className="mt-2 text-dynamic-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
      </div>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconTone}`}>{icon}</span>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-theme pt-3">
      <span className="min-w-0 truncate text-dynamic-xs text-muted">{detail}</span>
      <TrendBadge text={delta} tone={deltaTone} label={comparisonLabel} />
    </div>
  </article>
);

interface CompareMetric {
  id: string;
  label: string;
  beforeValue: string;
  afterValue: string;
  beforeAmount: number;
  afterAmount: number;
  delta: string;
  tone: TrendTone;
  higherIsBetter: boolean | null;
}

const ComparisonRow: React.FC<{ metric: CompareMetric; maxAmount: number; beforeLabel: string; afterLabel: string; language: string }> = ({ metric, maxAmount, beforeLabel, afterLabel, language }) => {
  const beforeWidth = Math.max(5, Math.min(100, (metric.beforeAmount / maxAmount) * 100));
  const afterWidth = Math.max(5, Math.min(100, (metric.afterAmount / maxAmount) * 100));
  const beforeColor = "bg-surface-muted";
  const afterColor = metric.tone === "caution" ? "bg-warning" : metric.tone === "positive" ? "bg-primary" : "bg-accent";
  return (
    <div className="grid gap-3 border-t border-theme py-3 first:border-t-0 sm:grid-cols-[minmax(120px,0.8fr)_minmax(0,2fr)] sm:items-center">
      <div className="flex items-center justify-between gap-2 sm:block">
        <p className="text-dynamic-xs font-semibold text-foreground">{metric.label}</p>
        <TrendBadge text={metric.delta} tone={metric.tone} label="" />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2 text-dynamic-xs"><span className="truncate text-muted">{beforeLabel}</span><span className="font-bold tabular-nums text-muted">{metric.beforeValue}</span></div>
          <div role="progressbar" aria-label={`${metric.label} · ${beforeLabel}`} aria-valuemin={0} aria-valuemax={maxAmount} aria-valuenow={metric.beforeAmount} className="h-2 overflow-hidden rounded-full bg-surface-elevated"><div className={`h-full rounded-full ${beforeColor}`} style={{ width: `${beforeWidth}%` }} /></div>
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2 text-dynamic-xs"><span className="truncate font-semibold text-foreground">{afterLabel}</span><span className="font-bold tabular-nums text-foreground">{metric.afterValue}</span></div>
          <div role="progressbar" aria-label={`${metric.label} · ${afterLabel}`} aria-valuemin={0} aria-valuemax={maxAmount} aria-valuenow={metric.afterAmount} className="h-2 overflow-hidden rounded-full bg-surface-elevated"><div className={`h-full rounded-full transition-[width] duration-500 ${afterColor}`} style={{ width: `${afterWidth}%` }} /></div>
        </div>
      </div>
    </div>
  );
};

interface QueueRowProps {
  icon: React.ReactNode;
  iconTone: string;
  title: string;
  subtitle: string;
  value: string;
  onClick: () => void;
}
const QueueRow: React.FC<QueueRowProps> = ({ icon, iconTone, title, subtitle, value, onClick }) => (
  <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl bg-surface-elevated p-3 text-start transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>{icon}</span>
    <span className="min-w-0 flex-1"><span className="block truncate text-dynamic-xs font-bold text-foreground">{title}</span><span className="mt-0.5 block truncate text-dynamic-xs text-muted">{subtitle}</span></span>
    <span className="shrink-0 rounded-lg bg-surface-elevated px-2.5 py-1 text-dynamic-xs font-bold tabular-nums text-foreground">{value}</span>
  </button>
);

export const DashboardModule: React.FC<DashboardModuleProps> = ({ employees, onNavigateModule }) => {
  const { t, localize, formatCurrencySAR, language } = useLanguage();
  const { currentRole, hasPermission } = useCurrentRole();
  const { setGeofenceModalOpen } = useRBACGeofence();
  const { expenseClaims, transferRequests, employeeRequests, attendanceRecords, financialWorkflowItems } = useOperations();

  const isEmployee = currentRole === "EMPLOYEE";
  const canViewPayroll = hasPermission("payroll:configure_constants");
  const canViewFinancials = hasPermission("route:accounts");
  const positiveLabel = t("dash.compare.vs_previous");
  const beforeLabel = t("dash.compare.before");
  const afterLabel = t("dash.compare.after");

  const latestAttendanceDate = attendanceRecords.map((record) => record.date).sort().at(-1) ?? "2026-10-02";
  const previousDate = DASHBOARD_PREVIOUS_SNAPSHOT_DATA.snapshotDate;
  const currentPeriod = monthLabel(latestAttendanceDate, language);
  const previousPeriod = monthLabel(previousDate, language);
  const currentSnapshotLabel = `${currentPeriod} · ${t("dash.premium.snapshot")}`;
  const previousSnapshotLabel = `${previousPeriod} · ${t("dash.premium.snapshot")}`;

  const latestAttendance = useMemo(() => {
    const validEmployeeIds = new Set(employees.map((employee) => employee.id));
    return attendanceRecords.filter((record) => record.date === latestAttendanceDate && validEmployeeIds.has(record.employeeId));
  }, [attendanceRecords, employees, latestAttendanceDate]);

  const attendanceCounts: Record<AttendanceStatus, number> = {
    PRESENT: latestAttendance.filter((record) => record.status === "PRESENT").length,
    LATE: latestAttendance.filter((record) => record.status === "LATE").length,
    ABSENT: latestAttendance.filter((record) => record.status === "ABSENT").length,
    REMOTE: latestAttendance.filter((record) => record.status === "REMOTE").length
  };
  const onTimeOrRemote = attendanceCounts.PRESENT + attendanceCounts.LATE + attendanceCounts.REMOTE;
  const attendanceRate = latestAttendance.length ? (onTimeOrRemote / latestAttendance.length) * 100 : 0;
  const attendanceCountsForStatus: Array<{ status: AttendanceStatus; value: number; color: string }> = [
    { status: "PRESENT", value: attendanceCounts.PRESENT, color: "bg-success" },
    { status: "LATE", value: attendanceCounts.LATE, color: "bg-warning" },
    { status: "REMOTE", value: attendanceCounts.REMOTE, color: "bg-accent" },
    { status: "ABSENT", value: attendanceCounts.ABSENT, color: "bg-danger" }
  ];

  const pendingExpenses = expenseClaims.filter((claim) => claim.status === "PENDING");
  const pendingTransfers = transferRequests.filter((request) => request.status === "PENDING");
  const pendingRequests = employeeRequests.filter((request) => request.status === "PENDING");
  const pendingInvoices = financialWorkflowItems.filter((item) => item.type === "INVOICE" && item.status === "PENDING");
  const pendingPayments = financialWorkflowItems.filter((item) => item.type !== "INVOICE" && item.status === "PENDING");
  const pendingExpenseTotal = pendingExpenses.reduce((total, claim) => total + claim.totalAmountSar, 0);
  const pendingInvoiceTotal = pendingInvoices.reduce((total, item) => total + item.amountSar, 0);
  const pendingPaymentTotal = pendingPayments.reduce((total, item) => total + item.amountSar, 0);
  const openActionCount = pendingExpenses.length + pendingTransfers.length + pendingRequests.length;
  const priorityQueueCount = openActionCount + (canViewFinancials ? pendingInvoices.length + pendingPayments.length : 0);
  const monthlyPayroll = DASHBOARD_BLUEPRINT_DATA.divisions.reduce((sum, division) => sum + division.monthlyPayrollSar, 0);
  const expiringEmployees = employees.filter((employee) => employee.daysUntilExpiry <= 90).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry).slice(0, 4);
  const personalProfile = employees[0];
  const personalAttendance = personalProfile ? latestAttendance.find((record) => record.employeeId === personalProfile.id) : undefined;

  const comparisonMetrics: CompareMetric[] = [
    {
      id: "headcount",
      label: t("dash.kpi.headcount"),
      beforeValue: formatNumber(DASHBOARD_PREVIOUS_SNAPSHOT_DATA.totalActiveWorkforce, language),
      afterValue: formatNumber(DASHBOARD_BLUEPRINT_DATA.totalActiveWorkforce, language),
      beforeAmount: DASHBOARD_PREVIOUS_SNAPSHOT_DATA.totalActiveWorkforce,
      afterAmount: DASHBOARD_BLUEPRINT_DATA.totalActiveWorkforce,
      delta: changeText(DASHBOARD_BLUEPRINT_DATA.totalActiveWorkforce - DASHBOARD_PREVIOUS_SNAPSHOT_DATA.totalActiveWorkforce, language, ` ${t("dash.compare.people")}`),
      tone: deltaTone(DASHBOARD_BLUEPRINT_DATA.totalActiveWorkforce - DASHBOARD_PREVIOUS_SNAPSHOT_DATA.totalActiveWorkforce, null),
      higherIsBetter: null
    },
    {
      id: "saudization",
      label: t("dash.kpi.nitaqat"),
      beforeValue: `${formatNumber(DASHBOARD_PREVIOUS_SNAPSHOT_DATA.saudizationPercent, language, 1)}%`,
      afterValue: `${formatNumber(DASHBOARD_BLUEPRINT_DATA.overallSaudizationPercent, language, 1)}%`,
      beforeAmount: DASHBOARD_PREVIOUS_SNAPSHOT_DATA.saudizationPercent,
      afterAmount: DASHBOARD_BLUEPRINT_DATA.overallSaudizationPercent,
      delta: changeText(DASHBOARD_BLUEPRINT_DATA.overallSaudizationPercent - DASHBOARD_PREVIOUS_SNAPSHOT_DATA.saudizationPercent, language, ` ${t("dash.compare.pp")}`),
      tone: deltaTone(DASHBOARD_BLUEPRINT_DATA.overallSaudizationPercent - DASHBOARD_PREVIOUS_SNAPSHOT_DATA.saudizationPercent, true),
      higherIsBetter: true
    },
    {
      id: "attendance",
      label: t("dash.kpi.attendance"),
      beforeValue: `${formatNumber(DASHBOARD_PREVIOUS_SNAPSHOT_DATA.attendanceRatePercent, language, 1)}%`,
      afterValue: `${formatNumber(attendanceRate, language, 1)}%`,
      beforeAmount: DASHBOARD_PREVIOUS_SNAPSHOT_DATA.attendanceRatePercent,
      afterAmount: attendanceRate,
      delta: changeText(attendanceRate - DASHBOARD_PREVIOUS_SNAPSHOT_DATA.attendanceRatePercent, language, ` ${t("dash.compare.pp")}`),
      tone: deltaTone(attendanceRate - DASHBOARD_PREVIOUS_SNAPSHOT_DATA.attendanceRatePercent, true),
      higherIsBetter: true
    },
    {
      id: "actions",
      label: t("dash.kpi.open_actions"),
      beforeValue: formatNumber(DASHBOARD_PREVIOUS_SNAPSHOT_DATA.openActionCount, language),
      afterValue: formatNumber(openActionCount, language),
      beforeAmount: DASHBOARD_PREVIOUS_SNAPSHOT_DATA.openActionCount,
      afterAmount: openActionCount,
      delta: changeText(openActionCount - DASHBOARD_PREVIOUS_SNAPSHOT_DATA.openActionCount, language, ` ${t("dash.compare.items")}`),
      tone: deltaTone(openActionCount - DASHBOARD_PREVIOUS_SNAPSHOT_DATA.openActionCount, false),
      higherIsBetter: false
    },
    ...(canViewPayroll ? [{
      id: "payroll",
      label: t("dash.kpi.payroll"),
      beforeValue: compactCurrency(DASHBOARD_PREVIOUS_SNAPSHOT_DATA.monthlyPayrollSar, language),
      afterValue: compactCurrency(monthlyPayroll, language),
      beforeAmount: DASHBOARD_PREVIOUS_SNAPSHOT_DATA.monthlyPayrollSar,
      afterAmount: monthlyPayroll,
      delta: changeText(percentageChange(monthlyPayroll, DASHBOARD_PREVIOUS_SNAPSHOT_DATA.monthlyPayrollSar), language, "%"),
      tone: "neutral" as TrendTone,
      higherIsBetter: null
    }, {
      id: "gosi",
      label: t("dash.kpi.gosi_pool"),
      beforeValue: compactCurrency(DASHBOARD_PREVIOUS_SNAPSHOT_DATA.monthlyGosiPoolSar, language),
      afterValue: compactCurrency(DASHBOARD_BLUEPRINT_DATA.monthlyGosiPoolSar, language),
      beforeAmount: DASHBOARD_PREVIOUS_SNAPSHOT_DATA.monthlyGosiPoolSar,
      afterAmount: DASHBOARD_BLUEPRINT_DATA.monthlyGosiPoolSar,
      delta: changeText(percentageChange(DASHBOARD_BLUEPRINT_DATA.monthlyGosiPoolSar, DASHBOARD_PREVIOUS_SNAPSHOT_DATA.monthlyGosiPoolSar), language, "%"),
      tone: "neutral" as TrendTone,
      higherIsBetter: null
    }] : [])
  ];

  const currentKpis = [
    {
      label: t("dash.kpi.headcount"), value: formatNumber(DASHBOARD_BLUEPRINT_DATA.totalActiveWorkforce, language),
      detail: t("dash.kpi.headcount.sub"), delta: comparisonMetrics[0].delta, deltaTone: comparisonMetrics[0].tone,
      icon: <Users className="h-5 w-5" />, iconTone: "bg-primary-soft text-primary"
    },
    {
      label: t("dash.kpi.nitaqat"), value: `${formatNumber(DASHBOARD_BLUEPRINT_DATA.overallSaudizationPercent, language, 1)}%`,
      detail: t("dash.kpi.nitaqat.sub"), delta: comparisonMetrics[1].delta, deltaTone: comparisonMetrics[1].tone,
      icon: <ShieldCheck className="h-5 w-5" />, iconTone: "bg-success-soft text-success"
    },
    {
      label: t("dash.kpi.attendance"), value: `${formatNumber(attendanceRate, language, 1)}%`,
      detail: `${formatNumber(onTimeOrRemote, language)} / ${formatNumber(latestAttendance.length, language)} ${t("dash.kpi.attendance.sub")}`,
      delta: comparisonMetrics[2].delta, deltaTone: comparisonMetrics[2].tone,
      icon: <Activity className="h-5 w-5" />, iconTone: "bg-accent-soft text-accent"
    },
    {
      label: t("dash.kpi.open_actions"), value: formatNumber(openActionCount, language),
      detail: t("dash.kpi.open_actions.sub"), delta: comparisonMetrics[3].delta, deltaTone: comparisonMetrics[3].tone,
      icon: <CircleAlert className="h-5 w-5" />, iconTone: "bg-warning-soft text-warning"
    },
    {
      label: t("dash.kpi.expiring_docs"), value: formatNumber(DASHBOARD_BLUEPRINT_DATA.expiring90DaysCount, language),
      detail: t("dash.kpi.expiring_docs.sub"),
      delta: changeText(DASHBOARD_BLUEPRINT_DATA.expiring90DaysCount - DASHBOARD_PREVIOUS_SNAPSHOT_DATA.expiringWithin90Days, language, ` ${t("dash.compare.items")}`),
      deltaTone: deltaTone(DASHBOARD_BLUEPRINT_DATA.expiring90DaysCount - DASHBOARD_PREVIOUS_SNAPSHOT_DATA.expiringWithin90Days, false),
      icon: <FileClock className="h-5 w-5" />, iconTone: "bg-danger-soft text-danger"
    },
    ...(canViewPayroll ? [{
      label: t("dash.kpi.payroll"), value: compactCurrency(monthlyPayroll, language),
      detail: `${t("dash.kpi.gosi_pool")}: ${compactCurrency(DASHBOARD_BLUEPRINT_DATA.monthlyGosiPoolSar, language)}`,
      delta: comparisonMetrics.find((metric) => metric.id === "payroll")!.delta,
      deltaTone: "neutral" as TrendTone,
      icon: <Landmark className="h-5 w-5" />, iconTone: "bg-primary-soft text-primary"
    }] : [])
  ];

  const sortedDivisions = [...DASHBOARD_BLUEPRINT_DATA.divisions].sort((a, b) => (b.saudiCount + b.expatCount) - (a.saudiCount + a.expatCount));
  const maximumDivisionHeadcount = Math.max(...sortedDivisions.map((division) => division.saudiCount + division.expatCount), 1);
  const divisionMetrics = sortedDivisions.map((division) => {
    const total = division.saudiCount + division.expatCount;
    return { ...division, total, saudizationPercent: total ? division.saudiCount / total * 100 : 0 };
  });
  const comparisonMax = (metric: CompareMetric): number => Math.max(metric.beforeAmount, metric.afterAmount, 1) * 1.08;

  if (isEmployee) {
    const status = personalAttendance?.status;
    return (
      <div className="space-y-4">
        <PageHeader eyebrow={t("nav.group.overview")} title={t("dash.employee.title")} meta={<span className="rounded-full bg-primary-soft px-2.5 py-1 text-dynamic-xs font-semibold text-primary">{t(`role.short.${currentRole}`)}</span>} />
        {personalProfile ? (
          <>
            <section className="relative isolate overflow-hidden rounded-3xl bg-surface p-5 shadow-shell sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-dynamic-xl font-bold text-on-primary">{localize(personalProfile.name).slice(0, 1)}</span><div className="min-w-0"><p className="text-dynamic-xs font-semibold uppercase tracking-wide text-primary">{t("dash.employee.profile")}</p><h2 className="mt-1 truncate text-dynamic-xl font-bold text-foreground">{localize(personalProfile.name)}</h2><p className="mt-1 truncate text-dynamic-sm text-muted">{localize(personalProfile.jobTitle)} · {localize(personalProfile.department)}</p></div></div>
                <button type="button" onClick={() => setGeofenceModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-dynamic-sm font-semibold text-on-primary shadow-card transition hover:bg-primary-hover"><CalendarClock className="h-4 w-4" /><span>{t("dash.employee.review_attendance")}</span></button>
              </div>
            </section>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <KpiCard label={t("dash.employee.attendance")} value={status ? t(`emp.attendance.status.${status}`) : t("dash.employee.no_attendance")} detail={`${t("dash.employee.recorded_on")}: ${fullDate(latestAttendanceDate, language)}`} delta={status === "PRESENT" || status === "REMOTE" ? t("dash.employee.on_track") : t("dash.employee.review")} deltaTone={status === "PRESENT" || status === "REMOTE" ? "positive" : "caution"} icon={<CalendarClock className="h-5 w-5" />} iconTone="bg-success-soft text-success" comparisonLabel="" />
              <KpiCard label={t("dash.employee.document")} value={personalProfile.daysUntilExpiry <= 90 ? `${formatNumber(personalProfile.daysUntilExpiry, language)} ${t("emp.days_remaining")}` : t("emp.expiry.compliant")} detail={fullDate(personalProfile.idExpiryDateGregorian, language)} delta={personalProfile.daysUntilExpiry <= 30 ? t("emp.expiry.critical") : personalProfile.daysUntilExpiry <= 90 ? t("emp.expiry.warning") : t("emp.expiry.compliant")} deltaTone={personalProfile.daysUntilExpiry <= 30 ? "caution" : "positive"} icon={<FileClock className="h-5 w-5" />} iconTone={personalProfile.daysUntilExpiry <= 30 ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary"} comparisonLabel="" />
              <article className="rounded-3xl bg-surface p-5 shadow-card"><div className="flex items-start justify-between gap-3"><div><p className="text-dynamic-xs font-semibold text-muted">{t("dash.employee.location")}</p><p className="mt-2 text-dynamic-lg font-bold text-foreground">{localize(personalProfile.location)}</p><p className="mt-1 text-dynamic-xs text-muted">{t("dash.employee.profile_id")}: {personalProfile.id}</p></div><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent"><BriefcaseBusiness className="h-5 w-5" /></span></div></article>
            </div>
          </>
        ) : <div className="rounded-2xl border border-dashed border-theme p-8 text-center text-dynamic-sm text-muted">{t("dash.employee.profile_unavailable")}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("nav.group.overview")}
        title={t("dash.header.title")}
        
        actions={<span className="inline-flex items-center gap-2 bg-surface-elevated px-3 py-2 text-dynamic-xs font-semibold text-foreground"><CalendarClock className="h-3.5 w-3.5 text-primary" />{currentPeriod} <span className="text-muted">{t("dash.compare.vs")}</span> {previousPeriod}</span>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {currentKpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} comparisonLabel={positiveLabel} />)}
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <article className="overflow-hidden rounded-3xl bg-surface shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-theme px-4 py-4 sm:px-5"><div><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><h2 className="text-dynamic-base font-bold text-foreground">{t("dash.premium.compare_title")}</h2></div></div><div className="flex flex-wrap items-center gap-3 text-dynamic-xs"><span className="inline-flex items-center gap-1.5 text-muted"><span className="h-2.5 w-2.5 rounded-full bg-surface-muted" />{beforeLabel}</span><span className="inline-flex items-center gap-1.5 text-foreground"><span className="h-2.5 w-2.5 rounded-full bg-primary" />{afterLabel}</span></div></div>
          <div className="px-4 py-2 sm:px-5">
            {comparisonMetrics.map((metric) => <ComparisonRow key={metric.id} metric={metric} maxAmount={comparisonMax(metric)} beforeLabel={previousSnapshotLabel} afterLabel={currentSnapshotLabel} language={language} />)}
          </div>
        </article>

        <article className="rounded-3xl bg-surface p-5 shadow-card">
          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><h2 className="text-dynamic-base font-bold text-foreground">{t("dash.premium.workforce_title")}</h2></div></div><span className="rounded-xl bg-primary-soft px-3 py-2 text-dynamic-xs font-bold text-primary tabular-nums">{formatNumber(DASHBOARD_BLUEPRINT_DATA.totalActiveWorkforce, language)} {t("dash.compare.people")}</span></div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-dynamic-xs"><span className="inline-flex items-center gap-1.5 text-muted"><span className="h-2.5 w-2.5 rounded-full bg-primary" />{t("dash.premium.saudi")}</span><span className="inline-flex items-center gap-1.5 text-muted"><span className="h-2.5 w-2.5 rounded-full bg-accent" />{t("dash.premium.expat")}</span></div>
          <div className="mt-3 space-y-3">
            {divisionMetrics.map((division) => {
              const saudiWidth = division.total ? (division.saudiCount / division.total) * 100 : 0;
              const expatWidth = division.total ? (division.expatCount / division.total) * 100 : 0;
              const scaleWidth = Math.min(100, (division.total / maximumDivisionHeadcount) * 100);
              return <div key={division.id} className="space-y-1.5"><div className="flex items-center justify-between gap-3 text-dynamic-xs"><span className="min-w-0 truncate font-semibold text-foreground">{localize(division.divisionName)}</span><span className="shrink-0 font-mono text-muted tabular-nums">{formatNumber(division.total, language)}</span></div><div role="progressbar" aria-label={`${localize(division.divisionName)} · ${formatNumber(division.total, language)}`} aria-valuemin={0} aria-valuemax={maximumDivisionHeadcount} aria-valuenow={division.total} className="h-3 overflow-hidden rounded-full bg-surface-elevated"><div className="flex h-full overflow-hidden rounded-full" style={{ width: `${scaleWidth}%` }}><div className="h-full bg-primary" style={{ width: `${saudiWidth}%` }} /><div className="h-full bg-accent" style={{ width: `${expatWidth}%` }} /></div></div><div className="flex items-center justify-between gap-2 text-dynamic-xs text-muted"><span>{formatNumber(division.saudiCount, language)} {t("dash.premium.saudi_count")}</span><span className="font-semibold text-foreground">{formatNumber(division.saudizationPercent, language, 1)}%</span></div></div>;
            })}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-theme pt-3 text-dynamic-xs"><span className="text-muted">{t("dash.kpi.nitaqat")}</span><span className="font-bold text-success">{formatNumber(DASHBOARD_BLUEPRINT_DATA.overallSaudizationPercent - 40, language, 1)} {t("dash.compare.pp")} {t("dash.premium.above_target_suffix")}</span></div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <article className="rounded-3xl bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-accent" /><h2 className="text-dynamic-base font-bold text-foreground">{t("dash.premium.attendance_title")}</h2></div><p className="mt-1 text-dynamic-xs text-muted">{fullDate(latestAttendanceDate, language)}</p></div><div className="text-end"><p className="text-dynamic-xs text-muted">{t("emp.attendance.metric.rate")}</p><p className="text-dynamic-2xl font-bold text-foreground tabular-nums">{formatNumber(attendanceRate, language, 1)}%</p></div></div>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-elevated" role="img" aria-label={t("dash.premium.attendance_title")}>{attendanceCountsForStatus.map((part) => <span key={part.status} className={`${part.color} h-full`} style={{ width: `${latestAttendance.length ? (part.value / latestAttendance.length) * 100 : 0}%` }} />)}</div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{attendanceCountsForStatus.map((part) => <div key={part.status} className="rounded-xl bg-surface-elevated p-3"><div className="flex items-center gap-2 text-dynamic-xs text-muted"><span className={`h-2 w-2 rounded-full ${part.color}`} />{t(`emp.attendance.status.${part.status}`)}</div><p className="mt-2 text-dynamic-lg font-bold text-foreground tabular-nums">{formatNumber(part.value, language)}</p></div>)}</div>
        </article>

        <article className="rounded-3xl bg-surface p-5 shadow-card">
          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><CircleAlert className="h-5 w-5 text-warning" /><h2 className="text-dynamic-base font-bold text-foreground">{t("dash.premium.action_title")}</h2></div></div><span className="rounded-xl bg-warning-soft px-3 py-2 text-dynamic-sm font-bold text-warning tabular-nums">{formatNumber(priorityQueueCount, language)}</span></div>
          <div className="mt-4 space-y-2">
            <QueueRow icon={<BriefcaseBusiness className="h-4 w-4" />} iconTone="bg-primary-soft text-primary" title={t("dash.action.people")} subtitle={`${formatNumber(pendingRequests.length, language)} ${t("dash.workflow.requests")} · ${formatNumber(pendingTransfers.length, language)} ${t("dash.workflow.transfers")}`} value={formatNumber(pendingRequests.length + pendingTransfers.length, language)} onClick={() => onNavigateModule("employees")} />
            <QueueRow icon={<Receipt className="h-4 w-4" />} iconTone="bg-warning-soft text-warning" title={t("dash.action.expenses")} subtitle={formatCurrencySAR(pendingExpenseTotal)} value={formatNumber(pendingExpenses.length, language)} onClick={() => onNavigateModule("expenses")} />
            {canViewFinancials && <QueueRow icon={<WalletCards className="h-4 w-4" />} iconTone="bg-accent-soft text-accent" title={t("dash.action.financials")} subtitle={formatCurrencySAR(pendingInvoiceTotal + pendingPaymentTotal)} value={formatNumber(pendingInvoices.length + pendingPayments.length, language)} onClick={() => onNavigateModule("accounts")} />}
          </div>
          {!openActionCount && !pendingInvoices.length && !pendingPayments.length && <div className="mt-3 flex items-center gap-2 rounded-xl bg-success-soft p-3 text-dynamic-xs font-semibold text-success"><CheckCircle2 className="h-4 w-4" />{t("dash.premium.all_clear")}</div>}
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <article className="rounded-3xl bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><FileClock className="h-5 w-5 text-danger" /><h2 className="text-dynamic-base font-bold text-foreground">{t("dash.premium.renewals_title")}</h2></div></div><span className="rounded-xl bg-danger-soft px-3 py-2 text-dynamic-sm font-bold text-danger tabular-nums">{formatNumber(DASHBOARD_BLUEPRINT_DATA.expiring90DaysCount, language)}</span></div>
          {expiringEmployees.length ? <div className="mt-4 divide-y divide-theme">{expiringEmployees.map((employee) => { const critical = employee.daysUntilExpiry <= 30; return <button key={employee.id} type="button" onClick={() => onNavigateModule("employees")} className="flex w-full items-center gap-3 py-3 text-start hover:bg-surface-elevated"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${critical ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}><FileClock className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-dynamic-xs font-bold text-foreground">{localize(employee.name)}</span><span className="mt-0.5 block truncate text-dynamic-xs text-muted">{localize(employee.department)} · {fullDate(employee.idExpiryDateGregorian, language)}</span></span><span className={`shrink-0 rounded-full px-2.5 py-1 text-dynamic-xs font-bold ${critical ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}>{formatNumber(employee.daysUntilExpiry, language)} {t("emp.days_remaining")}</span></button>; })}</div> : <p className="mt-4 rounded-xl bg-success-soft p-3 text-dynamic-xs font-semibold text-success">{t("dash.premium.no_renewals")}</p>}
          {hasPermission("route:employees") && <button type="button" onClick={() => onNavigateModule("employees")} className="mt-2 inline-flex items-center gap-1 text-dynamic-xs font-semibold text-primary hover:underline">{t("dash.workflow.view_people")}<ArrowUpRight className="h-3.5 w-3.5" /></button>}
        </article>

        {canViewPayroll ? (
          <article className="rounded-3xl bg-surface p-5 shadow-card">
            <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /><h2 className="text-dynamic-base font-bold text-foreground">{t("dash.premium.financial_title")}</h2></div></div><span className="rounded-xl bg-primary-soft px-3 py-2 text-dynamic-xs font-bold text-primary">{currentPeriod}</span></div>
            <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-surface-elevated p-3"><p className="text-dynamic-xs text-muted">{t("dash.kpi.payroll")}</p><p className="mt-1 text-dynamic-lg font-bold text-foreground tabular-nums">{compactCurrency(monthlyPayroll, language)}</p><p className="mt-1 text-dynamic-xs text-muted">{t("dash.premium.gross_snapshot")}</p></div><div className="rounded-xl bg-surface-elevated p-3"><p className="text-dynamic-xs text-muted">{t("dash.kpi.gosi_pool")}</p><p className="mt-1 text-dynamic-lg font-bold text-foreground tabular-nums">{compactCurrency(DASHBOARD_BLUEPRINT_DATA.monthlyGosiPoolSar, language)}</p><p className="mt-1 text-dynamic-xs text-muted">{t("dash.premium.employer_pool")}</p></div></div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-surface-elevated p-3"><span className="text-dynamic-xs text-muted">{t("dash.premium.pending_financials")}</span><span className="text-dynamic-sm font-bold text-foreground tabular-nums">{formatCurrencySAR(pendingInvoiceTotal + pendingPaymentTotal)}</span></div>
            {hasPermission("route:accounts") && <button type="button" onClick={() => onNavigateModule("accounts")} className="mt-3 inline-flex items-center gap-1 text-dynamic-xs font-semibold text-primary hover:underline">{t("dash.workflow.view_accounts")}<ArrowUpRight className="h-3.5 w-3.5" /></button>}
          </article>
        ) : (
          <article className="rounded-3xl bg-surface p-5 shadow-card">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-success" /><h2 className="text-dynamic-base font-bold text-foreground">{t("dash.premium.saudization_title")}</h2></div>
            <div className="mt-5 flex items-end justify-between gap-3"><p className="text-dynamic-3xl font-bold tracking-tight text-foreground tabular-nums">{formatNumber(DASHBOARD_BLUEPRINT_DATA.overallSaudizationPercent, language, 1)}%</p><TrendBadge text={changeText(DASHBOARD_BLUEPRINT_DATA.overallSaudizationPercent - DASHBOARD_PREVIOUS_SNAPSHOT_DATA.saudizationPercent, language, ` ${t("dash.compare.pp")}`)} tone="positive" label={positiveLabel} /></div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-elevated"><div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${Math.min(100, DASHBOARD_BLUEPRINT_DATA.overallSaudizationPercent)}%` }} /></div>
            <div className="mt-2 flex justify-between text-dynamic-xs text-muted"><span>{t("dash.premium.current_rate")}</span><span>{t("dash.premium.target")}: 40%</span></div>
          </article>
        )}
      </section>
      <div className="flex items-center gap-2 border-t border-theme pt-3 text-dynamic-xs text-muted"><CheckCircle2 className="h-4 w-4 text-success" /><span>{t("dash.premium.as_of")} {fullDate(latestAttendanceDate, language)} · {t("role.short." + currentRole)}</span></div>
    </div>
  );
};
