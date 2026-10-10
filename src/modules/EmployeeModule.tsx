import React, { useState, useMemo, useEffect } from "react";
import {
  UserCheck,
  UserPlus,
  Plus,
  Upload,
  Download,
  FileText,
  Loader2,
  ShieldCheck,
  FileBadge,
  Wallet,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Building2,
  FileSpreadsheet,
  CalendarClock,
  Eye,
  MapPin,
  Navigation,
  RefreshCw,
  X,
  AlertTriangle
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useOperations } from "@/context/OperationsContext";
import { useCurrentRole, useRBACGeofence } from "@/context/RBACGeofenceContext";
import { addISOCalendarYears } from "@/services/dateUtils";
import type {
  AttendanceStatus,
  PerformanceReviewSnapshot
} from "@/data/workspaceBlueprints";
import {
  EmployeeRecordBlueprint,
  calculateGosiContributions,
  calculateKsaEOSB,
  NitaqatBand,
  EmployeeStatus
} from "@/data/mockBlueprints";
import { dangerButtonClass, DataTableFrame, FilterDrawerEdgeTrigger, FilterDrawerTrigger, formControlClassName, HorizontalBarChart, iconButtonClass, inlineFormControlClassName, MetricCard, PageHeader, ResponsiveFilterDrawer, SegmentedTabs, successButtonClass, surfaceClassName, TabPanel, primaryButtonClass, secondaryButtonClass, useModalFocus } from "@/components/DesignSystem";
import {
  EMPLOYEE_IMPORT_COLUMNS,
  buildEmployeeImportPreview,
  downloadEmployeeCsv,
  downloadEmployeeTemplateCsv,
  downloadEmployeeTemplateXlsx,
  downloadEmployeeXlsx,
  readEmployeeImportFile,
  type EmployeeExportColumn,
  type EmployeeImportIssue,
  type EmployeeImportSourceRow
} from "@/services/employeeImport";
import { EmployeeDirectoryModule } from "./EmployeeDirectoryModule";
import { EmployeePayrollModule } from "./EmployeePayrollModule";
import { EmployeeAttendanceModule } from "./EmployeeAttendanceModule";
import { EmployeeOnboardingModule } from "./EmployeeOnboardingModule";

interface EmployeeModuleProps {
  employees: EmployeeRecordBlueprint[];
  onAddEmployee: (newEmp: EmployeeRecordBlueprint) => void;
  onAddEmployees: (newEmps: EmployeeRecordBlueprint[]) => void;
  onUpdateEmployee?: (updatedEmp: EmployeeRecordBlueprint) => void;
  globalSearchQuery: string;
}

type EmployeeSortColumn = "NAME" | "DEPARTMENT" | "EXPIRY";
type EmployeeSortKey = `${EmployeeSortColumn}_ASC` | `${EmployeeSortColumn}_DESC`;

const MAX_EMPLOYEE_IMPORT_BYTES = 10 * 1024 * 1024;
const EMPLOYEE_IMPORT_PAGE_SIZE = 20;

const getImportFormatKey = (field: (typeof EMPLOYEE_IMPORT_COLUMNS)[number]["key"]): string => {
  if (field === "id") return "emp.import.format.employee_id";
  if (field === "nameEn" || field === "nameAr" || field === "jobTitleEn" || field === "jobTitleAr" || field === "gosiNumber" || field === "qiwaContractId" || field === "locationEn" || field === "locationAr") return "emp.import.format.text";
  if (field === "nationality") return "emp.import.format.nationality";
  if (field === "nationalIdOrIqama") return "emp.import.format.id";
  if (field === "idExpiryDateGregorian") return "emp.import.format.expiry";
  if (field === "idExpiryDateHijri") return "emp.import.format.hijri";
  if (field === "departmentCode") return "emp.import.format.department";
  if (field === "nitaqatClass") return "emp.import.format.nitaqat";
  if (field === "basicSalarySar") return "emp.import.format.number";
  if (field === "housingAllowanceSar" || field === "transportAllowanceSar") return "emp.import.format.allowance";
  if (field === "ibanNumber") return "emp.import.format.iban";
  if (field === "status") return "emp.import.format.status";
  if (field === "laptopTag" || field === "smartBadgeId" || field === "corporateSim") return "emp.import.format.assets";
  return "emp.import.format.text";
};

const getImportFieldLabelKey = (field: EmployeeImportIssue["fieldKey"]): string => {
  if (field === "row") return "emp.import.row";
  if (field === "header") return "emp.import.template_field";
  return EMPLOYEE_IMPORT_COLUMNS.find((column) => column.key === field)?.labelKey ?? "emp.import.template_field";
};

export const EmployeeModule: React.FC<EmployeeModuleProps> = ({
  employees,
  onAddEmployee,
  onAddEmployees,
  onUpdateEmployee,
  globalSearchQuery
}) => {
  const { t, localize, formatCurrencySAR, direction } = useLanguage();
  const { hasPermission } = useCurrentRole();
  const {
    moduleToggles,
    setGeofenceModalOpen,
    activeOffice,
    capturedCoords,
    calculatedDistanceMeters,
    verificationStatus,
    isClockedIn
  } = useRBACGeofence();
  const isGeoVerified = verificationStatus === "VERIFIED_INSIDE_ZONE";
  const {
    transferRequests,
    updateTransferStatus,
    employeeRequests,
    updateEmployeeRequestStatus,
    attendanceRecords,
    performanceReviews
  } = useOperations();

  const [activeTab, setActiveTab] = useState<
    "directory" | "onboarding" | "payroll" | "attendance" | "performance" | "transfers" | "requests"
  >("directory");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | EmployeeStatus>("ALL");
  const [expiryFilter, setExpiryFilter] = useState<"ALL" | "EXPIRING_90" | "CRITICAL_30">("ALL");
  const [sortBy, setSortBy] = useState<EmployeeSortKey>("NAME_ASC");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [employeeActionsOpen, setEmployeeActionsOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFileFormat, setImportFileFormat] = useState<"CSV" | "XLSX" | null>(null);
  const [importSourceRows, setImportSourceRows] = useState<EmployeeImportSourceRow[] | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [importFileErrorKey, setImportFileErrorKey] = useState<string | null>(null);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [importPage, setImportPage] = useState(0);
  const [importConfirmChecked, setImportConfirmChecked] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const [exportingFormat, setExportingFormat] = useState<"CSV" | "XLSX" | null>(null);
  const [exportError, setExportError] = useState(false);
  const [templateLoading, setTemplateLoading] = useState<"XLSX" | "CSV" | null>(null);

  // 360° Employee Dossier Modal & SAMA WPS Batch Modal State
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);
  const [muqeemRenewToast, setMuqeemRenewToast] = useState<boolean>(false);
  const [wpsBatchModalOpen, setWpsBatchModalOpen] = useState<boolean>(false);

  const combinedSearch = globalSearchQuery.trim().toLowerCase();

  const filteredEmployees = useMemo(() => {
    const matched = employees.filter((emp) => {
      if (deptFilter !== "ALL" && emp.departmentCode !== deptFilter) return false;
      if (statusFilter !== "ALL" && emp.status !== statusFilter) return false;
      if (expiryFilter === "EXPIRING_90" && emp.daysUntilExpiry > 90) return false;
      if (expiryFilter === "CRITICAL_30" && emp.daysUntilExpiry > 30) return false;

      if (combinedSearch) {
        const haystack = [
          emp.id,
          emp.name.en,
          emp.name.ar,
          emp.nationalIdOrIqama,
          emp.nationalityLabel.en,
          emp.nationalityLabel.ar,
          emp.department.en,
          emp.department.ar,
          emp.location.en,
          emp.location.ar,
          emp.jobTitle.en,
          emp.jobTitle.ar,
          emp.gosiNumber,
          emp.qiwaContractId
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(combinedSearch);
      }
      return true;
    });

    return matched.sort((a, b) => {
      const descending = sortBy.endsWith("_DESC");
      let comparison = 0;
      if (sortBy.startsWith("EXPIRY_")) {
        comparison = a.daysUntilExpiry - b.daysUntilExpiry;
      } else if (sortBy.startsWith("DEPARTMENT_")) {
        const departmentA = direction === "rtl" ? a.department.ar : a.department.en;
        const departmentB = direction === "rtl" ? b.department.ar : b.department.en;
        comparison = departmentA.localeCompare(departmentB, direction === "rtl" ? "ar-SA" : "en-US", { sensitivity: "base", numeric: true });
      } else {
        const nameA = direction === "rtl" ? a.name.ar : a.name.en;
        const nameB = direction === "rtl" ? b.name.ar : b.name.en;
        comparison = nameA.localeCompare(nameB, direction === "rtl" ? "ar-SA" : "en-US", { sensitivity: "base", numeric: true });
      }
      return descending ? -comparison : comparison;
    });
  }, [employees, deptFilter, statusFilter, expiryFilter, combinedSearch, sortBy, direction]);

  const toggleDirectorySort = (column: EmployeeSortColumn) => {
    setSortBy((current) =>
      (current === `${column}_ASC` ? `${column}_DESC` : `${column}_ASC`) as EmployeeSortKey
    );
  };

  const directoryCounts = new Intl.NumberFormat(direction === "rtl" ? "ar-SA" : "en-US");
  const directoryTableDescription = `${t("emp.table.showing")
    .replace("{shown}", directoryCounts.format(filteredEmployees.length))
    .replace("{total}", directoryCounts.format(employees.length))} — ${t("emp.table.scroll_hint")}`;

  const importPreview = useMemo(
    () => importSourceRows ? buildEmployeeImportPreview(importSourceRows, employees) : null,
    [importSourceRows, employees]
  );
  const importPageCount = Math.max(1, Math.ceil((importPreview?.rowPreviews.length ?? 0) / EMPLOYEE_IMPORT_PAGE_SIZE));
  const visibleImportRows = importPreview?.rowPreviews.slice(
    importPage * EMPLOYEE_IMPORT_PAGE_SIZE,
    (importPage + 1) * EMPLOYEE_IMPORT_PAGE_SIZE
  ) ?? [];

  useEffect(() => {
    setImportConfirmChecked(false);
    setImportPage(0);
  }, [employees, importSourceRows]);

  // Directory KPI Summary
  const directoryMetrics = useMemo(() => {
    const total = filteredEmployees.length;
    const saudiCount = filteredEmployees.filter((e) => e.isSaudiNational).length;
    const saudiRatio = total > 0 ? ((saudiCount / total) * 100).toFixed(1) : "0.0";
    const criticalCount = filteredEmployees.filter((e) => e.daysUntilExpiry <= 30).length;
    const warningCount = filteredEmployees.filter(
      (e) => e.daysUntilExpiry > 30 && e.daysUntilExpiry <= 90
    ).length;
    return { total, saudiCount, saudiRatio, criticalCount, warningCount };
  }, [filteredEmployees]);

  // Selected Employee for 360° Dossier
  const selectedDossierEmployee = useMemo(
    () => employees.find((e) => e.id === selectedDossierId) || null,
    [employees, selectedDossierId]
  );
  const dossierDialogRef = useModalFocus(Boolean(selectedDossierEmployee), () => setSelectedDossierId(null));
  const employeeActionsDialogRef = useModalFocus(employeeActionsOpen, () => setEmployeeActionsOpen(false));
  const wpsBatchDialogRef = useModalFocus(wpsBatchModalOpen, () => setWpsBatchModalOpen(false));

  const employeeExportColumns = useMemo<EmployeeExportColumn[]>(() => [
    { key: "id", header: t("emp.import.field.employee_id"), value: (employee) => employee.id },
    { key: "nameEn", header: t("emp.import.field.name_en"), value: (employee) => employee.name.en },
    { key: "nameAr", header: t("emp.import.field.name_ar"), value: (employee) => employee.name.ar },
    { key: "nationality", header: t("emp.import.field.nationality"), value: (employee) => employee.isSaudiNational ? "SAUDI" : "EXPAT" },
    { key: "nationalIdOrIqama", header: t("emp.import.field.national_id"), value: (employee) => employee.nationalIdOrIqama },
    { key: "idExpiryDateGregorian", header: t("emp.import.field.expiry_gregorian"), value: (employee) => employee.idExpiryDateGregorian },
    { key: "idExpiryDateHijri", header: t("emp.import.field.expiry_hijri"), value: (employee) => employee.idExpiryDateHijri },
    { key: "jobTitleEn", header: t("emp.import.field.job_title_en"), value: (employee) => employee.jobTitle.en },
    { key: "jobTitleAr", header: t("emp.import.field.job_title_ar"), value: (employee) => employee.jobTitle.ar },
    { key: "departmentCode", header: t("emp.import.field.department_code"), value: (employee) => employee.departmentCode },
    { key: "nitaqatClass", header: t("emp.import.field.nitaqat_band"), value: (employee) => employee.nitaqatClass },
    { key: "gosiNumber", header: t("emp.import.field.gosi_number"), value: (employee) => employee.gosiNumber },
    { key: "qiwaContractId", header: t("emp.import.field.qiwa_contract"), value: (employee) => employee.qiwaContractId },
    { key: "basicSalarySar", header: t("emp.import.field.basic_salary"), value: (employee) => employee.basicSalarySar },
    { key: "housingAllowanceSar", header: t("emp.import.field.housing"), value: (employee) => employee.housingAllowanceSar },
    { key: "transportAllowanceSar", header: t("emp.import.field.transport"), value: (employee) => employee.transportAllowanceSar },
    { key: "ibanNumber", header: t("emp.import.field.iban"), value: (employee) => employee.ibanNumber },
    { key: "status", header: t("emp.import.field.status"), value: (employee) => employee.status },
    { key: "locationEn", header: t("emp.import.field.location_en"), value: (employee) => employee.location.en },
    { key: "locationAr", header: t("emp.import.field.location_ar"), value: (employee) => employee.location.ar },
    { key: "laptopTag", header: t("emp.import.field.laptop_tag"), value: (employee) => employee.allocatedAssets.laptopTag },
    { key: "smartBadgeId", header: t("emp.import.field.badge_id"), value: (employee) => employee.allocatedAssets.smartBadgeId },
    { key: "corporateSim", header: t("emp.import.field.sim"), value: (employee) => employee.allocatedAssets.corporateSim }
  ], [t]);

  const performanceRows = employees
    .map((employee) => ({
      employee,
      review: performanceReviews.find((item) => item.employeeId === employee.id)
    }))
    .filter((row): row is { employee: EmployeeRecordBlueprint; review: PerformanceReviewSnapshot } => !!row.review);
  const averagePerformance = performanceRows.length
    ? Math.round(performanceRows.reduce((total, row) => total + row.review.score, 0) / performanceRows.length)
    : 0;
  const completedGoals = performanceRows.reduce((total, row) => total + row.review.goalsCompleted, 0);
  const totalGoals = performanceRows.reduce((total, row) => total + row.review.goalsTotal, 0);
  const pendingTransferRequests = transferRequests.filter((request) => request.status === "PENDING");
  const approvedTransfers = transferRequests.filter((request) => request.status === "APPROVED");
  const pendingRequests = employeeRequests.filter((request) => request.status === "PENDING");
  const approvedRequests = employeeRequests.filter((request) => request.status === "APPROVED");

  const handleRenewMuqeemPermit = (emp: EmployeeRecordBlueprint) => {
    if (!onUpdateEmployee) return;
    const nextIso = addISOCalendarYears(emp.idExpiryDateGregorian, 1);

    onUpdateEmployee({
      ...emp,
      idExpiryDateGregorian: nextIso,
      idExpiryDateHijri: "1449-05-19",
      daysUntilExpiry: emp.daysUntilExpiry + 365
    });
    setMuqeemRenewToast(true);
    setTimeout(() => setMuqeemRenewToast(false), 3500);
  };

  const handleStatusChange = (emp: EmployeeRecordBlueprint, nextStatus: EmployeeStatus) => {
    if (!onUpdateEmployee) return;
    onUpdateEmployee({ ...emp, status: nextStatus });
  };

  const canOnboard =
    hasPermission("hr:onboard_new_hire") && moduleToggles.onboardingWizardEnabled;
  const canViewPayroll =
    hasPermission("payroll:configure_constants") || hasPermission("route:accounts");
  const canManageDirectory = hasPermission("hr:directory_full_manage");
  const canManageTeamLeave = hasPermission("dept:manage_team_leave_ot");

  const handleStartSingleOnboarding = () => {
    if (!canOnboard) return;
    setActiveTab("onboarding");
  };

  const closeEmployeeActionsThen = (action: () => void) => {
    setEmployeeActionsOpen(false);
    window.setTimeout(action, 0);
  };

  const openEmployeeActions = () => {
    setImportFileErrorKey(null);
    setExportError(false);
    setEmployeeActionsOpen(true);
  };

  const handleOpenImportModal = (format: "CSV" | "XLSX" | null = null) => {
    if (!canManageDirectory) return;
    setImportFileFormat(format);
    setImportSourceRows(null);
    setImportFileName("");
    setImportFileErrorKey(null);
    setImportSuccessCount(null);
    setImportConfirmChecked(false);
    setImportPage(0);
    setImportModalOpen(true);
  };

  const handleCloseImportModal = () => {
    setImportModalOpen(false);
    setImportFileFormat(null);
    setImportSourceRows(null);
    setImportFileName("");
    setImportFileErrorKey(null);
    setImportConfirmChecked(false);
  };
  const importDialogRef = useModalFocus(importModalOpen, handleCloseImportModal);

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setImportSourceRows(null);
    setImportFileName(file.name);
    setImportFileErrorKey(null);
    setImportSuccessCount(null);
    setImportConfirmChecked(false);
    setImportPage(0);
    const fileExtension = file.name.toLowerCase().split(".").pop();
    if (importFileFormat === "CSV" && fileExtension !== "csv") {
      setImportFileErrorKey("emp.import.error.expected_csv");
      return;
    }
    if (importFileFormat === "XLSX" && fileExtension !== "xlsx") {
      setImportFileErrorKey("emp.import.error.expected_xlsx");
      return;
    }
    if (file.size > MAX_EMPLOYEE_IMPORT_BYTES) {
      setImportFileErrorKey("emp.import.error.file_too_large");
      return;
    }
    setIsImportLoading(true);
    try {
      const rows = await readEmployeeImportFile(file);
      setImportSourceRows(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setImportFileErrorKey(message.startsWith("emp.import.error.") ? message : "emp.import.error.read_failed");
    } finally {
      setIsImportLoading(false);
    }
  };

  const handleDownloadEmployeeTemplate = async (format: "XLSX" | "CSV") => {
    setTemplateLoading(format);
    setImportFileErrorKey(null);
    const headers = EMPLOYEE_IMPORT_COLUMNS.map((column) => t(column.labelKey));
    try {
      if (format === "CSV") {
        downloadEmployeeTemplateCsv(headers);
      } else {
        const instructions: Array<[string, string, string]> = EMPLOYEE_IMPORT_COLUMNS.map((column) => [
          t(column.labelKey),
          t(column.requiredValue ? "emp.import.required" : "emp.import.optional"),
          t(getImportFormatKey(column.key))
        ]);
        await downloadEmployeeTemplateXlsx(
          headers,
          t("emp.import.sheet_instructions"),
          [t("emp.import.template_field"), t("emp.import.required"), t("emp.import.template_format")],
          instructions,
          t("emp.import.sheet_employees")
        );
      }
    } catch {
      setImportFileErrorKey("emp.import.error.template_failed");
    } finally {
      setTemplateLoading(null);
    }
  };

  const handleExportEmployees = async (format: "CSV" | "XLSX") => {
    if (!canManageDirectory || filteredEmployees.length === 0) return;
    setExportError(false);
    setExportingFormat(format);
    const today = new Date();
    const localDateStamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const fileName = `yamodeer-employees-${localDateStamp}`;
    try {
      if (format === "CSV") downloadEmployeeCsv(filteredEmployees, employeeExportColumns, fileName);
      else await downloadEmployeeXlsx(filteredEmployees, employeeExportColumns, fileName, t("emp.tab.directory"));
    } catch {
      setExportError(true);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleConfirmEmployeeImport = () => {
    if (!canManageDirectory || !importConfirmChecked || !importSourceRows) return;
    const latestPreview = buildEmployeeImportPreview(importSourceRows, employees);
    if (latestPreview.validEmployees.length === 0) return;
    const acceptedCount = latestPreview.validEmployees.length;
    onAddEmployees(latestPreview.validEmployees);
    setImportSuccessCount(acceptedCount);
    setImportSourceRows(null);
    setImportFileName("");
    setImportFileErrorKey(null);
    setImportConfirmChecked(false);
  };

  const visibleTab =
    (!canOnboard && activeTab === "onboarding") ||
    (!canViewPayroll && activeTab === "payroll")
      ? "directory"
      : activeTab;
  const importFileAccept = importFileFormat === "CSV"
    ? ".csv,text/csv"
    : importFileFormat === "XLSX"
      ? ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const importChooseFileKey = importFileFormat === "CSV"
    ? "emp.import.choose_csv"
    : importFileFormat === "XLSX"
      ? "emp.import.choose_xlsx"
      : "emp.import.choose_file";
  const importAcceptedFilesKey = importFileFormat === "CSV"
    ? "emp.import.accepted_csv"
    : importFileFormat === "XLSX"
      ? "emp.import.accepted_xlsx"
      : "emp.import.accepted_files";

  const activeEmployeesForWps = employees.filter((e) => e.status === "ACTIVE");
  const totalWpsNetDisbursement = activeEmployeesForWps.reduce((sum, emp) => {
    const gross = emp.basicSalarySar + emp.housingAllowanceSar + emp.transportAllowanceSar;
    const gosi = calculateGosiContributions(
      emp.isSaudiNational,
      emp.basicSalarySar,
      emp.housingAllowanceSar
    );
    return sum + (gross - gosi.employeeDeductionSar);
  }, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t("nav.group.people")}
        title={t("emp.header.title")}
        
        actions={(
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            {visibleTab === "directory" && (
              <FilterDrawerTrigger
                label={t("ui.filters")}
                controls="employee-directory-filters"
                expanded={filterDrawerOpen}
                activeCount={(deptFilter === "ALL" ? 0 : 1) + (statusFilter === "ALL" ? 0 : 1) + (expiryFilter === "ALL" ? 0 : 1)}
                onClick={() => setFilterDrawerOpen(true)}
                className="md:hidden"
              />
            )}
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={employeeActionsOpen}
              onClick={openEmployeeActions}
              className={primaryButtonClass}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{t("emp.actions.open")}</span>
            </button>
          </div>
        )}
      />

      {visibleTab === "directory" && (
        <div className="hidden w-full flex-wrap items-center justify-end gap-2 xl:flex">
          <select aria-label={t("emp.filter.all_depts")} value={deptFilter} onChange={(event) => setDeptFilter(event.target.value)} className={`${inlineFormControlClassName} min-w-40 text-dynamic-xs`}>
            <option value="ALL">{t("emp.filter.all_depts")}</option>
            <option value="HR_GOV">{t("dept.HR_GOV")}</option>
            <option value="FINTECH">{t("dept.FINTECH")}</option>
            <option value="PAYROLL">{t("dept.PAYROLL")}</option>
            <option value="PROCURE">{t("dept.PROCURE")}</option>
          </select>
          <select aria-label={t("emp.filter.all_status")} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | EmployeeStatus)} className={`${inlineFormControlClassName} min-w-36 text-dynamic-xs`}>
            <option value="ALL">{t("emp.filter.all_status")}</option>
            <option value="ACTIVE">{t("emp.status.ACTIVE")}</option>
            <option value="ON_LEAVE">{t("emp.status.ON_LEAVE")}</option>
            <option value="SUSPENDED">{t("emp.status.SUSPENDED")}</option>
          </select>
          <select aria-label={t("emp.filter.all_expiry")} value={expiryFilter} onChange={(event) => setExpiryFilter(event.target.value as "ALL" | "EXPIRING_90" | "CRITICAL_30")} className={`${inlineFormControlClassName} min-w-40 text-dynamic-xs`}>
            <option value="ALL">{t("emp.filter.all_expiry")}</option>
            <option value="EXPIRING_90">{t("emp.filter.expiring_90")}</option>
            <option value="CRITICAL_30">{t("emp.filter.critical_30")}</option>
          </select>
        </div>
      )}

      <ResponsiveFilterDrawer
        id="employee-directory-filters"
        open={filterDrawerOpen && visibleTab === "directory"}
        onClose={() => setFilterDrawerOpen(false)}
        onClear={() => { setDeptFilter("ALL"); setStatusFilter("ALL"); setExpiryFilter("ALL"); setSortBy("NAME_ASC"); }}
        title={t("ui.filters")}
        closeLabel={t("ui.close")}
        clearLabel={t("ui.clear_filters")}
        doneLabel={t("ui.done")}
      >
        <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
          <span>{t("emp.filter.all_depts")}</span>
          <select aria-label={t("emp.filter.all_depts")} value={deptFilter} onChange={(event) => setDeptFilter(event.target.value)} className={`${formControlClassName} h-11`}>
            <option value="ALL">{t("emp.filter.all_depts")}</option>
            <option value="HR_GOV">{t("dept.HR_GOV")}</option>
            <option value="FINTECH">{t("dept.FINTECH")}</option>
            <option value="PAYROLL">{t("dept.PAYROLL")}</option>
            <option value="PROCURE">{t("dept.PROCURE")}</option>
          </select>
        </label>
        <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
          <span>{t("emp.filter.all_status")}</span>
          <select aria-label={t("emp.filter.all_status")} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | EmployeeStatus)} className={`${formControlClassName} h-11`}>
            <option value="ALL">{t("emp.filter.all_status")}</option>
            <option value="ACTIVE">{t("emp.status.ACTIVE")}</option>
            <option value="ON_LEAVE">{t("emp.status.ON_LEAVE")}</option>
            <option value="SUSPENDED">{t("emp.status.SUSPENDED")}</option>
          </select>
        </label>
        <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
          <span>{t("emp.filter.all_expiry")}</span>
          <select aria-label={t("emp.filter.all_expiry")} value={expiryFilter} onChange={(event) => setExpiryFilter(event.target.value as "ALL" | "EXPIRING_90" | "CRITICAL_30")} className={`${formControlClassName} h-11`}>
            <option value="ALL">{t("emp.filter.all_expiry")}</option>
            <option value="EXPIRING_90">{t("emp.filter.expiring_90")}</option>
            <option value="CRITICAL_30">{t("emp.filter.critical_30")}</option>
          </select>
        </label>
        <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
          <span>{t("ui.sort_by")}</span>
          <select aria-label={t("ui.sort_by")} value={sortBy} onChange={(event) => setSortBy(event.target.value as EmployeeSortKey)} className={`${formControlClassName} h-11`}>
            <option value="NAME_ASC">{t("ui.sort.name_asc")}</option>
            <option value="NAME_DESC">{t("ui.sort.name_desc")}</option>
            <option value="EXPIRY_ASC">{t("ui.sort.expiry_asc")}</option>
            <option value="EXPIRY_DESC">{t("ui.sort.expiry_desc")}</option>
            <option value="DEPARTMENT_ASC">{t("ui.sort.department_asc")}</option>
            <option value="DEPARTMENT_DESC">{t("ui.sort.department_desc")}</option>
          </select>
        </label>
      </ResponsiveFilterDrawer>
      {visibleTab === "directory" && (
        <FilterDrawerEdgeTrigger
          label={t("ui.filters")}
          controls="employee-directory-filters"
          expanded={filterDrawerOpen}
          activeCount={(deptFilter === "ALL" ? 0 : 1) + (statusFilter === "ALL" ? 0 : 1) + (expiryFilter === "ALL" ? 0 : 1)}
          onClick={() => setFilterDrawerOpen(true)}
          placement="end"
          className="hidden md:flex"
        />
      )}

      <SegmentedTabs
        id="people"
        ariaLabel={t("ui.view_switcher")}
        value={visibleTab}
        onChange={setActiveTab}
        layout="scroll"
        items={[
          { value: "directory", label: t("emp.tab.directory"), icon: <UserCheck className="h-4 w-4" /> },
          ...(canViewPayroll
            ? [{ value: "payroll" as const, label: t("emp.tab.payroll"), icon: <Wallet className="h-4 w-4" /> }]
            : []),
          { value: "attendance", label: t("emp.tab.attendance"), icon: <CalendarClock className="h-4 w-4" /> },
          { value: "performance", label: t("emp.tab.performance"), icon: <ShieldCheck className="h-4 w-4" /> },
          { value: "transfers", label: t("emp.tab.transfers"), icon: <RefreshCw className="h-4 w-4" /> },
          { value: "requests", label: t("emp.tab.requests"), icon: <FileBadge className="h-4 w-4" /> },
          ...(canOnboard
            ? [{ value: "onboarding" as const, label: t("emp.tab.onboarding"), icon: <UserPlus className="h-4 w-4" /> }]
            : [])
        ]}
      />

      {/* TAB 1: HIGH-DENSITY EMPLOYEE DIRECTORY LEDGER */}
      <TabPanel hidden={visibleTab !== "directory"} id="people-directory-panel" labelledBy="people-directory-tab">
          <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label={t("emp.kpi.total_filtered")}
              value={directoryMetrics.total}
              icon={<UserCheck className="h-5 w-5" />}
              tone="primary"
            />
            <MetricCard
              label={t("emp.kpi.saudi_ratio")}
              value={<>{directoryMetrics.saudiRatio}% <span className="text-dynamic-sm font-semibold text-muted">({directoryMetrics.saudiCount})</span></>}
              icon={<ShieldCheck className="h-5 w-5" />}
              tone="success"
            />
            <MetricCard
              label={t("emp.kpi.critical_iqama")}
              value={directoryMetrics.criticalCount}
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="danger"
            />
            <MetricCard
              label={t("emp.kpi.warning_iqama")}
              value={directoryMetrics.warningCount}
              icon={<FileBadge className="h-5 w-5" />}
              tone="warning"
            />
          </div>

          {exportError && (
            <div role="alert" className="rounded-xl border border-danger bg-danger-soft px-4 py-3 text-dynamic-xs font-semibold text-danger-text">
              {t("emp.export.error")}
            </div>
          )}

          <EmployeeDirectoryModule
            employees={filteredEmployees}
            canManageDirectory={canManageDirectory}
            canViewPayroll={canViewPayroll}
            sortBy={sortBy}
            onToggleSort={toggleDirectorySort}
            onViewDossier={setSelectedDossierId}
            tableDescription={directoryTableDescription}
          />
          </div>
        </TabPanel>

      <TabPanel hidden={visibleTab !== "payroll" || !canViewPayroll} id="people-payroll-panel" labelledBy={canViewPayroll ? "people-payroll-tab" : undefined}>
        <EmployeePayrollModule employees={employees} />
      </TabPanel>

      <TabPanel hidden={visibleTab !== "attendance"} id="people-attendance-panel" labelledBy="people-attendance-tab">
        <EmployeeAttendanceModule employees={employees} />
      </TabPanel>

      <TabPanel hidden={visibleTab !== "performance"} id="people-performance-panel" labelledBy="people-performance-tab">
        <div className="space-y-4">
          <div>
            <h2 className="text-dynamic-lg font-semibold text-foreground">{t("emp.performance.heading")}</h2>
            
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label={t("emp.performance.metric.average")} value={`${averagePerformance}%`} icon={<ShieldCheck className="h-5 w-5" />} tone="primary" />
            <MetricCard label={t("emp.performance.metric.goals")} value={`${completedGoals} / ${totalGoals}`} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
            <MetricCard label={t("emp.performance.metric.top")} value={performanceRows.filter((row) => row.review.score >= 90).length} icon={<UserCheck className="h-5 w-5" />} tone="accent" />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <section className={`xl:col-span-4 ${surfaceClassName} p-4 space-y-4`}>
              <h3 className="text-dynamic-base font-semibold text-foreground">{t("emp.performance.table.title")}</h3>
              <HorizontalBarChart data={performanceRows.map(({ employee, review }) => ({ label: localize(employee.name), value: review.score, tone: review.score >= 90 ? "success" : review.score >= 80 ? "primary" : "warning" }))} valueFormatter={(value) => `${value}%`} maxValue={100} />
            </section>
            <div className="xl:col-span-8 min-w-0">
              <DataTableFrame title={t("emp.performance.table.title")} count={performanceRows.length} countLabel={t("ui.records")}>
                <table className="min-w-[640px] w-full border-collapse text-start">
                  <thead><tr className="bg-surface-elevated border-b border-theme text-muted text-dynamic-xs">
                    <th className="py-3 ps-4 pe-3 text-start font-bold">{t("emp.performance.col.employee")}</th>
                    <th className="py-3 px-3 text-start font-bold">{t("emp.performance.col.cycle")}</th>
                    <th className="py-3 px-3 text-end font-bold">{t("emp.performance.col.score")}</th>
                    <th className="py-3 ps-3 pe-4 text-end font-bold">{t("emp.performance.col.goals")}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-theme">
                    {performanceRows.map(({ employee, review }) => (
                      <tr key={employee.id} className="hover:bg-primary-soft/20">
                        <td className="py-3 ps-4 pe-3 text-dynamic-xs font-semibold text-foreground">{localize(employee.name)}</td>
                        <td className="py-3 px-3 font-mono text-dynamic-xs text-muted">{review.reviewCycle}</td>
                        <td className="py-3 px-3 text-end font-mono text-dynamic-xs font-bold text-primary-text">{review.score}% · {t(review.score >= 90 ? "emp.performance.rating.excellent" : review.score >= 80 ? "emp.performance.rating.strong" : "emp.performance.rating.developing")}</td>
                        <td className="py-3 ps-3 pe-4 text-end font-mono text-dynamic-xs text-foreground">{review.goalsCompleted}/{review.goalsTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTableFrame>
            </div>
          </div>
        </div>
      </TabPanel>

      <TabPanel hidden={visibleTab !== "transfers"} id="people-transfers-panel" labelledBy="people-transfers-tab">
        <div className="space-y-4">
          <div>
            <h2 className="text-dynamic-lg font-semibold text-foreground">{t("emp.transfers.heading")}</h2>
            
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetricCard label={t("emp.transfers.metric.pending")} value={pendingTransferRequests.length} icon={<RefreshCw className="h-5 w-5" />} tone="warning" />
            <MetricCard label={t("emp.transfers.metric.approved")} value={approvedTransfers.length} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
          </div>
          <DataTableFrame title={t("emp.transfers.table.title")} count={transferRequests.length} countLabel={t("ui.records")}>
            <table className="min-w-[980px] w-full border-collapse text-start">
              <thead><tr className="bg-surface-elevated border-b border-theme text-muted text-dynamic-xs">
                <th className="py-3 ps-4 pe-3 text-start font-bold">{t("emp.transfers.col.employee")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("emp.transfers.col.from")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("emp.transfers.col.to")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("emp.transfers.col.requested")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("emp.transfers.col.effective")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("emp.transfers.col.status")}</th>
                <th className="py-3 ps-3 pe-4 text-end font-bold">{t("file.col.actions")}</th>
              </tr></thead>
              <tbody className="divide-y divide-theme">
                {transferRequests.map((request) => {
                  const employee = employees.find((item) => item.id === request.employeeId);
                  return (
                    <tr key={request.id} className="hover:bg-primary-soft/20">
                      <td className="py-3 ps-4 pe-3"><div className="text-dynamic-xs font-semibold text-foreground">{employee ? localize(employee.name) : request.employeeId}</div><div className="font-mono text-dynamic-xs text-muted">{request.id}</div></td>
                      <td className="py-3 px-3 text-dynamic-xs text-muted">{t(`dept.${request.fromDepartmentCode}`)}</td>
                      <td className="py-3 px-3 text-dynamic-xs text-foreground">{t(`dept.${request.toDepartmentCode}`)}</td>
                      <td className="py-3 px-3 font-mono text-dynamic-xs text-muted">{request.requestedDate}</td>
                      <td className="py-3 px-3 font-mono text-dynamic-xs text-muted">{request.effectiveDate}</td>
                      <td className="py-3 px-3"><span className={`rounded-full px-2.5 py-1 text-dynamic-xs font-semibold ${request.status === "PENDING" ? "bg-warning-soft text-warning-text" : request.status === "APPROVED" ? "bg-success-soft text-success-text" : "bg-danger-soft text-danger-text"}`}>{t(`emp.workflow.status.${request.status}`)}</span></td>
                      <td className="py-3 ps-3 pe-4 text-end">
                        {request.status === "PENDING" && canManageDirectory ? (
                          <div className="flex justify-end gap-1.5">
                            <button type="button" onClick={() => updateTransferStatus(request.id, "APPROVED")} className={successButtonClass}>{t("emp.workflow.approve")}</button>
                            <button type="button" onClick={() => updateTransferStatus(request.id, "REJECTED")} className={dangerButtonClass}>{t("emp.workflow.reject")}</button>
                          </div>
                        ) : <span className="text-dynamic-xs text-muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTableFrame>
        </div>
      </TabPanel>

      <TabPanel hidden={visibleTab !== "requests"} id="people-requests-panel" labelledBy="people-requests-tab">
        <div className="space-y-4">
          <div>
            <h2 className="text-dynamic-lg font-semibold text-foreground">{t("emp.requests.heading")}</h2>
            
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetricCard label={t("emp.requests.metric.pending")} value={pendingRequests.length} icon={<FileBadge className="h-5 w-5" />} tone="warning" />
            <MetricCard label={t("emp.requests.metric.approved")} value={approvedRequests.length} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
          </div>
          <DataTableFrame title={t("emp.requests.table.title")} count={employeeRequests.length} countLabel={t("ui.records")}>
            <table className="min-w-[900px] w-full border-collapse text-start">
              <thead><tr className="bg-surface-elevated border-b border-theme text-muted text-dynamic-xs">
                <th className="py-3 ps-4 pe-3 text-start font-bold">{t("emp.requests.col.employee")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("emp.requests.col.type")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("emp.requests.col.submitted")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("emp.requests.col.requested_date")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("emp.requests.col.status")}</th>
                <th className="py-3 ps-3 pe-4 text-end font-bold">{t("file.col.actions")}</th>
              </tr></thead>
              <tbody className="divide-y divide-theme">
                {employeeRequests.map((request) => {
                  const employee = employees.find((item) => item.id === request.employeeId);
                  return (
                    <tr key={request.id} className="hover:bg-primary-soft/20">
                      <td className="py-3 ps-4 pe-3"><div className="text-dynamic-xs font-semibold text-foreground">{employee ? localize(employee.name) : request.employeeId}</div><div className="font-mono text-dynamic-xs text-muted">{request.id}</div></td>
                      <td className="py-3 px-3 text-dynamic-xs text-foreground">{t(`emp.requests.type.${request.type}`)}</td>
                      <td className="py-3 px-3 font-mono text-dynamic-xs text-muted">{request.submittedDate}</td>
                      <td className="py-3 px-3 font-mono text-dynamic-xs text-muted">{request.requestedDate || "—"}</td>
                      <td className="py-3 px-3"><span className={`rounded-full px-2.5 py-1 text-dynamic-xs font-semibold ${request.status === "PENDING" ? "bg-warning-soft text-warning-text" : request.status === "APPROVED" ? "bg-success-soft text-success-text" : "bg-danger-soft text-danger-text"}`}>{t(`emp.workflow.status.${request.status}`)}</span></td>
                      <td className="py-3 ps-3 pe-4 text-end">
                        {request.status === "PENDING" && (canManageDirectory || (request.type === "LEAVE" && canManageTeamLeave)) ? (
                          <div className="flex justify-end gap-1.5">
                            <button type="button" onClick={() => updateEmployeeRequestStatus(request.id, "APPROVED")} className={successButtonClass}>{t("emp.workflow.approve")}</button>
                            <button type="button" onClick={() => updateEmployeeRequestStatus(request.id, "REJECTED")} className={dangerButtonClass}>{t("emp.workflow.reject")}</button>
                          </div>
                        ) : <span className="text-dynamic-xs text-muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTableFrame>
        </div>
      </TabPanel>

      {/* TAB: 4-STEP KSA ONBOARDING WIZARD */}
      <TabPanel hidden={visibleTab !== "onboarding" || !canOnboard} id="people-onboarding-panel" labelledBy={canOnboard ? "people-onboarding-tab" : undefined}>
        <div className={`${surfaceClassName} p-4 space-y-4`}>
          <EmployeeOnboardingModule
            isActive={visibleTab === "onboarding"}
            employees={employees}
            onAddEmployee={onAddEmployee}
            onNavigateToDirectory={() => setActiveTab("directory")}
          />
        </div>
      </TabPanel>

      {/* 360° EMPLOYEE LEGAL, GOSI & CUSTODY DOSSIER MODAL */}
      {selectedDossierEmployee && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div ref={dossierDialogRef} role="dialog" aria-modal="true" aria-labelledby="employee-dossier-title" tabIndex={-1} className="bg-surface border-2 border-primary rounded-2xl max-w-3xl w-full p-4 shadow-shell space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-theme pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-primary-soft text-primary-text font-mono font-bold text-dynamic-xs">
                  {selectedDossierEmployee.id} •{" "}
                  {selectedDossierEmployee.qiwaContractId}
                </span>
                <h2 id="employee-dossier-title" className="text-dynamic-xl font-extrabold text-foreground pt-1">
                  {t("emp.dossier.title")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDossierId(null)}
                title={t("doc.action.close")}
                aria-label={t("doc.action.close")}
                className={iconButtonClass}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {muqeemRenewToast && (
              <div className="p-3.5 rounded-xl bg-success-soft border border-success text-success-text font-bold text-dynamic-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{t("emp.dossier.renew_success")}</span>
              </div>
            )}

            {/* Section 1: Legal Identity & Muqeem / Qiwa Renewal */}
            <div className="p-4 rounded-2xl bg-surface-elevated border border-theme space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-dynamic-xs font-bold text-primary-text uppercase">
                  {t("emp.dossier.section_legal")}
                </span>
                {selectedDossierEmployee.daysUntilExpiry <= 90 && (
                  <button
                    type="button"
                    onClick={() =>
                      handleRenewMuqeemPermit(selectedDossierEmployee)
                    }
                    className={primaryButtonClass}
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>{t("emp.btn.renew_muqeem")}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-dynamic-sm font-bold text-foreground">
                    {selectedDossierEmployee.name.en}
                  </div>
                  <div
                    dir="rtl"
                    className="text-dynamic-sm font-bold text-foreground"
                  >
                    {selectedDossierEmployee.name.ar}
                  </div>
                  <div className="text-dynamic-xs text-muted pt-0.5">
                    {localize(selectedDossierEmployee.jobTitle)}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-dynamic-xs text-muted">
                    <div><span className="font-semibold">{t("emp.col.nationality")}:</span> {localize(selectedDossierEmployee.nationalityLabel)}</div>
                    <div><span className="font-semibold">{t("emp.col.department")}:</span> {localize(selectedDossierEmployee.department)}</div>
                    <div><span className="font-semibold">{t("emp.col.location")}:</span> {localize(selectedDossierEmployee.location)}</div>
                  </div>
                </div>
                <div className="font-mono text-dynamic-xs space-y-1">
                  <div className="text-foreground font-bold">
                    {t("emp.dossier.identity_number")}: {selectedDossierEmployee.nationalIdOrIqama}
                  </div>
                  <div className="text-muted">
                    {t("emp.dossier.document_expiry")}: {selectedDossierEmployee.idExpiryDateGregorian} (
                    {selectedDossierEmployee.idExpiryDateHijri} {t("emp.dossier.hijri_suffix")}) —{" "}
                    <strong>
                      {selectedDossierEmployee.daysUntilExpiry}
                      {t("emp.days_remaining")}
                    </strong>
                  </div>
                  <div className="text-accent-text">
                    {t("emp.dossier.gosi_number")}: {selectedDossierEmployee.gosiNumber} •{" "}
                    {t(`nitaqat.${selectedDossierEmployee.nitaqatClass}`)}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Statutory Compensation, Conditional GOSI & EOSB */}
            {(() => {
              const gosi = calculateGosiContributions(
                selectedDossierEmployee.isSaudiNational,
                selectedDossierEmployee.basicSalarySar,
                selectedDossierEmployee.housingAllowanceSar
              );
              const gross =
                selectedDossierEmployee.basicSalarySar +
                selectedDossierEmployee.housingAllowanceSar +
                selectedDossierEmployee.transportAllowanceSar;
              const eosb5Yr = calculateKsaEOSB(gross, 5, "LAYOFF_OR_EXPIRY");

              return (
                <div className="p-4 rounded-2xl bg-surface-elevated border border-theme space-y-3">
                  <div className="text-dynamic-xs font-bold text-primary-text uppercase">
                    {t("emp.dossier.section_comp")}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-surface border border-theme">
                      <div className="text-dynamic-xs text-muted">
                        {t("wiz.field.basic_salary")}
                      </div>
                      <div className="text-dynamic-sm font-extrabold font-mono text-foreground pt-0.5">
                        {formatCurrencySAR(
                          selectedDossierEmployee.basicSalarySar
                        )}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-theme">
                      <div className="text-dynamic-xs text-muted">
                        {t("comp.gosi.emp_share")} ({gosi.employeeRatePercent}%)
                      </div>
                      <div className="text-dynamic-sm font-extrabold font-mono text-danger-text pt-0.5">
                        {formatCurrencySAR(gosi.employeeDeductionSar)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-theme">
                      <div className="text-dynamic-xs text-muted">
                        {t("comp.gosi.co_share")} ({gosi.employerRatePercent}%)
                      </div>
                      <div className="text-dynamic-sm font-extrabold font-mono text-accent-text pt-0.5">
                        {formatCurrencySAR(gosi.employerContributionSar)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-theme">
                      <div className="text-dynamic-xs text-muted">
                        {t("emp.dossier.eosb_five_year_award")}
                      </div>
                      <div className="text-dynamic-sm font-extrabold font-mono text-success-text pt-0.5">
                        {formatCurrencySAR(eosb5Yr.netPayableEosbSar)}
                      </div>
                    </div>
                  </div>
                  <div className="text-dynamic-xs font-mono text-muted">
                    {t("emp.iban_short")}: {selectedDossierEmployee.ibanNumber}
                  </div>
                </div>
              );
            })()}

            {/* Section 3: Allocated Hardware & Smart Badge Custody */}
            <div className="p-4 rounded-2xl bg-surface-elevated border border-theme space-y-2">
              <div className="text-dynamic-xs font-bold text-primary-text uppercase">
                {t("emp.dossier.section_assets")}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-dynamic-xs">
                <div className="p-3 rounded-xl bg-surface border border-theme">
                  <div className="text-muted">{t("wiz.field.laptop_tag")}</div>
                  <div className="font-bold text-foreground pt-0.5">
                    {selectedDossierEmployee.allocatedAssets.laptopTag}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-theme">
                  <div className="text-muted">{t("wiz.field.badge_id")}</div>
                  <div className="font-bold text-foreground pt-0.5">
                    {selectedDossierEmployee.allocatedAssets.smartBadgeId}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-theme">
                  <div className="text-muted">{t("wiz.field.sim_card")}</div>
                  <div className="font-bold text-foreground pt-0.5">
                    {selectedDossierEmployee.allocatedAssets.corporateSim}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: RBAC-Gated Employment Status Governance */}
            {canManageDirectory && (
              <div className="p-4 rounded-2xl bg-surface-elevated border border-theme flex flex-wrap items-center justify-between gap-3">
                <span className="text-dynamic-xs font-bold text-foreground">
                  {t("emp.dossier.section_gov")}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {(["ACTIVE", "ON_LEAVE", "SUSPENDED"] as EmployeeStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() =>
                          handleStatusChange(selectedDossierEmployee, st)
                        }
                        className={`px-3 py-1.5 rounded-xl font-bold text-dynamic-xs border transition ${
                          selectedDossierEmployee.status === st
                            ? "bg-primary text-on-primary border-primary"
                            : "bg-surface text-foreground border-theme"
                        }`}
                      >
                        {t(`emp.status.${st}`)}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employee actions hub: keeps directory tools in one responsive entry point. */}
      {employeeActionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-canvas/80 p-3 backdrop-blur-sm sm:p-5">
          <section
            id="employee-actions-dialog"
            ref={employeeActionsDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-actions-title"
            tabIndex={-1}
            className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-2 border-primary bg-surface shadow-shell"
          >
            <header className="flex items-start justify-between gap-4 border-b border-theme px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id="employee-actions-title" className="text-dynamic-xl font-extrabold text-foreground">
                  {t("emp.actions.title")}
                </h2>
                <p className="mt-1 max-w-2xl text-dynamic-xs leading-relaxed text-muted">
                  {t("emp.actions.description")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEmployeeActionsOpen(false)}
                aria-label={t("ui.close")}
                title={t("ui.close")}
                className={iconButtonClass}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {canOnboard && (
                  <section className={`${surfaceClassName} min-w-0 space-y-3 p-4`} aria-labelledby="employee-actions-add-title">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-text">
                        <UserPlus className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 id="employee-actions-add-title" className="text-dynamic-base font-bold text-foreground">{t("emp.add.single")}</h3>
                        <p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{t("emp.actions.add_desc")}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => closeEmployeeActionsThen(handleStartSingleOnboarding)} className={`${primaryButtonClass} w-full`}>
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                      <span>{t("emp.add.single")}</span>
                    </button>
                  </section>
                )}

                {visibleTab === "directory" && canManageDirectory && (
                  <section className={`${surfaceClassName} min-w-0 space-y-3 p-4`} aria-labelledby="employee-actions-import-title">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-text">
                        <Upload className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 id="employee-actions-import-title" className="text-dynamic-base font-bold text-foreground">{t("emp.actions.import_title")}</h3>
                        <p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{t("emp.actions.import_desc")}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button type="button" onClick={() => closeEmployeeActionsThen(() => handleOpenImportModal("CSV"))} className={`${secondaryButtonClass} w-full`}>
                        <FileText className="h-4 w-4 text-accent-text" aria-hidden="true" />
                        <span>{t("emp.actions.import_csv")}</span>
                      </button>
                      <button type="button" onClick={() => closeEmployeeActionsThen(() => handleOpenImportModal("XLSX"))} className={`${secondaryButtonClass} w-full`}>
                        <FileSpreadsheet className="h-4 w-4 text-success-text" aria-hidden="true" />
                        <span>{t("emp.actions.import_xlsx")}</span>
                      </button>
                    </div>
                    <div className="space-y-2 border-t border-theme pt-3">
                      <h4 className="text-dynamic-xs font-bold text-foreground">{t("emp.actions.templates_title")}</h4>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button type="button" disabled={!!templateLoading} onClick={() => void handleDownloadEmployeeTemplate("CSV")} className={`${secondaryButtonClass} w-full disabled:cursor-not-allowed disabled:opacity-50`}>
                          {templateLoading === "CSV" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-accent-text" aria-hidden="true" />}
                          <span>{t("emp.actions.template_csv")}</span>
                        </button>
                        <button type="button" disabled={!!templateLoading} onClick={() => void handleDownloadEmployeeTemplate("XLSX")} className={`${secondaryButtonClass} w-full disabled:cursor-not-allowed disabled:opacity-50`}>
                          {templateLoading === "XLSX" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-success-text" aria-hidden="true" />}
                          <span>{t("emp.actions.template_xlsx")}</span>
                        </button>
                      </div>
                      {importFileErrorKey === "emp.import.error.template_failed" && (
                        <p role="alert" className="text-dynamic-xs font-semibold text-danger-text">{t(importFileErrorKey)}</p>
                      )}
                    </div>
                  </section>
                )}

                {visibleTab === "directory" && canManageDirectory && (
                  <section className={`${surfaceClassName} min-w-0 space-y-3 p-4`} aria-labelledby="employee-actions-export-title">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 id="employee-actions-export-title" className="text-dynamic-base font-bold text-foreground">{t("emp.actions.export_title")}</h3>
                        <p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{t("emp.actions.export_desc")}</p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-surface-elevated px-2.5 py-1 text-dynamic-xs font-semibold text-muted">
                        {t("ui.records")} · {directoryCounts.format(filteredEmployees.length)}
                      </span>
                    </div>
                    {filteredEmployees.length === 0 && (
                      <p className="rounded-lg bg-warning-soft px-3 py-2 text-dynamic-xs text-warning-text">{t("emp.export.empty")}</p>
                    )}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button type="button" disabled={!filteredEmployees.length || !!exportingFormat} onClick={() => void handleExportEmployees("CSV")} aria-label={t("emp.export.csv")} className={`${secondaryButtonClass} w-full disabled:cursor-not-allowed disabled:opacity-50`}>
                        {exportingFormat === "CSV" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-accent-text" aria-hidden="true" />}
                        <span>{exportingFormat === "CSV" ? t("emp.export.loading") : t("emp.export.csv")}</span>
                      </button>
                      <button type="button" disabled={!filteredEmployees.length || !!exportingFormat} onClick={() => void handleExportEmployees("XLSX")} aria-label={t("emp.export.xlsx")} className={`${secondaryButtonClass} w-full disabled:cursor-not-allowed disabled:opacity-50`}>
                        {exportingFormat === "XLSX" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-success-text" aria-hidden="true" />}
                        <span>{exportingFormat === "XLSX" ? t("emp.export.loading") : t("emp.export.xlsx")}</span>
                      </button>
                    </div>
                    {exportError && (
                      <p role="alert" className="text-dynamic-xs font-semibold text-danger-text">{t("emp.export.error")}</p>
                    )}
                  </section>
                )}

                <section className={`${surfaceClassName} min-w-0 space-y-3 p-4`} aria-labelledby="employee-actions-wps-title">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                      <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 id="employee-actions-wps-title" className="text-dynamic-base font-bold text-foreground">{t("emp.actions.wps_title")}</h3>
                      <p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{t("emp.actions.wps_desc")}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => closeEmployeeActionsThen(() => setWpsBatchModalOpen(true))} className={`${secondaryButtonClass} w-full`}>
                    <FileSpreadsheet className="h-4 w-4 text-accent-text" aria-hidden="true" />
                    <span>{t("emp.actions.wps_open")}</span>
                  </button>
                </section>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* RBAC-GATED EMPLOYEE IMPORT WITH ROW/FIELD PREVIEW AND ADD-ONLY CONFIRMATION */}
      {importModalOpen && canManageDirectory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-canvas/80 p-3 backdrop-blur-sm sm:p-5">
          <section ref={importDialogRef} role="dialog" aria-modal="true" aria-labelledby="employee-import-title" tabIndex={-1} className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border-2 border-primary bg-surface shadow-shell">
            <header className="flex items-start justify-between gap-4 border-b border-theme px-4 py-4 sm:px-6">
              <div>
                <h2 id="employee-import-title" className="text-dynamic-xl font-extrabold text-foreground">{t("emp.import.title")}</h2>
                <p className="mt-1 text-dynamic-xs text-muted">{t("emp.import.subtitle")}</p>
              </div>
              <button type="button" onClick={handleCloseImportModal} title={t("emp.import.close")} aria-label={t("emp.import.close")} className={iconButtonClass}>
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              <div className="rounded-xl border border-primary bg-primary-soft p-4">
                <div className="flex items-center gap-2 text-dynamic-sm font-bold text-primary-text">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t("emp.import.safety")}</span>
                </div>
                <p className="mt-1 text-dynamic-xs text-foreground">{t("emp.import.add_only")}</p>
                <p className="mt-1 text-dynamic-xs text-muted">{t("emp.import.duplicate_safety")}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
                <div className="rounded-xl border border-theme bg-surface-elevated p-4">
                  <div className="text-dynamic-sm font-bold text-foreground">{t("emp.import.template_title")}</div>
                  <p className="mt-1 text-dynamic-xs text-muted">{t("emp.import.template_description")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={!!templateLoading} onClick={() => void handleDownloadEmployeeTemplate("XLSX")} className={`${secondaryButtonClass} disabled:opacity-50`}>
                      {templateLoading === "XLSX" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-success-text" />}
                      <span>{t("emp.import.template_xlsx")}</span>
                    </button>
                    <button type="button" disabled={!!templateLoading} onClick={() => void handleDownloadEmployeeTemplate("CSV")} className={`${secondaryButtonClass} disabled:opacity-50`}>
                      {templateLoading === "CSV" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-accent-text" />}
                      <span>{t("emp.import.template_csv")}</span>
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-dashed border-primary bg-surface-elevated p-4">
                  <div className="text-dynamic-sm font-bold text-foreground">{t("emp.import.choose_file")}</div>
                  <p className="mt-1 text-dynamic-xs text-muted">{t(importAcceptedFilesKey)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label htmlFor="employee-import-file" className={`${primaryButtonClass} cursor-pointer`}>
                      <Upload className="h-4 w-4" />
                      <span>{t(importChooseFileKey)}</span>
                    </label>
                    <input id="employee-import-file" type="file" accept={importFileAccept} onChange={handleImportFileChange} disabled={isImportLoading} className="sr-only" />
                    {importFileName && <span className="max-w-full break-all text-dynamic-xs font-medium text-foreground">{importFileName}</span>}
                  </div>
                </div>
              </div>

              {isImportLoading && (
                <div role="status" className="flex items-center gap-2 rounded-xl border border-theme bg-surface-elevated px-4 py-3 text-dynamic-xs font-semibold text-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-primary-text" />
                  <span>{t("emp.import.loading")}</span>
                </div>
              )}
              {importFileErrorKey && (
                <div role="alert" className="rounded-xl border border-danger bg-danger-soft px-4 py-3 text-dynamic-xs font-semibold text-danger-text">
                  {t(importFileErrorKey)}
                </div>
              )}
              {importSuccessCount !== null && (
                <div role="status" className="flex items-center gap-2 rounded-xl border border-success bg-success-soft px-4 py-3 text-dynamic-xs font-semibold text-success-text">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{t("emp.import.added_success")} ({importSuccessCount})</span>
                </div>
              )}

              {importPreview && (
                <section className="space-y-3" aria-label={t("emp.import.preview_title")}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-dynamic-base font-bold text-foreground">{t("emp.import.preview_title")}</h3>
                      <p className="text-dynamic-xs text-muted">{t("emp.import.preview_before_confirm")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-dynamic-xs">
                      <span className="rounded-lg bg-success-soft px-2.5 py-1 font-bold text-success-text">{t("emp.import.valid_rows")}: {importPreview.validEmployees.length}</span>
                      <span className="rounded-lg bg-danger-soft px-2.5 py-1 font-bold text-danger-text">{t("emp.import.error_rows")}: {importPreview.rowPreviews.filter((row) => row.status === "ISSUES").length}</span>
                      <span className="rounded-lg bg-warning-soft px-2.5 py-1 font-bold text-warning-text">{t("emp.import.warning_count")}: {importPreview.warningCount}</span>
                    </div>
                  </div>

                  {(!importPreview.headersFound || importPreview.missingHeaderKeys.length > 0 || importPreview.duplicateHeaderKeys.length > 0 || importPreview.emptyData || importPreview.tooManyRows) && (
                    <div role="alert" className="space-y-2 rounded-xl border border-danger bg-danger-soft p-4 text-dynamic-xs text-danger-text">
                      {!importPreview.headersFound && <div className="font-semibold">{t("emp.import.headers_not_found")}</div>}
                      {importPreview.tooManyRows && <div className="font-semibold">{t("emp.import.too_many_rows")}</div>}
                      {importPreview.emptyData && <div className="font-semibold">{t("emp.import.empty_data")}</div>}
                      {!!importPreview.missingHeaderKeys.length && (
                        <div><span className="font-bold">{t("emp.import.missing_headers")}</span> {importPreview.missingHeaderKeys.map((field) => t(EMPLOYEE_IMPORT_COLUMNS.find((column) => column.key === field)?.labelKey ?? "emp.import.template_field")).join(", ")}</div>
                      )}
                      {!!importPreview.duplicateHeaderKeys.length && (
                        <div><span className="font-bold">{t("emp.import.duplicate_headers")}</span> {importPreview.duplicateHeaderKeys.map((field) => t(EMPLOYEE_IMPORT_COLUMNS.find((column) => column.key === field)?.labelKey ?? "emp.import.template_field")).join(", ")}</div>
                      )}
                    </div>
                  )}
                  {!!importPreview.unknownHeaders.length && (
                    <div className="rounded-xl border border-warning bg-warning-soft px-4 py-3 text-dynamic-xs text-foreground">
                      <span className="font-bold">{t("emp.import.unknown_headers")}</span> {importPreview.unknownHeaders.join(", ")}
                    </div>
                  )}

                  {!!importPreview.rowPreviews.length && (
                    <div className="overflow-hidden rounded-xl border border-theme bg-surface">
                      <div role="region" aria-label={t("emp.import.preview_title")} tabIndex={0} className="max-w-full overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
                        <table className="min-w-[840px] w-full border-collapse text-start">
                          <thead>
                            <tr className="border-b border-theme bg-surface-elevated text-dynamic-xs text-muted">
                              <th className="px-3 py-3 text-start font-bold">{t("emp.import.row")}</th>
                              <th className="px-3 py-3 text-start font-bold">{t("emp.import.employee")}</th>
                              <th className="px-3 py-3 text-start font-bold">{t("emp.import.employee_id")}</th>
                              <th className="px-3 py-3 text-start font-bold">{t("emp.import.result")}</th>
                              <th className="px-3 py-3 text-start font-bold">{t("emp.import.issue")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-theme">
                            {visibleImportRows.map((row) => (
                              <tr key={row.rowNumber} className="align-top">
                                <td className="px-3 py-3 font-mono text-dynamic-xs text-muted">{row.rowNumber}</td>
                                <td className="px-3 py-3 text-dynamic-xs font-semibold text-foreground">{row.employeeLabel}</td>
                                <td className="px-3 py-3 font-mono text-dynamic-xs text-muted">{row.employeeId || "—"}</td>
                                <td className="px-3 py-3">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-dynamic-xs font-bold ${row.status === "READY" ? "bg-success-soft text-success-text" : "bg-danger-soft text-danger-text"}`}>
                                    {row.status === "READY" ? t("emp.import.ready") : t("emp.import.issues")}
                                  </span>
                                </td>
                                <td className="max-w-xl px-3 py-3 text-dynamic-xs">
                                  {row.issues.length ? (
                                    <ul className="space-y-1.5">
                                      {row.issues.map((issue, index) => (
                                        <li key={`${row.rowNumber}-${issue.fieldKey}-${issue.messageKey}-${index}`} className={`leading-relaxed ${issue.severity === "WARNING" ? "text-warning-text" : "text-danger-text"}`}>
                                          <span className="font-bold">{t(getImportFieldLabelKey(issue.fieldKey))}:</span> {t(issue.messageKey)}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : <span className="text-muted">—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {importPageCount > 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-theme px-3 py-3">
                          <span className="text-dynamic-xs text-muted">{t("emp.import.page")} {importPage + 1} {t("emp.import.of")} {importPageCount}</span>
                          <div className="flex gap-2">
                            <button type="button" disabled={importPage === 0} onClick={() => setImportPage((page) => Math.max(0, page - 1))} className={`${secondaryButtonClass} disabled:opacity-50`}>{t("emp.import.previous")}</button>
                            <button type="button" disabled={importPage + 1 >= importPageCount} onClick={() => setImportPage((page) => Math.min(importPageCount - 1, page + 1))} className={`${secondaryButtonClass} disabled:opacity-50`}>{t("emp.import.next")}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}
            </div>

            <footer className="flex flex-col gap-3 border-t border-theme bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              {importPreview && importPreview.validEmployees.length > 0 ? (
                <label className="flex max-w-3xl items-start gap-2 text-dynamic-xs text-foreground">
                  <input type="checkbox" checked={importConfirmChecked} onChange={(event) => setImportConfirmChecked(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
                  <span>{t("emp.import.confirm_label")} <span className="font-bold">{t("emp.import.adding_count")} {importPreview.validEmployees.length}</span></span>
                </label>
              ) : <span className="text-dynamic-xs text-muted">{importSuccessCount === null && !importFileName && !importFileErrorKey ? t("emp.import.no_file") : ""}</span>}
              <div className="flex shrink-0 items-center justify-end gap-2">
                <button type="button" onClick={handleCloseImportModal} className={secondaryButtonClass}>{t("emp.import.close")}</button>
                <button type="button" disabled={!importConfirmChecked || !importPreview?.validEmployees.length || isImportLoading} onClick={handleConfirmEmployeeImport} className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}>
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t("emp.import.confirm_add")}</span>
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {/* SAMA SARIE WPS BULK PAYROLL BATCH (SIF) MODAL */}
      {wpsBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div ref={wpsBatchDialogRef} role="dialog" aria-modal="true" aria-labelledby="wps-batch-title" tabIndex={-1} className="bg-surface border-2 border-primary rounded-2xl max-w-3xl w-full p-4 shadow-shell space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-theme pb-4">
              <div>
                <h2 id="wps-batch-title" className="text-dynamic-xl font-extrabold text-foreground">
                  {t("emp.wps_batch.title")}
                </h2>
                <p role="note" className="mt-1 max-w-xl text-dynamic-xs leading-relaxed text-muted">
                  {t("emp.wps_batch.preview_notice")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWpsBatchModalOpen(false)}
                title={t("doc.action.close")}
                aria-label={t("doc.action.close")}
                className={iconButtonClass}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-primary-soft border border-primary">
                <div className="text-dynamic-xs text-muted">
                  {t("emp.wps_batch.total_net")}
                </div>
                <div className="text-dynamic-xl font-extrabold font-mono text-primary-text pt-0.5">
                  {formatCurrencySAR(totalWpsNetDisbursement)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-surface-elevated border border-theme">
                <div className="text-dynamic-xs text-muted">
                  {t("emp.wps_batch.record_count")}
                </div>
                <div className="text-dynamic-xl font-extrabold font-mono text-foreground pt-0.5">
                  {activeEmployeesForWps.length} EDR
                </div>
              </div>
            </div>

            <div role="region" aria-label={t("emp.import.template_title")} tabIndex={0} className="max-w-full p-4 rounded-xl bg-surface-elevated border border-theme font-mono text-dynamic-xs space-y-1.5 overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
              <div className="text-primary-text font-bold">
                HDR|NOOR-KSA-HRMS|300918273600003|SAR|2026-10-02|
                {activeEmployeesForWps.length}|{totalWpsNetDisbursement.toFixed(2)}
              </div>
              {activeEmployeesForWps.map((emp) => {
                const gosi = calculateGosiContributions(
                  emp.isSaudiNational,
                  emp.basicSalarySar,
                  emp.housingAllowanceSar
                );
                const net =
                  emp.basicSalarySar +
                  emp.housingAllowanceSar +
                  emp.transportAllowanceSar -
                  gosi.employeeDeductionSar;
                return (
                  <div key={emp.id} className="text-foreground whitespace-nowrap">
                    EDR|{emp.nationalIdOrIqama}|{emp.ibanNumber}|SAR|
                    {net.toFixed(2)}|{emp.basicSalarySar.toFixed(2)}|
                    {emp.housingAllowanceSar.toFixed(2)}|
                    {emp.transportAllowanceSar.toFixed(2)}|
                    {gosi.employeeDeductionSar.toFixed(2)}|{emp.qiwaContractId}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
