import React, { useMemo } from "react";
import { Building2, FileSpreadsheet, ShieldCheck, Wallet } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { calculateGosiContributions, EmployeeRecordBlueprint } from "@/data/mockBlueprints";
import { DataTableFrame, HorizontalBarChart, MetricCard, surfaceClassName } from "@/components/DesignSystem";

export const EmployeePayrollModule: React.FC<{
  employees: EmployeeRecordBlueprint[];
}> = ({ employees }) => {
  const { t, localize, formatCurrencySAR } = useLanguage();

  const payrollRows = useMemo(
    () =>
      employees.map((employee) => {
        const gross = employee.basicSalarySar + employee.housingAllowanceSar + employee.transportAllowanceSar;
        const gosi = calculateGosiContributions(
          employee.isSaudiNational,
          employee.basicSalarySar,
          employee.housingAllowanceSar
        );
        return { employee, gross, gosi, net: gross - gosi.employeeDeductionSar };
      }),
    [employees]
  );

  const activePayrollRows = payrollRows.filter((row) => row.employee.status === "ACTIVE");
  const payrollTotals = activePayrollRows.reduce(
    (totals, row) => ({
      gross: totals.gross + row.gross,
      net: totals.net + row.net,
      employeeGosi: totals.employeeGosi + row.gosi.employeeDeductionSar,
      employerGosi: totals.employerGosi + row.gosi.employerContributionSar
    }),
    { gross: 0, net: 0, employeeGosi: 0, employerGosi: 0 }
  );
  const payrollByDepartment = Array.from(
    activePayrollRows.reduce((groups, row) => {
      const current = groups.get(row.employee.departmentCode) || {
        label: localize(row.employee.department),
        value: 0
      };
      current.value += row.gross;
      groups.set(row.employee.departmentCode, current);
      return groups;
    }, new Map<string, { label: string; value: number }>()).values()
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-dynamic-lg font-semibold text-foreground">{t("emp.payroll.heading")}</h2>

        </div>
        <span className="rounded-lg bg-surface-elevated px-2.5 py-1 text-dynamic-xs font-semibold text-muted">{t("app.badge.pdpl")}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("emp.payroll.metric.gross")} value={formatCurrencySAR(payrollTotals.gross)} icon={<Wallet className="h-5 w-5" />} tone="primary" />
        <MetricCard label={t("emp.payroll.metric.net")} value={formatCurrencySAR(payrollTotals.net)} icon={<FileSpreadsheet className="h-5 w-5" />} tone="success" />
        <MetricCard label={t("emp.payroll.metric.employee_gosi")} value={formatCurrencySAR(payrollTotals.employeeGosi)} icon={<ShieldCheck className="h-5 w-5" />} tone="warning" />
        <MetricCard label={t("emp.payroll.metric.employer_gosi")} value={formatCurrencySAR(payrollTotals.employerGosi)} icon={<Building2 className="h-5 w-5" />} tone="accent" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section className={`xl:col-span-4 ${surfaceClassName} p-4 space-y-4`}>
          <h3 className="text-dynamic-base font-semibold text-foreground">{t("dash.chart.payroll_by_department")}</h3>
          <HorizontalBarChart
            data={payrollByDepartment.map((item, index) => ({ ...item, tone: (["primary", "accent", "success", "warning"] as const)[index % 4] }))}
            valueFormatter={formatCurrencySAR}
          />
        </section>
        <div className="xl:col-span-8 min-w-0">
          <DataTableFrame title={t("emp.payroll.table.title")} count={activePayrollRows.length} countLabel={t("ui.records")}>
            <table className="min-w-[900px] w-full border-collapse text-start">
              <thead>
                <tr className="bg-surface-elevated border-b border-theme text-muted text-dynamic-xs">
                  <th className="py-3 ps-4 pe-3 text-start font-bold">{t("emp.payroll.col.employee")}</th>
                  <th className="py-3 px-3 text-start font-bold">{t("emp.payroll.col.department")}</th>
                  <th className="py-3 px-3 text-end font-bold">{t("emp.payroll.col.gross")}</th>
                  <th className="py-3 px-3 text-end font-bold">{t("emp.payroll.col.employee_gosi")}</th>
                  <th className="py-3 px-3 text-end font-bold">{t("emp.payroll.col.employer_gosi")}</th>
                  <th className="py-3 ps-3 pe-4 text-end font-bold">{t("emp.payroll.col.net")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {activePayrollRows.map(({ employee, gross, gosi, net }) => (
                  <tr key={employee.id} className="hover:bg-primary-soft/20">
                    <td className="py-3 ps-4 pe-3"><div className="text-dynamic-xs font-semibold text-foreground">{localize(employee.name)}</div><div className="font-mono text-dynamic-xs text-muted">{employee.id}</div></td>
                    <td className="py-3 px-3 text-dynamic-xs text-muted">{localize(employee.department)}</td>
                    <td className="py-3 px-3 text-end font-mono text-dynamic-xs text-foreground">{formatCurrencySAR(gross)}</td>
                    <td className="py-3 px-3 text-end font-mono text-dynamic-xs text-danger-text">{formatCurrencySAR(gosi.employeeDeductionSar)}</td>
                    <td className="py-3 px-3 text-end font-mono text-dynamic-xs text-muted">{formatCurrencySAR(gosi.employerContributionSar)}</td>
                    <td className="py-3 ps-3 pe-4 text-end font-mono text-dynamic-xs font-bold text-primary-text">{formatCurrencySAR(net)}</td>
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
