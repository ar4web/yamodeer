import React, { useState, useMemo, useEffect } from "react";
import {
  UserCheck,
  UserPlus,
  Upload,
  FileText,
  Loader2,
  ShieldCheck,
  FileBadge,
  Wallet,
  Laptop,
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
import { DataTableFrame, FilterDrawerEdgeTrigger, FilterDrawerTrigger, HorizontalBarChart, iconButtonClass, MetricCard, PageHeader, ResponsiveFilterDrawer, SegmentedTabs, TabPanel, primaryButtonClass, secondaryButtonClass } from "@/components/DesignSystem";
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

interface EmployeeModuleProps {
  employees: EmployeeRecordBlueprint[];
  onAddEmployee: (newEmp: EmployeeRecordBlueprint) => void;
  onAddEmployees: (newEmps: EmployeeRecordBlueprint[]) => void;
  onUpdateEmployee?: (updatedEmp: EmployeeRecordBlueprint) => void;
  globalSearchQuery: string;
}

const createEmptyOnboardingForm = () => ({
  nameEn: "",
  nameAr: "",
  isSaudiNational: true,
  jobTitleEn: "",
  jobTitleAr: "",
  departmentCode: "FINTECH",
  nationalIdOrIqama: "",
  idExpiryDateGregorian: "",
  qiwaContractId: "",
  gosiNumber: "",
  passportAndMedical: "",
  basicSalarySar: 0,
  housingAllowanceSar: 0,
  transportAllowanceSar: 0,
  ibanNumber: "",
  laptopTag: "",
  smartBadgeId: "",
  corporateSim: "",
  vpnToken: ""
});

const MAX_EMPLOYEE_IMPORT_BYTES = 10 * 1024 * 1024;
const EMPLOYEE_IMPORT_PAGE_SIZE = 20;
const readNonNegativeNumberInput = (rawValue: string): number | null => {
  if (rawValue === "") return 0;
  const value = Number(rawValue);
  return Number.isFinite(value) && value >= 0 ? value : null;
};
const normalizeKsaDigits = (value: string): string => value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
const normalizeEmployeeIdentity = (value: string): string => normalizeKsaDigits(value).replace(/[\s-]/g, "");

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
  if (status === "ACTIVE") return "bg-success-soft text-success";
  if (status === "ON_LEAVE") return "bg-warning-soft text-warning";
  return "bg-danger-soft text-danger";
};

const getDocumentExpiryPresentation = (daysUntilExpiry: number) => {
  if (daysUntilExpiry <= 30) {
    return { labelKey: "emp.expiry.critical", className: "bg-danger-soft text-danger" };
  }
  if (daysUntilExpiry <= 90) {
    return { labelKey: "emp.expiry.warning", className: "bg-warning-soft text-warning" };
  }
  return { labelKey: "emp.expiry.compliant", className: "bg-success-soft text-success" };
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
  const [importModalOpen, setImportModalOpen] = useState(false);
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

  // 4-Step Onboarding Wizard State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [wizardSuccess, setWizardSuccess] = useState(false);

  const [formState, setFormState] = useState(createEmptyOnboardingForm);

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

  // Live KSA Legal ID & IBAN Validators for Onboarding Wizard
  const isIdValid = useMemo(() => {
    const clean = normalizeKsaDigits(formState.nationalIdOrIqama.trim());
    if (!/^[12]\d{9}$/.test(clean)) return false;
    if (formState.isSaudiNational && !clean.startsWith("1")) return false;
    if (!formState.isSaudiNational && !clean.startsWith("2")) return false;
    return true;
  }, [formState.nationalIdOrIqama, formState.isSaudiNational]);

  const isIbanValid = useMemo(() => {
    const clean = formState.ibanNumber.trim().replace(/\s/g, "").toUpperCase();
    return /^SA\d{22}$/.test(clean);
  }, [formState.ibanNumber]);

  const normalizedOnboardingIdentity = normalizeEmployeeIdentity(formState.nationalIdOrIqama.trim());
  const isIdentityDuplicate = employees.some((employee) => normalizeEmployeeIdentity(employee.nationalIdOrIqama) === normalizedOnboardingIdentity);
  const isQiwaContractDuplicate = !!formState.qiwaContractId.trim() && employees.some((employee) => employee.qiwaContractId.toLocaleLowerCase() === formState.qiwaContractId.trim().toLocaleLowerCase());
  const expiryParts = formState.idExpiryDateGregorian.split("-").map(Number);
  const parsedExpiryDate = new Date(Date.UTC(expiryParts[0] || 0, (expiryParts[1] || 1) - 1, expiryParts[2] || 1));
  const isExpiryDateValid = /^\d{4}-\d{2}-\d{2}$/.test(formState.idExpiryDateGregorian) && parsedExpiryDate.toISOString().slice(0, 10) === formState.idExpiryDateGregorian;
  const housingAllowanceValid = Number.isFinite(Number(formState.housingAllowanceSar)) && Number(formState.housingAllowanceSar) >= 0;
  const transportAllowanceValid = Number.isFinite(Number(formState.transportAllowanceSar)) && Number(formState.transportAllowanceSar) >= 0;
  const missingNewHireFieldKeys = [
    !formState.nameEn.trim() ? "wiz.field.name_en" : null,
    !formState.nameAr.trim() ? "wiz.field.name_ar" : null,
    !formState.jobTitleEn.trim() ? "wiz.field.job_title_en" : null,
    !formState.jobTitleAr.trim() ? "wiz.field.job_title_ar" : null,
    !isIdValid ? "wiz.field.id_number" : null,
    !isExpiryDateValid ? "wiz.field.expiry_date" : null,
    !formState.gosiNumber.trim() ? "wiz.field.gosi_number" : null,
    !formState.qiwaContractId.trim() ? "wiz.field.qiwa_contract" : null,
    !(Number(formState.basicSalarySar) > 0) ? "wiz.field.basic_salary" : null,
    !housingAllowanceValid ? "wiz.field.housing" : null,
    !transportAllowanceValid ? "wiz.field.transport" : null,
    !isIbanValid ? "wiz.field.iban" : null
  ].filter((fieldKey): fieldKey is string => !!fieldKey);
  const canCommitNewHire = missingNewHireFieldKeys.length === 0 && !isIdentityDuplicate && !isQiwaContractDuplicate;

  const wizardGosiPreview = useMemo(
    () =>
      calculateGosiContributions(
        formState.isSaudiNational,
        Number(formState.basicSalarySar) || 0,
        Number(formState.housingAllowanceSar) || 0
      ),
    [formState.isSaudiNational, formState.basicSalarySar, formState.housingAllowanceSar]
  );

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

  const attendanceForEmployees = attendanceRecords
    .map((record) => ({
      record,
      employee: employees.find((item) => item.id === record.employeeId)
    }))
    .filter((row): row is { record: typeof attendanceRecords[number]; employee: EmployeeRecordBlueprint } => !!row.employee);
  const attendanceCounts: Record<AttendanceStatus, number> = {
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
    const currentExp = new Date(emp.idExpiryDateGregorian);
    currentExp.setFullYear(currentExp.getFullYear() + 1);
    const nextIso = currentExp.toISOString().slice(0, 10);

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

  const handleCommitNewHire = () => {
    if (!canCommitNewHire || isIdentityDuplicate || isQiwaContractDuplicate) return;
    const deptNames: Record<string, { en: string; ar: string }> = {
      HR_GOV: { en: "Executive HR & Governance", ar: "الموارد البشرية التنفيذية والحوكمة" },
      FINTECH: { en: "Digital Transformation & FinTech", ar: "التحول الرقمي والتقنية المالية" },
      PAYROLL: { en: "Payroll & Statutory Compliance", ar: "الرواتب والامتثال النظامي" },
      PROCURE: { en: "Procurement & Vendor Governance", ar: "المشتريات وحوكمة الموردين" }
    };
    const usedIds = new Set(employees.map((employee) => employee.id.toLocaleLowerCase()));
    const maxId = employees.reduce((maximum, employee) => {
      const match = /^EMP-KSA-(\d+)$/i.exec(employee.id);
      return match ? Math.max(maximum, Number(match[1])) : maximum;
    }, 1000);
    let sequence = maxId + 1;
    while (usedIds.has(`emp-ksa-${sequence}`)) sequence += 1;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const expiryParts = formState.idExpiryDateGregorian.split("-").map(Number);
    const expiryStart = new Date(expiryParts[0], expiryParts[1] - 1, expiryParts[2]).getTime();
    const diffDays = Math.ceil((expiryStart - todayStart) / 86_400_000);
    const cleanIban = formState.ibanNumber.replace(/\s/g, "").toUpperCase();
    const department = deptNames[formState.departmentCode] || deptNames.FINTECH;

    const newRecord: EmployeeRecordBlueprint = {
      id: `EMP-KSA-${sequence}`,
      name: { en: formState.nameEn.trim(), ar: formState.nameAr.trim() },
      isSaudiNational: formState.isSaudiNational,
      nationalityLabel: formState.isSaudiNational
        ? { en: "Saudi Arabia", ar: "المملكة العربية السعودية" }
        : { en: "Expat Resident (Iqama)", ar: "مقيم (إقامة عمل)" },
      nationalIdOrIqama: normalizedOnboardingIdentity,
      idExpiryDateGregorian: formState.idExpiryDateGregorian,
      idExpiryDateHijri: "",
      daysUntilExpiry: diffDays,
      jobTitle: { en: formState.jobTitleEn.trim(), ar: formState.jobTitleAr.trim() },
      department,
      departmentCode: formState.departmentCode,
      location: { en: "Riyadh KAFD HQ", ar: "الرياض — مقر كافد" },
      nitaqatClass: "PLATINUM" as NitaqatBand,
      gosiNumber: formState.gosiNumber.trim(),
      qiwaContractId: formState.qiwaContractId.trim(),
      basicSalarySar: Number(formState.basicSalarySar),
      housingAllowanceSar: Number(formState.housingAllowanceSar),
      transportAllowanceSar: Number(formState.transportAllowanceSar),
      ibanNumber: cleanIban,
      status: "ACTIVE",
      allocatedAssets: {
        laptopTag: formState.laptopTag.trim(),
        smartBadgeId: formState.smartBadgeId.trim(),
        corporateSim: formState.corporateSim.trim()
      }
    };

    onAddEmployee(newRecord);
    setWizardSuccess(true);
    setTimeout(() => {
      setWizardSuccess(false);
      setActiveTab("directory");
      setWizardStep(1);
      setFormState(createEmptyOnboardingForm());
    }, 1800);
  };

  const canOnboard =
    hasPermission("hr:onboard_new_hire") && moduleToggles.onboardingWizardEnabled;
  const canViewPayroll =
    hasPermission("payroll:configure_constants") || hasPermission("route:accounts");
  const canManageDirectory = hasPermission("hr:directory_full_manage");
  const canManageTeamLeave = hasPermission("dept:manage_team_leave_ot");

  const employeeDirectoryColumns: EmployeeDirectoryColumn[] = [
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
      render: (employee) => <bdi dir="ltr" className="font-mono tabular-nums text-foreground">{directoryCounts.format(employee.daysUntilExpiry)}</bdi>
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
          onClick={() => setSelectedDossierId(employee.id)}
          title={`${t("emp.btn.view_details")} ${localize(employee.name)}`}
          aria-label={`${t("emp.btn.view_details")} ${localize(employee.name)}`}
          className={`${secondaryButtonClass} min-h-9 gap-1.5 px-3 py-1.5 text-dynamic-xs`}
        >
          <Eye className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="whitespace-nowrap">{t("emp.btn.view_details")}</span>
        </button>
      )
    }
  ];
  const employeeDirectoryTableWidth = employeeDirectoryColumns.reduce((total, column) => total + column.width, 0);

  const handleStartSingleOnboarding = () => {
    if (!canOnboard) return;
    setFormState(createEmptyOnboardingForm());
    setWizardStep(1);
    setWizardSuccess(false);
    setActiveTab("onboarding");
  };

  const handleOpenImportModal = () => {
    if (!canManageDirectory) return;
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
    setImportSourceRows(null);
    setImportFileName("");
    setImportFileErrorKey(null);
    setImportConfirmChecked(false);
  };

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
              <>
                <FilterDrawerTrigger
                  label={t("ui.filters")}
                  controls="employee-directory-filters"
                  expanded={filterDrawerOpen}
                  activeCount={(deptFilter === "ALL" ? 0 : 1) + (statusFilter === "ALL" ? 0 : 1) + (expiryFilter === "ALL" ? 0 : 1)}
                  onClick={() => setFilterDrawerOpen(true)}
                  className="md:hidden"
                />
                {canManageDirectory && (
                  <>
                    <button type="button" onClick={handleOpenImportModal} className={secondaryButtonClass}>
                      <Upload className="h-4 w-4 text-primary" />
                      <span>{t("emp.import.open")}</span>
                    </button>
                    <button type="button" disabled={!filteredEmployees.length || !!exportingFormat} onClick={() => void handleExportEmployees("CSV")} aria-label={t("emp.export.csv")} className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}>
                      {exportingFormat === "CSV" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-accent" />}
                      <span>{exportingFormat === "CSV" ? t("emp.export.loading") : t("emp.export.csv")}</span>
                    </button>
                    <button type="button" disabled={!filteredEmployees.length || !!exportingFormat} onClick={() => void handleExportEmployees("XLSX")} aria-label={t("emp.export.xlsx")} className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}>
                      {exportingFormat === "XLSX" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-success" />}
                      <span>{exportingFormat === "XLSX" ? t("emp.export.loading") : t("emp.export.xlsx")}</span>
                    </button>
                  </>
                )}
              </>
            )}
            {canOnboard && (
              <button type="button" onClick={handleStartSingleOnboarding} className={primaryButtonClass}>
                <UserPlus className="h-4 w-4" />
                <span>{t("emp.add.single")}</span>
              </button>
            )}
            <button type="button" onClick={() => setWpsBatchModalOpen(true)} className={secondaryButtonClass}>
              <FileSpreadsheet className="h-4 w-4 text-accent" />
              <span>{t("emp.btn.bulk_wps")}</span>
            </button>
          </div>
        )}
      />

      {visibleTab === "directory" && (
        <div className="hidden w-full flex-wrap items-center justify-end gap-2 xl:flex">
          <select aria-label={t("emp.filter.all_depts")} value={deptFilter} onChange={(event) => setDeptFilter(event.target.value)} className="h-10 min-w-40 bg-surface-elevated px-3 text-dynamic-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="ALL">{t("emp.filter.all_depts")}</option>
            <option value="HR_GOV">{t("dept.HR_GOV")}</option>
            <option value="FINTECH">{t("dept.FINTECH")}</option>
            <option value="PAYROLL">{t("dept.PAYROLL")}</option>
            <option value="PROCURE">{t("dept.PROCURE")}</option>
          </select>
          <select aria-label={t("emp.filter.all_status")} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | EmployeeStatus)} className="h-10 min-w-36 bg-surface-elevated px-3 text-dynamic-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="ALL">{t("emp.filter.all_status")}</option>
            <option value="ACTIVE">{t("emp.status.ACTIVE")}</option>
            <option value="ON_LEAVE">{t("emp.status.ON_LEAVE")}</option>
            <option value="SUSPENDED">{t("emp.status.SUSPENDED")}</option>
          </select>
          <select aria-label={t("emp.filter.all_expiry")} value={expiryFilter} onChange={(event) => setExpiryFilter(event.target.value as "ALL" | "EXPIRING_90" | "CRITICAL_30")} className="h-10 min-w-40 bg-surface-elevated px-3 text-dynamic-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
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
          <select aria-label={t("emp.filter.all_depts")} value={deptFilter} onChange={(event) => setDeptFilter(event.target.value)} className="h-11 w-full border border-theme bg-surface-elevated px-3 text-dynamic-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="ALL">{t("emp.filter.all_depts")}</option>
            <option value="HR_GOV">{t("dept.HR_GOV")}</option>
            <option value="FINTECH">{t("dept.FINTECH")}</option>
            <option value="PAYROLL">{t("dept.PAYROLL")}</option>
            <option value="PROCURE">{t("dept.PROCURE")}</option>
          </select>
        </label>
        <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
          <span>{t("emp.filter.all_status")}</span>
          <select aria-label={t("emp.filter.all_status")} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | EmployeeStatus)} className="h-11 w-full border border-theme bg-surface-elevated px-3 text-dynamic-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="ALL">{t("emp.filter.all_status")}</option>
            <option value="ACTIVE">{t("emp.status.ACTIVE")}</option>
            <option value="ON_LEAVE">{t("emp.status.ON_LEAVE")}</option>
            <option value="SUSPENDED">{t("emp.status.SUSPENDED")}</option>
          </select>
        </label>
        <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
          <span>{t("emp.filter.all_expiry")}</span>
          <select aria-label={t("emp.filter.all_expiry")} value={expiryFilter} onChange={(event) => setExpiryFilter(event.target.value as "ALL" | "EXPIRING_90" | "CRITICAL_30")} className="h-11 w-full border border-theme bg-surface-elevated px-3 text-dynamic-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="ALL">{t("emp.filter.all_expiry")}</option>
            <option value="EXPIRING_90">{t("emp.filter.expiring_90")}</option>
            <option value="CRITICAL_30">{t("emp.filter.critical_30")}</option>
          </select>
        </label>
        <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
          <span>{t("ui.sort_by")}</span>
          <select aria-label={t("ui.sort_by")} value={sortBy} onChange={(event) => setSortBy(event.target.value as EmployeeSortKey)} className="h-11 w-full border border-theme bg-surface-elevated px-3 text-dynamic-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
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
            <div role="alert" className="rounded-xl border border-danger bg-danger-soft px-4 py-3 text-dynamic-xs font-semibold text-danger">
              {t("emp.export.error")}
            </div>
          )}

          <DataTableFrame
            title={t("emp.table.title")}
            description={directoryTableDescription}
            count={filteredEmployees.length}
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
                            onClick={() => toggleDirectorySort(column.sortColumn!)}
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
                {filteredEmployees.map((employee) => (
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
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={employeeDirectoryColumns.length} role="status" aria-live="polite" className="border border-theme px-5 py-8 text-center text-dynamic-sm text-muted">
                      {t("ui.no_results")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </DataTableFrame>
          </div>
        </TabPanel>

      <TabPanel hidden={visibleTab !== "payroll" || !canViewPayroll} id="people-payroll-panel" labelledBy={canViewPayroll ? "people-payroll-tab" : undefined}>
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
            <section className="xl:col-span-4 rounded-2xl border border-theme bg-surface p-4 shadow-card space-y-4">
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
                        <td className="py-3 px-3 text-end font-mono text-dynamic-xs text-danger">{formatCurrencySAR(gosi.employeeDeductionSar)}</td>
                        <td className="py-3 px-3 text-end font-mono text-dynamic-xs text-muted">{formatCurrencySAR(gosi.employerContributionSar)}</td>
                        <td className="py-3 ps-3 pe-4 text-end font-mono text-dynamic-xs font-bold text-primary">{formatCurrencySAR(net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTableFrame>
            </div>
          </div>
        </div>
      </TabPanel>

      <TabPanel hidden={visibleTab !== "attendance"} id="people-attendance-panel" labelledBy="people-attendance-tab">
        <div className="space-y-4">
          <h2 className="text-dynamic-lg font-semibold text-foreground">{t("emp.attendance.heading")}</h2>
          {hasPermission("self_service:geofence_punch") && (
            <section className="space-y-4 bg-shell-nav p-4 text-shell-nav-foreground shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-shell-nav-elevated text-shell-nav-foreground">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-dynamic-base font-semibold text-shell-nav-foreground">{t("shell.geofence_status")}</h3>
                    <p className="text-dynamic-xs text-shell-nav-muted">{localize(activeOffice.city)}</p>
                  </div>
                </div>
                <span role="status" className={`inline-flex items-center gap-2 text-dynamic-xs font-semibold ${isGeoVerified ? "text-shell-nav-foreground" : "text-warning"}`}>
                  <span className={`h-2 w-2 ${isGeoVerified ? "bg-accent" : "bg-warning"}`} aria-hidden="true" />
                  {t(isGeoVerified ? "shell.location_verified" : "shell.location_review")}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="min-w-0 bg-shell-nav-elevated px-3 py-2.5">
                  <span className="block text-dynamic-xs text-shell-nav-muted">{t("geo.distance")}</span>
                  <span className="mt-1 block truncate font-mono text-dynamic-base font-semibold tabular-nums text-shell-nav-foreground">{calculatedDistanceMeters}m</span>
                </div>
                <div className="min-w-0 bg-shell-nav-elevated px-3 py-2.5">
                  <span className="block text-dynamic-xs text-shell-nav-muted">{t("geo.accuracy")}</span>
                  <span className={`mt-1 block font-mono text-dynamic-base font-semibold tabular-nums ${capturedCoords.accuracyMeters > 15 ? "text-warning" : "text-shell-nav-foreground"}`}>±{capturedCoords.accuracyMeters}m</span>
                </div>
                <div className="min-w-0 bg-shell-nav-elevated px-3 py-2.5">
                  <span className="block text-dynamic-xs text-shell-nav-muted">{t("emp.attendance.col.status")}</span>
                  <span className="mt-1 flex items-center gap-2 font-mono text-dynamic-base font-semibold text-shell-nav-foreground">
                    <Navigation className="h-4 w-4" aria-hidden="true" />
                    {t(isClockedIn ? "shell.clocked_in_badge" : "shell.clock_in_btn")}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setGeofenceModalOpen(true)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 bg-shell-nav-foreground px-3 text-dynamic-xs font-semibold text-shell-nav transition-colors hover:bg-surface"
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
            <section className="xl:col-span-4 rounded-2xl border border-theme bg-surface p-4 shadow-card space-y-4">
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
                        <td className="py-3 px-3"><span className={`rounded-full px-2.5 py-1 text-dynamic-xs font-semibold ${record.status === "PRESENT" ? "bg-success-soft text-success" : record.status === "LATE" ? "bg-warning-soft text-warning" : record.status === "ABSENT" ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"}`}>{t(`emp.attendance.status.${record.status}`)}</span></td>
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
            <section className="xl:col-span-4 rounded-2xl border border-theme bg-surface p-4 shadow-card space-y-4">
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
                        <td className="py-3 px-3 text-end font-mono text-dynamic-xs font-bold text-primary">{review.score}% · {t(review.score >= 90 ? "emp.performance.rating.excellent" : review.score >= 80 ? "emp.performance.rating.strong" : "emp.performance.rating.developing")}</td>
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
                      <td className="py-3 px-3"><span className={`rounded-full px-2.5 py-1 text-dynamic-xs font-semibold ${request.status === "PENDING" ? "bg-warning-soft text-warning" : request.status === "APPROVED" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{t(`emp.workflow.status.${request.status}`)}</span></td>
                      <td className="py-3 ps-3 pe-4 text-end">
                        {request.status === "PENDING" && canManageDirectory ? (
                          <div className="flex justify-end gap-1.5">
                            <button type="button" onClick={() => updateTransferStatus(request.id, "APPROVED")} className="rounded-lg bg-success px-2.5 py-1 text-dynamic-xs font-semibold text-on-primary">{t("emp.workflow.approve")}</button>
                            <button type="button" onClick={() => updateTransferStatus(request.id, "REJECTED")} className="rounded-lg bg-danger px-2.5 py-1 text-dynamic-xs font-semibold text-on-primary">{t("emp.workflow.reject")}</button>
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
                      <td className="py-3 px-3"><span className={`rounded-full px-2.5 py-1 text-dynamic-xs font-semibold ${request.status === "PENDING" ? "bg-warning-soft text-warning" : request.status === "APPROVED" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{t(`emp.workflow.status.${request.status}`)}</span></td>
                      <td className="py-3 ps-3 pe-4 text-end">
                        {request.status === "PENDING" && (canManageDirectory || (request.type === "LEAVE" && canManageTeamLeave)) ? (
                          <div className="flex justify-end gap-1.5">
                            <button type="button" onClick={() => updateEmployeeRequestStatus(request.id, "APPROVED")} className="rounded-lg bg-success px-2.5 py-1 text-dynamic-xs font-semibold text-on-primary">{t("emp.workflow.approve")}</button>
                            <button type="button" onClick={() => updateEmployeeRequestStatus(request.id, "REJECTED")} className="rounded-lg bg-danger px-2.5 py-1 text-dynamic-xs font-semibold text-on-primary">{t("emp.workflow.reject")}</button>
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

      {/* TAB 2: 4-STEP KSA ONBOARDING WIZARD */}
      <TabPanel hidden={visibleTab !== "onboarding" || !canOnboard} id="people-onboarding-panel" labelledBy={canOnboard ? "people-onboarding-tab" : undefined}>
        <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
          {/* Step Progress Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(
              [
                [1, "wiz.step1.title", "wiz.step1.desc", UserCheck],
                [2, "wiz.step2.title", "wiz.step2.desc", FileBadge],
                [3, "wiz.step3.title", "wiz.step3.desc", Wallet],
                [4, "wiz.step4.title", "wiz.step4.desc", Laptop]
              ] as const
            ).map(([stepNum, titleKey, descKey, StepIcon]) => {
              const isActive = wizardStep === stepNum;
              const isDone = wizardStep > stepNum;
              return (
                <button
                  key={stepNum}
                  type="button"
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => setWizardStep(stepNum)}
                  className={`p-4 rounded-xl border text-start transition flex items-start gap-3 ${
                    isActive
                      ? "bg-primary-soft border-primary text-foreground"
                      : isDone
                      ? "bg-success-soft border-success text-foreground"
                      : "bg-surface-elevated border-theme text-muted"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive
                        ? "bg-primary text-on-primary"
                        : isDone
                        ? "bg-success text-on-primary"
                        : "bg-surface text-muted"
                    }`}
                  >
                    <StepIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-dynamic-sm font-bold">{t(titleKey)}</div>
                    <div className="text-dynamic-xs opacity-80">{t(descKey)}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {wizardSuccess && (
            <div className="p-4 rounded-xl bg-success-soft border border-success text-success font-bold text-dynamic-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>{t("wiz.success_banner")}</span>
            </div>
          )}

          {/* Step 1: Personal Profile */}
          {wizardStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("wiz.field.name_en")}
                </label>
                <input aria-label={t("wiz.field.name_en")}
                  type="text"
                  value={formState.nameEn}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, nameEn: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("wiz.field.name_ar")}
                </label>
                <input aria-label={t("wiz.field.name_ar")}
                  type="text"
                  value={formState.nameAr}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, nameAr: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("wiz.field.nationality")}
                </label>
                <select aria-label={t("wiz.field.nationality")}
                  value={formState.isSaudiNational ? "SAUDI" : "EXPAT"}
                  onChange={(e) => {
                    const isSaudi = e.target.value === "SAUDI";
                    setFormState((p) => ({
                      ...p,
                      isSaudiNational: isSaudi,
                      nationalIdOrIqama: ""
                    }));
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                >
                  <option value="SAUDI">{t("wiz.field.saudi_citizen")}</option>
                  <option value="EXPAT">{t("wiz.field.expat_resident")}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("wiz.field.department")}
                </label>
                <select aria-label={t("wiz.field.department")}
                  value={formState.departmentCode}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, departmentCode: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                >
                  <option value="FINTECH">{t("dept.FINTECH")}</option>
                  <option value="HR_GOV">{t("dept.HR_GOV")}</option>
                  <option value="PAYROLL">{t("dept.PAYROLL")}</option>
                  <option value="PROCURE">{t("dept.PROCURE")}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("wiz.field.job_title_en")}
                </label>
                <input aria-label={t("wiz.field.job_title_en")}
                  type="text"
                  value={formState.jobTitleEn}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, jobTitleEn: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("wiz.field.job_title_ar")}
                </label>
                <input aria-label={t("wiz.field.job_title_ar")}
                  type="text"
                  value={formState.jobTitleAr}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, jobTitleAr: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                />
              </div>
            </div>
          )}

          {/* Step 2: KSA Legal Documents with 10-Digit Prefix Validation */}
          {wizardStep === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("wiz.field.id_number")}
                </label>
                <input aria-label={t("wiz.field.id_number")}
                  type="text"
                  maxLength={10}
                  value={formState.nationalIdOrIqama}
                  onChange={(e) =>
                    setFormState((p) => ({
                      ...p,
                      nationalIdOrIqama: e.target.value
                    }))
                  }
                  className={`w-full px-4 py-2.5 rounded-xl bg-surface-elevated border font-mono text-dynamic-sm text-foreground ${
                    isIdValid ? "border-success" : "border-danger"
                  }`}
                />
                <div
                  className={`text-dynamic-xs font-semibold ${
                    isIdValid && !isIdentityDuplicate ? "text-success" : "text-danger"
                  }`}
                >
                  {isIdentityDuplicate
                    ? t("wiz.validation.identity_exists")
                    : isIdValid
                      ? formState.isSaudiNational
                        ? t("wiz.validation.id_valid_saudi")
                        : t("wiz.validation.id_valid_expat")
                      : t("wiz.validation.id_invalid")}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("wiz.field.expiry_date")}
                </label>
                <input aria-label={t("wiz.field.expiry_date")}
                  type="date"
                  value={formState.idExpiryDateGregorian}
                  onChange={(e) =>
                    setFormState((p) => ({
                      ...p,
                      idExpiryDateGregorian: e.target.value
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("wiz.field.qiwa_contract")}
                </label>
                <input aria-label={t("wiz.field.qiwa_contract")}
                  type="text"
                  value={formState.qiwaContractId}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, qiwaContractId: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                />
                {isQiwaContractDuplicate && <div role="alert" className="text-dynamic-xs font-semibold text-danger">{t("wiz.validation.qiwa_exists")}</div>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("wiz.field.gosi_number")}
                </label>
                <input aria-label={t("wiz.field.gosi_number")}
                  type="text"
                  value={formState.gosiNumber}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, gosiNumber: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("wiz.field.passport_no")}
                </label>
                <input aria-label={t("wiz.field.passport_no")}
                  type="text"
                  value={formState.passportAndMedical}
                  onChange={(e) =>
                    setFormState((p) => ({
                      ...p,
                      passportAndMedical: e.target.value
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                />
              </div>
            </div>
          )}

          {/* Step 3: Compensation Structure */}
          {wizardStep === 3 && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-dynamic-xs font-bold text-muted">
                    {t("wiz.field.basic_salary")}
                  </label>
                  <input aria-label={t("wiz.field.basic_salary")}
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.basicSalarySar}
                    onChange={(e) => {
                      const basic = readNonNegativeNumberInput(e.target.value);
                      if (basic === null) return;
                      setFormState((p) => ({
                        ...p,
                        basicSalarySar: basic,
                        housingAllowanceSar: Math.round(basic * 0.25),
                        transportAllowanceSar: Math.round(basic * 0.1)
                      }));
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-dynamic-xs font-bold text-muted">
                    {t("wiz.field.housing")}
                  </label>
                  <input aria-label={t("wiz.field.housing")}
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.housingAllowanceSar}
                    onChange={(e) => {
                      const value = readNonNegativeNumberInput(e.target.value);
                      if (value === null) return;
                      setFormState((p) => ({ ...p, housingAllowanceSar: value }));
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-dynamic-xs font-bold text-muted">
                    {t("wiz.field.transport")}
                  </label>
                  <input aria-label={t("wiz.field.transport")}
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.transportAllowanceSar}
                    onChange={(e) => {
                      const value = readNonNegativeNumberInput(e.target.value);
                      if (value === null) return;
                      setFormState((p) => ({ ...p, transportAllowanceSar: value }));
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-dynamic-xs font-bold text-muted">
                    {t("wiz.field.iban")}
                  </label>
                  <input aria-label={t("wiz.field.iban")}
                    type="text"
                    maxLength={24}
                    value={formState.ibanNumber}
                    onChange={(e) =>
                      setFormState((p) => ({ ...p, ibanNumber: e.target.value }))
                    }
                    className={`w-full px-4 py-2.5 rounded-xl bg-surface-elevated border font-mono text-dynamic-sm text-foreground ${
                      isIbanValid ? "border-success" : "border-danger"
                    }`}
                  />
                  <div
                    className={`text-dynamic-xs font-semibold ${
                      isIbanValid ? "text-success" : "text-danger"
                    }`}
                  >
                    {isIbanValid
                      ? t("wiz.validation.iban_valid")
                      : t("wiz.validation.iban_invalid")}
                  </div>
                </div>
              </div>

              {/* Conditional GOSI Split Preview Box */}
              <div className="p-4 rounded-2xl bg-primary-soft border border-primary space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-dynamic-sm font-bold text-primary">
                    {t("wiz.gosi_preview")}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-dynamic-xs font-bold">
                    {formState.isSaudiNational
                      ? t("emp.badge.saudi")
                      : t("emp.badge.expat")}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-surface border border-theme">
                    <div className="text-dynamic-xs text-muted">
                      {t("comp.gosi.emp_share")} ({wizardGosiPreview.employeeRatePercent}%)
                    </div>
                    <div className="text-dynamic-base font-extrabold text-foreground">
                      {formatCurrencySAR(wizardGosiPreview.employeeDeductionSar)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-theme">
                    <div className="text-dynamic-xs text-muted">
                      {t("comp.gosi.co_share")} ({wizardGosiPreview.employerRatePercent}%)
                    </div>
                    <div className="text-dynamic-base font-extrabold text-foreground">
                      {formatCurrencySAR(wizardGosiPreview.employerContributionSar)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-theme">
                    <div className="text-dynamic-xs text-muted">
                      {t("comp.gosi.net_impact")}
                    </div>
                    <div className="text-dynamic-base font-extrabold text-primary">
                      {formatCurrencySAR(wizardGosiPreview.totalGosiRemittanceSar)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Asset Allocation */}
          {wizardStep === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("wiz.field.laptop_tag")}
                </label>
                <input aria-label={t("wiz.field.laptop_tag")}
                  type="text"
                  value={formState.laptopTag}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, laptopTag: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("wiz.field.badge_id")}
                </label>
                <input aria-label={t("wiz.field.badge_id")}
                  type="text"
                  value={formState.smartBadgeId}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, smartBadgeId: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("wiz.field.sim_card")}
                </label>
                <input aria-label={t("wiz.field.sim_card")}
                  type="text"
                  value={formState.corporateSim}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, corporateSim: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("wiz.field.vpn_token")}
                </label>
                <input aria-label={t("wiz.field.vpn_token")}
                  type="text"
                  value={formState.vpnToken}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, vpnToken: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                />
              </div>
            </div>
          )}

          {wizardStep === 4 && !canCommitNewHire && (
            <div role="alert" className="rounded-xl border border-warning bg-warning-soft px-4 py-3 text-dynamic-xs text-foreground space-y-1">
              <div className="font-bold">{t("wiz.validation.missing_fields")}</div>
              {!!missingNewHireFieldKeys.length && <div>{missingNewHireFieldKeys.map((fieldKey) => t(fieldKey)).join(" · ")}</div>}
              {isIdentityDuplicate && <div className="font-semibold text-danger">{t("wiz.validation.identity_exists")}</div>}
              {isQiwaContractDuplicate && <div className="font-semibold text-danger">{t("wiz.validation.qiwa_exists")}</div>}
            </div>
          )}

          {/* Wizard Navigation Footer */}
          <div className="flex items-center justify-between border-t border-theme pt-4">
            <button
              type="button"
              disabled={wizardStep === 1}
              onClick={() =>
                setWizardStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : 1))
              }
              className={secondaryButtonClass}
            >
              {direction === "rtl" ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
              <span>{t("wiz.btn.prev")}</span>
            </button>

            {wizardStep < 4 ? (
              <button
                type="button"
                onClick={() =>
                  setWizardStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : 4))
                }
                className={primaryButtonClass}
              >
                <span>{t("wiz.btn.next")}</span>
                {direction === "rtl" ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canCommitNewHire}
                onClick={handleCommitNewHire}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 bg-success px-4 py-2 text-dynamic-sm font-bold text-on-primary transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{t("wiz.btn.commit")}</span>
              </button>
            )}
          </div>
        </div>
        </TabPanel>

      {/* 360° EMPLOYEE LEGAL, GOSI & CUSTODY DOSSIER MODAL */}
      {selectedDossierEmployee && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-primary rounded-2xl max-w-3xl w-full p-4 shadow-shell space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-theme pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-primary-soft text-primary font-mono font-bold text-dynamic-xs">
                  {selectedDossierEmployee.id} •{" "}
                  {selectedDossierEmployee.qiwaContractId}
                </span>
                <h2 className="text-dynamic-xl font-extrabold text-foreground pt-1">
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
              <div className="p-3.5 rounded-xl bg-success-soft border border-success text-success font-bold text-dynamic-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{t("emp.dossier.renew_success")}</span>
              </div>
            )}

            {/* Section 1: Legal Identity & Muqeem / Qiwa Renewal */}
            <div className="p-4 rounded-2xl bg-surface-elevated border border-theme space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-dynamic-xs font-bold text-primary uppercase">
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
                  <div className="text-accent">
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
                  <div className="text-dynamic-xs font-bold text-primary uppercase">
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
                      <div className="text-dynamic-sm font-extrabold font-mono text-danger pt-0.5">
                        {formatCurrencySAR(gosi.employeeDeductionSar)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-theme">
                      <div className="text-dynamic-xs text-muted">
                        {t("comp.gosi.co_share")} ({gosi.employerRatePercent}%)
                      </div>
                      <div className="text-dynamic-sm font-extrabold font-mono text-accent pt-0.5">
                        {formatCurrencySAR(gosi.employerContributionSar)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-theme">
                      <div className="text-dynamic-xs text-muted">
                        5-Yr EOSB Award
                      </div>
                      <div className="text-dynamic-sm font-extrabold font-mono text-success pt-0.5">
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
              <div className="text-dynamic-xs font-bold text-primary uppercase">
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

      {/* RBAC-GATED EMPLOYEE IMPORT WITH ROW/FIELD PREVIEW AND ADD-ONLY CONFIRMATION */}
      {importModalOpen && canManageDirectory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-canvas/80 p-3 backdrop-blur-sm sm:p-5">
          <section role="dialog" aria-modal="true" aria-labelledby="employee-import-title" className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border-2 border-primary bg-surface shadow-shell">
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
                <div className="flex items-center gap-2 text-dynamic-sm font-bold text-primary">
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
                      {templateLoading === "XLSX" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-success" />}
                      <span>{t("emp.import.template_xlsx")}</span>
                    </button>
                    <button type="button" disabled={!!templateLoading} onClick={() => void handleDownloadEmployeeTemplate("CSV")} className={`${secondaryButtonClass} disabled:opacity-50`}>
                      {templateLoading === "CSV" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-accent" />}
                      <span>{t("emp.import.template_csv")}</span>
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-dashed border-primary bg-surface-elevated p-4">
                  <div className="text-dynamic-sm font-bold text-foreground">{t("emp.import.choose_file")}</div>
                  <p className="mt-1 text-dynamic-xs text-muted">{t("emp.import.accepted_files")}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label htmlFor="employee-import-file" className={`${primaryButtonClass} cursor-pointer`}>
                      <Upload className="h-4 w-4" />
                      <span>{t("emp.import.choose_file")}</span>
                    </label>
                    <input id="employee-import-file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleImportFileChange} disabled={isImportLoading} className="sr-only" />
                    {importFileName && <span className="max-w-full break-all text-dynamic-xs font-medium text-foreground">{importFileName}</span>}
                  </div>
                </div>
              </div>

              {isImportLoading && (
                <div role="status" className="flex items-center gap-2 rounded-xl border border-theme bg-surface-elevated px-4 py-3 text-dynamic-xs font-semibold text-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>{t("emp.import.loading")}</span>
                </div>
              )}
              {importFileErrorKey && (
                <div role="alert" className="rounded-xl border border-danger bg-danger-soft px-4 py-3 text-dynamic-xs font-semibold text-danger">
                  {t(importFileErrorKey)}
                </div>
              )}
              {importSuccessCount !== null && (
                <div role="status" className="flex items-center gap-2 rounded-xl border border-success bg-success-soft px-4 py-3 text-dynamic-xs font-semibold text-success">
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
                      <span className="rounded-lg bg-success-soft px-2.5 py-1 font-bold text-success">{t("emp.import.valid_rows")}: {importPreview.validEmployees.length}</span>
                      <span className="rounded-lg bg-danger-soft px-2.5 py-1 font-bold text-danger">{t("emp.import.error_rows")}: {importPreview.rowPreviews.filter((row) => row.status === "ISSUES").length}</span>
                      <span className="rounded-lg bg-warning-soft px-2.5 py-1 font-bold text-warning">{t("emp.import.warning_count")}: {importPreview.warningCount}</span>
                    </div>
                  </div>

                  {(!importPreview.headersFound || importPreview.missingHeaderKeys.length > 0 || importPreview.duplicateHeaderKeys.length > 0 || importPreview.emptyData || importPreview.tooManyRows) && (
                    <div role="alert" className="space-y-2 rounded-xl border border-danger bg-danger-soft p-4 text-dynamic-xs text-danger">
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
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-dynamic-xs font-bold ${row.status === "READY" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                                    {row.status === "READY" ? t("emp.import.ready") : t("emp.import.issues")}
                                  </span>
                                </td>
                                <td className="max-w-xl px-3 py-3 text-dynamic-xs">
                                  {row.issues.length ? (
                                    <ul className="space-y-1.5">
                                      {row.issues.map((issue, index) => (
                                        <li key={`${row.rowNumber}-${issue.fieldKey}-${issue.messageKey}-${index}`} className={`leading-relaxed ${issue.severity === "WARNING" ? "text-warning" : "text-danger"}`}>
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
          <div className="bg-surface border-2 border-primary rounded-2xl max-w-3xl w-full p-4 shadow-shell space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-theme pb-4">
              <div>
                <h2 className="text-dynamic-xl font-extrabold text-foreground">
                  {t("emp.wps_batch.title")}
                </h2>
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
                <div className="text-dynamic-xl font-extrabold font-mono text-primary pt-0.5">
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
              <div className="text-primary font-bold">
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
