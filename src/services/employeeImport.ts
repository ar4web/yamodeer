import type { EmployeeRecordBlueprint, EmployeeStatus, NitaqatBand } from "@/data/mockBlueprints";

export type EmployeeImportFieldKey =
  | "id"
  | "nameEn"
  | "nameAr"
  | "nationality"
  | "nationalIdOrIqama"
  | "idExpiryDateGregorian"
  | "idExpiryDateHijri"
  | "jobTitleEn"
  | "jobTitleAr"
  | "departmentCode"
  | "nitaqatClass"
  | "gosiNumber"
  | "qiwaContractId"
  | "basicSalarySar"
  | "housingAllowanceSar"
  | "transportAllowanceSar"
  | "ibanNumber"
  | "status"
  | "locationEn"
  | "locationAr"
  | "laptopTag"
  | "smartBadgeId"
  | "corporateSim";

export interface EmployeeImportColumn {
  key: EmployeeImportFieldKey;
  requiredHeader: boolean;
  labelKey: string;
  requiredValue?: boolean;
  aliases: string[];
  allowedValues?: string[];
}

export interface EmployeeImportIssue {
  rowNumber: number;
  employeeLabel: string;
  fieldKey: EmployeeImportFieldKey | "row" | "header";
  messageKey: string;
  severity: "ERROR" | "WARNING";
}

export interface EmployeeImportPreviewRow {
  rowNumber: number;
  employeeLabel: string;
  employeeId: string;
  status: "READY" | "ISSUES";
  issues: EmployeeImportIssue[];
}

export interface EmployeeImportPreview {
  headerRowNumber: number | null;
  headersFound: boolean;
  missingHeaderKeys: EmployeeImportFieldKey[];
  duplicateHeaderKeys: EmployeeImportFieldKey[];
  unknownHeaders: string[];
  rowPreviews: EmployeeImportPreviewRow[];
  validEmployees: EmployeeRecordBlueprint[];
  errorCount: number;
  warningCount: number;
  emptyData: boolean;
  tooManyRows: boolean;
}

export interface EmployeeExportColumn {
  key: string;
  header: string;
  value: (employee: EmployeeRecordBlueprint) => string | number;
  width?: number;
}

export interface EmployeeImportSourceRow {
  rowNumber: number;
  values: unknown[];
}
type SourceRow = EmployeeImportSourceRow;

const FORMULA_VALUE = "__HRMS_FORMULA_CELL__";
const MAX_IMPORT_ROWS = 5000;

export const EMPLOYEE_IMPORT_COLUMNS: readonly EmployeeImportColumn[] = [
  { key: "id", labelKey: "emp.import.field.employee_id", requiredHeader: false, aliases: ["employee id", "employee id optional", "employee code", "employee number", "emp id", "id", "رقم الموظف", "الرقم الوظيفي", "معرف الموظف", "رقم الموظف اختياري"] },
  { key: "nameEn", labelKey: "emp.import.field.name_en", requiredHeader: true, requiredValue: true, aliases: ["full name english", "employee name english", "name english", "name en", "الاسم بالانجليزية", "الاسم باللغة الانجليزية", "الاسم الكامل بالانجليزية", "الاسم الانجليزي"] },
  { key: "nameAr", labelKey: "emp.import.field.name_ar", requiredHeader: true, requiredValue: true, aliases: ["full name arabic", "employee name arabic", "name arabic", "name ar", "الاسم بالعربية", "الاسم باللغة العربية", "الاسم الكامل بالعربية", "الاسم العربي"] },
  { key: "nationality", labelKey: "emp.import.field.nationality", requiredHeader: true, requiredValue: true, allowedValues: ["SAUDI", "EXPAT"], aliases: ["nationality", "nationality type", "nationality saudi expat", "saudi or expat", "citizenship", "الجنسية", "الجنسية saudi expat", "تصنيف الجنسية"] },
  { key: "nationalIdOrIqama", labelKey: "emp.import.field.national_id", requiredHeader: true, requiredValue: true, aliases: ["national id", "national id or iqama", "national id iqama", "national id iqama number", "id number", "iqama number", "iqama", "nationalidoriqama", "رقم الهوية", "رقم الهوية الاقامة", "رقم الهوية او الاقامة", "رقم الإقامة", "رقم الاقامة"] },
  { key: "idExpiryDateGregorian", labelKey: "emp.import.field.expiry_gregorian", requiredHeader: true, requiredValue: true, aliases: ["id expiry date", "iqama expiry date", "id iqama expiry gregorian", "expiry date gregorian", "id expiry gregorian", "انتهاء الهوية الإقامة ميلادي", "تاريخ انتهاء الهوية", "تاريخ انتهاء الاقامة", "تاريخ الانتهاء الميلادي"] },
  { key: "idExpiryDateHijri", labelKey: "emp.import.field.expiry_hijri", requiredHeader: false, aliases: ["id expiry hijri", "iqama expiry hijri", "id iqama expiry hijri optional", "expiry date hijri", "انتهاء الهوية الإقامة هجري اختياري", "تاريخ الانتهاء الهجري"] },
  { key: "jobTitleEn", labelKey: "emp.import.field.job_title_en", requiredHeader: true, requiredValue: true, aliases: ["job title english", "job title en", "position english", "المسمى الوظيفي بالانجليزية", "المسمى الوظيفي باللغة الانجليزية"] },
  { key: "jobTitleAr", labelKey: "emp.import.field.job_title_ar", requiredHeader: true, requiredValue: true, aliases: ["job title arabic", "job title ar", "position arabic", "المسمى الوظيفي بالعربية", "المسمى الوظيفي باللغة العربية"] },
  { key: "departmentCode", labelKey: "emp.import.field.department_code", requiredHeader: true, requiredValue: true, allowedValues: ["HR_GOV", "FINTECH", "PAYROLL", "PROCURE"], aliases: ["department code", "department", "dept", "department name", "رمز الادارة", "رمز الإدارة", "القسم", "الإدارة", "الادارة"] },
  { key: "nitaqatClass", labelKey: "emp.import.field.nitaqat_band", requiredHeader: true, requiredValue: true, allowedValues: ["PLATINUM", "HIGH_GREEN", "MEDIUM_GREEN", "LOW_GREEN"], aliases: ["nitaqat band", "nitaqat class", "saudization band", "nitaqat", "فئة نطاقات", "تصنيف نطاقات", "نطاقات", "النطاق"] },
  { key: "gosiNumber", labelKey: "emp.import.field.gosi_number", requiredHeader: true, requiredValue: true, aliases: ["gosi number", "gosi subscription number", "gosi id", "رقم التأمينات", "رقم التأمينات الاجتماعية", "رقم اشتراك التأمينات", "رقم الاشتراك"] },
  { key: "qiwaContractId", labelKey: "emp.import.field.qiwa_contract", requiredHeader: true, requiredValue: true, aliases: ["qiwa contract id", "qiwa contract number", "qiwa id", "contract number", "رقم عقد قوى", "رقم عقد قوى الموحد"] },
  { key: "basicSalarySar", labelKey: "emp.import.field.basic_salary", requiredHeader: true, requiredValue: true, aliases: ["basic salary", "basic salary sar", "monthly basic salary", "salary basic", "الراتب الاساسي", "الراتب الأساسي", "الراتب الأساسي ريال"] },
  { key: "housingAllowanceSar", labelKey: "emp.import.field.housing", requiredHeader: true, aliases: ["housing allowance", "housing allowance sar", "بدل السكن", "بدل السكن ريال"] },
  { key: "transportAllowanceSar", labelKey: "emp.import.field.transport", requiredHeader: true, aliases: ["transport allowance", "transport allowance sar", "بدل النقل", "بدل النقل ريال"] },
  { key: "ibanNumber", labelKey: "emp.import.field.iban", requiredHeader: true, requiredValue: true, aliases: ["iban", "iban number", "saudi iban", "wps iban", "رقم الآيبان", "رقم الايبان", "الآيبان السعودي", "آيبان", "ايبان"] },
  { key: "status", labelKey: "emp.import.field.status", requiredHeader: false, allowedValues: ["ACTIVE", "ON_LEAVE", "SUSPENDED"], aliases: ["employment status", "employment status optional", "employee status", "status", "الحالة الوظيفية", "الحالة الوظيفية اختياري", "حالة الموظف", "الحالة"] },
  { key: "locationEn", labelKey: "emp.import.field.location_en", requiredHeader: true, requiredValue: true, aliases: ["location english", "location en", "work location english", "الموقع باللغة الانجليزية", "موقع العمل بالانجليزية"] },
  { key: "locationAr", labelKey: "emp.import.field.location_ar", requiredHeader: true, requiredValue: true, aliases: ["location arabic", "location ar", "work location arabic", "الموقع بالعربية", "موقع العمل بالعربية"] },
  { key: "laptopTag", labelKey: "emp.import.field.laptop_tag", requiredHeader: true, aliases: ["laptop tag", "laptop asset tag", "laptop asset tag optional", "asset tag", "computer asset", "رقم عهدة الحاسب", "رقم الحاسب الاصل اختياري", "رقم الجهاز"] },
  { key: "smartBadgeId", labelKey: "emp.import.field.badge_id", requiredHeader: true, aliases: ["smart badge id", "badge id", "access badge", "access badge id optional", "رقم بطاقة الدخول", "رقم بطاقة الدخول اختياري", "رقم البطاقة"] },
  { key: "corporateSim", labelKey: "emp.import.field.sim", requiredHeader: true, aliases: ["corporate sim", "corporate sim optional", "sim number", "company sim", "رقم شريحة الشركة", "شريحة الشركة اختياري", "رقم الشريحة"] }
];

const REQUIRED_HEADER_KEYS = EMPLOYEE_IMPORT_COLUMNS.filter((column) => column.requiredHeader).map((column) => column.key);

const normalizeArabicDigits = (value: string): string => value
  .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
  .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

const normalizeHeader = (value: string): string => normalizeArabicDigits(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f\u064B-\u065F\u0670]/g, "")
  .replace(/[أإآٱ]/g, "ا")
  .replace(/[ى]/g, "ي")
  .toLocaleLowerCase()
  .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
  .trim();

const ALIAS_TO_KEY = new Map<string, EmployeeImportFieldKey>();
for (const column of EMPLOYEE_IMPORT_COLUMNS) {
  ALIAS_TO_KEY.set(normalizeHeader(column.key), column.key);
  for (const alias of column.aliases) ALIAS_TO_KEY.set(normalizeHeader(alias), column.key);
}

const cellToText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    if (objectValue.formula || objectValue.sharedFormula) return FORMULA_VALUE;
    if (Array.isArray(objectValue.richText)) return objectValue.richText.map((part) => typeof part === "object" && part && "text" in part ? String((part as { text: unknown }).text ?? "") : "").join("");
    if ("text" in objectValue) return String(objectValue.text ?? "");
    if ("result" in objectValue) return cellToText(objectValue.result);
    return "";
  }
  return normalizeArabicDigits(String(value)).trim();
};

const detectCsvDelimiter = (line: string): string => {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let maxCount = -1;
  for (const candidate of candidates) {
    let quoted = false;
    let count = 0;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        if (quoted && line[index + 1] === '"') index += 1;
        else quoted = !quoted;
      } else if (!quoted && char === candidate) count += 1;
    }
    if (count > maxCount) { maxCount = count; best = candidate; }
  }
  return best;
};

const parseCsv = (text: string): SourceRow[] => {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectCsvDelimiter(firstLine);
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (char === '"') {
      if (inQuotes && clean[index + 1] === '"') { currentCell += '"'; index += 1; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && char === delimiter) {
      currentRecord.push(currentCell); currentCell = ""; continue;
    }
    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && clean[index + 1] === "\n") index += 1;
      currentRecord.push(currentCell); records.push(currentRecord); currentRecord = []; currentCell = ""; continue;
    }
    currentCell += char;
  }
  if (currentCell.length || currentRecord.length) { currentRecord.push(currentCell); records.push(currentRecord); }
  return records.map((values, index) => ({ rowNumber: index + 1, values: values.map((value) => value.trim()) }));
};

export const readEmployeeImportFile = async (file: File): Promise<SourceRow[]> => {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") return parseCsv(await file.text());
  if (extension !== "xlsx") throw new Error("emp.import.error.unsupported_file");
  const ExcelJSRuntime = (await import("exceljs")).default;
  const workbook = new ExcelJSRuntime.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("emp.import.error.empty_workbook");
  const rows: SourceRow[] = [];
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values: unknown[] = [];
    for (let column = 1; column <= row.cellCount; column += 1) values.push(cellToText(row.getCell(column).value));
    rows.push({ rowNumber, values });
  });
  return rows;
};

const hasContent = (values: unknown[]): boolean => values.some((value) => cellToText(value).trim() !== "");
const getCell = (row: SourceRow, columnIndex: number | undefined): string => columnIndex === undefined ? "" : cellToText(row.values[columnIndex]).trim();
const duplicateValues = (values: string[]): Set<string> => {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([value]) => value));
};
const parseMoney = (value: string): number | null => {
  if (!value) return null;
  const normalized = normalizeArabicDigits(value).replace(/[٬,\s]/g, "").replace(/[٫]/g, ".").replace(/^(SAR|ر\.س\.?)/i, "");
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
};
const normalizeIdentity = (value: string): string => normalizeArabicDigits(value).replace(/[\s-]/g, "");
const parseDate = (value: string): string | null => {
  const text = value.trim();
  if (!text) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (!iso) return null;
  const year = Number(iso[1]); const month = Number(iso[2]); const day = Number(iso[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};
const normalizeDepartment = (value: string): { code: string; en: string; ar: string } | null => {
  const normalized = normalizeHeader(value).replace(/ /g, "");
  const departments = [
    { code: "HR_GOV", en: "Executive HR & Governance", ar: "الموارد البشرية التنفيذية والحوكمة", aliases: ["HR_GOV", "Executive HR & Governance", "HR Governance", "الموارد البشرية التنفيذية والحوكمة"] },
    { code: "FINTECH", en: "Digital Transformation & FinTech", ar: "التحول الرقمي والتقنية المالية", aliases: ["FINTECH", "Digital Transformation & FinTech", "Finance", "التحول الرقمي والتقنية المالية"] },
    { code: "PAYROLL", en: "Payroll & Statutory Compliance", ar: "الرواتب والامتثال النظامي", aliases: ["PAYROLL", "Payroll & Statutory Compliance", "الرواتب والامتثال النظامي"] },
    { code: "PROCURE", en: "Procurement & Vendor Governance", ar: "المشتريات وحوكمة الموردين", aliases: ["PROCURE", "Procurement & Vendor Governance", "المشتريات وحوكمة الموردين"] }
  ];
  return departments.find((department) => department.aliases.some((alias) => normalizeHeader(alias).replace(/ /g, "") === normalized)) ?? null;
};
const normalizeBand = (value: string): NitaqatBand | null => {
  const normalized = normalizeHeader(value).replace(/ /g, "_");
  if (["platinum", "النطاق_البلاتيني", "بلاتيني"].includes(normalized)) return "PLATINUM";
  if (["high_green", "highgreen", "اخضر_مرتفع", "الاخضر_المرتفع"].includes(normalized)) return "HIGH_GREEN";
  if (["medium_green", "mediumgreen", "اخضر_متوسط", "الاخضر_المتوسط"].includes(normalized)) return "MEDIUM_GREEN";
  if (["low_green", "lowgreen", "اخضر_منخفض", "الاخضر_المنخفض"].includes(normalized)) return "LOW_GREEN";
  return null;
};
const normalizeStatus = (value: string): EmployeeStatus | null => {
  const normalized = normalizeHeader(value).replace(/ /g, "_");
  if (["active", "نشط", "على_راس_العمل", "علي_راس_العمل"].includes(normalized)) return "ACTIVE";
  if (["on_leave", "onleave", "leave", "في_اجازة", "في_إجازة"].includes(normalized)) return "ON_LEAVE";
  if (["suspended", "موقوف", "معلق"].includes(normalized)) return "SUSPENDED";
  return null;
};
const normalizeNationality = (value: string): "SAUDI" | "EXPAT" | null => {
  const normalized = normalizeHeader(value).replace(/ /g, "_");
  if (["saudi", "saudi_national", "saudi_arabia", "ksa", "سعودي", "سعودية", "مواطن_سعودي", "المملكة_العربية_السعودية"].includes(normalized)) return "SAUDI";
  if (["expat", "resident", "non_saudi", "non_saudis", "iqama", "expat_resident", "مقيم", "غير_سعودي", "مقيم_غير_سعودي"].includes(normalized)) return "EXPAT";
  return null;
};
const daysUntil = (isoDate: string): number => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const target = new Date(year, month - 1, day).getTime();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.ceil((target - todayStart) / 86_400_000);
};
const makeEmployeeId = (existingIds: Set<string>, reservedIds: Set<string> = new Set()): string => {
  let maximum = 1000;
  existingIds.forEach((id) => {
    const match = /^EMP-KSA-(\d+)$/i.exec(id);
    if (match) maximum = Math.max(maximum, Number(match[1]));
  });
  let candidate = maximum + 1;
  while (existingIds.has(`emp-ksa-${candidate}`) || reservedIds.has(`emp-ksa-${candidate}`)) candidate += 1;
  const result = `EMP-KSA-${candidate}`;
  existingIds.add(result.toLocaleLowerCase());
  return result;
};

export const buildEmployeeImportPreview = (sourceRows: SourceRow[], employees: EmployeeRecordBlueprint[]): EmployeeImportPreview => {
  const headerLimit = Math.min(sourceRows.length, 10);
  let headerRowIndex = -1;
  let bestScore = 0;
  for (let index = 0; index < headerLimit; index += 1) {
    const score = sourceRows[index].values.reduce<number>((count, value) => count + (ALIAS_TO_KEY.has(normalizeHeader(cellToText(value))) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; headerRowIndex = index; }
  }
  const base: EmployeeImportPreview = {
    headerRowNumber: headerRowIndex >= 0 ? sourceRows[headerRowIndex].rowNumber : null,
    headersFound: bestScore >= 5,
    missingHeaderKeys: [], duplicateHeaderKeys: [], unknownHeaders: [], rowPreviews: [], validEmployees: [],
    errorCount: 0, warningCount: 0, emptyData: false, tooManyRows: false
  };
  if (!base.headersFound || headerRowIndex < 0) {
    base.missingHeaderKeys = [...REQUIRED_HEADER_KEYS];
    base.errorCount = 1;
    return base;
  }

  const headerValues = sourceRows[headerRowIndex].values;
  const columnIndices = new Map<EmployeeImportFieldKey, number>();
  const duplicateKeys = new Set<EmployeeImportFieldKey>();
  const unknownHeaders: string[] = [];
  headerValues.forEach((value, index) => {
    const header = cellToText(value).trim();
    if (!header) return;
    const key = ALIAS_TO_KEY.get(normalizeHeader(header));
    if (!key) { unknownHeaders.push(header); return; }
    if (columnIndices.has(key)) duplicateKeys.add(key);
    else columnIndices.set(key, index);
  });
  base.duplicateHeaderKeys = Array.from(duplicateKeys);
  base.missingHeaderKeys = REQUIRED_HEADER_KEYS.filter((key) => !columnIndices.has(key));
  base.unknownHeaders = unknownHeaders;
  const dataRows = sourceRows.slice(headerRowIndex + 1).filter((row) => hasContent(row.values));
  base.emptyData = dataRows.length === 0;
  if (dataRows.length > MAX_IMPORT_ROWS) {
    base.tooManyRows = true;
    base.errorCount = 1;
    return base;
  }
  if (base.missingHeaderKeys.length || base.duplicateHeaderKeys.length || base.emptyData) {
    base.errorCount = Math.max(1, base.missingHeaderKeys.length + base.duplicateHeaderKeys.length);
    return base;
  }

  const existingIds = new Set(employees.map((employee) => employee.id.trim().toLocaleLowerCase()));
  const existingNationalIds = new Set(employees.map((employee) => normalizeIdentity(employee.nationalIdOrIqama)));
  const existingQiwaIds = new Set(employees.map((employee) => employee.qiwaContractId.trim().toLocaleLowerCase()).filter(Boolean));
  const fileProvidedIds = new Set(dataRows.map((row) => getCell(row, columnIndices.get("id")).toLocaleLowerCase()).filter(Boolean));
  const duplicateFileIds = duplicateValues(dataRows.map((row) => getCell(row, columnIndices.get("id")).toLocaleLowerCase()));
  const duplicateFileNationalIds = duplicateValues(dataRows.map((row) => normalizeIdentity(getCell(row, columnIndices.get("nationalIdOrIqama")))));
  const duplicateFileQiwaIds = duplicateValues(dataRows.map((row) => getCell(row, columnIndices.get("qiwaContractId")).toLocaleLowerCase()));
  const accepted: Array<{ rowNumber: number; employeeLabel: string; employee: EmployeeRecordBlueprint; issues: EmployeeImportIssue[] }> = [];

  for (const row of dataRows) {
    const read = (key: EmployeeImportFieldKey): string => getCell(row, columnIndices.get(key));
    const raw: Record<EmployeeImportFieldKey, string> = Object.fromEntries(EMPLOYEE_IMPORT_COLUMNS.map((column) => [column.key, read(column.key)])) as Record<EmployeeImportFieldKey, string>;
    const name = raw.nameEn || raw.nameAr || `#${row.rowNumber}`;
    const issues: EmployeeImportIssue[] = [];
    const addIssue = (fieldKey: EmployeeImportIssue["fieldKey"], messageKey: string, severity: EmployeeImportIssue["severity"] = "ERROR") => issues.push({ rowNumber: row.rowNumber, employeeLabel: name, fieldKey, messageKey, severity });

    EMPLOYEE_IMPORT_COLUMNS.forEach((column) => {
      if (read(column.key) === FORMULA_VALUE) addIssue(column.key, "emp.import.error.formula_not_allowed");
      if (column.requiredValue && !read(column.key)) addIssue(column.key, "emp.import.error.required");
    });
    const nationality = normalizeNationality(raw.nationality);
    if (raw.nationality && !nationality) addIssue("nationality", "emp.import.error.invalid_nationality");

    const identity = normalizeIdentity(raw.nationalIdOrIqama);
    if (identity && !/^[12]\d{9}$/.test(identity)) addIssue("nationalIdOrIqama", "emp.import.error.invalid_id_format");
    if (identity && nationality === "SAUDI" && !identity.startsWith("1")) addIssue("nationalIdOrIqama", "emp.import.error.nationality_id_mismatch");
    if (identity && nationality === "EXPAT" && !identity.startsWith("2")) addIssue("nationalIdOrIqama", "emp.import.error.nationality_id_mismatch");

    const expiryDate = parseDate(raw.idExpiryDateGregorian);
    if (raw.idExpiryDateGregorian && !expiryDate) addIssue("idExpiryDateGregorian", "emp.import.error.invalid_date");
    if (expiryDate && daysUntil(expiryDate) < 0) addIssue("idExpiryDateGregorian", "emp.import.error.expired_document", "WARNING");
    const department = normalizeDepartment(raw.departmentCode);
    if (raw.departmentCode && !department) addIssue("departmentCode", "emp.import.error.invalid_department");
    const nitaqatClass = normalizeBand(raw.nitaqatClass);
    if (raw.nitaqatClass && !nitaqatClass) addIssue("nitaqatClass", "emp.import.error.invalid_nitaqat");
    const status = raw.status ? normalizeStatus(raw.status) : "ACTIVE";
    if (raw.status && !status) addIssue("status", "emp.import.error.invalid_status");

    const basicSalary = parseMoney(raw.basicSalarySar);
    const housingAllowance = raw.housingAllowanceSar ? parseMoney(raw.housingAllowanceSar) : 0;
    const transportAllowance = raw.transportAllowanceSar ? parseMoney(raw.transportAllowanceSar) : 0;
    if (raw.basicSalarySar && basicSalary === null) addIssue("basicSalarySar", "emp.import.error.invalid_number");
    if (basicSalary !== null && basicSalary <= 0) addIssue("basicSalarySar", "emp.import.error.salary_positive");
    if (raw.housingAllowanceSar && housingAllowance === null) addIssue("housingAllowanceSar", "emp.import.error.invalid_number");
    if (raw.transportAllowanceSar && transportAllowance === null) addIssue("transportAllowanceSar", "emp.import.error.invalid_number");
    if (typeof housingAllowance === "number" && housingAllowance < 0) addIssue("housingAllowanceSar", "emp.import.error.negative_number");
    if (typeof transportAllowance === "number" && transportAllowance < 0) addIssue("transportAllowanceSar", "emp.import.error.negative_number");
    const iban = normalizeArabicDigits(raw.ibanNumber).replace(/\s/g, "").toUpperCase();
    if (iban && !/^SA\d{22}$/.test(iban)) addIssue("ibanNumber", "emp.import.error.invalid_iban");

    const providedId = raw.id.trim();
    const normalizedId = providedId.toLocaleLowerCase();
    if (providedId && existingIds.has(normalizedId)) addIssue("id", "emp.import.error.existing_employee_id");
    if (providedId && duplicateFileIds.has(normalizedId)) addIssue("id", "emp.import.error.duplicate_file_id");
    if (identity && existingNationalIds.has(identity)) addIssue("nationalIdOrIqama", "emp.import.error.existing_identity");
    if (identity && duplicateFileNationalIds.has(identity)) addIssue("nationalIdOrIqama", "emp.import.error.duplicate_file_identity");
    const qiwaId = raw.qiwaContractId.trim().toLocaleLowerCase();
    if (qiwaId && existingQiwaIds.has(qiwaId)) addIssue("qiwaContractId", "emp.import.error.existing_qiwa");
    if (qiwaId && duplicateFileQiwaIds.has(qiwaId)) addIssue("qiwaContractId", "emp.import.error.duplicate_file_qiwa");

    const isSaudiNational = nationality === "SAUDI";
    let previewEmployeeId = providedId;
    if (!issues.some((issue) => issue.severity === "ERROR") && department && nitaqatClass && status && nationality && identity && expiryDate && basicSalary !== null && typeof housingAllowance === "number" && typeof transportAllowance === "number") {
      const employeeId = providedId || makeEmployeeId(existingIds, fileProvidedIds);
      previewEmployeeId = employeeId;
      existingIds.add(employeeId.toLocaleLowerCase());
      const employee: EmployeeRecordBlueprint = {
        id: employeeId,
        name: { en: raw.nameEn.trim(), ar: raw.nameAr.trim() },
        isSaudiNational,
        nationalityLabel: isSaudiNational ? { en: "Saudi Arabia", ar: "المملكة العربية السعودية" } : { en: "Expat Resident (Iqama)", ar: "مقيم (إقامة عمل)" },
        nationalIdOrIqama: identity,
        idExpiryDateGregorian: expiryDate,
        idExpiryDateHijri: raw.idExpiryDateHijri.trim(),
        daysUntilExpiry: daysUntil(expiryDate),
        jobTitle: { en: raw.jobTitleEn.trim(), ar: raw.jobTitleAr.trim() },
        department: { en: department.en, ar: department.ar },
        departmentCode: department.code,
        location: { en: raw.locationEn.trim(), ar: raw.locationAr.trim() },
        nitaqatClass,
        gosiNumber: raw.gosiNumber.trim(),
        qiwaContractId: raw.qiwaContractId.trim(),
        basicSalarySar: basicSalary,
        housingAllowanceSar: housingAllowance,
        transportAllowanceSar: transportAllowance,
        ibanNumber: iban,
        status,
        allocatedAssets: {
          laptopTag: raw.laptopTag.trim(),
          smartBadgeId: raw.smartBadgeId.trim(),
          corporateSim: raw.corporateSim.trim()
        }
      };
      accepted.push({ rowNumber: row.rowNumber, employeeLabel: name, employee, issues });
    }
    base.rowPreviews.push({ rowNumber: row.rowNumber, employeeLabel: name, employeeId: previewEmployeeId, status: issues.some((issue) => issue.severity === "ERROR") ? "ISSUES" : "READY", issues });
  }

  base.validEmployees = accepted.map((entry) => entry.employee);
  base.warningCount = base.rowPreviews.reduce((count, rowPreview) => count + rowPreview.issues.filter((issue) => issue.severity === "WARNING").length, 0);
  base.errorCount = base.rowPreviews.reduce((count, rowPreview) => count + rowPreview.issues.filter((issue) => issue.severity === "ERROR").length, 0);
  return base;
};

const safeSpreadsheetText = (value: string | number): string | number => {
  if (typeof value !== "string") return value;
  return /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
};
const csvCell = (value: string | number): string => {
  const safe = String(safeSpreadsheetText(value));
  return `"${safe.replace(/"/g, '""')}"`;
};
const downloadBlob = (blob: Blob, fileName: string): void => {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
};
const safeFileName = (value: string): string => value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "employees";

export const downloadEmployeeCsv = (employees: EmployeeRecordBlueprint[], columns: EmployeeExportColumn[], fileName: string): void => {
  const csv = [columns.map((column) => csvCell(column.header)).join(","), ...employees.map((employee) => columns.map((column) => csvCell(column.value(employee))).join(","))].join("\r\n");
  downloadBlob(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }), `${safeFileName(fileName)}.csv`);
};

export const downloadEmployeeXlsx = async (employees: EmployeeRecordBlueprint[], columns: EmployeeExportColumn[], fileName: string, sheetName: string): Promise<void> => {
  const ExcelJSRuntime = (await import("exceljs")).default;
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = "YaModeer HRMS";
  workbook.created = new Date();
  workbook.subject = "Employee directory export";
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31));
  sheet.columns = columns.map((column) => ({ header: column.header, key: column.key, width: column.width ?? 22 }));
  employees.forEach((employee) => {
    const record: Record<string, string | number> = {};
    columns.forEach((column) => { record[column.key] = safeSpreadsheetText(column.value(employee)); });
    sheet.addRow(record);
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  if (columns.length && employees.length) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: employees.length + 1, column: columns.length } };
  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${safeFileName(fileName)}.xlsx`);
};

export const downloadEmployeeTemplateXlsx = async (headers: string[], instructionSheetTitle: string, instructionHeaders: [string, string, string], instructions: Array<[string, string, string]>, sheetName: string): Promise<void> => {
  const ExcelJSRuntime = (await import("exceljs")).default;
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = "YaModeer HRMS";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));
  worksheet.addRow(headers);
  worksheet.columns = headers.map((header) => ({ header, width: Math.max(20, Math.min(36, header.length + 5)) }));
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  worksheet.getRow(1).font = { bold: true };
  const instructionsSheet = workbook.addWorksheet(instructionSheetTitle.slice(0, 31));
  instructionsSheet.addRow(instructionHeaders);
  instructions.forEach((row) => instructionsSheet.addRow(row));
  instructionsSheet.columns = [{ width: 34 }, { width: 14 }, { width: 62 }];
  instructionsSheet.views = [{ state: "frozen", ySplit: 1 }];
  instructionsSheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "employee-import-template.xlsx");
};

export const downloadEmployeeTemplateCsv = (headers: string[]): void => {
  const csv = headers.map(csvCell).join(",");
  downloadBlob(new Blob([`\uFEFF${csv}\r\n`], { type: "text/csv;charset=utf-8" }), "employee-import-template.csv");
};
