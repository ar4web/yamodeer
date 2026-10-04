import type { EmployeeRecordBlueprint } from "@/data/mockBlueprints";
import type { AttendanceRecord, AttendanceStatus } from "@/data/workspaceBlueprints";

export interface DepartmentWorkforceMetric {
  code: string;
  label: EmployeeRecordBlueprint["department"];
  total: number;
  saudiCount: number;
  expatCount: number;
}

export interface WorkforceSnapshot {
  employees: EmployeeRecordBlueprint[];
  total: number;
  saudiCount: number;
  expatCount: number;
  onLeaveCount: number;
  saudiSharePercent: number | null;
  departments: DepartmentWorkforceMetric[];
}

export interface AttendanceSnapshot {
  latestDate: string | null;
  workforceCount: number;
  recordedCount: number;
  attendedCount: number;
  statusCounts: Record<AttendanceStatus, number>;
}

export interface ExpiringEmployeeRecord {
  employee: EmployeeRecordBlueprint;
  daysRemaining: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const parseIsoDateDay = (value: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return Math.floor(date.getTime() / DAY_MS);
};

const localDateDay = (date: Date): number =>
  Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);

export const getDaysUntilDate = (value: string, asOf: Date = new Date()): number | null => {
  const targetDay = parseIsoDateDay(value);
  return targetDay === null ? null : targetDay - localDateDay(asOf);
};

export const buildWorkforceSnapshot = (
  employees: EmployeeRecordBlueprint[]
): WorkforceSnapshot => {
  // Employees on leave remain part of the workforce; suspended records do not.
  const workforce = employees.filter((employee) => employee.status !== "SUSPENDED");
  const saudiCount = workforce.filter((employee) => employee.isSaudiNational).length;
  const onLeaveCount = workforce.filter((employee) => employee.status === "ON_LEAVE").length;
  const grouped = new Map<string, DepartmentWorkforceMetric>();

  for (const employee of workforce) {
    const code = employee.departmentCode?.trim() || "UNASSIGNED";
    const current = grouped.get(code) ?? {
      code,
      label: employee.department,
      total: 0,
      saudiCount: 0,
      expatCount: 0
    };
    current.total += 1;
    if (employee.isSaudiNational) current.saudiCount += 1;
    else current.expatCount += 1;
    grouped.set(code, current);
  }

  const departments = [...grouped.values()].sort(
    (left, right) => right.total - left.total || left.code.localeCompare(right.code)
  );

  return {
    employees: workforce,
    total: workforce.length,
    saudiCount,
    expatCount: workforce.length - saudiCount,
    onLeaveCount,
    saudiSharePercent: workforce.length ? (saudiCount / workforce.length) * 100 : null,
    departments
  };
};

export const buildAttendanceSnapshot = (
  records: AttendanceRecord[],
  workforce: EmployeeRecordBlueprint[]
): AttendanceSnapshot => {
  const workforceIds = new Set(
    workforce
      .filter((employee) => employee.status !== "SUSPENDED")
      .map((employee) => employee.id)
  );
  const relevantRecords = records.filter(
    (record) => workforceIds.has(record.employeeId) && parseIsoDateDay(record.date) !== null
  );
  const latestDate = relevantRecords.reduce<string | null>(
    (latest, record) => !latest || record.date > latest ? record.date : latest,
    null
  );
  const byEmployee = new Map<string, AttendanceRecord>();

  // The current attendance interface is one status per employee per day. If
  // duplicate rows arrive, keep the last supplied row instead of double-counting.
  for (const record of relevantRecords) {
    if (record.date === latestDate) byEmployee.set(record.employeeId, record);
  }

  const statusCounts: Record<AttendanceStatus, number> = {
    PRESENT: 0,
    LATE: 0,
    REMOTE: 0,
    ABSENT: 0
  };
  for (const record of byEmployee.values()) statusCounts[record.status] += 1;

  return {
    latestDate,
    workforceCount: workforceIds.size,
    recordedCount: byEmployee.size,
    attendedCount: statusCounts.PRESENT + statusCounts.LATE + statusCounts.REMOTE,
    statusCounts
  };
};

export const getRenewalAttentionRecords = (
  employees: EmployeeRecordBlueprint[],
  asOf: Date = new Date(),
  dueWithinDays = 90
): ExpiringEmployeeRecord[] => {
  const today = localDateDay(asOf);
  return employees
    .filter((employee) => employee.status !== "SUSPENDED")
    .flatMap((employee) => {
      const expiryDay = parseIsoDateDay(employee.idExpiryDateGregorian);
      if (expiryDay === null) return [];
      const daysRemaining = expiryDay - today;
      // Keep overdue records visible as well as renewals coming up within 90 days.
      if (daysRemaining > dueWithinDays) return [];
      return [{ employee, daysRemaining }];
    })
    .sort(
      (left, right) => left.daysRemaining - right.daysRemaining ||
        left.employee.id.localeCompare(right.employee.id)
    );
};
