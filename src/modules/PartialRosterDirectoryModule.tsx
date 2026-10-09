import React, { useMemo, useState } from "react";
import { Building2, CircleAlert, FileUp, Info, Search, Users } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formControlClassName, PageHeader, primaryButtonClass, surfaceClassName } from "@/components/DesignSystem";
import type { PartialEmployeeRosterRecord } from "@/services/rosterImport";

interface PartialRosterDirectoryModuleProps {
  records: PartialEmployeeRosterRecord[];
  globalSearchQuery?: string;
}

const statusTone = (status: PartialEmployeeRosterRecord["status"]): string => {
  if (status === "ACTIVE") return "bg-success-soft text-success-text";
  if (status === "ON_LEAVE") return "bg-warning-soft text-warning-text";
  return "bg-surface-muted text-muted";
};

const interpolate = (template: string, values: Record<string, number | string>): string =>
  Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);

export const PartialRosterDirectoryModule: React.FC<PartialRosterDirectoryModuleProps> = ({
  records,
  globalSearchQuery = ""
}) => {
  const { t, formatCurrencySAR, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const companies = useMemo(
    () => [...new Set(records.map((record) => record.company))].sort((left, right) => left.localeCompare(right)),
    [records]
  );
  const filteredRecords = useMemo(() => {
    const searchTerms = [globalSearchQuery, searchQuery]
      .flatMap((query) => query.toLocaleLowerCase().split(/\s+/))
      .filter(Boolean);
    return records.filter((record) => {
      if (companyFilter !== "ALL" && record.company !== companyFilter) return false;
      if (statusFilter !== "ALL" && record.status !== statusFilter) return false;
      const searchHaystack = [
        record.employeeId,
        record.company,
        record.nameEn,
        record.nameAr,
        record.nationality,
        record.nationalIdOrIqama,
        record.departmentCode,
        record.jobTitle,
        String(record.basicSalarySar),
        record.status
      ].join(" ").toLocaleLowerCase();
      return searchTerms.every((term) => searchHaystack.includes(term));
    });
  }, [companyFilter, globalSearchQuery, records, searchQuery, statusFilter]);
  const countByStatus = useMemo(() => ({
    active: records.filter((record) => record.status === "ACTIVE").length,
    onLeave: records.filter((record) => record.status === "ON_LEAVE").length,
    inactive: records.filter((record) => record.status === "INACTIVE").length
  }), [records]);
  const resultLabel = interpolate(t("emp.partial.results"), {
    visible: filteredRecords.length,
    total: records.length
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("nav.employees")}
        meta={(
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-dynamic-xs font-semibold text-accent-text">
            <Users aria-hidden="true" className="h-3.5 w-3.5" />
            {t("emp.partial.session_badge")}
          </span>
        )}
      />

      <div role="note" className="flex items-start gap-3 rounded-lg border border-warning bg-warning-soft p-3 text-dynamic-xs leading-relaxed text-warning-text">
        <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t("emp.partial.notice")}</span>
      </div>

      <section className={`${surfaceClassName} p-4`}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="relative w-full xl:w-1/4 xl:min-w-[12rem] xl:max-w-none">
            <label htmlFor="partial-roster-search" className="mb-1.5 block text-dynamic-xs font-bold text-foreground">
              {t("emp.partial.search_label")}
            </label>
            <Search className="pointer-events-none absolute start-3 top-[2.7rem] h-4 w-4 text-muted" aria-hidden="true" />
            <input
              id="partial-roster-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("emp.partial.search_placeholder")}
              className={`${formControlClassName} h-11 py-2 ps-10 pe-3`}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:w-auto">
            <div>
              <label htmlFor="partial-roster-company" className="mb-1.5 block text-dynamic-xs font-bold text-foreground">
                <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{t("emp.partial.company_filter")}</span>
              </label>
              <select
                id="partial-roster-company"
                value={companyFilter}
                onChange={(event) => setCompanyFilter(event.target.value)}
                className={`${formControlClassName} h-11 font-semibold`}
              >
                <option value="ALL">{t("emp.partial.all_companies")}</option>
                {companies.map((company) => <option key={company} value={company}>{company}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="partial-roster-status" className="mb-1.5 block text-dynamic-xs font-bold text-foreground">
                {t("emp.partial.status_filter")}
              </label>
              <select
                id="partial-roster-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={`${formControlClassName} h-11 font-semibold`}
              >
                <option value="ALL">{t("emp.partial.all_statuses")}</option>
                {(["ACTIVE", "ON_LEAVE", "INACTIVE"] as const).map((status) => (
                  <option key={status} value={status}>{t(`emp.status.${status}`)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-theme pt-3 text-dynamic-xs text-muted">
          <span className="font-semibold">{resultLabel}</span>
          <span className="tabular-nums">
            {countByStatus.active} {t("emp.status.ACTIVE")} · {countByStatus.onLeave} {t("emp.status.ON_LEAVE")} · {countByStatus.inactive} {t("emp.status.INACTIVE")}
          </span>
        </div>
      </section>

      <section className={`${surfaceClassName} min-w-0 overflow-hidden`} aria-label={t("emp.partial.table_label")}>
        {filteredRecords.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <table className="min-w-[1500px] w-full border-separate border-spacing-0 text-start text-dynamic-xs">
              <caption className="sr-only">{t("emp.partial.table_caption")}</caption>
              <thead>
                <tr className="bg-surface-elevated text-muted">
                  {[
                    ["id", "emp.partial.employee_id"],
                    ["company", "emp.partial.company"],
                    ["nameEn", "emp.partial.name_en"],
                    ["nameAr", "emp.partial.name_ar"],
                    ["nationality", "emp.partial.nationality"],
                    ["identity", "emp.partial.national_id"],
                    ["department", "emp.partial.department"],
                    ["jobTitle", "emp.partial.job_title"],
                    ["salary", "emp.partial.basic_salary"],
                    ["status", "emp.partial.status"]
                  ].map(([key, labelKey]) => (
                    <th key={key} scope="col" className="sticky top-0 border-b border-theme px-3 py-3 text-start font-bold whitespace-nowrap">
                      {t(labelKey)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.employeeId} className="transition hover:bg-surface-elevated/70">
                    <td dir="ltr" className="border-b border-theme px-3 py-3 font-mono text-foreground whitespace-nowrap">{record.employeeId}</td>
                    <td dir="auto" className="border-b border-theme px-3 py-3 text-foreground whitespace-nowrap">{record.company}</td>
                    <td dir="auto" className="border-b border-theme px-3 py-3 font-semibold text-foreground whitespace-nowrap">{record.nameEn}</td>
                    <td dir="auto" className="border-b border-theme px-3 py-3 text-foreground whitespace-nowrap">{record.nameAr}</td>
                    <td dir="auto" className="border-b border-theme px-3 py-3 text-foreground whitespace-nowrap">{record.nationality}</td>
                    <td dir="ltr" className="border-b border-theme px-3 py-3 font-mono text-foreground whitespace-nowrap">{record.nationalIdOrIqama}</td>
                    <td dir="ltr" className="border-b border-theme px-3 py-3 text-foreground whitespace-nowrap">{record.departmentCode}</td>
                    <td dir="auto" className="border-b border-theme px-3 py-3 text-foreground whitespace-nowrap">{record.jobTitle}</td>
                    <td dir="ltr" className="border-b border-theme px-3 py-3 text-end tabular-nums text-foreground whitespace-nowrap">{formatCurrencySAR(record.basicSalarySar)}</td>
                    <td className="border-b border-theme px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${statusTone(record.status)}`}>
                        {t(`emp.status.${record.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-dynamic-sm text-muted">{t("emp.partial.no_results")}</div>
        )}
      </section>

      <p className="text-dynamic-xs leading-relaxed text-muted">{t("emp.partial.fields_note")}</p>
    </div>
  );
};

export const PartialRosterImportRequiredModule: React.FC<{ onNavigateSettings: () => void }> = ({ onNavigateSettings }) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <PageHeader
        title={t("nav.employees")}
        meta={(
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-dynamic-xs font-semibold text-accent-text">
            <Users aria-hidden="true" className="h-3.5 w-3.5" />
            {t("emp.partial.summary_only_badge")}
          </span>
        )}
      />
      <section className={`${surfaceClassName} p-6`}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
            <Info aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-dynamic-base font-bold text-foreground">{t("emp.partial.summary_only.title")}</h2>
            <p className="mt-2 max-w-3xl text-dynamic-sm leading-relaxed text-muted">{t("emp.partial.summary_only.body")}</p>
            <button
              type="button"
              onClick={onNavigateSettings}
              className={`mt-4 ${primaryButtonClass}`}
            >
              <FileUp aria-hidden="true" className="h-4 w-4" />
              {t("emp.partial.summary_only.action")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
