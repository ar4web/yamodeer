import React, { useMemo } from "react";
import { Eye } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { EmployeeRecordBlueprint, EmployeeStatus } from "@/data/mockBlueprints";
import { DataTableFrame, secondaryButtonClass } from "@/components/DesignSystem";

type EmployeeSortColumn = "NAME" | "DEPARTMENT" | "EXPIRY";
type EmployeeSortKey = `${EmployeeSortColumn}_ASC` | `${EmployeeSortColumn}_DESC`;

type EmployeeDirectoryColumn = {
  key: string;
  label: string;
  width: number;
  alignment: "start" | "end";
  render: (employee: EmployeeRecordBlueprint) => React.ReactNode;
  sortColumn?: EmployeeSortColumn;
};

const getEmployeeSortLabelKey = (sort: EmployeeSortKey): string => {
  switch (sort) {
    case "NAME_ASC": return "ui.sort.name_asc";
    case "NAME_DESC": return "ui.sort.name_desc";
    case "DEPARTMENT_ASC": return "ui.sort.department_asc";
    case "DEPARTMENT_DESC": return "ui.sort.department_desc";
    case "EXPIRY_ASC": return "ui.sort.expiry_asc";
    case "EXPIRY_DESC": return "ui.sort.expiry_desc";
  }
};

const getEmployeeStatusClassName = (status: EmployeeStatus): string => {
  if (status === "ACTIVE") return "bg-success-soft text-success-text";
  if (status === "ON_LEAVE") return "bg-warning-soft text-warning-text";
  return "bg-danger-soft text-danger-text";
};

const getDocumentExpiryPresentation = (daysUntilExpiry: number) => {
  if (daysUntilExpiry <= 30) {
    return { labelKey: "emp.expiry.critical", className: "bg-danger-soft text-danger-text" };
  }
  if (daysUntilExpiry <= 90) {
    return { labelKey: "emp.expiry.warning", className: "bg-warning-soft text-warning-text" };
  }
  return { labelKey: "emp.expiry.compliant", className: "bg-success-soft text-success-text" };
};

const formatEmployeeDirectoryDate = (value: string, isRtl: boolean): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return new Intl.DateTimeFormat(isRtl ? "ar-SA" : "en-GB", {
    calendar: "gregory",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
};

export const EmployeeDirectoryModule: React.FC<{
  employees: EmployeeRecordBlueprint[];
  canManageDirectory: boolean;
  canViewPayroll: boolean;
  sortBy: EmployeeSortKey;
  onToggleSort: (column: EmployeeSortColumn) => void;
  onViewDossier: (employeeId: string) => void;
  tableDescription: string;
}> = ({ employees, canManageDirectory, canViewPayroll, sortBy, onToggleSort, onViewDossier, tableDescription }) => {
  const { t, localize, formatCurrencySAR, direction } = useLanguage();

  const employeeDirectoryColumns = useMemo<EmployeeDirectoryColumn[]>(() => [
    {
      key: "employee_name",
      label: t("emp.table.employee_name"),
      width: 210,
      alignment: "start",
      sortColumn: "NAME",
      render: (employee) => <span className="font-semibold text-foreground">{localize(employee.name)}</span>
    },
    {
      key: "employee_number",
      label: t("emp.directory.employee_number"),
      width: 135,
      alignment: "start",
      render: (employee) => <bdi dir="ltr" className="font-mono tabular-nums text-foreground">{employee.id}</bdi>
    },
    {
      key: "job_title",
      label: t("emp.col.job_title"),
      width: 190,
      alignment: "start",
      render: (employee) => <span className="break-words text-foreground">{localize(employee.jobTitle)}</span>
    },
    {
      key: "department",
      label: t("emp.col.department"),
      width: 165,
      alignment: "start",
      sortColumn: "DEPARTMENT",
      render: (employee) => <span className="break-words text-foreground">{localize(employee.department)}</span>
    },
    {
      key: "department_code",
      label: t("emp.col.department_code"),
      width: 120,
      alignment: "start",
      render: (employee) => <bdi dir="ltr" className="font-mono text-dynamic-xs text-foreground">{employee.departmentCode || "—"}</bdi>
    },
    {
      key: "location",
      label: t("emp.col.location"),
      width: 150,
      alignment: "start",
      render: (employee) => <span className="break-words text-foreground">{localize(employee.location)}</span>
    },
    {
      key: "employment_status",
      label: t("emp.col.employment_status"),
      width: 130,
      alignment: "start",
      render: (employee) => <span className={`inline-flex whitespace-nowrap px-2 py-1 text-dynamic-xs font-semibold ${getEmployeeStatusClassName(employee.status)}`}>{t(`emp.status.${employee.status}`)}</span>
    },
    {
      key: "nationality",
      label: t("emp.col.nationality"),
      width: 135,
      alignment: "start",
      render: (employee) => <span className="break-words text-foreground">{localize(employee.nationalityLabel)}</span>
    },
    {
      key: "employee_category",
      label: t("emp.col.employee_category"),
      width: 145,
      alignment: "start",
      render: (employee) => <span className="whitespace-nowrap text-foreground">{t(employee.isSaudiNational ? "emp.category.saudi" : "emp.category.expat")}</span>
    },
    {
      key: "national_id_iqama",
      label: t("emp.import.field.national_id"),
      width: 155,
      alignment: "start",
      render: (employee) => <bdi dir="ltr" className="font-mono tabular-nums text-foreground">{employee.nationalIdOrIqama || "—"}</bdi>
    },
    {
      key: "expiry_gregorian",
      label: t("emp.import.field.expiry_gregorian"),
      width: 150,
      alignment: "start",
      sortColumn: "EXPIRY",
      render: (employee) => <time dateTime={employee.idExpiryDateGregorian} dir="ltr" className="whitespace-nowrap font-mono tabular-nums text-foreground">{formatEmployeeDirectoryDate(employee.idExpiryDateGregorian, direction === "rtl")}</time>
    },
    {
      key: "expiry_hijri",
      label: t("emp.import.field.expiry_hijri"),
      width: 145,
      alignment: "start",
      render: (employee) => <bdi dir="ltr" className="font-mono tabular-nums text-foreground">{employee.idExpiryDateHijri || "—"}</bdi>
    },
    {
      key: "days_to_expiry",
      label: t("emp.col.days_to_expiry"),
      width: 110,
      alignment: "end",
      render: (employee) => <bdi dir="ltr" className="font-mono tabular-nums text-foreground">{new Intl.NumberFormat(direction === "rtl" ? "ar-SA" : "en-US").format(employee.daysUntilExpiry)}</bdi>
    },
    {
      key: "expiry_status",
      label: t("emp.col.expiry_status"),
      width: 145,
      alignment: "start",
      render: (employee) => {
        const expiry = getDocumentExpiryPresentation(employee.daysUntilExpiry);
        return <span className={`inline-flex whitespace-nowrap px-2 py-1 text-dynamic-xs font-semibold ${expiry.className}`}>{t(expiry.labelKey)}</span>;
      }
    },
    {
      key: "nitaqat_band",
      label: t("emp.import.field.nitaqat_band"),
      width: 135,
      alignment: "start",
      render: (employee) => <span className="whitespace-nowrap text-foreground">{t(`nitaqat.${employee.nitaqatClass}`)}</span>
    },
    {
      key: "gosi_number",
      label: t("emp.import.field.gosi_number"),
      width: 155,
      alignment: "start",
      render: (employee) => <bdi dir="ltr" className="font-mono tabular-nums text-foreground">{employee.gosiNumber || "—"}</bdi>
    },
    {
      key: "qiwa_contract",
      label: t("emp.import.field.qiwa_contract"),
      width: 155,
      alignment: "start",
      render: (employee) => <bdi dir="ltr" className="font-mono tabular-nums text-foreground">{employee.qiwaContractId || "—"}</bdi>
    },
    ...(canViewPayroll ? [
      {
        key: "basic_salary",
        label: t("emp.import.field.basic_salary"),
        width: 145,
        alignment: "end" as const,
        render: (employee: EmployeeRecordBlueprint) => <span dir={direction === "rtl" ? "rtl" : "ltr"} className="whitespace-nowrap font-mono tabular-nums text-foreground">{formatCurrencySAR(employee.basicSalarySar)}</span>
      },
      {
        key: "housing_allowance",
        label: t("emp.import.field.housing"),
        width: 155,
        alignment: "end" as const,
        render: (employee: EmployeeRecordBlueprint) => <span dir={direction === "rtl" ? "rtl" : "ltr"} className="whitespace-nowrap font-mono tabular-nums text-foreground">{formatCurrencySAR(employee.housingAllowanceSar)}</span>
      },
      {
        key: "transport_allowance",
        label: t("emp.import.field.transport"),
        width: 155,
        alignment: "end" as const,
        render: (employee: EmployeeRecordBlueprint) => <span dir={direction === "rtl" ? "rtl" : "ltr"} className="whitespace-nowrap font-mono tabular-nums text-foreground">{formatCurrencySAR(employee.transportAllowanceSar)}</span>
      },
      {
        key: "total_package",
        label: t("emp.col.total_package"),
        width: 175,
        alignment: "end" as const,
        render: (employee: EmployeeRecordBlueprint) => <span dir={direction === "rtl" ? "rtl" : "ltr"} className="whitespace-nowrap font-mono font-semibold tabular-nums text-foreground">{formatCurrencySAR(employee.basicSalarySar + employee.housingAllowanceSar + employee.transportAllowanceSar)}</span>
      },
      {
        key: "iban",
        label: t("emp.import.field.iban"),
        width: 225,
        alignment: "start" as const,
        render: (employee: EmployeeRecordBlueprint) => <bdi dir="ltr" className="font-mono tabular-nums text-foreground">{employee.ibanNumber || "—"}</bdi>
      }
    ] : []),
    {
      key: "laptop_asset",
      label: t("emp.col.asset_laptop"),
      width: 165,
      alignment: "start",
      render: (employee) => <bdi dir="ltr" className="font-mono text-foreground">{employee.allocatedAssets.laptopTag || "—"}</bdi>
    },
    {
      key: "access_badge",
      label: t("emp.col.access_badge"),
      width: 155,
      alignment: "start",
      render: (employee) => <bdi dir="ltr" className="font-mono text-foreground">{employee.allocatedAssets.smartBadgeId || "—"}</bdi>
    },
    {
      key: "corporate_sim",
      label: t("emp.col.corporate_sim"),
      width: 145,
      alignment: "start",
      render: (employee) => <bdi dir="ltr" className="font-mono text-foreground">{employee.allocatedAssets.corporateSim || "—"}</bdi>
    },
    {
      key: "details",
      label: t("emp.col.details"),
      width: 135,
      alignment: "end",
      render: (employee) => (
        <button
          type="button"
          onClick={() => onViewDossier(employee.id)}
          title={`${t("emp.btn.view_details")} ${localize(employee.name)}`}
          aria-label={`${t("emp.btn.view_details")} ${localize(employee.name)}`}
          className={`${secondaryButtonClass} min-h-9 gap-1.5 px-3 py-1.5 text-dynamic-xs`}
        >
          <Eye className="h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />
          <span className="whitespace-nowrap">{t("emp.btn.view_details")}</span>
        </button>
      )
    }
  ], [t, localize, formatCurrencySAR, direction, canViewPayroll, onViewDossier]);

  const employeeDirectoryTableWidth = employeeDirectoryColumns.reduce((total, column) => total + column.width, 0);
  const columnCount = employeeDirectoryColumns.length;

  return (
    <DataTableFrame
      title={t("emp.table.title")}
      description={tableDescription}
      count={employees.length}
      countLabel={t("ui.records")}
      scrollRegionClassName="max-h-[70vh] overflow-y-auto"
    >
      <table
        style={{ minWidth: `${employeeDirectoryTableWidth}px` }}
        className="w-full table-fixed border-collapse text-start"
      >
        <caption className="sr-only">{t("emp.table.caption")}</caption>
        <colgroup>
          {employeeDirectoryColumns.map((column) => (
            <col key={column.key} style={{ width: `${column.width}px` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="text-dynamic-xs font-semibold text-muted">
            {employeeDirectoryColumns.map((column) => {
              const isSorted = column.sortColumn !== undefined && sortBy.startsWith(`${column.sortColumn}_`);
              const nextSort = column.sortColumn
                ? (sortBy === `${column.sortColumn}_ASC` ? `${column.sortColumn}_DESC` : `${column.sortColumn}_ASC`) as EmployeeSortKey
                : undefined;
              const isStickyNameColumn = column.key === "employee_name";
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={isSorted ? (sortBy.endsWith("_ASC") ? "ascending" : "descending") : undefined}
                  className={`sticky top-0 border border-theme bg-surface-elevated px-3 py-2.5 align-bottom ${column.alignment === "end" ? "text-end" : "text-start"} ${isStickyNameColumn ? "start-0 z-30" : "z-20"}`}
                >
                  {column.sortColumn && nextSort ? (
                    <button
                      type="button"
                      onClick={() => onToggleSort(column.sortColumn!)}
                      aria-label={`${t("ui.sort_by")}: ${t(getEmployeeSortLabelKey(nextSort))}`}
                      className="inline-flex min-h-9 w-full items-center justify-between gap-2 text-start font-semibold transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    >
                      <span>{column.label}</span>
                      <span aria-hidden="true" className="shrink-0 font-mono text-dynamic-sm">
                        {sortBy === `${column.sortColumn}_ASC` ? "↑" : sortBy === `${column.sortColumn}_DESC` ? "↓" : "↕"}
                      </span>
                    </button>
                  ) : (
                    <span className="block min-h-9">{column.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id} className="group transition-colors hover:bg-primary-soft/30">
              {employeeDirectoryColumns.map((column) => {
                const isEmployeeRowHeader = column.key === "employee_name";
                const cellClassName = `border border-theme px-3 py-2.5 align-middle text-dynamic-xs ${column.alignment === "end" ? "text-end" : "text-start"} ${isEmployeeRowHeader ? "sticky start-0 z-10 bg-surface group-hover:bg-primary-soft/30" : ""}`;
                return isEmployeeRowHeader ? (
                  <th key={column.key} scope="row" className={`${cellClassName} font-semibold`}>
                    {column.render(employee)}
                  </th>
                ) : (
                  <td key={column.key} className={cellClassName}>
                    {column.render(employee)}
                  </td>
                );
              })}
            </tr>
          ))}
          {employees.length === 0 && (
            <tr>
              <td colSpan={columnCount} role="status" aria-live="polite" className="border border-theme px-5 py-8 text-center text-dynamic-sm text-muted">
                {t("ui.no_results")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </DataTableFrame>
  );
};
