export const MAX_ROSTER_IMPORT_BYTES = 10 * 1024 * 1024;

export type ImportedRosterStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";

export type RosterImportIssueCode =
  | "UNSUPPORTED_FILE"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_ROWS"
  | "EMPTY_FILE"
  | "MISSING_HEADERS"
  | "DUPLICATE_HEADERS"
  | "EMPTY_REQUIRED_FIELDS"
  | "DUPLICATE_EMPLOYEE_IDS"
  | "DUPLICATE_NATIONAL_IDS"
  | "INVALID_NATIONAL_IDS"
  | "NATIONALITY_ID_PREFIX_MISMATCH"
  | "INVALID_STATUSES"
  | "INVALID_DEPARTMENTS"
  | "INVALID_SALARIES"
  | "DUPLICATE_ID_COLUMN_MISMATCH";

export type RosterImportWarningCode =
  | "BLANK_ROWS_SKIPPED"
  | "DUPLICATE_ID_COLUMN"
  | "UNNAMED_EXTRA_COLUMNS"
  | "LATIN_TEXT_IN_ARABIC_NAME_FIELD"
  | "UNKNOWN_COLUMNS";

export interface RosterImportIssue {
  code: RosterImportIssueCode | RosterImportWarningCode;
  count?: number;
  fields?: string[];
}

export interface RosterDepartmentSummary {
  code: string;
  workforceCount: number;
  activeCount: number;
  onLeaveCount: number;
  inactiveCount: number;
  saudiCount: number;
  expatCount: number;
}

export interface RosterCompanySummary {
  name: string;
  workforceCount: number;
  activeCount: number;
  onLeaveCount: number;
  inactiveCount: number;
  saudiCount: number;
  expatCount: number;
  departments: RosterDepartmentSummary[];
}

/**
 * Dashboard-only summary. Individual names, employee IDs, National IDs/Iqamas,
 * job titles, and salary values are intentionally not retained here.
 */
export interface RosterImportSummary {
  importedAt: string;
  sourceRecordCount: number;
  activeCount: number;
  onLeaveCount: number;
  inactiveCount: number;
  workforceCount: number;
  saudiCount: number;
  expatCount: number;
  departments: RosterDepartmentSummary[];
  companies: RosterCompanySummary[];
  arabicNameFieldCount: number;
  arabicNameArabicScriptCount: number;
}

export interface PartialEmployeeRosterRecord {
  employeeId: string;
  company: string;
  nameEn: string;
  nameAr: string;
  nationality: string;
  nationalIdOrIqama: string;
  departmentCode: string;
  jobTitle: string;
  basicSalarySar: number;
  status: ImportedRosterStatus;
}

export interface RosterImportBundle {
  summary: RosterImportSummary;
  records: PartialEmployeeRosterRecord[];
}

export interface RosterImportPreview {
  ok: boolean;
  rowCount: number;
  blankRowsSkipped: number;
  summary: RosterImportSummary | null;
  records: PartialEmployeeRosterRecord[] | null;
  errors: RosterImportIssue[];
  warnings: RosterImportIssue[];
}

interface MutableDepartmentSummary {
  code: string;
  activeCount: number;
  onLeaveCount: number;
  inactiveCount: number;
  saudiCount: number;
  expatCount: number;
}

interface MutableCompanySummary {
  name: string;
  activeCount: number;
  onLeaveCount: number;
  inactiveCount: number;
  saudiCount: number;
  expatCount: number;
  departments: Map<string, MutableDepartmentSummary>;
}

const CORE_FIELDS = [
  "employeeId",
  "company",
  "nameEn",
  "nameAr",
  "nationality",
  "nationalIdOrIqama",
  "departmentCode",
  "jobTitle",
  "basicSalarySar",
  "status"
] as const;

type CoreField = (typeof CORE_FIELDS)[number];

const FIELD_ALIASES: Record<CoreField, string[]> = {
  employeeId: ["id", "employeeid", "employeecode", "employeenumber"],
  company: ["company", "legalentity", "businessunit"],
  nameEn: ["nameen", "nameenglish", "fullnameenglish"],
  nameAr: ["namear", "namearabic", "fullnamearabic"],
  nationality: ["nationality", "citizenship"],
  nationalIdOrIqama: ["nationalidoriqama", "nationalid", "iqama", "iqamanumber"],
  departmentCode: ["departmentcode", "department", "dept"],
  jobTitle: ["jobtitle", "position"],
  basicSalarySar: ["basicsalarysar", "basicsalary", "monthlybasicsalary"],
  status: ["status", "employmentstatus"]
};

const normalizeHeader = (value: string): string => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase()
  .replace(/[^a-z0-9]+/g, "");

const detectDelimiter = (line: string): string => {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let maximum = -1;
  for (const delimiter of candidates) {
    let quoted = false;
    let count = 0;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (quoted && line[index + 1] === '"') index += 1;
        else quoted = !quoted;
      } else if (!quoted && character === delimiter) {
        count += 1;
      }
    }
    if (count > maximum) {
      maximum = count;
      best = delimiter;
    }
  }
  return best;
};

const parseDelimitedText = (source: string): string[][] => {
  const text = source.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (!quoted && character === delimiter) {
      record.push(cell);
      cell = "";
      continue;
    }
    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      record.push(cell);
      records.push(record);
      record = [];
      cell = "";
      continue;
    }
    cell += character;
  }
  if (cell.length > 0 || record.length > 0) {
    record.push(cell);
    records.push(record);
  }
  return records;
};

const hasContent = (row: string[]): boolean => row.some((cell) => cell.trim() !== "");

const addCount = <Code extends RosterImportIssueCode | RosterImportWarningCode>(
  counts: Map<Code, number>,
  code: Code,
  count = 1
): void => {
  counts.set(code, (counts.get(code) ?? 0) + count);
};

const parseSalary = (raw: string): number | null => {
  const value = raw.trim().replace(/[\s,]/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

const emptyMutableCompany = (name: string): MutableCompanySummary => ({
  name,
  activeCount: 0,
  onLeaveCount: 0,
  inactiveCount: 0,
  saudiCount: 0,
  expatCount: 0,
  departments: new Map()
});

const emptyMutableDepartment = (code: string): MutableDepartmentSummary => ({
  code,
  activeCount: 0,
  onLeaveCount: 0,
  inactiveCount: 0,
  saudiCount: 0,
  expatCount: 0
});

const incrementStatus = (
  bucket: Pick<MutableCompanySummary, "activeCount" | "onLeaveCount" | "inactiveCount"> | Pick<MutableDepartmentSummary, "activeCount" | "onLeaveCount" | "inactiveCount">,
  status: ImportedRosterStatus
): void => {
  if (status === "ACTIVE") bucket.activeCount += 1;
  else if (status === "ON_LEAVE") bucket.onLeaveCount += 1;
  else bucket.inactiveCount += 1;
};

const finalizeDepartment = (value: MutableDepartmentSummary): RosterDepartmentSummary => ({
  ...value,
  workforceCount: value.activeCount + value.onLeaveCount
});

const finalizeCompany = (value: MutableCompanySummary): RosterCompanySummary => ({
  name: value.name,
  activeCount: value.activeCount,
  onLeaveCount: value.onLeaveCount,
  inactiveCount: value.inactiveCount,
  workforceCount: value.activeCount + value.onLeaveCount,
  saudiCount: value.saudiCount,
  expatCount: value.expatCount,
  departments: [...value.departments.values()]
    .map(finalizeDepartment)
    .filter((department) => department.workforceCount > 0)
    .sort((left, right) => right.workforceCount - left.workforceCount || left.code.localeCompare(right.code))
});

const getFieldIndex = (
  field: CoreField,
  headers: string[]
): number[] => {
  const aliases = new Set(FIELD_ALIASES[field]);
  return headers.flatMap((header, index) => aliases.has(normalizeHeader(header)) ? [index] : []);
};

const hasArabicScript = (value: string): boolean => /[\u0600-\u06ff]/.test(value);

export const parseRosterCsvText = (source: string): RosterImportPreview => {
  const records = parseDelimitedText(source);
  const nonblankRecords = records.filter(hasContent);
  if (nonblankRecords.length === 0) {
    return {
      ok: false,
      rowCount: 0,
      blankRowsSkipped: 0,
      summary: null,
      records: null,
      errors: [{ code: "EMPTY_FILE" }],
      warnings: []
    };
  }

  // Permit a few title/notes rows above the table, like the existing employee importer.
  const headerSearch = nonblankRecords.slice(0, 10);
  let header = headerSearch[0];
  let headerScore = -1;
  for (const candidate of headerSearch) {
    const score = CORE_FIELDS.reduce((total, field) => total + (getFieldIndex(field, candidate).length ? 1 : 0), 0);
    if (score > headerScore) {
      header = candidate;
      headerScore = score;
    }
  }
  const headerRecordIndex = records.indexOf(header);
  const errors = new Map<RosterImportIssueCode, number>();
  const warnings = new Map<RosterImportWarningCode, number>();
  const columns = new Map<CoreField, number>();
  const repeatedIdColumns: number[] = [];
  const duplicateHeaderFields: string[] = [];

  for (const field of CORE_FIELDS) {
    const indexes = getFieldIndex(field, header);
    if (indexes.length === 0) continue;
    columns.set(field, indexes[0]);
    if (field === "employeeId" && indexes.length > 1) repeatedIdColumns.push(...indexes.slice(1));
    else if (indexes.length > 1) duplicateHeaderFields.push(field);
  }

  const missingFields = CORE_FIELDS.filter((field) => !columns.has(field));
  if (missingFields.length > 0) errors.set("MISSING_HEADERS", missingFields.length);
  if (duplicateHeaderFields.length > 0) errors.set("DUPLICATE_HEADERS", duplicateHeaderFields.length);
  if (headerScore < 8) errors.set("MISSING_HEADERS", Math.max(errors.get("MISSING_HEADERS") ?? 0, 1));
  if (errors.size > 0) {
    return {
      ok: false,
      rowCount: Math.max(nonblankRecords.length - 1, 0),
      blankRowsSkipped: records.length - nonblankRecords.length,
      summary: null,
      records: null,
      errors: [...errors].map(([code, count]) => ({ code, count, fields: code === "MISSING_HEADERS" ? missingFields : undefined })),
      warnings: []
    };
  }

  const dataRows = records.slice(headerRecordIndex + 1).filter(hasContent);
  const blankRowsSkipped = records.slice(headerRecordIndex + 1).filter((row) => !hasContent(row)).length;
  if (dataRows.length > 5000) {
    return {
      ok: false,
      rowCount: dataRows.length,
      blankRowsSkipped,
      summary: null,
      records: null,
      errors: [{ code: "TOO_MANY_ROWS", count: dataRows.length }],
      warnings: []
    };
  }
  const employeeIdIndex = columns.get("employeeId")!;
  const companyIndex = columns.get("company")!;
  const nameEnIndex = columns.get("nameEn")!;
  const nameArIndex = columns.get("nameAr")!;
  const nationalityIndex = columns.get("nationality")!;
  const identityIndex = columns.get("nationalIdOrIqama")!;
  const departmentIndex = columns.get("departmentCode")!;
  const salaryIndex = columns.get("basicSalarySar")!;
  const jobTitleIndex = columns.get("jobTitle")!;
  const statusIndex = columns.get("status")!;

  const seenEmployeeIds = new Set<string>();
  const seenIdentities = new Set<string>();
  const companyGroups = new Map<string, MutableCompanySummary>();
  const overallDepartments = new Map<string, MutableDepartmentSummary>();
  const overall = emptyMutableCompany("ALL");
  const rowErrors = new Map<RosterImportIssueCode, number>();
  const rosterRecords: PartialEmployeeRosterRecord[] = [];
  let arabicNameFieldCount = 0;
  let arabicNameArabicScriptCount = 0;
  let repeatedIdsMatch = repeatedIdColumns.length > 0;

  for (const row of dataRows) {
    const employeeId = (row[employeeIdIndex] ?? "").trim();
    const company = (row[companyIndex] ?? "").trim();
    const nameEnRaw = row[nameEnIndex] ?? "";
    const nameArRaw = row[nameArIndex] ?? "";
    const nameEn = nameEnRaw.trim();
    const nameAr = nameArRaw.trim();
    const nationalityRaw = row[nationalityIndex] ?? "";
    const nationality = nationalityRaw.trim().toUpperCase();
    const identityRaw = row[identityIndex] ?? "";
    const identity = identityRaw.replace(/[\s-]/g, "");
    const departmentRaw = row[departmentIndex] ?? "";
    const department = departmentRaw.trim().toUpperCase();
    const jobTitleRaw = row[jobTitleIndex] ?? "";
    const salary = parseSalary(row[salaryIndex] ?? "");
    const statusValue = (row[statusIndex] ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");

    if (!employeeId || !company || !nameEn || !nameAr || !nationality || !identity || !department || !jobTitleRaw.trim() || !statusValue) {
      addCount(rowErrors, "EMPTY_REQUIRED_FIELDS");
      continue;
    }
    const normalizedEmployeeId = employeeId.toLocaleLowerCase();
    if (seenEmployeeIds.has(normalizedEmployeeId)) addCount(rowErrors, "DUPLICATE_EMPLOYEE_IDS");
    else seenEmployeeIds.add(normalizedEmployeeId);
    if (seenIdentities.has(identity)) addCount(rowErrors, "DUPLICATE_NATIONAL_IDS");
    else seenIdentities.add(identity);

    if (!/^\d{10}$/.test(identity)) addCount(rowErrors, "INVALID_NATIONAL_IDS");
    const isSaudi = nationality === "SAUDI";
    if (/^\d{10}$/.test(identity) && identity[0] !== (isSaudi ? "1" : "2")) {
      addCount(rowErrors, "NATIONALITY_ID_PREFIX_MISMATCH");
    }
    if (!/^[A-Z0-9]+(?:_[A-Z0-9]+)*$/.test(department)) addCount(rowErrors, "INVALID_DEPARTMENTS");
    if (salary === null) addCount(rowErrors, "INVALID_SALARIES");
    if (!["ACTIVE", "ON_LEAVE", "INACTIVE"].includes(statusValue)) addCount(rowErrors, "INVALID_STATUSES");

    if (repeatedIdColumns.some((index) => (row[index] ?? "").trim() !== employeeId)) repeatedIdsMatch = false;
    arabicNameFieldCount += 1;
    if (hasArabicScript(nameAr)) arabicNameArabicScriptCount += 1;

    if (!companyGroups.has(company)) companyGroups.set(company, emptyMutableCompany(company));
    const companyGroup = companyGroups.get(company)!;
    const status = statusValue as ImportedRosterStatus;
    if (salary !== null && ["ACTIVE", "ON_LEAVE", "INACTIVE"].includes(statusValue)) {
      rosterRecords.push({
        employeeId,
        company,
        nameEn: nameEnRaw,
        nameAr: nameArRaw,
        nationality: nationalityRaw,
        nationalIdOrIqama: identityRaw,
        departmentCode: departmentRaw,
        jobTitle: jobTitleRaw,
        basicSalarySar: salary,
        status
      });
    }
    incrementStatus(overall, status);
    incrementStatus(companyGroup, status);

    const departmentGroup = overallDepartments.get(department) ?? emptyMutableDepartment(department);
    const companyDepartment = companyGroup.departments.get(department) ?? emptyMutableDepartment(department);
    incrementStatus(departmentGroup, status);
    incrementStatus(companyDepartment, status);
    overallDepartments.set(department, departmentGroup);
    companyGroup.departments.set(department, companyDepartment);

    if (status !== "INACTIVE") {
      if (isSaudi) {
        overall.saudiCount += 1;
        companyGroup.saudiCount += 1;
        departmentGroup.saudiCount += 1;
        companyDepartment.saudiCount += 1;
      } else {
        overall.expatCount += 1;
        companyGroup.expatCount += 1;
        departmentGroup.expatCount += 1;
        companyDepartment.expatCount += 1;
      }
    }
  }

  if (rowErrors.size > 0) {
    return {
      ok: false,
      rowCount: dataRows.length,
      blankRowsSkipped,
      summary: null,
      records: null,
      errors: [...rowErrors].map(([code, count]) => ({ code, count })),
      warnings: []
    };
  }
  if (repeatedIdColumns.length > 0 && !repeatedIdsMatch) errors.set("DUPLICATE_ID_COLUMN_MISMATCH", 1);
  if (errors.size > 0) {
    return {
      ok: false,
      rowCount: dataRows.length,
      blankRowsSkipped,
      summary: null,
      records: null,
      errors: [...errors].map(([code, count]) => ({ code, count })),
      warnings: []
    };
  }

  if (blankRowsSkipped > 0) warnings.set("BLANK_ROWS_SKIPPED", blankRowsSkipped);
  if (repeatedIdColumns.length > 0) warnings.set("DUPLICATE_ID_COLUMN", repeatedIdColumns.length);
  const unnamedExtraColumns = header.reduce((count, value, index) => {
    if (value.trim()) return count;
    return dataRows.some((row) => (row[index] ?? "").trim()) ? count + 1 : count;
  }, 0);
  if (unnamedExtraColumns > 0) warnings.set("UNNAMED_EXTRA_COLUMNS", unnamedExtraColumns);
  if (arabicNameArabicScriptCount < arabicNameFieldCount) {
    warnings.set("LATIN_TEXT_IN_ARABIC_NAME_FIELD", arabicNameFieldCount - arabicNameArabicScriptCount);
  }
  const recognizedHeaders = new Set(CORE_FIELDS.flatMap((field) => FIELD_ALIASES[field]));
  const unknownColumns = header.filter((value) => value.trim() && !recognizedHeaders.has(normalizeHeader(value)));
  if (unknownColumns.length > 0) warnings.set("UNKNOWN_COLUMNS", unknownColumns.length);

  const departments = [...overallDepartments.values()]
    .map(finalizeDepartment)
    .filter((department) => department.workforceCount > 0)
    .sort((left, right) => right.workforceCount - left.workforceCount || left.code.localeCompare(right.code));
  const summary: RosterImportSummary = {
    importedAt: new Date().toISOString(),
    sourceRecordCount: dataRows.length,
    activeCount: overall.activeCount,
    onLeaveCount: overall.onLeaveCount,
    inactiveCount: overall.inactiveCount,
    workforceCount: overall.activeCount + overall.onLeaveCount,
    saudiCount: overall.saudiCount,
    expatCount: overall.expatCount,
    departments,
    companies: [...companyGroups.values()]
      .map(finalizeCompany)
      .sort((left, right) => left.name.localeCompare(right.name)),
    arabicNameFieldCount,
    arabicNameArabicScriptCount
  };
  return {
    ok: true,
    rowCount: dataRows.length,
    blankRowsSkipped,
    summary,
    records: rosterRecords,
    errors: [],
    warnings: [...warnings].map(([code, count]) => ({ code, count }))
  };
};

export const previewRosterImportFile = async (file: File): Promise<RosterImportPreview> => {
  if (!/\.(csv|txt)$/i.test(file.name)) {
    return { ok: false, rowCount: 0, blankRowsSkipped: 0, summary: null, records: null, errors: [{ code: "UNSUPPORTED_FILE" }], warnings: [] };
  }
  if (file.size > MAX_ROSTER_IMPORT_BYTES) {
    return { ok: false, rowCount: 0, blankRowsSkipped: 0, summary: null, records: null, errors: [{ code: "FILE_TOO_LARGE" }], warnings: [] };
  }
  return parseRosterCsvText(await file.text());
};

export interface RosterDashboardView {
  companyName: string | null;
  workforceCount: number;
  activeCount: number;
  onLeaveCount: number;
  inactiveCount: number;
  saudiCount: number;
  expatCount: number;
  saudiSharePercent: number | null;
  departments: RosterDepartmentSummary[];
}

export const getRosterDashboardView = (
  summary: RosterImportSummary,
  companyName: string | null
): RosterDashboardView => {
  const selected = companyName ? summary.companies.find((company) => company.name === companyName) : undefined;
  const source = selected ?? summary;
  const workforceCount = source.activeCount + source.onLeaveCount;
  return {
    companyName: selected?.name ?? null,
    workforceCount,
    activeCount: source.activeCount,
    onLeaveCount: source.onLeaveCount,
    inactiveCount: source.inactiveCount,
    saudiCount: source.saudiCount,
    expatCount: source.expatCount,
    saudiSharePercent: workforceCount ? (source.saudiCount / workforceCount) * 100 : null,
    departments: source.departments.filter((department) => department.workforceCount > 0)
  };
};
