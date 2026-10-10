import type { BilingualText } from "@/context/LanguageContext";

export type ExpenseCategory =
  | "GOV_FEES"
  | "TRAVEL_PER_DIEM"
  | "IT_HARDWARE"
  | "HOSPITALITY";

export type ExpenseStatus =
  | "PENDING"
  | "APPROVED"
  | "REIMBURSED"
  | "REJECTED";

export interface ExpenseClaimRecord {
  id: string;
  employeeId: string;
  employeeName: BilingualText;
  category: ExpenseCategory;
  merchantName: BilingualText;
  merchantVatNumber: string;
  baseAmountSar: number;
  vatAmountSar: number;
  totalAmountSar: number;
  dateIso: string;
  status: ExpenseStatus;
  receiptHash?: string;
  receiptFileName?: string;
}

export const INITIAL_EXPENSE_CLAIMS: ExpenseClaimRecord[] = [
  {
    id: "EXP-KSA-401",
    employeeId: "EMP-KSA-1001",
    employeeName: {
      en: "Tariq bin Abdulaziz Al-Qahtani",
      ar: "طارق بن عبدالعزيز القحطاني"
    },
    category: "GOV_FEES",
    merchantName: {
      en: "Absher / Jawazat Muqeem Portal (SADAD)",
      ar: "منصة أبشر / مقيم — سداد الرسوم الحكومية"
    },
    merchantVatNumber: "",
    baseAmountSar: 9600,
    vatAmountSar: 0,
    totalAmountSar: 9600,
    dateIso: "2026-10-01",
    status: "REIMBURSED"
  },
  {
    id: "EXP-KSA-402",
    employeeId: "EMP-KSA-1002",
    employeeName: {
      en: "Eng. Mahmoud El-Sayed Mansour",
      ar: "م. محمود السيد منصور"
    },
    category: "IT_HARDWARE",
    merchantName: {
      en: "Jarir Bookstore Corporate KSA",
      ar: "مكتبة جرير — مبيعات الشركات"
    },
    merchantVatNumber: "300056289100003",
    baseAmountSar: 6400,
    vatAmountSar: 960,
    totalAmountSar: 7360,
    dateIso: "2026-10-01",
    status: "APPROVED"
  },
  {
    id: "EXP-KSA-403",
    employeeId: "EMP-KSA-1003",
    employeeName: {
      en: "Noura bint Fahad Al-Dosari",
      ar: "نورة بنت فهد الدوسري"
    },
    category: "TRAVEL_PER_DIEM",
    merchantName: {
      en: "Saudia Airlines & Jeddah Ritz-Carlton",
      ar: "الخطوط السعودية وفندق ريتز كارلتون جدة"
    },
    merchantVatNumber: "300192837400003",
    baseAmountSar: 8200,
    vatAmountSar: 1230,
    totalAmountSar: 9430,
    dateIso: "2026-10-02",
    status: "PENDING"
  },
  {
    id: "EXP-KSA-404",
    employeeId: "EMP-KSA-1005",
    employeeName: {
      en: "Faisal bin Salman Al-Harbi",
      ar: "فيصل بن سلمان الحربي"
    },
    category: "HOSPITALITY",
    merchantName: {
      en: "Bujairi Terrace Executive Summit Hosting",
      ar: "مطل البجيري — استضافة قمة الموردين"
    },
    merchantVatNumber: "310482910200003",
    baseAmountSar: 4500,
    vatAmountSar: 675,
    totalAmountSar: 5175,
    dateIso: "2026-10-02",
    status: "PENDING"
  }
];

export type WorkflowStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface EmployeeTransferRequest {
  id: string;
  employeeId: string;
  fromDepartmentCode: string;
  toDepartmentCode: string;
  requestedDate: string;
  effectiveDate: string;
  status: WorkflowStatus;
}

export const INITIAL_TRANSFER_REQUESTS: EmployeeTransferRequest[] = [
  {
    id: "TRF-2026-031",
    employeeId: "EMP-KSA-1003",
    fromDepartmentCode: "PAYROLL",
    toDepartmentCode: "FINTECH",
    requestedDate: "2026-09-28",
    effectiveDate: "2026-10-15",
    status: "PENDING"
  },
  {
    id: "TRF-2026-032",
    employeeId: "EMP-KSA-1005",
    fromDepartmentCode: "PROCURE",
    toDepartmentCode: "HR_GOV",
    requestedDate: "2026-09-30",
    effectiveDate: "2026-10-20",
    status: "PENDING"
  },
  {
    id: "TRF-2026-029",
    employeeId: "EMP-KSA-1006",
    fromDepartmentCode: "FINTECH",
    toDepartmentCode: "PAYROLL",
    requestedDate: "2026-09-18",
    effectiveDate: "2026-10-01",
    status: "APPROVED"
  }
];

export type EmployeeRequestType = "LEAVE" | "ATTENDANCE" | "DOCUMENT";

export interface EmployeeRequestRecord {
  id: string;
  employeeId: string;
  type: EmployeeRequestType;
  submittedDate: string;
  requestedDate?: string;
  status: WorkflowStatus;
}

export const INITIAL_EMPLOYEE_REQUESTS: EmployeeRequestRecord[] = [
  {
    id: "REQ-2026-071",
    employeeId: "EMP-KSA-1003",
    type: "LEAVE",
    submittedDate: "2026-10-01",
    requestedDate: "2026-10-18",
    status: "PENDING"
  },
  {
    id: "REQ-2026-073",
    employeeId: "EMP-KSA-1002",
    type: "ATTENDANCE",
    submittedDate: "2026-10-02",
    requestedDate: "2026-10-01",
    status: "PENDING"
  },
  {
    id: "REQ-2026-078",
    employeeId: "EMP-KSA-1005",
    type: "DOCUMENT",
    submittedDate: "2026-10-02",
    status: "PENDING"
  },
  {
    id: "REQ-2026-064",
    employeeId: "EMP-KSA-1001",
    type: "LEAVE",
    submittedDate: "2026-09-26",
    requestedDate: "2026-10-08",
    status: "APPROVED"
  }
];

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "REMOTE";

export interface AttendanceRecord {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
}

export const ATTENDANCE_BLUEPRINT_DATA: AttendanceRecord[] = [
  { employeeId: "EMP-KSA-1001", date: "2026-10-02", status: "PRESENT", checkIn: "08:02", checkOut: "17:08" },
  { employeeId: "EMP-KSA-1002", date: "2026-10-02", status: "LATE", checkIn: "09:21", checkOut: "18:02" },
  { employeeId: "EMP-KSA-1003", date: "2026-10-02", status: "PRESENT", checkIn: "07:55", checkOut: "16:54" },
  { employeeId: "EMP-KSA-1004", date: "2026-10-02", status: "REMOTE", checkIn: "08:16", checkOut: "17:01" },
  { employeeId: "EMP-KSA-1005", date: "2026-10-02", status: "ABSENT", checkIn: null, checkOut: null },
  { employeeId: "EMP-KSA-1006", date: "2026-10-02", status: "PRESENT", checkIn: "08:10", checkOut: "17:00" }
];

export interface PerformanceReviewSnapshot {
  employeeId: string;
  reviewCycle: string;
  score: number;
  goalsCompleted: number;
  goalsTotal: number;
}

export const PERFORMANCE_BLUEPRINT_DATA: PerformanceReviewSnapshot[] = [
  { employeeId: "EMP-KSA-1001", reviewCycle: "2026-Q3", score: 92, goalsCompleted: 5, goalsTotal: 5 },
  { employeeId: "EMP-KSA-1002", reviewCycle: "2026-Q3", score: 84, goalsCompleted: 4, goalsTotal: 5 },
  { employeeId: "EMP-KSA-1003", reviewCycle: "2026-Q3", score: 88, goalsCompleted: 4, goalsTotal: 5 },
  { employeeId: "EMP-KSA-1004", reviewCycle: "2026-Q3", score: 96, goalsCompleted: 5, goalsTotal: 5 },
  { employeeId: "EMP-KSA-1005", reviewCycle: "2026-Q3", score: 81, goalsCompleted: 3, goalsTotal: 5 },
  { employeeId: "EMP-KSA-1006", reviewCycle: "2026-Q3", score: 90, goalsCompleted: 5, goalsTotal: 5 }
];

export type FinancialWorkflowType = "INVOICE" | "PAYROLL" | "GOSI" | "VAT";
export type FinancialWorkflowStatus = "PENDING" | "PAID";

export interface FinancialWorkflowItem {
  id: string;
  reference: string;
  type: FinancialWorkflowType;
  counterparty: BilingualText;
  amountSar: number;
  dueDate: string;
  status: FinancialWorkflowStatus;
}

export const INITIAL_FINANCIAL_WORKFLOW_ITEMS: FinancialWorkflowItem[] = [
  {
    id: "AP-INV-419",
    reference: "INV-2026-00419",
    type: "INVOICE",
    counterparty: { en: "Al-Yamamah Cloud & Cyber Manpower Co.", ar: "شركة اليمامة للكفاءات السحابية والأمن السيبراني" },
    amountSar: 557750,
    dueDate: "2026-10-20",
    status: "PENDING"
  },
  {
    id: "AP-INV-420",
    reference: "INV-2026-00420",
    type: "INVOICE",
    counterparty: { en: "Najd Integrated Facilities & Security LLC", ar: "شركة نجد المتكاملة لإدارة المرافق والحراسات" },
    amountSar: 356500,
    dueDate: "2026-10-18",
    status: "PENDING"
  },
  {
    id: "PAY-2026-10",
    reference: "WPS-2026-10",
    type: "PAYROLL",
    counterparty: { en: "October 2026 WPS payroll batch", ar: "مسير رواتب أكتوبر 2026 عبر حماية الأجور" },
    amountSar: 6500000,
    dueDate: "2026-10-28",
    status: "PENDING"
  },
  {
    id: "GOSI-2026-10",
    reference: "GOSI-2026-10",
    type: "GOSI",
    counterparty: { en: "October 2026 GOSI contribution", ar: "اشتراكات التأمينات الاجتماعية لأكتوبر 2026" },
    amountSar: 384920,
    dueDate: "2026-10-30",
    status: "PENDING"
  },
  {
    id: "VAT-2026-Q3",
    reference: "ZATCA-VAT-Q3-2026",
    type: "VAT",
    counterparty: { en: "Q3 ZATCA output VAT settlement", ar: "تسوية ضريبة القيمة المضافة للمخرجات للربع الثالث" },
    amountSar: 412500,
    dueDate: "2026-10-31",
    status: "PENDING"
  }
];
