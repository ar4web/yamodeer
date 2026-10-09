import { BilingualText } from "@/context/LanguageContext";

/**
 * 4A. KSA LABOR LAW COMPLIANCE FRAMEWORK (KSA_LABOR_LAW_CONSTANTS)
 * Strictly implements Royal Decree No. M/51 and architecture-rules.json math rules.
 */
export const KSA_LABOR_LAW_CONSTANTS = {
  workingHours: {
    standardDailyMaxHours: 8,
    standardWeeklyMaxHours: 48,
    ramadanDailyMaxHours: 6,
    ramadanWeeklyMaxHours: 36,
    daysInPayrollMonth: 30
  },
  overtimeMultipliers: {
    standardMultiplier: 1.5, // (Basic Salary / 30 / 8) * Hours * 1.5
    holidayBaseMultiplier: 1.5,
    holidayAdditionalPremiumModifier: 0.5 // 1.5x basic wage + additional 50% premium modifier
  },
  gosiRates: {
    SAUDI: {
      employeeRate: 0.10, // 10% Employee Deduction
      employerRate: 0.10, // 10% Employer Contribution
      description: {
        en: "Saudi National (10% Employee / 10% Employer GOSI Annuity & SANED)",
        ar: "مواطن سعودي (10% استقطاع الموظف / 10% مساهمة صاحب العمل)"
      }
    },
    EXPAT: {
      employeeRate: 0.0, // 0% Employee Deduction
      employerRate: 0.02, // Strictly 2% Employer Occupational Hazards Only
      description: {
        en: "Expat Resident (0% Employee / 2% Employer Occupational Hazards Only)",
        ar: "مقيم غير سعودي (0% على الموظف / 2% أخطار مهنية على صاحب العمل فقط)"
      }
    }
  },
  eosbRules: {
    firstFiveYearsMonthlyFactor: 0.5, // 1/2 month wage per year for first 5 years
    subsequentYearsMonthlyFactor: 1.0, // 1 full month wage per year after 5 years
    resignationTiers: {
      underTwoYears: 0.0,
      twoToFiveYears: 1 / 3, // 33.33%
      fiveToTenYears: 2 / 3, // 66.67%
      tenPlusYears: 1.0 // 100%
    },
    layoffOrExpiryMultiplier: 1.0 // 100% full entitlement
  }
} as const;

export interface OvertimeCalculationResult {
  hourlyBasicRate: number;
  standardOvertimePay: number;
  holidayBaseOvertimePay: number;
  holidayPremiumSupplementPay: number;
  holidayTotalPay: number;
  grandTotalOvertimePay: number;
}

/**
 * Standardized KSA Overtime Engine:
 * - Standard OT: (Basic Salary / 30 / 8) * Hours * 1.5
 * - Friday / Official Public Holiday: 1.5x basic wage + additional 50% premium modifier
 */
const assertFiniteNonNegative = (fieldName: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${fieldName} must be a finite, non-negative number`);
  }
};

/** Round a SAR value to the nearest halala. */
export function roundSarToHalala(amountSar: number): number {
  assertFiniteNonNegative("amountSar", amountSar);
  const halala = (amountSar + Number.EPSILON) * 100;
  if (!Number.isFinite(halala) || halala > Number.MAX_SAFE_INTEGER) {
    throw new RangeError("amountSar exceeds the safe halala precision range");
  }
  return Math.round(halala) / 100;
}

/** Calculate VAT using explicit halala precision. */
export function calculateVatAmountSar(
  taxableSubtotalSar: number,
  vatRate: number = 0.15
): number {
  assertFiniteNonNegative("taxableSubtotalSar", taxableSubtotalSar);
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 1) {
    throw new RangeError("vatRate must be a finite value between 0 and 1");
  }
  return roundSarToHalala(taxableSubtotalSar * vatRate);
}

export function calculateKsaOvertime(
  basicSalarySar: number,
  standardOvertimeHours: number,
  holidayOrFridayHours: number
): OvertimeCalculationResult {
  assertFiniteNonNegative("basicSalarySar", basicSalarySar);
  assertFiniteNonNegative("standardOvertimeHours", standardOvertimeHours);
  assertFiniteNonNegative("holidayOrFridayHours", holidayOrFridayHours);

  const hourlyBasicRate =
    basicSalarySar /
    KSA_LABOR_LAW_CONSTANTS.workingHours.daysInPayrollMonth /
    KSA_LABOR_LAW_CONSTANTS.workingHours.standardDailyMaxHours;

  const standardOvertimePay =
    (basicSalarySar / 30 / 8) *
    standardOvertimeHours *
    KSA_LABOR_LAW_CONSTANTS.overtimeMultipliers.standardMultiplier;

  const holidayBaseOvertimePay =
    (basicSalarySar / 30 / 8) *
    holidayOrFridayHours *
    KSA_LABOR_LAW_CONSTANTS.overtimeMultipliers.holidayBaseMultiplier;

  const holidayPremiumSupplementPay =
    (basicSalarySar / 30 / 8) *
    holidayOrFridayHours *
    KSA_LABOR_LAW_CONSTANTS.overtimeMultipliers.holidayAdditionalPremiumModifier;

  const holidayTotalPay = holidayBaseOvertimePay + holidayPremiumSupplementPay;

  return {
    hourlyBasicRate: roundSarToHalala(hourlyBasicRate),
    standardOvertimePay: roundSarToHalala(standardOvertimePay),
    holidayBaseOvertimePay: roundSarToHalala(holidayBaseOvertimePay),
    holidayPremiumSupplementPay: roundSarToHalala(holidayPremiumSupplementPay),
    holidayTotalPay: roundSarToHalala(holidayTotalPay),
    grandTotalOvertimePay: roundSarToHalala(standardOvertimePay + holidayTotalPay)
  };
}

export interface GosiCalculationResult {
  contributoryWageBase: number;
  employeeDeductionSar: number;
  employerContributionSar: number;
  totalGosiRemittanceSar: number;
  employeeRatePercent: number;
  employerRatePercent: number;
}

/**
 * Conditional GOSI Deduction Engine:
 * - Saudi Citizen: 10% employee / 10% employer
 * - Expat Resident: 0% employee / 2% employer occupational hazards-only
 */
export function calculateGosiContributions(
  isSaudiNational: boolean,
  basicSalarySar: number,
  housingAllowanceSar: number
): GosiCalculationResult {
  assertFiniteNonNegative("basicSalarySar", basicSalarySar);
  assertFiniteNonNegative("housingAllowanceSar", housingAllowanceSar);
  const contributoryWageBase = roundSarToHalala(
    Math.min(basicSalarySar + housingAllowanceSar, 45000)
  );
  const schema = isSaudiNational
    ? KSA_LABOR_LAW_CONSTANTS.gosiRates.SAUDI
    : KSA_LABOR_LAW_CONSTANTS.gosiRates.EXPAT;

  const employeeDeductionSar = roundSarToHalala(
    contributoryWageBase * schema.employeeRate
  );
  const employerContributionSar = roundSarToHalala(
    contributoryWageBase * schema.employerRate
  );

  return {
    contributoryWageBase,
    employeeDeductionSar,
    employerContributionSar,
    totalGosiRemittanceSar: roundSarToHalala(
      employeeDeductionSar + employerContributionSar
    ),
    employeeRatePercent: schema.employeeRate * 100,
    employerRatePercent: schema.employerRate * 100
  };
}

export type TerminationReasonType = "LAYOFF_OR_EXPIRY" | "RESIGNATION";

export interface EosbCalculationResult {
  firstFiveYearsAward: number;
  subsequentYearsAward: number;
  grossUnadjustedAward: number;
  statutoryModifierRatio: number;
  statutoryModifierPercent: number;
  netPayableEosbSar: number;
}

/**
 * End-of-Service Benefits (EOSB) Calculator Engine (Articles 84 & 85)
 */
export function calculateKsaEOSB(
  lastGrossMonthlyWageSar: number,
  serviceDurationYears: number,
  reason: TerminationReasonType
): EosbCalculationResult {
  assertFiniteNonNegative("lastGrossMonthlyWageSar", lastGrossMonthlyWageSar);
  assertFiniteNonNegative("serviceDurationYears", serviceDurationYears);
  if (reason !== "LAYOFF_OR_EXPIRY" && reason !== "RESIGNATION") {
    throw new TypeError("reason must be a supported KSA EOSB termination reason");
  }
  const firstFiveYears = Math.min(serviceDurationYears, 5);
  const subsequentYears = Math.max(serviceDurationYears - 5, 0);

  const firstFiveYearsAward =
    firstFiveYears *
    KSA_LABOR_LAW_CONSTANTS.eosbRules.firstFiveYearsMonthlyFactor *
    lastGrossMonthlyWageSar;

  const subsequentYearsAward =
    subsequentYears *
    KSA_LABOR_LAW_CONSTANTS.eosbRules.subsequentYearsMonthlyFactor *
    lastGrossMonthlyWageSar;

  const grossUnadjustedAward = firstFiveYearsAward + subsequentYearsAward;

  let statutoryModifierRatio = 1.0;
  if (reason === "RESIGNATION") {
    if (serviceDurationYears < 2) {
      statutoryModifierRatio = KSA_LABOR_LAW_CONSTANTS.eosbRules.resignationTiers.underTwoYears;
    } else if (serviceDurationYears < 5) {
      statutoryModifierRatio = KSA_LABOR_LAW_CONSTANTS.eosbRules.resignationTiers.twoToFiveYears;
    } else if (serviceDurationYears < 10) {
      statutoryModifierRatio = KSA_LABOR_LAW_CONSTANTS.eosbRules.resignationTiers.fiveToTenYears;
    } else {
      statutoryModifierRatio = KSA_LABOR_LAW_CONSTANTS.eosbRules.resignationTiers.tenPlusYears;
    }
  } else {
    statutoryModifierRatio = KSA_LABOR_LAW_CONSTANTS.eosbRules.layoffOrExpiryMultiplier;
  }

  const netPayableEosbSar = grossUnadjustedAward * statutoryModifierRatio;

  return {
    firstFiveYearsAward: roundSarToHalala(firstFiveYearsAward),
    subsequentYearsAward: roundSarToHalala(subsequentYearsAward),
    grossUnadjustedAward: roundSarToHalala(grossUnadjustedAward),
    statutoryModifierRatio,
    statutoryModifierPercent: Number((statutoryModifierRatio * 100).toFixed(2)),
    netPayableEosbSar: roundSarToHalala(netPayableEosbSar)
  };
}

/**
 * 3A. MASTER EMPLOYEE DIRECTORY BLUEPRINT DATA
 */
export type NitaqatBand = "PLATINUM" | "HIGH_GREEN" | "MEDIUM_GREEN" | "LOW_GREEN";
export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "SUSPENDED";

export interface EmployeeRecordBlueprint {
  id: string;
  name: BilingualText;
  isSaudiNational: boolean;
  nationalityLabel: BilingualText;
  nationalIdOrIqama: string; // 10xxxxxxx for Saudi, 2xxxxxxxx for Expat Iqama
  idExpiryDateGregorian: string; // YYYY-MM-DD (relative to 2026-10-02)
  idExpiryDateHijri: string;
  daysUntilExpiry: number;
  jobTitle: BilingualText;
  department: BilingualText;
  departmentCode: string;
  location: BilingualText;
  nitaqatClass: NitaqatBand;
  gosiNumber: string;
  qiwaContractId: string;
  basicSalarySar: number;
  housingAllowanceSar: number;
  transportAllowanceSar: number;
  ibanNumber: string;
  status: EmployeeStatus;
  allocatedAssets: {
    laptopTag: string;
    smartBadgeId: string;
    corporateSim: string;
  };
}

export const EMPLOYEE_GRID_BLUEPRINT: EmployeeRecordBlueprint[] = [
  {
    id: "EMP-KSA-1001",
    name: { en: "Tariq bin Abdulaziz Al-Qahtani", ar: "طارق بن عبدالعزيز القحطاني" },
    isSaudiNational: true,
    nationalityLabel: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    nationalIdOrIqama: "1084920174",
    idExpiryDateGregorian: "2029-05-14",
    idExpiryDateHijri: "1450-12-29",
    daysUntilExpiry: 955,
    jobTitle: { en: "VP of People & Saudization Strategy", ar: "نائب الرئيس لاستراتيجية الموارد البشرية والتوطين" },
    department: { en: "Executive HR & Governance", ar: "الموارد البشرية التنفيذية والحوكمة" },
    departmentCode: "HR_GOV",
    location: { en: "Riyadh KAFD HQ", ar: "الرياض — مقر كافد" },
    nitaqatClass: "PLATINUM",
    gosiNumber: "GOSI-491028341",
    qiwaContractId: "QIWA-2026-88412",
    basicSalarySar: 34000,
    housingAllowanceSar: 8500,
    transportAllowanceSar: 3400,
    ibanNumber: "SA4420000001234567891001",
    status: "ACTIVE",
    allocatedAssets: {
      laptopTag: "KSA-MBP16-9901",
      smartBadgeId: "KAFD-SEC-4011",
      corporateSim: "STC-550192831"
    }
  },
  {
    id: "EMP-KSA-1002",
    name: { en: "Eng. Mahmoud El-Sayed Mansour", ar: "م. محمود السيد منصور" },
    isSaudiNational: false,
    nationalityLabel: { en: "Egypt (Expat Iqama)", ar: "مصر (إقامة عمل)" },
    nationalIdOrIqama: "2419084512",
    idExpiryDateGregorian: "2026-10-19",
    idExpiryDateHijri: "1448-05-08",
    daysUntilExpiry: 17, // < 30 days CRITICAL flag!
    jobTitle: { en: "Principal ZATCA Cryptographic Architect", ar: "كبير مهندسي تشفير الفوترة الإلكترونية (زاتكا)" },
    department: { en: "Digital Transformation & FinTech", ar: "التحول الرقمي والتقنية المالية" },
    departmentCode: "FINTECH",
    location: { en: "Riyadh KAFD HQ", ar: "الرياض — مقر كافد" },
    nitaqatClass: "PLATINUM",
    gosiNumber: "GOSI-882910442",
    qiwaContractId: "QIWA-2026-44109",
    basicSalarySar: 26000,
    housingAllowanceSar: 6500,
    transportAllowanceSar: 2600,
    ibanNumber: "SA8180000009876543211002",
    status: "ACTIVE",
    allocatedAssets: {
      laptopTag: "KSA-THINK-8821",
      smartBadgeId: "KAFD-SEC-4088",
      corporateSim: "STC-550192899"
    }
  },
  {
    id: "EMP-KSA-1003",
    name: { en: "Noura bint Fahad Al-Dosari", ar: "نورة بنت فهد الدوسري" },
    isSaudiNational: true,
    nationalityLabel: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    nationalIdOrIqama: "1093817265",
    idExpiryDateGregorian: "2028-11-20",
    idExpiryDateHijri: "1450-07-03",
    daysUntilExpiry: 780,
    jobTitle: { en: "Director of GOSI & Payroll Operations", ar: "مديرة عمليات الرواتب والتأمينات الاجتماعية" },
    department: { en: "Payroll & Statutory Compliance", ar: "الرواتب والامتثال النظامي" },
    departmentCode: "PAYROLL",
    location: { en: "Riyadh KAFD HQ", ar: "الرياض — مقر كافد" },
    nitaqatClass: "PLATINUM",
    gosiNumber: "GOSI-509281736",
    qiwaContractId: "QIWA-2026-99201",
    basicSalarySar: 24000,
    housingAllowanceSar: 6000,
    transportAllowanceSar: 2400,
    ibanNumber: "SA5510000004567891231003",
    status: "ACTIVE",
    allocatedAssets: {
      laptopTag: "KSA-MBP14-7712",
      smartBadgeId: "KAFD-SEC-4102",
      corporateSim: "MOB-540918273"
    }
  },
  {
    id: "EMP-KSA-1004",
    name: { en: "Farhan Ahmed Siddiqui", ar: "فرحان أحمد صديقي" },
    isSaudiNational: false,
    nationalityLabel: { en: "Pakistan (Expat Iqama)", ar: "باكستان (إقامة عمل)" },
    nationalIdOrIqama: "2389104765",
    idExpiryDateGregorian: "2026-11-28",
    idExpiryDateHijri: "1448-06-18",
    daysUntilExpiry: 57, // 30-90 days WARNING flag!
    jobTitle: { en: "Senior Cloud SecOps & PDPL Engineer", ar: "مهندس أول أمن سحابي وحماية البيانات (سدايا)" },
    department: { en: "Digital Transformation & FinTech", ar: "التحول الرقمي والتقنية المالية" },
    departmentCode: "FINTECH",
    location: { en: "Jeddah Red Sea Hub", ar: "جدة — قطاع البحر الأحمر" },
    nitaqatClass: "HIGH_GREEN",
    gosiNumber: "GOSI-774829103",
    qiwaContractId: "QIWA-2026-55302",
    basicSalarySar: 19500,
    housingAllowanceSar: 4875,
    transportAllowanceSar: 1950,
    ibanNumber: "SA2245000007418529631004",
    status: "ACTIVE",
    allocatedAssets: {
      laptopTag: "KSA-DELL-6604",
      smartBadgeId: "JED-SEC-2019",
      corporateSim: "ZAIN-590123456"
    }
  },
  {
    id: "EMP-KSA-1005",
    name: { en: "Faisal bin Salman Al-Harbi", ar: "فيصل بن سلمان الحربي" },
    isSaudiNational: true,
    nationalityLabel: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    nationalIdOrIqama: "1102938475",
    idExpiryDateGregorian: "2026-12-15",
    idExpiryDateHijri: "1448-07-06",
    daysUntilExpiry: 74, // < 90 days renewal reminder
    jobTitle: { en: "Supply Chain & Vendor SLA Lead", ar: "رئيس عقود الموردين ومستويات الخدمة" },
    department: { en: "Procurement & Vendor Governance", ar: "المشتريات وحوكمة الموردين" },
    departmentCode: "PROCURE",
    location: { en: "Dhahran Techno Valley", ar: "الظهران — وادي التقنية" },
    nitaqatClass: "PLATINUM",
    gosiNumber: "GOSI-619283745",
    qiwaContractId: "QIWA-2026-77123",
    basicSalarySar: 18000,
    housingAllowanceSar: 4500,
    transportAllowanceSar: 1800,
    ibanNumber: "SA9015000003692581471005",
    status: "ON_LEAVE",
    allocatedAssets: {
      laptopTag: "KSA-MBP14-5109",
      smartBadgeId: "DMM-SEC-1044",
      corporateSim: "STC-550998877"
    }
  },
  {
    id: "EMP-KSA-1006",
    name: { en: "Rami Wissam Khoury", ar: "رامي وسام خوري" },
    isSaudiNational: false,
    nationalityLabel: { en: "Jordan (Expat Iqama)", ar: "الأردن (إقامة عمل)" },
    nationalIdOrIqama: "2491827364",
    idExpiryDateGregorian: "2026-10-14",
    idExpiryDateHijri: "1448-05-03",
    daysUntilExpiry: 12, // < 30 days CRITICAL flag!
    jobTitle: { en: "Enterprise ERP Integration Specialist", ar: "أخصائي تكامل أنظمة الموارد المؤسسية" },
    department: { en: "Payroll & Statutory Compliance", ar: "الرواتب والامتثال النظامي" },
    departmentCode: "PAYROLL",
    location: { en: "Riyadh KAFD HQ", ar: "الرياض — مقر كافد" },
    nitaqatClass: "HIGH_GREEN",
    gosiNumber: "GOSI-918273645",
    qiwaContractId: "QIWA-2026-33901",
    basicSalarySar: 16500,
    housingAllowanceSar: 4125,
    transportAllowanceSar: 1650,
    ibanNumber: "SA6360000001597534861006",
    status: "SUSPENDED",
    allocatedAssets: {
      laptopTag: "KSA-THINK-3092",
      smartBadgeId: "KAFD-SEC-4390",
      corporateSim: "MOB-540112233"
    }
  }
];

/**
 * 3B. VENDOR & CONTRACTOR MANAGEMENT BLUEPRINT DATA
 */
export interface VendorContractorBlueprint {
  id: string;
  companyName: BilingualText;
  category: BilingualText;
  commercialRegistrationCr: string; // 10-digit KSA CR starting with 1010 / 4030 / 2050
  crExpiryDate: string;
  chamberOfCommerceId: string;
  vatRegistrationNumber: string; // 15-digit KSA VAT starting with 3 and ending with 3
  saudizationTargetPercent: number;
  saudizationActualPercent: number;
  suppliedContractorsCount: number;
  monthlyRetainerSar: number;
  slaTier: BilingualText;
  complianceStatus: "VERIFIED" | "EXPIRING_CR" | "AUDIT_HOLD";
}

export const VENDOR_CONTRACTOR_BLUEPRINT: VendorContractorBlueprint[] = [
  {
    id: "VEN-KSA-801",
    companyName: {
      en: "Al-Yamamah Cloud & Cyber Manpower Co.",
      ar: "شركة اليمامة للكفاءات السحابية والأمن السيبراني"
    },
    category: { en: "IT Outsourcing & Specialized SMP", ar: "إسناد تقنية المعلومات والكوادر المتخصصة" },
    commercialRegistrationCr: "1010684921",
    crExpiryDate: "2027-08-19",
    chamberOfCommerceId: "RUH-COC-994812",
    vatRegistrationNumber: "310492817300003",
    saudizationTargetPercent: 40,
    saudizationActualPercent: 48.5,
    suppliedContractorsCount: 42,
    monthlyRetainerSar: 485000,
    slaTier: { en: "Platinum 99.95% SLA — KAFD Onsite", ar: "اتفاقية مستوى خدمة بلاتينية 99.95% — كافد" },
    complianceStatus: "VERIFIED"
  },
  {
    id: "VEN-KSA-802",
    companyName: {
      en: "Najd Integrated Facilities & Security LLC",
      ar: "شركة نجد المتكاملة لإدارة المرافق والحراسات"
    },
    category: { en: "Smart Facilities & Perimeter Operations", ar: "إدارة المرافق الذكية وأمن المنشآت" },
    commercialRegistrationCr: "1010442918",
    crExpiryDate: "2026-11-15",
    chamberOfCommerceId: "RUH-COC-771029",
    vatRegistrationNumber: "310883920100003",
    saudizationTargetPercent: 30,
    saudizationActualPercent: 34.0,
    suppliedContractorsCount: 68,
    monthlyRetainerSar: 310000,
    slaTier: { en: "Gold 24/7 Physical & Biometric Guard", ar: "ذهبية 24/7 حراسة وتشغيل أنظمة البصمة" },
    complianceStatus: "EXPIRING_CR"
  },
  {
    id: "VEN-KSA-803",
    companyName: {
      en: "Hijaz Legal & MHRSD Advisory Partners",
      ar: "شركاء الحجاز للاستشارات العمالية والحوكمة"
    },
    category: { en: "Legal Advisory & Qiwa Arbitration", ar: "الاستشارات القانونية والتحكيم العمالي" },
    commercialRegistrationCr: "4030291844",
    crExpiryDate: "2028-03-30",
    chamberOfCommerceId: "JED-COC-552910",
    vatRegistrationNumber: "311209384700003",
    saudizationTargetPercent: 70,
    saudizationActualPercent: 82.0,
    suppliedContractorsCount: 9,
    monthlyRetainerSar: 145000,
    slaTier: { en: "Executive Retainer — Labor Courts & ZATCA", ar: "استشارات تنفيذية — المحاكم العمالية وزاتكا" },
    complianceStatus: "VERIFIED"
  },
  {
    id: "VEN-KSA-804",
    companyName: {
      en: "Eastern Gulf Industrial Logistics Contractors",
      ar: "مقاولو الخليج الشرقي للإمداد الصناعي"
    },
    category: { en: "Fleet & Field Logistics Staffing", ar: "تشغيل الأساطيل والإمداد الميداني" },
    commercialRegistrationCr: "2050918273",
    crExpiryDate: "2027-02-10",
    chamberOfCommerceId: "DMM-COC-338192",
    vatRegistrationNumber: "310556473800003",
    saudizationTargetPercent: 35,
    saudizationActualPercent: 28.4,
    suppliedContractorsCount: 31,
    monthlyRetainerSar: 220000,
    slaTier: { en: "Standard Field SLA — Eastern Province", ar: "اتفاقية تشغيل ميداني — المنطقة الشرقية" },
    complianceStatus: "AUDIT_HOLD"
  }
];

/**
 * 4B. ZATCA E-INVOICING PHASE 2 INTEGRATION MODULE & TLV HEXADECIMAL ENGINE
 * Strictly implements architecture-rules.json:
 * - "Every generated invoice component must render standard fields in BOTH English and Arabic simultaneously in a side-by-side or stacked block layout."
 * - "The QR code module must accept a pre-computed Tag-Length-Value (TLV) hexadecimal string array. Never render raw text strings inside a compliance QR asset."
 */
export interface ZatcaTlvDecodedField {
  tag: number;
  tagLabel: BilingualText;
  byteLength: number;
  hexSegment: string;
  utf8Value: string;
}

/**
 * Encodes a single TLV (Tag-Length-Value) entry into an uppercase hexadecimal string:
 * [1-byte Tag Hex][1-byte UTF-8 Byte Length Hex][N-byte UTF-8 Value Hex]
 */
export function encodeZatcaTlvHexSegment(tag: number, value: string): string {
  if (!Number.isInteger(tag) || tag < 1 || tag > 0xff) {
    throw new RangeError("TLV tag must be an integer from 1 to 255");
  }
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("TLV value must be a non-empty string");
  }
  const valueBytes = new TextEncoder().encode(value);
  if (valueBytes.length > 0xff) {
    throw new RangeError("TLV UTF-8 value cannot exceed 255 bytes");
  }
  const tagHex = tag.toString(16).padStart(2, "0").toUpperCase();
  const lenHex = valueBytes.length.toString(16).padStart(2, "0").toUpperCase();
  const valHex = Array.from(valueBytes)
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join("");
  return `${tagHex}${lenHex}${valHex}`;
}

/**
 * Builds a complete ZATCA Phase 2 pre-computed TLV hexadecimal string array (Tags 1 to 8)
 */
export function buildZatcaTlvHexArray(params: {
  sellerName: string;
  vatRegistrationNumber: string;
  timestampIso: string;
  invoiceTotalWithVat: string;
  vatTotal: string;
  xmlInvoiceHash: string;
  ecdsaSignature: string;
  cryptographicStampPublicKey: string;
}): string[] {
  const values = [
    params.sellerName,
    params.vatRegistrationNumber,
    params.timestampIso,
    params.invoiceTotalWithVat,
    params.vatTotal,
    params.xmlInvoiceHash,
    params.ecdsaSignature,
    params.cryptographicStampPublicKey
  ];
  if (values.some((value) => typeof value !== "string" || value.trim() === "")) {
    throw new TypeError("All required ZATCA TLV values must be non-empty strings");
  }
  return values.map((value, index) => encodeZatcaTlvHexSegment(index + 1, value));
}

const TLV_TAG_NAMES: Record<number, BilingualText> = {
  1: { en: "Tag 1: Seller Name", ar: "الحقل 1: اسم المورد" },
  2: { en: "Tag 2: Seller VAT Reg No", ar: "الحقل 2: الرقم الضريبي للمورد" },
  3: { en: "Tag 3: ISO-8601 Timestamp", ar: "الحقل 3: الطابع الزمني للفاتورة" },
  4: { en: "Tag 4: Invoice Total (Incl. VAT)", ar: "الحقل 4: إجمالي الفاتورة (مع الضريبة)" },
  5: { en: "Tag 5: VAT Total Amount (15%)", ar: "الحقل 5: مجموع ضريبة القيمة المضافة" },
  6: { en: "Tag 6: SHA-256 XML Hash", ar: "الحقل 6: تجزئة الفاتورة SHA-256" },
  7: { en: "Tag 7: ECDSA Digital Signature", ar: "الحقل 7: التوقيع الرقمي ECDSA" },
  8: { en: "Tag 8: CSID Public Key Stamp", ar: "الحقل 8: الختم التشفيري العام" }
};

/**
 * Parses and validates a pre-computed TLV hexadecimal string array back into structured byte telemetry
 */
export function decodeZatcaTlvHexArray(tlvHexArray: string[]): ZatcaTlvDecodedField[] {
  if (!Array.isArray(tlvHexArray)) {
    throw new TypeError("TLV payload must be an array of hexadecimal segments");
  }
  const decoder = new TextDecoder("utf-8", { fatal: true });
  return tlvHexArray.map((hexSegment) => {
    if (typeof hexSegment !== "string") {
      throw new TypeError("TLV segment must be a hexadecimal string");
    }
    const cleanHex = hexSegment.trim().toUpperCase();
    if (!/^(?:[0-9A-F]{2}){2,}$/.test(cleanHex)) {
      throw new TypeError("TLV segment must contain complete hexadecimal bytes");
    }
    const tag = Number.parseInt(cleanHex.slice(0, 2), 16);
    const byteLength = Number.parseInt(cleanHex.slice(2, 4), 16);
    if (tag < 1 || cleanHex.length !== 4 + byteLength * 2) {
      throw new RangeError("TLV segment length does not match its one-byte header");
    }
    const valueHex = cleanHex.slice(4);
    const bytes = new Uint8Array(
      valueHex.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) || []
    );
    const utf8Value = decoder.decode(bytes);
    return {
      tag,
      tagLabel: TLV_TAG_NAMES[tag] || { en: `Tag ${tag}`, ar: `الحقل ${tag}` },
      byteLength,
      hexSegment: cleanHex,
      utf8Value
    };
  });
}

/**
 * Converts a pre-computed TLV hexadecimal string array into the canonical ZATCA Base64 binary stream.
 * Invalid segments fail closed instead of silently becoming a plausible Base64 value.
 */
export function tlvHexArrayToBase64(tlvHexArray: string[]): string {
  if (!Array.isArray(tlvHexArray) || tlvHexArray.length === 0) {
    throw new TypeError("At least one TLV segment is required");
  }
  const decodedSegments = decodeZatcaTlvHexArray(tlvHexArray);
  const combinedHex = decodedSegments.map((segment) => segment.hexSegment).join("");
  const bytePairs = combinedHex.match(/.{2}/g) || [];
  let binaryString = "";
  for (const pair of bytePairs) {
    binaryString += String.fromCharCode(Number.parseInt(pair, 16));
  }
  if (typeof btoa !== "function") {
    throw new Error("A standards-compliant Base64 encoder is unavailable");
  }
  return btoa(binaryString);
}

export interface ZatcaInvoiceLineItem {
  id: string;
  descriptionEn: string;
  descriptionAr: string;
  quantity: number;
  unitPriceSar: number;
  vatRatePercent: number;
  vatAmountSar: number;
  lineTotalWithVatSar: number;
}

export interface ZatcaPhase2InvoiceBlueprint {
  invoiceNumber: string;
  uuid: string;
  invoiceCounterValueIcv: number;
  previousInvoiceHashPih: string;
  currentCryptographicHash: string;
  digitalSignatureEcdsa: string;
  csidStampId: string;
  issueTimestampIso: string;
  supplierNameEn: string;
  supplierNameAr: string;
  supplierVatNumber: string;
  supplierAddressEn: string;
  supplierAddressAr: string;
  buyerNameEn: string;
  buyerNameAr: string;
  buyerVatNumber: string;
  buyerAddressEn: string;
  buyerAddressAr: string;
  lineItems: ZatcaInvoiceLineItem[];
  taxableSubtotalSar: number;
  totalVatSar: number;
  grandTotalSar: number;
  tlvHexArray: string[]; // Pre-computed Tag-Length-Value hexadecimal string array
}

export const ZATCA_INVOICE_BLUEPRINTS: ZatcaPhase2InvoiceBlueprint[] = [
  {
    invoiceNumber: "INV-ZATCA-2026-00419",
    uuid: "8f3c9d12-5b7a-4e21-9c04-718293a4b5c6",
    invoiceCounterValueIcv: 419,
    previousInvoiceHashPih:
      "NWU0ZTg5YzI3YjkxNGRlM2Y4YTFjMmI0ZDVlNmY3YThhOWIwYzFkMmUzZjRhNWI2YzdkOGU5ZjBhMWIyYzNkNA==",
    currentCryptographicHash:
      "Y2I5ZjQxZThhM2M3NTBiNjE5ZDRlMmY4YTFjM2I1ZDdYTlfcGhhc2UyX3phdGNhX3NoYTI1Nl9kaWdlc3Q=",
    digitalSignatureEcdsa:
      "MEUCIQDk8v9L2mN4pQ6rS8tU0vW2xY4zA6bC8dE0fG2hI4jK6AIgP1qR3sT5uV7wX9yZ1aB3cD5eF7gH9iJ1kL3mN5oP7qR=",
    csidStampId: "CSID-DEMO-KSA-3104928173-V2",
    issueTimestampIso: "2026-10-02T09:30:00Z",
    supplierNameEn: "Al-Yamamah Cloud & Cyber Manpower Co.",
    supplierNameAr: "شركة اليمامة للكفاءات السحابية والأمن السيبراني",
    supplierVatNumber: "310492817300003",
    supplierAddressEn: "Building 4082, Al-Aqeeq Dist, KAFD, Riyadh 13519, KSA",
    supplierAddressAr: "مبنى 4082، حي العقيق، مركز الملك عبدالله المالي، الرياض 13519",
    buyerNameEn: "NOOR Enterprise Holdings KSA (Closed Joint Stock)",
    buyerNameAr: "شركة نور القابضة للمشاريع السعودية (مساهمة مقفلة)",
    buyerVatNumber: "300918273600003",
    buyerAddressEn: "Parcel 4.08, King Abdullah Financial District, Riyadh 13519",
    buyerAddressAr: "القطعة 4.08، مركز الملك عبدالله المالي، الرياض 13519",
    lineItems: [
      {
        id: "LI-01",
        descriptionEn: "Cloud SecOps & PDPL Managed Manpower (42 Engineers — Oct 2026)",
        descriptionAr: "إسناد كوادر الأمن السحابي وحماية البيانات سدايا (42 مهندساً — أكتوبر 2026)",
        quantity: 1,
        unitPriceSar: 420000,
        vatRatePercent: 15,
        vatAmountSar: 63000,
        lineTotalWithVatSar: 483000
      },
      {
        id: "LI-02",
        descriptionEn: "ZATCA Phase 2 Cryptographic HSM Stamp Maintenance & SLA",
        descriptionAr: "صيانة واتفاقية مستوى خدمة وحدات التشفير للمرحلة الثانية من زاتكا",
        quantity: 1,
        unitPriceSar: 65000,
        vatRatePercent: 15,
        vatAmountSar: 9750,
        lineTotalWithVatSar: 74750
      }
    ],
    taxableSubtotalSar: 485000,
    totalVatSar: 72750,
    grandTotalSar: 557750,
    tlvHexArray: buildZatcaTlvHexArray({
      sellerName: "Al-Yamamah Cloud & Cyber Manpower Co. | شركة اليمامة",
      vatRegistrationNumber: "310492817300003",
      timestampIso: "2026-10-02T09:30:00Z",
      invoiceTotalWithVat: "557750.00",
      vatTotal: "72750.00",
      xmlInvoiceHash: "cb9f41e8a3c750b619d4e2f8a1c3b5d7",
      ecdsaSignature: "MEUCIQDk8v9L2mN4pQ6rS8tU0vW2xY4z",
      cryptographicStampPublicKey: "CSID-DEMO-KSA-3104928173-V2"
    })
  },
  {
    invoiceNumber: "INV-ZATCA-2026-00420",
    uuid: "4a1b2c3d-9e8f-4a7b-8c6d-5e4f3a2b1c09",
    invoiceCounterValueIcv: 420,
    previousInvoiceHashPih:
      "Y2I5ZjQxZThhM2M3NTBiNjE5ZDRlMmY4YTFjM2I1ZDdYTlfcGhhc2UyX3phdGNhX3NoYTI1Nl9kaWdlc3Q=",
    currentCryptographicHash:
      "N2E4YjljMGRlMWYyY2IzNDRkNWU2ZjdhOGI5YzBkMWUyZjNhNGI1YzZkN2U4ZjBhMWIyYzNkNGU1ZjZhN2I=",
    digitalSignatureEcdsa:
      "MEYCIQCr9sT1uV3wX5yZ7aB9cD1eF3gH5iJ7kL9mN1oP3qR5sQIhAN2bC4dE6fG8hI0jK2lM4nO6pQ8rS0tU2vW4xY6zA8bC",
    csidStampId: "CSID-DEMO-KSA-3108839201-V2",
    issueTimestampIso: "2026-10-02T11:15:00Z",
    supplierNameEn: "Najd Integrated Facilities & Security LLC",
    supplierNameAr: "شركة نجد المتكاملة لإدارة المرافق والحراسات",
    supplierVatNumber: "310883920100003",
    supplierAddressEn: "King Fahd Road, Olaya Commercial Towers, Riyadh 12214, KSA",
    supplierAddressAr: "طريق الملك فهد، أبراج العليا التجارية، الرياض 12214، المملكة العربية السعودية",
    buyerNameEn: "NOOR Enterprise Holdings KSA (Closed Joint Stock)",
    buyerNameAr: "شركة نور القابضة للمشاريع السعودية (مساهمة مقفلة)",
    buyerVatNumber: "300918273600003",
    buyerAddressEn: "Parcel 4.08, King Abdullah Financial District, Riyadh 13519",
    buyerAddressAr: "القطعة 4.08، مركز الملك عبدالله المالي، الرياض 13519",
    lineItems: [
      {
        id: "LI-10",
        descriptionEn: "24/7 Biometric & Geofence Perimeter Security Staffing (68 Staff)",
        descriptionAr: "خدمات الحراسات الأمنية وتشغيل البوابات البيومترية على مدار الساعة (68 فرداً)",
        quantity: 1,
        unitPriceSar: 310000,
        vatRatePercent: 15,
        vatAmountSar: 46500,
        lineTotalWithVatSar: 356500
      }
    ],
    taxableSubtotalSar: 310000,
    totalVatSar: 46500,
    grandTotalSar: 356500,
    tlvHexArray: buildZatcaTlvHexArray({
      sellerName: "Najd Integrated Facilities & Security LLC | شركة نجد",
      vatRegistrationNumber: "310883920100003",
      timestampIso: "2026-10-02T11:15:00Z",
      invoiceTotalWithVat: "356500.00",
      vatTotal: "46500.00",
      xmlInvoiceHash: "7a8b9c0de1f2cb344d5e6f7a8b9c0d1e",
      ecdsaSignature: "MEYCIQCr9sT1uV3wX5yZ7aB9cD1eF3gH",
      cryptographicStampPublicKey: "CSID-DEMO-KSA-3108839201-V2"
    })
  }
];

/**
 * 4C. CUSTOMIZABLE DASHBOARD BLUEPRINT DATA
 */
export interface DashboardDivisionStat {
  id: string;
  divisionName: BilingualText;
  saudiCount: number;
  expatCount: number;
  saudizationPercent: number;
  nitaqatTier: NitaqatBand;
  monthlyPayrollSar: number;
}

export const DASHBOARD_PREVIOUS_SNAPSHOT_DATA = {
  snapshotDate: "2026-09-30",
  totalActiveWorkforce: 406,
  saudizationPercent: 46.1,
  attendanceRatePercent: 80,
  openActionCount: 8,
  expiringWithin90Days: 5,
  monthlyPayrollSar: 6_365_000,
  monthlyGosiPoolSar: 376_420
} as const;

export const DASHBOARD_BLUEPRINT_DATA: {
  totalActiveWorkforce: number;
  saudiNationalCount: number;
  expatResidentCount: number;
  overallSaudizationPercent: number;
  monthlyGosiPoolSar: number;
  expiring90DaysCount: number;
  divisions: DashboardDivisionStat[];
} = {
  totalActiveWorkforce: 412,
  saudiNationalCount: 193,
  expatResidentCount: 219,
  overallSaudizationPercent: 46.8,
  monthlyGosiPoolSar: 384920,
  expiring90DaysCount: 4,
  divisions: [
    {
      id: "DIV-01",
      divisionName: { en: "Executive HR & Governance", ar: "الموارد البشرية التنفيذية والحوكمة" },
      saudiCount: 44,
      expatCount: 8,
      saudizationPercent: 84.6,
      nitaqatTier: "PLATINUM",
      monthlyPayrollSar: 920000
    },
    {
      id: "DIV-02",
      divisionName: { en: "Digital Transformation & FinTech", ar: "التحول الرقمي والتقنية المالية" },
      saudiCount: 62,
      expatCount: 98,
      saudizationPercent: 38.8,
      nitaqatTier: "HIGH_GREEN",
      monthlyPayrollSar: 2840000
    },
    {
      id: "DIV-03",
      divisionName: { en: "Payroll & Statutory Compliance", ar: "الرواتب والامتثال النظامي" },
      saudiCount: 39,
      expatCount: 19,
      saudizationPercent: 67.2,
      nitaqatTier: "PLATINUM",
      monthlyPayrollSar: 1050000
    },
    {
      id: "DIV-04",
      divisionName: { en: "Procurement & Vendor Governance", ar: "المشتريات وحوكمة الموردين" },
      saudiCount: 48,
      expatCount: 94,
      saudizationPercent: 33.8,
      nitaqatTier: "MEDIUM_GREEN",
      monthlyPayrollSar: 1690000
    }
  ]
};
