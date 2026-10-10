import React, { useMemo } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, MapPin, Navigation, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useOperations } from "@/context/OperationsContext";
import { useCurrentRole, useRBACGeofence } from "@/context/RBACGeofenceContext";
import { EmployeeRecordBlueprint } from "@/data/mockBlueprints";
import { DataTableFrame, HorizontalBarChart, MetricCard, secondaryButtonClass, surfaceClassName } from "@/components/DesignSystem";

export const EmployeeAttendanceModule: React.FC<{
  employees: EmployeeRecordBlueprint[];
}> = ({ employees }) => {
  const { t, localize } = useLanguage();
  const { hasPermission } = useCurrentRole();
  const {
    setGeofenceModalOpen,
    activeOffice,
    capturedCoords,
    calculatedDistanceMeters,
    verificationStatus,
    isClockedIn
  } = useRBACGeofence();
  const isGeoVerified = verificationStatus === "VERIFIED_INSIDE_ZONE";
  const { attendanceRecords } = useOperations();

  const attendanceForEmployees = useMemo(
    () =>
      attendanceRecords
        .map((record) => ({
          record,
          employee: employees.find((item) => item.id === record.employeeId)
        }))
        .filter((row): row is { record: typeof attendanceRecords[number]; employee: EmployeeRecordBlueprint } => !!row.employee),
    [attendanceRecords, employees]
  );

  const attendanceCounts = {
    PRESENT: attendanceForEmployees.filter(({ record }) => record.status === "PRESENT").length,
    LATE: attendanceForEmployees.filter(({ record }) => record.status === "LATE").length,
    ABSENT: attendanceForEmployees.filter(({ record }) => record.status === "ABSENT").length,
    REMOTE: attendanceForEmployees.filter(({ record }) => record.status === "REMOTE").length
  };
  const attendanceRate = attendanceForEmployees.length
    ? Math.round(((attendanceCounts.PRESENT + attendanceCounts.LATE + attendanceCounts.REMOTE) / attendanceForEmployees.length) * 100)
    : 0;
  const attendanceChart = [
    { label: t("emp.attendance.status.PRESENT"), value: attendanceCounts.PRESENT, tone: "success" as const },
    { label: t("emp.attendance.status.LATE"), value: attendanceCounts.LATE, tone: "warning" as const },
    { label: t("emp.attendance.status.REMOTE"), value: attendanceCounts.REMOTE, tone: "accent" as const },
    { label: t("emp.attendance.status.ABSENT"), value: attendanceCounts.ABSENT, tone: "danger" as const }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-dynamic-lg font-semibold text-foreground">{t("emp.attendance.heading")}</h2>
      {hasPermission("self_service:geofence_punch") && (
        <section className={`${surfaceClassName} space-y-4 p-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-dynamic-base font-semibold text-foreground">{t("shell.geofence_status")}</h3>
                <p className="text-dynamic-xs text-muted">{localize(activeOffice.city)}</p>
              </div>
            </div>
            <span role="status" className={`inline-flex items-center gap-2 text-dynamic-xs font-semibold ${isGeoVerified ? "text-success-text" : "text-warning-text"}`}>
              <span className={`h-2 w-2 rounded-full ${isGeoVerified ? "bg-success" : "bg-warning"}`} aria-hidden="true" />
              {t(isGeoVerified ? "shell.location_verified" : "shell.location_review")}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="min-w-0 rounded-md border border-theme bg-surface-elevated px-3 py-2.5">
              <span className="block text-dynamic-xs text-muted">{t("geo.distance")}</span>
              <span className="mt-1 block truncate font-mono text-dynamic-base font-semibold tabular-nums text-foreground">{calculatedDistanceMeters}m</span>
            </div>
            <div className="min-w-0 rounded-md border border-theme bg-surface-elevated px-3 py-2.5">
              <span className="block text-dynamic-xs text-muted">{t("geo.accuracy")}</span>
              <span className={`mt-1 block font-mono text-dynamic-base font-semibold tabular-nums ${capturedCoords.accuracyMeters > 15 ? "text-warning-text" : "text-foreground"}`}>±{capturedCoords.accuracyMeters}m</span>
            </div>
            <div className="min-w-0 rounded-md border border-theme bg-surface-elevated px-3 py-2.5">
              <span className="block text-dynamic-xs text-muted">{t("emp.attendance.col.status")}</span>
              <span className="mt-1 flex items-center gap-2 font-mono text-dynamic-base font-semibold text-foreground">
                <Navigation className="h-4 w-4" aria-hidden="true" />
                {t(isClockedIn ? "shell.clocked_in_badge" : "shell.clock_in_btn")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setGeofenceModalOpen(true)}
              className={secondaryButtonClass}
            >
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              <span>{t("emp.attendance.open_geofence")}</span>
            </button>
          </div>
        </section>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("emp.attendance.metric.rate")} value={`${attendanceRate}%`} icon={<CalendarClock className="h-5 w-5" />} tone="primary" />
        <MetricCard label={t("emp.attendance.metric.present")} value={attendanceCounts.PRESENT + attendanceCounts.REMOTE} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <MetricCard label={t("emp.attendance.metric.late")} value={attendanceCounts.LATE} icon={<AlertTriangle className="h-5 w-5" />} tone="warning" />
        <MetricCard label={t("emp.attendance.metric.absent")} value={attendanceCounts.ABSENT} icon={<X className="h-5 w-5" />} tone="danger" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section className={`xl:col-span-4 ${surfaceClassName} p-4 space-y-4`}>
          <h3 className="text-dynamic-base font-semibold text-foreground">{t("dash.chart.attendance_mix")}</h3>
          <HorizontalBarChart data={attendanceChart} />
        </section>
        <div className="xl:col-span-8 min-w-0">
          <DataTableFrame title={t("emp.attendance.table.title")} count={attendanceForEmployees.length} countLabel={t("ui.records")}>
            <table className="min-w-[720px] w-full border-collapse text-start">
              <thead><tr className="bg-surface-elevated border-b border-theme text-muted text-dynamic-xs">
                <th className="py-3 ps-4 pe-3 text-start font-bold">{t("emp.attendance.col.employee")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("emp.attendance.col.status")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("emp.attendance.col.check_in")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("emp.attendance.col.check_out")}</th>
                <th className="py-3 ps-3 pe-4 text-start font-bold">{t("emp.attendance.col.date")}</th>
              </tr></thead>
              <tbody className="divide-y divide-theme">
                {attendanceForEmployees.map(({ record, employee }) => (
                  <tr key={`${record.employeeId}-${record.date}`} className="hover:bg-primary-soft/20">
                    <td className="py-3 ps-4 pe-3 text-dynamic-xs font-semibold text-foreground">{localize(employee.name)}</td>
                    <td className="py-3 px-3"><span className={`rounded-full px-2.5 py-1 text-dynamic-xs font-semibold ${record.status === "PRESENT" ? "bg-success-soft text-success-text" : record.status === "LATE" ? "bg-warning-soft text-warning-text" : record.status === "ABSENT" ? "bg-danger-soft text-danger-text" : "bg-accent-soft text-accent-text"}`}>{t(`emp.attendance.status.${record.status}`)}</span></td>
                    <td className="py-3 px-3 font-mono text-dynamic-xs text-foreground">{record.checkIn || "—"}</td>
                    <td className="py-3 px-3 font-mono text-dynamic-xs text-foreground">{record.checkOut || "—"}</td>
                    <td className="py-3 ps-3 pe-4 font-mono text-dynamic-xs text-muted">{record.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableFrame>
        </div>
      </div>
    </div>
  );
};
