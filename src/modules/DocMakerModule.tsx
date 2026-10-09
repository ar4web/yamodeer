import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import type { Paragraph, Table } from "docx";

type DocxRuntime = typeof import("docx");
type TextRunInstance = InstanceType<DocxRuntime["TextRun"]>;
type ImageRunInstance = InstanceType<DocxRuntime["ImageRun"]>;
type InlineDocxRun = TextRunInstance | ImageRunInstance;
import {
  AlignCenter,
  ArrowLeft,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Columns2,
  FileSpreadsheet,
  FileText,
  Heading1,
  Heading2,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  LoaderCircle,
  Printer,
  Redo2,
  Save,
  SlidersHorizontal,
  Sparkles,
  Strikethrough,
  Table2,
  Type,
  Underline,
  Undo2,
  Upload,
  X
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { getLocalISODate } from "@/services/dateUtils";
import type { VaultFileItem } from "@/modules/FilesManagerModule";
import { iconButtonBaseClass, iconButtonClass, PageHeader, primaryButtonClass, PrototypeNotice, ResponsiveDrawer, secondaryButtonClass, SegmentedTabs, TabPanel } from "@/components/DesignSystem";

export type DocumentTemplateId =
  | "BLANK"
  | "QIWA"
  | "QUOTATION"
  | "SALARY_CERT"
  | "LEAVE"
  | "WARNING"
  | "EOSB"
  | "NDA"
  | "MEMO"
  | "PER_DIEM";

type DocLayout =
  | "DUAL_AR_RIGHT_EN_LEFT"
  | "DUAL_EN_RIGHT_AR_LEFT"
  | "STACKED_BILINGUAL"
  | "ARABIC_ONLY_RTL"
  | "ENGLISH_ONLY_LTR";

type PaperSize =
  | "A0"
  | "A1"
  | "A2"
  | "A3"
  | "A4"
  | "A5"
  | "A6"
  | "A7"
  | "B4"
  | "B5"
  | "B6"
  | "LETTER"
  | "LEGAL"
  | "EXECUTIVE"
  | "STATEMENT"
  | "FOLIO"
  | "TABLOID"
  | "LEDGER"
  | "C4"
  | "C5"
  | "C6"
  | "DL"
  | "MONARCH"
  | "ENVELOPE10";

type PaperOrientation = "PORTRAIT" | "LANDSCAPE";
type MarginPreset = "NARROW" | "NORMAL" | "WIDE";
type EditorLanguage = "en" | "ar";
type ConfigPanel = "templates" | "paper" | "letterhead" | "style";

const DOC_STYLE_STORAGE_KEY = "yamodeer-docmaker-styles-v3";
const LEGACY_DOC_STYLE_STORAGE_KEY = "noor-docmaker-styles-v2";

const DOCUMENT_TEMPLATE_CATEGORY_KEYS: Record<DocumentTemplateId, string> = {
  BLANK: "doc.category.general",
  QIWA: "doc.category.employment",
  QUOTATION: "doc.category.commercial",
  SALARY_CERT: "doc.category.hr",
  LEAVE: "doc.category.hr",
  WARNING: "doc.category.hr",
  EOSB: "doc.category.hr",
  NDA: "doc.category.governance",
  MEMO: "doc.category.executive",
  PER_DIEM: "doc.category.travel"
};

const DOCUMENT_TEMPLATE_CATEGORY_ORDER = [
  "doc.category.general",
  "doc.category.employment",
  "doc.category.commercial",
  "doc.category.hr",
  "doc.category.governance",
  "doc.category.executive",
  "doc.category.travel"
];

interface DocMakerModuleProps {
  onSaveToVault?: (file: VaultFileItem) => void;
  initialTemplateId?: string;
  onReturnToFiles?: () => void;
}

interface TemplateSeed {
  id: DocumentTemplateId;
  en: string;
  ar: string;
}

interface SavedDocStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontSizePx: number;
  inkColor: string;
  highlightColor: string;
}

const DOCUMENT_TEMPLATES: TemplateSeed[] = [
  {
    id: "BLANK",
    en: "<p>Prepared by {{COMPANY_NAME}} on {{ISSUE_DATE}}.</p><p><br></p>",
    ar: "<p>أُعد بواسطة {{COMPANY_NAME}} بتاريخ {{ISSUE_DATE}}.</p><p><br></p>"
  },
  {
    id: "QIWA",
    en: "<p><strong>Reference:</strong> {{QIWA_CONTRACT_ID}} &nbsp; | &nbsp; <strong>Issue date:</strong> {{ISSUE_DATE}}</p><p>This agreement is made between <strong>{{COMPANY_NAME}}</strong>, Commercial Registration No. {{COMPANY_CR}}, and <strong>{{EMPLOYEE_NAME_EN}}</strong>, National ID / Iqama No. {{EMPLOYEE_IQAMA}}.</p><h2>1. Position and workplace</h2><p>The employee is appointed as {{JOB_TITLE_EN}} in {{DEPARTMENT_EN}}, with the principal workplace in the Kingdom of Saudi Arabia.</p><h2>2. Term and commencement</h2><p>Employment commences on {{START_DATE}}. The agreement term, probation, renewal and notice provisions are subject to the executed Qiwa contract and applicable Saudi Labor Law.</p><h2>3. Compensation and payment</h2><p>Monthly basic salary: {{BASIC_SALARY_SAR}} SAR. Housing, transport and other agreed allowances are stated in the signed compensation schedule. Salary is paid through the applicable Wage Protection System (WPS) process.</p><h2>4. Working time, leave and obligations</h2><p>Working time, statutory rest, annual leave, public holidays, confidentiality, occupational safety and termination are governed by the signed Qiwa agreement and applicable law.</p><p><br></p><p>Employer authorized signatory: ____________________ &nbsp;&nbsp; Employee: ____________________</p>",
    ar: "<p><strong>المرجع:</strong> {{QIWA_CONTRACT_ID}} &nbsp; | &nbsp; <strong>تاريخ الإصدار:</strong> {{ISSUE_DATE}}</p><p>أُبرمت هذه الاتفاقية بين <strong>{{COMPANY_NAME}}</strong>، سجل تجاري رقم {{COMPANY_CR}}، وبين <strong>{{EMPLOYEE_NAME_AR}}</strong>، هوية وطنية / إقامة رقم {{EMPLOYEE_IQAMA}}.</p><h2>١. المسمى الوظيفي ومكان العمل</h2><p>يُعيّن الموظف بوظيفة {{JOB_TITLE_AR}} في إدارة {{DEPARTMENT_AR}}، ويكون مقر العمل الأساسي في المملكة العربية السعودية.</p><h2>٢. مدة العقد وتاريخ المباشرة</h2><p>تبدأ علاقة العمل بتاريخ {{START_DATE}}. وتخضع مدة العقد وفترة التجربة والتجديد والإشعار لما هو موثق في عقد قوى الموقع ولأنظمة العمل السعودية ذات الصلة.</p><h2>٣. الأجر وآلية الصرف</h2><p>الراتب الأساسي الشهري: {{BASIC_SALARY_SAR}} ريال سعودي. وتحدد البدلات السكنية وبدل النقل وغيرها في ملحق الأجر الموقع. ويصرف الأجر عبر المسار المعتمد لنظام حماية الأجور.</p><h2>٤. ساعات العمل والإجازات والالتزامات</h2><p>تخضع ساعات العمل والراحة والإجازات الرسمية والسنوية والسرية والسلامة المهنية وإنهاء العلاقة لما ورد في العقد الموحد والأنظمة المعمول بها.</p><p><br></p><p>المفوّض بالتوقيع عن المنشأة: ____________________ &nbsp;&nbsp; الموظف: ____________________</p>"
  },
  {
    id: "QUOTATION",
    en: "<p><strong>Quote No.:</strong> Q-{{QUOTE_ID}} &nbsp; | &nbsp; <strong>Valid until:</strong> {{VALID_UNTIL}}</p><p><strong>Supplier:</strong> {{COMPANY_NAME}} &nbsp; | &nbsp; <strong>VAT Registration No.:</strong> {{COMPANY_VAT}}</p><p><strong>Prepared for:</strong> {{BUYER_NAME_EN}} &nbsp; | &nbsp; <strong>Customer VAT No.:</strong> {{BUYER_VAT}}</p><h2>Scope of supply</h2><p>{{SERVICE_DESCRIPTION_EN}}</p><table><tr><th>Item / Service</th><th>Qty</th><th>Unit Price (SAR)</th><th>VAT 15%</th><th>Total (SAR)</th></tr><tr><td>{{SERVICE_DESCRIPTION_EN}}</td><td>1</td><td>{{QUOTE_SUBTOTAL}}</td><td>{{QUOTE_VAT}}</td><td>{{QUOTE_TOTAL}}</td></tr></table><p>Subtotal: {{QUOTE_SUBTOTAL}} SAR &nbsp; | &nbsp; VAT (15%): {{QUOTE_VAT}} SAR</p><h2>Commercial terms</h2><p>Prices are in SAR. This quotation is subject to the final purchase order, signed service terms and applicable ZATCA e-invoicing requirements. Payment terms: {{PAYMENT_TERMS}}.</p><p>Authorized supplier representative: ____________________</p>",
    ar: "<p><strong>رقم العرض:</strong> Q-{{QUOTE_ID}} &nbsp; | &nbsp; <strong>صالح حتى:</strong> {{VALID_UNTIL}}</p><p><strong>المورّد:</strong> {{COMPANY_NAME_AR}} &nbsp; | &nbsp; <strong>الرقم الضريبي:</strong> {{COMPANY_VAT}}</p><p><strong>مقدم إلى:</strong> {{BUYER_NAME_AR}} &nbsp; | &nbsp; <strong>الرقم الضريبي للعميل:</strong> {{BUYER_VAT}}</p><h2>نطاق التوريد</h2><p>{{SERVICE_DESCRIPTION_AR}}</p><table><tr><th>البند / الخدمة</th><th>الكمية</th><th>سعر الوحدة (ر.س)</th><th>ضريبة 15%</th><th>الإجمالي (ر.س)</th></tr><tr><td>{{SERVICE_DESCRIPTION_AR}}</td><td>١</td><td>{{QUOTE_SUBTOTAL}}</td><td>{{QUOTE_VAT}}</td><td>{{QUOTE_TOTAL}}</td></tr></table><p>الإجمالي قبل الضريبة: {{QUOTE_SUBTOTAL}} ريال &nbsp; | &nbsp; ضريبة القيمة المضافة (15%): {{QUOTE_VAT}} ريال</p><h2>الشروط التجارية</h2><p>جميع الأسعار بالريال السعودي. يخضع هذا العرض لأمر الشراء النهائي وشروط الخدمة الموقعة ومتطلبات الفوترة الإلكترونية لدى زاتكا. شروط السداد: {{PAYMENT_TERMS_AR}}.</p><p>المفوّض بالتوقيع عن المورّد: ____________________</p>"
  },
  {
    id: "SALARY_CERT",
    en: "<p><strong>Date:</strong> {{ISSUE_DATE}} &nbsp; | &nbsp; <strong>Reference:</strong> HR-{{DOC_REFERENCE}}</p><p>To whom it may concern,</p><p>This is to certify that {{EMPLOYEE_NAME_EN}}, National ID / Iqama No. {{EMPLOYEE_IQAMA}}, is employed by {{COMPANY_NAME}} as {{JOB_TITLE_EN}} in {{DEPARTMENT_EN}} since {{START_DATE}}.</p><p>Monthly basic salary: {{BASIC_SALARY_SAR}} SAR. Total monthly package, including approved allowances: {{GROSS_PACKAGE_SAR}} SAR.</p><p>This certificate is issued at the employee's request for the stated purpose and does not create any guarantee or liability on behalf of the employer.</p><p>Sincerely,<br>Human Resources Department<br>{{COMPANY_NAME}}</p>",
    ar: "<p><strong>التاريخ:</strong> {{ISSUE_DATE}} &nbsp; | &nbsp; <strong>المرجع:</strong> HR-{{DOC_REFERENCE}}</p><p>إلى من يهمه الأمر،</p><p>تشهد {{COMPANY_NAME_AR}} بأن {{EMPLOYEE_NAME_AR}}، حامل الهوية الوطنية / الإقامة رقم {{EMPLOYEE_IQAMA}}، يعمل لديها بوظيفة {{JOB_TITLE_AR}} في إدارة {{DEPARTMENT_AR}} منذ تاريخ {{START_DATE}}.</p><p>الراتب الأساسي الشهري: {{BASIC_SALARY_SAR}} ريال. وإجمالي الحزمة الشهرية شاملاً البدلات المعتمدة: {{GROSS_PACKAGE_SAR}} ريال.</p><p>صدرت هذه الشهادة بناءً على طلب الموظف للغرض المبين، ولا تُنشئ أي ضمان أو التزام مالي على المنشأة.</p><p>وتفضلوا بقبول فائق الاحترام،<br>إدارة الموارد البشرية<br>{{COMPANY_NAME_AR}}</p>"
  },
  {
    id: "LEAVE",
    en: "<p><strong>Request reference:</strong> LV-{{DOC_REFERENCE}} &nbsp; | &nbsp; <strong>Submission date:</strong> {{ISSUE_DATE}}</p><p>Employee: {{EMPLOYEE_NAME_EN}} &nbsp; | &nbsp; National ID / Iqama: {{EMPLOYEE_IQAMA}}</p><p>Department: {{DEPARTMENT_EN}} &nbsp; | &nbsp; Job title: {{JOB_TITLE_EN}}</p><p>Requested leave: {{LEAVE_START_DATE}} through {{LEAVE_END_DATE}} ({{LEAVE_DAYS}} working days).</p><p>Leave type: Annual paid leave in accordance with Article 109 and the approved company policy. Work handover / acting contact: {{COVERING_EMPLOYEE}}.</p><p>Employee signature: ____________________ &nbsp; Line manager decision: Approved / Declined &nbsp; Date: __________</p>",
    ar: "<p><strong>مرجع الطلب:</strong> LV-{{DOC_REFERENCE}} &nbsp; | &nbsp; <strong>تاريخ التقديم:</strong> {{ISSUE_DATE}}</p><p>الموظف: {{EMPLOYEE_NAME_AR}} &nbsp; | &nbsp; الهوية الوطنية / الإقامة: {{EMPLOYEE_IQAMA}}</p><p>الإدارة: {{DEPARTMENT_AR}} &nbsp; | &nbsp; المسمى الوظيفي: {{JOB_TITLE_AR}}</p><p>الإجازة المطلوبة من {{LEAVE_START_DATE}} حتى {{LEAVE_END_DATE}} ({{LEAVE_DAYS}} يوم عمل).</p><p>نوع الإجازة: إجازة سنوية مدفوعة وفق المادة 109 وسياسة المنشأة المعتمدة. تسليم المهام / الموظف البديل: {{COVERING_EMPLOYEE}}.</p><p>توقيع الموظف: ____________________ &nbsp; قرار المدير المباشر: موافق / غير موافق &nbsp; التاريخ: __________</p>"
  },
  {
    id: "WARNING",
    en: "<p><strong>Confidential HR reference:</strong> ER-{{DOC_REFERENCE}} &nbsp; | &nbsp; Date: {{ISSUE_DATE}}</p><p>To: {{EMPLOYEE_NAME_EN}} &nbsp; | &nbsp; National ID / Iqama: {{EMPLOYEE_IQAMA}} &nbsp; | &nbsp; Department: {{DEPARTMENT_EN}}</p><h2>Notice of concern</h2><p>Reported incident / policy clause: {{INCIDENT_DESCRIPTION_EN}}. Date and location: {{INCIDENT_DATE}} / {{INCIDENT_LOCATION}}.</p><h2>Employee response</h2><p>Please provide a written response and any supporting evidence by {{RESPONSE_DEADLINE}}. This notice is a request for explanation, not a final finding or disciplinary decision.</p><p>HR representative: ____________________ &nbsp; Employee acknowledgement of receipt: ____________________</p>",
    ar: "<p><strong>مرجع الموارد البشرية السري:</strong> ER-{{DOC_REFERENCE}} &nbsp; | &nbsp; التاريخ: {{ISSUE_DATE}}</p><p>إلى: {{EMPLOYEE_NAME_AR}} &nbsp; | &nbsp; الهوية الوطنية / الإقامة: {{EMPLOYEE_IQAMA}} &nbsp; | &nbsp; الإدارة: {{DEPARTMENT_AR}}</p><h2>موضوع الإشعار</h2><p>الواقعة / البند محل المراجعة: {{INCIDENT_DESCRIPTION_AR}}. التاريخ والموقع: {{INCIDENT_DATE}} / {{INCIDENT_LOCATION}}.</p><h2>إفادة الموظف</h2><p>يرجى تقديم رد مكتوب وأي مستندات مؤيدة في موعد أقصاه {{RESPONSE_DEADLINE}}. هذا الإشعار طلب إيضاح ولا يمثل نتيجة نهائية أو قراراً تأديبياً.</p><p>ممثل الموارد البشرية: ____________________ &nbsp; إقرار الموظف بالاستلام: ____________________</p>"
  },
  {
    id: "EOSB",
    en: "<p><strong>Settlement reference:</strong> EOSB-{{DOC_REFERENCE}} &nbsp; | &nbsp; <strong>Issue date:</strong> {{ISSUE_DATE}}</p><p>Employee: {{EMPLOYEE_NAME_EN}} ({{EMPLOYEE_IQAMA}}) &nbsp; | &nbsp; Department: {{DEPARTMENT_EN}}</p><p>Employment start: {{START_DATE}} &nbsp; | &nbsp; Last working day: {{LAST_WORKING_DAY}} &nbsp; | &nbsp; Service: {{SERVICE_YEARS}} years</p><table><tr><th>Settlement component</th><th>Amount (SAR)</th><th>Notes</th></tr><tr><td>Basic wage and eligible allowances</td><td>{{GROSS_WAGE_SAR}}</td><td>Per approved payroll record</td></tr><tr><td>EOSB estimate (Articles 84 / 85)</td><td>{{EOSB_AMOUNT_SAR}}</td><td>Subject to termination reason and verified service</td></tr><tr><td>Other approved dues / deductions</td><td>{{OTHER_DUES_SAR}}</td><td>Attach supporting schedule</td></tr></table><p>Final net settlement: {{SETTLEMENT_TOTAL_SAR}} SAR. This statement is a working estimate pending HR, payroll and legal verification and signed clearance.</p><p>Employee: ____________________ &nbsp; HR / Finance: ____________________</p>",
    ar: "<p><strong>مرجع المخالصة:</strong> EOSB-{{DOC_REFERENCE}} &nbsp; | &nbsp; <strong>تاريخ الإصدار:</strong> {{ISSUE_DATE}}</p><p>الموظف: {{EMPLOYEE_NAME_AR}} ({{EMPLOYEE_IQAMA}}) &nbsp; | &nbsp; الإدارة: {{DEPARTMENT_AR}}</p><p>تاريخ المباشرة: {{START_DATE}} &nbsp; | &nbsp; آخر يوم عمل: {{LAST_WORKING_DAY}} &nbsp; | &nbsp; مدة الخدمة: {{SERVICE_YEARS}} سنة</p><table><tr><th>عنصر التسوية</th><th>المبلغ (ر.س)</th><th>ملاحظات</th></tr><tr><td>الأجر الأساسي والبدلات المستحقة</td><td>{{GROSS_WAGE_SAR}}</td><td>وفق سجل الرواتب المعتمد</td></tr><tr><td>تقدير مكافأة نهاية الخدمة (المادتان 84 / 85)</td><td>{{EOSB_AMOUNT_SAR}}</td><td>بحسب سبب الانتهاء ومدة الخدمة المعتمدة</td></tr><tr><td>مستحقات / استقطاعات أخرى معتمدة</td><td>{{OTHER_DUES_SAR}}</td><td>يرفق جدول الإثباتات</td></tr></table><p>صافي التسوية النهائية: {{SETTLEMENT_TOTAL_SAR}} ريال. هذا البيان تقديري لحين التحقق من الموارد البشرية والرواتب والشؤون القانونية واعتماد المخالصة.</p><p>الموظف: ____________________ &nbsp; الموارد البشرية / المالية: ____________________</p>"
  },
  {
    id: "NDA",
    en: "<p>Made on {{ISSUE_DATE}} between {{COMPANY_NAME}} and {{EMPLOYEE_NAME_EN}} ({{EMPLOYEE_IQAMA}}).</p><h2>1. Confidential information</h2><p>The recipient must use company, customer, employee, government integration and security information only for authorized work and protect it from unauthorized access or disclosure.</p><h2>2. Personal data</h2><p>Personal data must be handled only for an authorized purpose, with access limited to the minimum required, and in line with applicable Saudi Personal Data Protection Law (PDPL) and company policy.</p><h2>3. Return and reporting</h2><p>On request or separation, return company records and assets. Promptly report suspected loss, misuse or unauthorized disclosure through the approved incident channel.</p><p>Employee signature: ____________________ &nbsp; Company representative: ____________________</p>",
    ar: "<p>أُبرم بتاريخ {{ISSUE_DATE}} بين {{COMPANY_NAME_AR}} و{{EMPLOYEE_NAME_AR}} ({{EMPLOYEE_IQAMA}}).</p><h2>١. المعلومات السرية</h2><p>يلتزم المستلم باستخدام معلومات المنشأة والعملاء والموظفين والتكاملات الحكومية والأمنية لأغراض العمل المصرح بها فقط، وحمايتها من الوصول أو الإفصاح غير المصرح به.</p><h2>٢. البيانات الشخصية</h2><p>تُعالج البيانات الشخصية لغرض مشروع ومصرح به، ويقتصر الوصول عليها بالقدر اللازم، مع مراعاة نظام حماية البيانات الشخصية السعودي وسياسات المنشأة.</p><h2>٣. إعادة المعلومات والإبلاغ</h2><p>تعاد سجلات المنشأة وأصولها عند الطلب أو انتهاء العلاقة. ويجب الإبلاغ فوراً عن أي فقد أو إساءة استخدام أو إفصاح غير مصرح به عبر قناة الحوادث المعتمدة.</p><p>توقيع الموظف: ____________________ &nbsp; ممثل المنشأة: ____________________</p>"
  },
  {
    id: "MEMO",
    en: "<p><strong>To:</strong> {{MEMO_TO}} &nbsp; | &nbsp; <strong>From:</strong> {{MEMO_FROM}} &nbsp; | &nbsp; <strong>Date:</strong> {{ISSUE_DATE}}</p><p><strong>Subject:</strong> {{MEMO_SUBJECT}}</p><h2>Purpose</h2><p>State the decision, action or business context clearly.</p><h2>Background and considerations</h2><p>{{MEMO_BACKGROUND}}</p><h2>Required action and owner</h2><p>{{MEMO_ACTION}} &nbsp; | &nbsp; Owner: {{ACTION_OWNER}} &nbsp; | &nbsp; Due date: {{DUE_DATE}}</p>",
    ar: "<p><strong>إلى:</strong> {{MEMO_TO_AR}} &nbsp; | &nbsp; <strong>من:</strong> {{MEMO_FROM_AR}} &nbsp; | &nbsp; <strong>التاريخ:</strong> {{ISSUE_DATE}}</p><p><strong>الموضوع:</strong> {{MEMO_SUBJECT_AR}}</p><h2>الغرض</h2><p>حدد القرار أو الإجراء أو سياق الأعمال بوضوح.</p><h2>الخلفية والاعتبارات</h2><p>{{MEMO_BACKGROUND_AR}}</p><h2>الإجراء المطلوب والمسؤول</h2><p>{{MEMO_ACTION_AR}} &nbsp; | &nbsp; المسؤول: {{ACTION_OWNER}} &nbsp; | &nbsp; الموعد: {{DUE_DATE}}</p>"
  },
  {
    id: "PER_DIEM",
    en: "<p><strong>Authorization ID:</strong> TR-{{DOC_REFERENCE}} &nbsp; | &nbsp; Date: {{ISSUE_DATE}}</p><p>Traveler: {{EMPLOYEE_NAME_EN}} &nbsp; | &nbsp; Department: {{DEPARTMENT_EN}} &nbsp; | &nbsp; Project: {{PROJECT_NAME}}</p><p>Destination: {{TRAVEL_CITY}} &nbsp; | &nbsp; Travel dates: {{TRAVEL_START}} — {{TRAVEL_END}}</p><table><tr><th>Allowance</th><th>Approved cap (SAR)</th><th>Receipt required</th></tr><tr><td>Daily per diem</td><td>{{PER_DIEM_DAILY}}</td><td>Per policy</td></tr><tr><td>Transport / lodging</td><td>{{TRAVEL_COST_CAP}}</td><td>Yes</td></tr></table><p>Expenses must follow the approved travel policy and be supported by valid invoices. VAT recovery is subject to a valid ZATCA tax invoice and applicable rules.</p><p>Employee: ____________________ &nbsp; Manager: ____________________ &nbsp; Finance: ____________________</p>",
    ar: "<p><strong>رقم التفويض:</strong> TR-{{DOC_REFERENCE}} &nbsp; | &nbsp; التاريخ: {{ISSUE_DATE}}</p><p>المسافر: {{EMPLOYEE_NAME_AR}} &nbsp; | &nbsp; الإدارة: {{DEPARTMENT_AR}} &nbsp; | &nbsp; المشروع: {{PROJECT_NAME}}</p><p>الوجهة: {{TRAVEL_CITY}} &nbsp; | &nbsp; مدة السفر: {{TRAVEL_START}} — {{TRAVEL_END}}</p><table><tr><th>البدل</th><th>الحد المعتمد (ر.س)</th><th>إرفاق إيصال</th></tr><tr><td>بدل الانتداب اليومي</td><td>{{PER_DIEM_DAILY}}</td><td>حسب السياسة</td></tr><tr><td>النقل / السكن</td><td>{{TRAVEL_COST_CAP}}</td><td>نعم</td></tr></table><p>تخضع المصروفات لسياسة السفر المعتمدة، ويجب إرفاق الفواتير النظامية. ويخضع استرداد الضريبة لوجود فاتورة ضريبية صحيحة ومتطلبات زاتكا.</p><p>الموظف: ____________________ &nbsp; المدير: ____________________ &nbsp; المالية: ____________________</p>"
  }
];

const PAPER_DIMENSIONS_TWIPS: Record<PaperSize, { width: number; height: number }> = {
  A0: { width: 47678, height: 67406 },
  A1: { width: 33682, height: 47678 },
  A2: { width: 23818, height: 33682 },
  A3: { width: 16834, height: 23818 },
  A4: { width: 11909, height: 16834 },
  A5: { width: 8395, height: 11909 },
  A6: { width: 5947, height: 8395 },
  A7: { width: 4190, height: 5947 },
  B4: { width: 14170, height: 20016 },
  B5: { width: 9979, height: 14170 },
  B6: { width: 7085, height: 9979 },
  LETTER: { width: 12240, height: 15840 },
  LEGAL: { width: 12240, height: 20160 },
  EXECUTIVE: { width: 10440, height: 15120 },
  STATEMENT: { width: 7920, height: 12240 },
  FOLIO: { width: 12240, height: 18720 },
  TABLOID: { width: 15840, height: 24480 },
  LEDGER: { width: 15840, height: 24480 },
  C4: { width: 12989, height: 18374 },
  C5: { width: 9187, height: 12989 },
  C6: { width: 6466, height: 9187 },
  DL: { width: 6235, height: 12470 },
  MONARCH: { width: 5587, height: 10800 },
  ENVELOPE10: { width: 5940, height: 13680 }
};

const EDITOR_FONT_SIZE_PRESETS: Record<string, number> = { "2": 12, "3": 14, "4": 18, "5": 24, "6": 32, "7": 48 };

function getEditorFontSizeIndex(fontSizePx: number): string {
  if (fontSizePx < 12) return "2";
  if (fontSizePx < 16) return "3";
  if (fontSizePx < 20) return "4";
  if (fontSizePx < 28) return "5";
  if (fontSizePx < 40) return "6";
  return "7";
}

const PAPER_DIMENSIONS_INCHES: Record<PaperSize, { width: number; height: number }> = {
  A0: { width: 33.11, height: 46.81 },
  A1: { width: 23.39, height: 33.11 },
  A2: { width: 16.54, height: 23.39 },
  A3: { width: 11.69, height: 16.54 },
  A4: { width: 8.27, height: 11.69 },
  A5: { width: 5.83, height: 8.27 },
  A6: { width: 4.13, height: 5.83 },
  A7: { width: 2.91, height: 4.13 },
  B4: { width: 9.84, height: 13.9 },
  B5: { width: 6.93, height: 9.84 },
  B6: { width: 4.92, height: 6.93 },
  LETTER: { width: 8.5, height: 11 },
  LEGAL: { width: 8.5, height: 14 },
  EXECUTIVE: { width: 7.25, height: 10.5 },
  STATEMENT: { width: 5.5, height: 8.5 },
  FOLIO: { width: 8.5, height: 13 },
  TABLOID: { width: 11, height: 17 },
  LEDGER: { width: 11, height: 17 },
  C4: { width: 9.02, height: 12.76 },
  C5: { width: 6.38, height: 9.02 },
  C6: { width: 4.49, height: 6.38 },
  DL: { width: 4.33, height: 8.66 },
  MONARCH: { width: 3.88, height: 7.5 },
  ENVELOPE10: { width: 4.125, height: 9.5 }
};

const SMART_VARIABLES = [
  { token: "{{EMPLOYEE_NAME_EN}}", key: "doc.smart.employee_name" },
  { token: "{{EMPLOYEE_IQAMA}}", key: "doc.smart.iqama" },
  { token: "{{JOB_TITLE_EN}}", key: "doc.smart.job_title" },
  { token: "{{BASIC_SALARY_SAR}}", key: "doc.smart.basic_salary" },
  { token: "{{START_DATE}}", key: "doc.smart.start_date" },
  { token: "{{COMPANY_CR}}", key: "doc.smart.company_cr" },
  { token: "{{QUOTE_TOTAL}}", key: "doc.smart.quote_total" }
] as const;

const getTemplateSeed = (id: DocumentTemplateId): TemplateSeed =>
  DOCUMENT_TEMPLATES.find((template) => template.id === id) || DOCUMENT_TEMPLATES[0];

const getInitialTitle = (id: DocumentTemplateId, translate: (key: string) => string) =>
  translate(id === "BLANK" ? "doc.template.blank" : `doc.template.${id}`);

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const DOC_HTML_ALLOWED_TAGS = [
  "a", "b", "blockquote", "br", "caption", "code", "del", "div", "em",
  "font", "h1", "h2", "h3", "h4", "hr", "i", "img", "li", "ol", "p",
  "s", "span", "strike", "strong", "sub", "sup", "table", "tbody", "td",
  "tfoot", "th", "thead", "tr", "u", "ul"
];
const DOC_HTML_ALLOWED_ATTRS = [
  "alt", "class", "colspan", "dir", "height", "href", "rel", "rowspan",
  "scope", "src", "style", "target", "title", "width"
];
const sanitizeHtml = (html: string): string =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: DOC_HTML_ALLOWED_TAGS,
    ALLOWED_ATTR: DOC_HTML_ALLOWED_ATTRS,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["embed", "form", "iframe", "link", "math", "meta", "object", "script", "style", "svg"],
    FORBID_ATTR: ["srcset"]
  });

const createHtmlTable = (rows: unknown[][]): string => {
  const safeRows = rows
    .filter((row) => row.some((cell) => String(cell ?? "").trim()))
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td>${escapeHtml(String(cell ?? ""))}</td>`)
          .join("")}</tr>`
    )
    .join("");
  return `<table><tbody>${safeRows || "<tr><td><br></td></tr>"}</tbody></table><p><br></p>`;
};

const getNodeRuns = (
  node: Node,
  inherited: {
    bold?: boolean;
    italics?: boolean;
    underline?: { type: "single" };
    strike?: boolean;
    color?: string;
    size?: number;
    font?: string;
  },
  docxRuntime: DocxRuntime
): InlineDocxRun[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    return text ? [new docxRuntime.TextRun({ text, ...inherited })] : [];
  }
  if (!(node instanceof HTMLElement)) return [];
  if (node.tagName === "IMG") {
    const imageSource = node.getAttribute("src") || "";
    const imageBytes = imageSource.startsWith("data:image/") ? dataUriToUint8(imageSource) : undefined;
    if (!imageBytes || (!imageSource.startsWith("data:image/png") && !imageSource.startsWith("data:image/jpeg"))) return [];
    const width = Number(node.getAttribute("width")) || 420;
    const height = Number(node.getAttribute("height")) || 260;
    return [
      new docxRuntime.ImageRun({
        data: imageBytes,
        type: imageSource.startsWith("data:image/png") ? "png" : "jpg",
        transformation: { width, height },
        altText: { name: "document-image", description: node.getAttribute("alt") || "Embedded document image" }
      })
    ];
  }

  const style = node.getAttribute("style") || "";
  const cssColor = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)?.[1]?.trim();
  const cssSize = style.match(/(?:^|;)\s*font-size\s*:\s*([\d.]+)px/i)?.[1];
  const cssFont = style.match(/(?:^|;)\s*font-family\s*:\s*([^;]+)/i)?.[1]?.trim();
  const flags = {
    bold: inherited.bold || ["B", "STRONG"].includes(node.tagName),
    italics: inherited.italics || ["I", "EM"].includes(node.tagName),
    underline: inherited.underline || node.tagName === "U" ? { type: "single" as const } : undefined,
    strike: inherited.strike || node.tagName === "S" || node.tagName === "STRIKE",
    color: cssColor ? cssColor.replace("#", "").toUpperCase() : inherited.color,
    size: cssSize ? Math.round(Number(cssSize) * 1.5) : inherited.size,
    font: cssFont ? cssFont.replace(/["']/g, "").split(",")[0].trim() : inherited.font
  };

  if (node.tagName === "BR") return [new docxRuntime.TextRun({ text: "\n", ...flags })];
  return Array.from(node.childNodes).flatMap((child) => getNodeRuns(child, flags, docxRuntime));
};

const htmlBlockToDocx = (
  html: string,
  isArabic: boolean,
  baseFont: string,
  baseColor: string,
  docxRuntime: DocxRuntime
): Array<Paragraph | Table> => {
  const safeHtml = sanitizeHtml(html);
  const container = document.createElement("div");
  container.innerHTML = safeHtml;
  const children = Array.from(container.childNodes).filter(
    (node) => node.nodeType === Node.ELEMENT_NODE || Boolean(node.textContent?.trim())
  );

  return children.flatMap((node) => {
    if (node instanceof HTMLElement && (node.tagName === "UL" || node.tagName === "OL")) {
      return Array.from(node.children)
        .filter((child): child is HTMLLIElement => child instanceof HTMLLIElement)
        .map((item, index) => {
          const marker = node.tagName === "OL" ? `${index + 1}. ` : "• ";
          const itemRuns = Array.from(item.childNodes).flatMap((child) =>
            getNodeRuns(child, { font: baseFont, color: baseColor.replace("#", "").toUpperCase() }, docxRuntime)
          );
          return new docxRuntime.Paragraph({
            children: [new docxRuntime.TextRun({ text: marker, font: baseFont, bold: true }), ...itemRuns],
            bidirectional: isArabic,
            alignment: isArabic ? docxRuntime.AlignmentType.RIGHT : docxRuntime.AlignmentType.LEFT
          });
        });
    }
    if (node instanceof HTMLTableElement) {
      const htmlRows = Array.from(node.rows);
      const maxColumns = Math.max(1, ...htmlRows.map((row) => row.cells.length));
      const columnWidth = Math.floor(9360 / maxColumns);
      const rows = htmlRows.map(
        (htmlRow) =>
          new docxRuntime.TableRow({
            children: Array.from({ length: maxColumns }, (_, index) => {
              const cell = htmlRow.cells[index];
              const runs = cell
                ? Array.from(cell.childNodes).flatMap((child) =>
                    getNodeRuns(child, {
                      font: baseFont,
                      color: baseColor.replace("#", "").toUpperCase()
                    }, docxRuntime)
                  )
                : [];
              return new docxRuntime.TableCell({
                width: { size: columnWidth, type: docxRuntime.WidthType.DXA },
                children: [
                  new docxRuntime.Paragraph({
                    children: runs.length
                      ? runs
                      : [new docxRuntime.TextRun({ text: "", font: baseFont })],
                    bidirectional: isArabic,
                    alignment: isArabic ? docxRuntime.AlignmentType.RIGHT : docxRuntime.AlignmentType.LEFT
                  })
                ]
              });
            })
          })
      );
      return new docxRuntime.Table({
        width: { size: columnWidth * maxColumns, type: docxRuntime.WidthType.DXA },
        columnWidths: Array.from({ length: maxColumns }, () => columnWidth),
        rows
      });
    }

    const element = node instanceof HTMLElement ? node : null;
    const alignmentText = element?.style.textAlign || "";
    const alignment =
      alignmentText === "center"
        ? docxRuntime.AlignmentType.CENTER
        : alignmentText === "right"
        ? docxRuntime.AlignmentType.RIGHT
        : alignmentText === "justify"
        ? docxRuntime.AlignmentType.JUSTIFIED
        : isArabic
        ? docxRuntime.AlignmentType.RIGHT
        : docxRuntime.AlignmentType.LEFT;
    const heading =
      element?.tagName === "H1"
        ? docxRuntime.HeadingLevel.HEADING_1
        : element?.tagName === "H2"
        ? docxRuntime.HeadingLevel.HEADING_2
        : element?.tagName === "H3"
        ? docxRuntime.HeadingLevel.HEADING_3
        : undefined;
    const isListItem = element?.tagName === "LI";
    const runOptions = {
      font: baseFont,
      color: baseColor.replace("#", "").toUpperCase(),
      bold: ["H1", "H2", "H3", "TH"].includes(element?.tagName || "")
    };
    const runs = element?.tagName === "IMG"
      ? getNodeRuns(element, runOptions, docxRuntime)
      : Array.from(node.childNodes).flatMap((child) =>
          getNodeRuns(child, runOptions, docxRuntime)
        );
    return new docxRuntime.Paragraph({
      children: runs.length ? runs : [new docxRuntime.TextRun({ text: "", font: baseFont })],
      bidirectional: isArabic,
      alignment,
      heading,
      bullet: isListItem ? { level: 0 } : undefined
    });
  });
};

const dataUriToUint8 = (dataUri: string): Uint8Array | undefined => {
  const encoded = dataUri.split(",")[1];
  if (!encoded) return undefined;
  try {
    return Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  } catch {
    return undefined;
  }
};

export const DocMakerModule: React.FC<DocMakerModuleProps> = ({
  onSaveToVault,
  initialTemplateId,
  onReturnToFiles
}) => {
  const { t, language } = useLanguage();
  const { englishFont, arabicFont } = useTheme();
  const englishEditorRef = useRef<HTMLDivElement | null>(null);
  const arabicEditorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const bodyImageInputRef = useRef<HTMLInputElement | null>(null);
  const letterheadInputRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<{ en: string; ar: string }>({
    en: getTemplateSeed("BLANK").en,
    ar: getTemplateSeed("BLANK").ar
  });
  const savedRangeRef = useRef<Range | null>(null);

  const [editorSeed, setEditorSeed] = useState<{ en: string; ar: string }>(() => ({
    en: getTemplateSeed("BLANK").en,
    ar: getTemplateSeed("BLANK").ar
  }));
  const [editorMount, setEditorMount] = useState(0);
  const [activeTemplateId, setActiveTemplateId] =
    useState<DocumentTemplateId>("BLANK");
  const [isImportedDocument, setIsImportedDocument] = useState(false);
  const [showDocumentTitleOnPage, setShowDocumentTitleOnPage] = useState(true);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<DocumentTemplateId | null>(null);
  const [baselineDocumentTitle, setBaselineDocumentTitle] = useState(() => getInitialTitle("BLANK", t));
  const templateConfirmRef = useRef<HTMLButtonElement | null>(null);
  const pendingTemplateTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string>(
    getInitialTitle("BLANK", t)
  );
  const [layout, setLayout] = useState<DocLayout>("DUAL_AR_RIGHT_EN_LEFT");
  const [activeLanguage, setActiveLanguage] = useState<EditorLanguage>("en");
  const [configPanel, setConfigPanel] = useState<ConfigPanel>("templates");
  const [paperSize, setPaperSize] = useState<PaperSize>("A4");
  const [orientation, setOrientation] = useState<PaperOrientation>("PORTRAIT");
  const [marginPreset, setMarginPreset] = useState<MarginPreset>("NORMAL");
  const [letterheadPreset, setLetterheadPreset] = useState<"NONE" | "STANDARD" | "FORMAL">("STANDARD");
  const [letterheadImage, setLetterheadImage] = useState<string>("");
  const [includeApprovalBlock, setIncludeApprovalBlock] = useState(false);
  const [savedStyles, setSavedStyles] = useState<SavedDocStyle[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const value = window.localStorage.getItem(DOC_STYLE_STORAGE_KEY) || window.localStorage.getItem(LEGACY_DOC_STYLE_STORAGE_KEY);
      return value ? (JSON.parse(value) as SavedDocStyle[]) : [];
    } catch {
      return [];
    }
  });
  const [styleForm, setStyleForm] = useState<SavedDocStyle>({
    id: "draft-style",
    name: "",
    fontFamily: "Inter",
    fontSizePx: 14,
    inkColor: "#1f2937",
    highlightColor: "#fef3c7"
  });
  const [importBusy, setImportBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [smartToken, setSmartToken] = useState("");

  const isDual = layout === "DUAL_AR_RIGHT_EN_LEFT" || layout === "DUAL_EN_RIGHT_AR_LEFT";
  const paperDimensions = useMemo(() => {
    const base = PAPER_DIMENSIONS_INCHES[paperSize];
    return orientation === "LANDSCAPE"
      ? { width: base.height, height: base.width }
      : base;
  }, [paperSize, orientation]);
  const paperTwips = useMemo(() => {
    const base = PAPER_DIMENSIONS_TWIPS[paperSize];
    return orientation === "LANDSCAPE"
      ? { width: base.height, height: base.width }
      : base;
  }, [paperSize, orientation]);
  const marginInches = marginPreset === "NARROW" ? 0.5 : marginPreset === "WIDE" ? 1.5 : 1;
  const marginTwips = Math.round(marginInches * 1440);
  const isArabicOnly = layout === "ARABIC_ONLY_RTL";
  const isEnglishOnly = layout === "ENGLISH_ONLY_LTR";
  const currentEditorRef = activeLanguage === "ar" ? arabicEditorRef : englishEditorRef;

  const closeToastSoon = useCallback(() => {
    window.setTimeout(() => setToastMessage(""), 3500);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DOC_STYLE_STORAGE_KEY, JSON.stringify(savedStyles));
    } catch {
      // Browser storage can be disabled; the editor remains fully usable in memory.
    }
  }, [savedStyles]);

  useEffect(() => {
    if (initialTemplateId && DOCUMENT_TEMPLATES.some((item) => item.id === initialTemplateId)) {
      const id = initialTemplateId as DocumentTemplateId;
      const seed = getTemplateSeed(id);
      const contents = { en: seed.en, ar: seed.ar };
      contentRef.current = contents;
      setEditorSeed(contents);
      setActiveTemplateId(id);
      setIsImportedDocument(false);
      setShowDocumentTitleOnPage(true);
      const nextTitle = getInitialTitle(id, t);
      setDocumentTitle(nextTitle);
      setBaselineDocumentTitle(nextTitle);
      setEditorMount((current) => current + 1);
    }
  }, [initialTemplateId]);

  const chooseTemplate = (id: DocumentTemplateId) => {
    const seed = getTemplateSeed(id);
    const contents = { en: seed.en, ar: seed.ar };
    contentRef.current = contents;
    setEditorSeed(contents);
    setActiveTemplateId(id);
    setIsImportedDocument(false);
    setShowDocumentTitleOnPage(true);
    const nextTitle = getInitialTitle(id, t);
    setDocumentTitle(nextTitle);
    setBaselineDocumentTitle(nextTitle);
    setPendingTemplateId(null);
    setSettingsDrawerOpen(false);
    setEditorMount((current) => current + 1);
    setToastMessage("");
  };

  const requestTemplateSelection = (id: DocumentTemplateId, triggerButton: HTMLButtonElement) => {
    const hasEditedContent =
      contentRef.current.en !== editorSeed.en ||
      contentRef.current.ar !== editorSeed.ar ||
      documentTitle !== baselineDocumentTitle;
    if (!hasEditedContent && !isImportedDocument && id === activeTemplateId) return;
    if (hasEditedContent || isImportedDocument) {
      pendingTemplateTriggerRef.current = triggerButton;
      setPendingTemplateId(id);
      return;
    }
    chooseTemplate(id);
  };

  const cancelTemplateReplacement = () => {
    setPendingTemplateId(null);
    window.requestAnimationFrame(() => pendingTemplateTriggerRef.current?.focus());
  };

  useEffect(() => {
    if (pendingTemplateId) templateConfirmRef.current?.focus();
  }, [pendingTemplateId]);

  const syncDocumentTitleVisibility = () => {
    const hasBodyTitle = contentRef.current.en.toLowerCase().includes("<h1") || contentRef.current.ar.toLowerCase().includes("<h1");
    setShowDocumentTitleOnPage(!hasBodyTitle);
  };

  const updateEditorHtml = (lang: EditorLanguage, html: string) => {
    contentRef.current[lang] = html;
    setEditorSeed((previous) => ({ ...previous, [lang]: html }));
    syncDocumentTitleVisibility();
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const editor = currentEditorRef.current;
      if (editor && editor.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  };

  const restoreSavedSelection = () => {
    if (!savedRangeRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
  };

  const runEditorCommand = (command: string, value?: string) => {
    currentEditorRef.current?.focus();
    restoreSavedSelection();
    document.execCommand(command, false, value);
    if (currentEditorRef.current) {
      contentRef.current[activeLanguage] = currentEditorRef.current.innerHTML;
    }
    syncDocumentTitleVisibility();
    saveSelection();
  };

  const insertHtmlAtCursor = (html: string) => {
    currentEditorRef.current?.focus();
    restoreSavedSelection();
    document.execCommand("insertHTML", false, html);
    if (currentEditorRef.current) {
      contentRef.current[activeLanguage] = currentEditorRef.current.innerHTML;
    }
    syncDocumentTitleVisibility();
    saveSelection();
  };

  const insertSmartToken = (token: string) => {
    if (!token) return;
    insertHtmlAtCursor(`<span>${escapeHtml(token)}</span>`);
    setSmartToken("");
  };

  const insertLink = () => {
    const url = window.prompt(t("doc.action.insert_link"), "https://");
    if (url && /^https?:\/\//i.test(url)) {
      runEditorCommand("createLink", url);
    }
  };

  const insertFinancialTable = () => {
    const tableHtml = `<table><thead><tr><th>${escapeHtml(t("doc.table.title"))}</th><th>${escapeHtml(t("acc.jv.amount"))}</th><th>${escapeHtml(t("acc.vat.net"))}</th></tr></thead><tbody><tr><td>{{LINE_ITEM}}</td><td>{{AMOUNT_SAR}}</td><td>15%</td></tr><tr><td>{{LINE_ITEM_2}}</td><td>{{AMOUNT_SAR_2}}</td><td>15%</td></tr></tbody></table><p><br></p>`;
    insertHtmlAtCursor(tableHtml);
  };

  const handleImportOfficeDocument = async (file: File) => {
    setImportBusy(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      if (extension === "docx") {
        const arrayBuffer = await file.arrayBuffer();
        const mammothModule = await import("mammoth");
        const mammothRuntime = (mammothModule as unknown as { default?: typeof import("mammoth") }).default || (mammothModule as unknown as typeof import("mammoth"));
        const result = await mammothRuntime.convertToHtml({ arrayBuffer });
        updateEditorHtml(activeLanguage, sanitizeHtml(result.value));
      } else if (extension === "html" || extension === "htm") {
        updateEditorHtml(activeLanguage, sanitizeHtml(await file.text()));
      } else if (extension === "txt") {
        const text = await file.text();
        const html = text
          .split(/\r?\n/)
          .map((line) => `<p>${line.trim() ? escapeHtml(line) : "<br>"}</p>`)
          .join("");
        updateEditorHtml(activeLanguage, html);
      } else if (extension === "csv" || extension === "xlsx" || extension === "xlsm") {
        const ExcelJSRuntime = (await import("exceljs")).default;
    const workbook = new ExcelJSRuntime.Workbook();
        if (extension === "csv") {
          const csvText = await file.text();
          const parsedRows = csvText
            .split(/\r?\n/)
            .filter((line) => line.trim())
            .map((line) => line.split(",").map((cell) => cell.replace(/^\"|\"$/g, "")));
          updateEditorHtml(activeLanguage, createHtmlTable(parsedRows));
        } else {
          await workbook.xlsx.load(await file.arrayBuffer());
          const worksheet = workbook.worksheets[0];
          const rows: unknown[][] = [];
          worksheet?.eachRow({ includeEmpty: true }, (row) => {
            const values = Array.isArray(row.values) ? row.values.slice(1) : [];
            rows.push(values.map((value) => (value && typeof value === "object" && "text" in value ? (value as { text: string }).text : value)));
          });
          updateEditorHtml(activeLanguage, createHtmlTable(rows));
        }
      } else {
        throw new Error("unsupported-format");
      }

      setEditorMount((current) => current + 1);
      setIsImportedDocument(true);
      setPendingTemplateId(null);
      const importedTitle = file.name.replace(/\.[^.]+$/, "");
      setDocumentTitle(importedTitle);
      setBaselineDocumentTitle(importedTitle);
      setToastMessage(t("doc.status.imported"));
      closeToastSoon();
    } catch {
      setToastMessage(t("doc.status.import_error"));
      closeToastSoon();
    } finally {
      setImportBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const handleExcelImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await handleImportOfficeDocument(file);
  };

  const applyCurrentStyle = () => {
    currentEditorRef.current?.focus();
    restoreSavedSelection();
    document.execCommand("fontName", false, styleForm.fontFamily);
    document.execCommand("foreColor", false, styleForm.inkColor);
    const sizeIndex = getEditorFontSizeIndex(styleForm.fontSizePx);
    document.execCommand("fontSize", false, sizeIndex);
    if (currentEditorRef.current) {
      contentRef.current[activeLanguage] = currentEditorRef.current.innerHTML;
    }
  };

  const saveStylePreset = () => {
    const saved = { ...styleForm, id: `STYLE-${Date.now()}` };
    setSavedStyles((prev) => [saved, ...prev.filter((style) => style.name !== saved.name)]);
  };

  const applySavedStyle = (style: SavedDocStyle) => {
    setStyleForm(style);
    currentEditorRef.current?.focus();
    restoreSavedSelection();
    document.execCommand("fontName", false, style.fontFamily);
    document.execCommand("foreColor", false, style.inkColor);
    document.execCommand("hiliteColor", false, style.highlightColor);
    const sizeIndex = getEditorFontSizeIndex(style.fontSizePx);
    document.execCommand("fontSize", false, sizeIndex);
    if (currentEditorRef.current) {
      contentRef.current[activeLanguage] = currentEditorRef.current.innerHTML;
    }
  };

  const getOrderedLanguages = (): EditorLanguage[] => {
    if (layout === "DUAL_EN_RIGHT_AR_LEFT") return ["ar", "en"];
    return ["en", "ar"];
  };

  const createDocxBlocks = (lang: EditorLanguage, docxRuntime: DocxRuntime): Array<Paragraph | Table> =>
    htmlBlockToDocx(
      contentRef.current[lang],
      lang === "ar",
      lang === "ar" ? arabicFont : englishFont,
      styleForm.inkColor,
      docxRuntime
    );

  const buildWordDocumentBlob = async (): Promise<Blob> => {
    const docxRuntime = await import("docx");
    const children: Array<Paragraph | Table> = [];
    const imageBytes = letterheadImage ? dataUriToUint8(letterheadImage) : undefined;
    if (imageBytes) {
      children.push(
        new docxRuntime.Paragraph({
          children: [
            new docxRuntime.ImageRun({
              data: imageBytes,
              type: letterheadImage.startsWith("data:image/png") ? "png" : "jpg",
              transformation: { width: 560, height: 90 },
              altText: { title: "Corporate letterhead", description: "Imported document letterhead", name: "letterhead" }
            })
          ],
          alignment: docxRuntime.AlignmentType.CENTER
        })
      );
    } else if (letterheadPreset !== "NONE") {
      children.push(
        new docxRuntime.Paragraph({
          children: [
            new docxRuntime.TextRun({
              text: letterheadPreset === "STANDARD" ? "YaModeer" : "YaModeer",
              bold: true,
              size: 26,
              color: letterheadPreset === "STANDARD" ? "374151" : "4B5563"
            })
          ],
          alignment: docxRuntime.AlignmentType.CENTER,
          spacing: { after: 240 }
        })
      );
    }

    if (showDocumentTitleOnPage) {
      children.push(
        new docxRuntime.Paragraph({
          children: [new docxRuntime.TextRun({ text: documentTitle, bold: true, size: 32, color: styleForm.inkColor.replace("#", "").toUpperCase() })],
          alignment: docxRuntime.AlignmentType.CENTER,
          spacing: { after: 240 }
        })
      );
    }

    if (layout === "STACKED_BILINGUAL") {
      children.push(...createDocxBlocks("en", docxRuntime), new docxRuntime.Paragraph({ text: " " }), ...createDocxBlocks("ar", docxRuntime));
    } else if (layout === "ARABIC_ONLY_RTL") {
      children.push(...createDocxBlocks("ar", docxRuntime));
    } else if (layout === "ENGLISH_ONLY_LTR") {
      children.push(...createDocxBlocks("en", docxRuntime));
    } else {
      const order = getOrderedLanguages();
      const colWidths = [4680, 4680];
      const dualTable = new docxRuntime.Table({
        width: { size: 9360, type: docxRuntime.WidthType.DXA },
        columnWidths: colWidths,
        rows: [
          new docxRuntime.TableRow({
            children: order.map((lang, index) => {
              const blocks = createDocxBlocks(lang, docxRuntime);
              return new docxRuntime.TableCell({
                width: { size: colWidths[index], type: docxRuntime.WidthType.DXA },
                children: blocks.length ? blocks : [new docxRuntime.Paragraph("")],
                margins: { top: 80, bottom: 80, left: 100, right: 100 }
              });
            })
          })
        ]
      });
      children.push(dualTable);
    }

    if (includeApprovalBlock) {
      children.push(
        new docxRuntime.Paragraph({
          children: [
            new docxRuntime.TextRun({
              text: `${t("doc.approval.signature_en")} / ${t("doc.approval.signature_ar")}`,
              bold: true,
              size: 20,
              color: "374151"
            })
          ],
          spacing: { before: 420, after: 120 }
        }),
        new docxRuntime.Paragraph({
          text: "____________________________________________",
          spacing: { after: 240 }
        }),
        new docxRuntime.Paragraph({
          children: [
            new docxRuntime.TextRun({
              text: `${t("doc.approval.seal_en")} / ${t("doc.approval.seal_ar")}`,
              bold: true,
              size: 20,
              color: "374151"
            })
          ],
          spacing: { before: 120, after: 120 }
        }),
        new docxRuntime.Paragraph({ text: "____________________________________________" })
      );
    }

    const documentFile = new docxRuntime.Document({
      creator: "YaModeer Enterprise Doc Maker",
      title: documentTitle,
      description: "Bilingual Saudi enterprise document generated in the Doc Maker Studio",
      sections: [
        {
          properties: {
            page: {
              size: {
                width: paperTwips.width,
                height: paperTwips.height,
                orientation: orientation === "LANDSCAPE" ? docxRuntime.PageOrientation.LANDSCAPE : docxRuntime.PageOrientation.PORTRAIT
              },
              margin: {
                top: marginTwips,
                bottom: marginTwips,
                left: marginTwips,
                right: marginTwips
              }
            }
          },
          children
        }
      ]
    });

    return await docxRuntime.Packer.toBlob(documentFile);
  };

  const exportAsWordDocument = async () => {
    const blob = await buildWordDocumentBlob();
    downloadBlob(blob, `${slugify(documentTitle)}.docx`);
  };

  const exportAsExcelWorkbook = async () => {
    const ExcelJSRuntime = (await import("exceljs")).default;
    const workbook = new ExcelJSRuntime.Workbook();
    workbook.creator = "YaModeer Enterprise Doc Maker";
    workbook.created = new Date();
    workbook.subject = documentTitle;

    const addLanguageSheet = (lang: EditorLanguage, worksheetName: string) => {
      const worksheet = workbook.addWorksheet(worksheetName);
      const parser = new DOMParser();
      const parsed = parser.parseFromString(sanitizeHtml(contentRef.current[lang]), "text/html");
      const htmlTables = Array.from(parsed.querySelectorAll("table"));
      if (htmlTables.length) {
        htmlTables.forEach((table, tableIndex) => {
          const rows = Array.from(table.rows).map((row) =>
            Array.from(row.cells).map((cell) => cell.innerText.trim())
          );
          if (tableIndex > 0) worksheet.addRow([]);
          rows.forEach((row) => worksheet.addRow(row));
        });
      } else {
        worksheet.addRow([lang === "en" ? "English Content" : "المحتوى العربي"]);
        const text = parsed.body.innerText || "";
        text.split(/\r?\n/).filter(Boolean).forEach((line) => worksheet.addRow([line]));
      }
      worksheet.columns.forEach((column) => {
        column.width = 28;
      });
      worksheet.views = [{ state: "frozen", ySplit: 1 }];
      worksheet.getRow(1).font = { bold: true };
      return worksheet;
    };

    if (!isArabicOnly) addLanguageSheet("en", "English Document");
    if (!isEnglishOnly) addLanguageSheet("ar", "Arabic Document");
    if (isEnglishOnly) addLanguageSheet("en", "Document Content");
    if (isArabicOnly) addLanguageSheet("ar", "Document Content");

    const contentSheet = workbook.addWorksheet("Document Details");
    contentSheet.addRows([
      ["Document Title", documentTitle],
      ["Template", isImportedDocument ? "IMPORTED" : activeTemplateId],
      ["Layout", layout],
      ["Paper Size", paperSize],
      ["Orientation", orientation],
      ["Issue Date", getLocalISODate()]
    ]);
    contentSheet.getColumn(1).width = 24;
    contentSheet.getColumn(2).width = 48;

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }),
      `${slugify(documentTitle)}.xlsx`
    );
  };

  const buildPrintHtml = () => {
    const content = sanitizeHtml(contentRef.current.en);
    const arabicContent = sanitizeHtml(contentRef.current.ar);
    const pageWidth = `${paperDimensions.width}in`;
    const paperStyle = `max-width:100%;min-height:${paperDimensions.height}in;padding-block:${marginInches}in;padding-inline:${marginInches}in;margin-inline:auto;box-sizing:border-box;background:#fff;color:${styleForm.inkColor};font-family:${styleForm.fontFamily},Arial,sans-serif;font-size:${styleForm.fontSizePx}px;line-height:1.65;overflow:hidden;`;
    const letterhead = letterheadImage
      ? `<img src="${letterheadImage}" alt="" style="display:block;width:100%;max-height:1.1in;object-fit:contain;margin-block:0 18px;margin-inline:auto">`
      : letterheadPreset === "NONE"
      ? ""
      : `<div style="text-align:center;font-weight:800;font-size:20px;padding:10px;border-block-end:3px solid ${letterheadPreset === "STANDARD" ? "#374151" : "#4b5563"};margin-block-end:18px">${letterheadPreset === "STANDARD" ? "YaModeer" : "YaModeer"}</div>`;
    const pane = (html: string, lang: EditorLanguage) =>
      `<section dir="${lang === "ar" ? "rtl" : "ltr"}" style="min-width:0;direction:${lang === "ar" ? "rtl" : "ltr"};font-family:${lang === "ar" ? arabicFont : englishFont},Arial,sans-serif">${html}</section>`;
    let documentBody = "";
    if (layout === "STACKED_BILINGUAL") {
      documentBody = `${pane(content, "en")}<hr>${pane(arabicContent, "ar")}`;
    } else if (layout === "ARABIC_ONLY_RTL") {
      documentBody = pane(arabicContent, "ar");
    } else if (layout === "ENGLISH_ONLY_LTR") {
      documentBody = pane(content, "en");
    } else {
      const ordered = getOrderedLanguages()
        .map((lang) => pane(sanitizeHtml(contentRef.current[lang]), lang))
        .join("");
      documentBody = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;direction:ltr;align-items:start">${ordered}</div>`;
    }
    const footer = includeApprovalBlock
      ? `<footer style="display:grid;grid-template-columns:1fr 1fr;gap:40px;direction:ltr;border-block-start:1px solid #d7dde5;padding-block-start:18px;margin-block-start:48px"><div><div style="font-size:10px;font-weight:600">${escapeHtml(t("doc.approval.signature_en"))}</div><div dir="rtl" style="font-size:10px;color:#6b7280;margin-block-start:3px">${escapeHtml(t("doc.approval.signature_ar"))}</div><div style="height:1px;background:#d7dde5;margin-block-start:44px"></div></div><div><div style="font-size:10px;font-weight:600">${escapeHtml(t("doc.approval.seal_en"))}</div><div dir="rtl" style="font-size:10px;color:#6b7280;margin-block-start:3px">${escapeHtml(t("doc.approval.seal_ar"))}</div><div style="height:1px;background:#d7dde5;margin-block-start:44px"></div></div></footer>`
      : "";
    const printTitle = showDocumentTitleOnPage ? `<h1 style="text-align:center;font-size:1.5em;margin-block:0 20px;margin-inline:0">${escapeHtml(documentTitle)}</h1>` : "";
    return `<!doctype html><html lang="${language}" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(documentTitle)}</title></head><body style="margin:0;padding-block:24px;padding-inline:24px;background:#f1f5f9"><main style="width:${pageWidth};${paperStyle}">${letterhead}${printTitle}${documentBody}${footer}</main></body></html>`;
  };

  const printToPdf = () => {
    const frame = document.createElement("iframe");
    frame.setAttribute("title", t("doc.io.export_pdf"));
    frame.setAttribute("sandbox", "allow-modals");
    frame.style.position = "fixed";
    frame.style.insetInlineStart = "-10000px";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.border = "0";
    frame.onload = () => {
      const targetWindow = frame.contentWindow;
      if (!targetWindow) return;
      targetWindow.focus();
      targetWindow.print();
      window.setTimeout(() => {
        frame.remove();
      }, 1800);
    };
    frame.srcdoc = buildPrintHtml();
    document.body.appendChild(frame);
  };

  const saveToVault = async () => {
    if (!onSaveToVault) return;
    try {
      const blob = await buildWordDocumentBlob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("docx-read-failed"));
        reader.readAsDataURL(blob);
      });
      let digest = `${blob.size.toString(16)}...docx`;
      if (typeof crypto !== "undefined" && crypto.subtle) {
        const hashBuffer = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
        digest = Array.from(new Uint8Array(hashBuffer))
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("");
      }
      const created: VaultFileItem = {
        id: `FILE-KSA-${Date.now().toString().slice(-6)}`,
        fileName: `${slugify(documentTitle)}.docx`,
        title: {
          en: `${documentTitle} — Files workspace draft`,
          ar: `${documentTitle} — مسودة في مساحة الملفات`
        },
        folder: "DOCMAKER",
        format: "DOCX",
        dataUrl,
        sizeLabel: `${Math.max(1, Math.round(blob.size / 1024))} KB`,
        sha256Short: `${digest.slice(0, 12)}...${digest.slice(-8)}`,
        pdplTier: "PDPL_RESTRICTED",
        updatedAt: getLocalISODate(),
        linkedTemplateId: isImportedDocument ? "IMPORTED" : activeTemplateId
      };
      onSaveToVault(created);
      if (onReturnToFiles) {
        onReturnToFiles();
        return;
      }
      setToastMessage(t("doc.status.saved"));
      closeToastSoon();
    } catch {
      setToastMessage(t("doc.status.import_error"));
      closeToastSoon();
    }
  };

  const handleBodyImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        insertHtmlAtCursor(`<img src="${reader.result}" alt="${escapeHtml(t("doc.action.insert_image"))}" style="max-width:100%;height:auto">`);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleLetterheadUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      setToastMessage(t("doc.status.image_format"));
      closeToastSoon();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLetterheadImage(reader.result);
        setLetterheadPreset("NONE");
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleExportWord = () => {
    void exportAsWordDocument().catch(() => {
      setToastMessage(t("doc.status.import_error"));
      closeToastSoon();
    });
  };
  const handleExportExcel = () => {
    void exportAsExcelWorkbook().catch(() => {
      setToastMessage(t("doc.status.import_error"));
      closeToastSoon();
    });
  };

  const layoutOptions: DocLayout[] = [
    "DUAL_AR_RIGHT_EN_LEFT",
    "DUAL_EN_RIGHT_AR_LEFT",
    "STACKED_BILINGUAL",
    "ARABIC_ONLY_RTL",
    "ENGLISH_ONLY_LTR"
  ];
  const paperSizes: PaperSize[] = ["A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "B4", "B5", "B6", "LETTER", "LEGAL", "EXECUTIVE", "STATEMENT", "FOLIO", "TABLOID", "LEDGER", "C4", "C5", "C6", "DL", "MONARCH", "ENVELOPE10"];
  const configPanels: Array<{ id: ConfigPanel; icon: React.ElementType; label: string }> = [
    { id: "templates", icon: FileText, label: "doc.sidebar.templates" },
    { id: "paper", icon: Columns2, label: "doc.sidebar.paper_layout" },
    { id: "letterhead", icon: ImagePlus, label: "doc.sidebar.letterhead" },
    { id: "style", icon: Sparkles, label: "doc.sidebar.style_maker" }
  ];

  const editorToolbar = [
    { id: "undo", icon: Undo2, key: "doc.action.undo", command: "undo" },
    { id: "redo", icon: Redo2, key: "doc.action.redo", command: "redo" },
    { id: "bold", icon: Bold, key: "doc.action.bold", command: "bold" },
    { id: "italic", icon: Italic, key: "doc.action.italic", command: "italic" },
    { id: "underline", icon: Underline, key: "doc.action.underline", command: "underline" },
    { id: "strike", icon: Strikethrough, key: "doc.action.strike", command: "strikeThrough" },
    { id: "h1", icon: Heading1, key: "doc.action.heading1", command: "formatBlock", value: "H1" },
    { id: "h2", icon: Heading2, key: "doc.action.heading2", command: "formatBlock", value: "H2" },
    { id: "left", icon: AlignLeft, key: "doc.action.align_left", command: "justifyLeft" },
    { id: "center", icon: AlignCenter, key: "doc.action.align_center", command: "justifyCenter" },
    { id: "right", icon: AlignRight, key: "doc.action.align_right", command: "justifyRight" },
    { id: "justify", icon: AlignJustify, key: "doc.action.align_justify", command: "justifyFull" },
    { id: "bullets", icon: List, key: "doc.action.bullet_list", command: "insertUnorderedList" },
    { id: "numbers", icon: ListOrdered, key: "doc.action.numbered_list", command: "insertOrderedList" }
  ];

  const editorPane = (lang: EditorLanguage, addTrailingRule = false) => {
    const isArabic = lang === "ar";
    const isActive = activeLanguage === lang;
    const paneMinimumHeight = Math.max(520, paperDimensions.height * 96 - marginInches * 192 - 250);
    return (
      <section
        key={`${editorMount}-${lang}`}
        className={`min-w-0 ${addTrailingRule ? "border-b border-document-line pb-5 md:border-b-0 md:border-e md:pe-5 md:pb-0" : ""}`}
        onClick={() => setActiveLanguage(lang)}
      >
        <div className={`mb-4 flex items-center justify-between gap-3 border-b pb-2 ${isActive ? "border-primary" : "border-document-line"}`}>
          <span className={`text-dynamic-xs font-semibold uppercase tracking-wide ${isActive ? "text-primary-text" : "text-muted"}`}>
            {t(isArabic ? "doc.editor.ar_label" : "doc.editor.en_label")}
          </span>
          <span className="font-mono text-dynamic-xs text-muted">{isArabic ? "RTL" : "LTR"}</span>
        </div>
        <div
          key={`${editorMount}-${lang}-editor`}
          ref={isArabic ? arabicEditorRef : englishEditorRef}
          dir={isArabic ? "rtl" : "ltr"}
          lang={isArabic ? "ar" : "en"}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setActiveLanguage(lang)}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onPaste={(event) => {
            event.preventDefault();
            const pastedHtml = event.clipboardData.getData("text/html");
            const pastedText = event.clipboardData.getData("text/plain");
            const safeHtml = pastedHtml
              ? sanitizeHtml(pastedHtml)
              : escapeHtml(pastedText).replace(/\r?\n/g, "<br>");
            const selection = window.getSelection();
            if (!selection?.rangeCount) return;
            const range = selection.getRangeAt(0);
            if (!event.currentTarget.contains(range.commonAncestorContainer)) return;
            range.deleteContents();
            const fragment = range.createContextualFragment(safeHtml);
            const lastInsertedNode = fragment.lastChild;
            range.insertNode(fragment);
            if (lastInsertedNode) range.setStartAfter(lastInsertedNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            contentRef.current[lang] = event.currentTarget.innerHTML;
            syncDocumentTitleVisibility();
            saveSelection();
          }}
          onInput={(event) => {
            contentRef.current[lang] = event.currentTarget.innerHTML;
            syncDocumentTitleVisibility();
            saveSelection();
          }}
          dangerouslySetInnerHTML={{ __html: editorSeed[lang] }}
          className="w-full text-dynamic-sm leading-7 text-document-ink focus:outline-none [&_h1]:mb-3 [&_h1]:text-dynamic-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-dynamic-lg [&_h2]:font-semibold [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-document-line [&_td]:p-2 [&_th]:border [&_th]:border-document-line [&_th]:bg-surface-muted [&_th]:p-2 [&_th]:font-semibold [&_p]:my-3 [&_ul]:list-disc [&_ul]:ps-6 [&_ol]:list-decimal [&_ol]:ps-6"
          style={{ fontFamily: isArabic ? arabicFont : englishFont, color: styleForm.inkColor, fontSize: `${styleForm.fontSizePx}px`, minHeight: `${paneMinimumHeight}px` }}
          aria-label={t(isArabic ? "doc.editor.ar_label" : "doc.editor.en_label")}
        />
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("doc.header.title")}
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {onReturnToFiles && (
              <button type="button" onClick={onReturnToFiles} className={secondaryButtonClass}>
                <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
                <span>{t("doc.action.back_to_files")}</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.html,.htm,.txt"
              onChange={handleExcelImportChange}
              className="hidden"
            />
            <input
              ref={excelInputRef}
              type="file"
              accept=".csv,.xlsx,.xlsm"
              onChange={handleExcelImportChange}
              className="hidden"
            />
            <input
              ref={bodyImageInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleBodyImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importBusy}
              title={t("doc.io.import_doc")}
              aria-label={t("doc.io.import_doc")}
              className={iconButtonClass}
            >
              {importBusy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              disabled={importBusy}
              title={t("doc.io.import_excel")}
              aria-label={t("doc.io.import_excel")}
              className={iconButtonClass}
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleExportWord}
              title={t("doc.io.export_word")}
              aria-label={t("doc.io.export_word")}
              className={iconButtonClass}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => void handleExportExcel()}
              title={t("doc.io.export_excel")}
              aria-label={t("doc.io.export_excel")}
              className={iconButtonClass}
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={printToPdf}
              title={t("doc.io.export_pdf")}
              aria-label={t("doc.io.export_pdf")}
              className={iconButtonClass}
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
            </button>
            {onSaveToVault && (
              <button
                type="button"
                onClick={saveToVault}
                title={t("doc.io.save_vault")}
                aria-label={t("doc.io.save_vault")}
                className={iconButtonClass}
              >
                <Save className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      />
      <PrototypeNotice label={t("collab.badge.local_demo")}>{t("doc.prototype.notice")}</PrototypeNotice>
      {toastMessage && (
        <div className="flex items-center justify-between gap-3 border border-success bg-success-soft px-4 py-3 text-dynamic-xs font-semibold text-success-text">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage("")} title={t("doc.action.close")} aria-label={t("doc.action.close")} className={iconButtonClass}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <ResponsiveDrawer
        id="docmaker-settings-drawer"
        open={settingsDrawerOpen}
        onClose={() => { setSettingsDrawerOpen(false); setPendingTemplateId(null); }}
        title={t("doc.workspace.drawer_title")}
        closeLabel={t("doc.workspace.close_setup")}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-theme p-3">
            <SegmentedTabs
              id="doc-settings"
              ariaLabel={t("doc.workspace.settings_tabs")}
              value={configPanel}
              onChange={setConfigPanel}
              layout="grid"
              items={configPanels.map((panel) => {
                const Icon = panel.icon;
                return {
                  value: panel.id,
                  label: t(panel.label),
                  icon: <Icon className="h-4 w-4 shrink-0" />
                };
              })}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="space-y-3">
              <TabPanel hidden={configPanel !== "templates"} id="doc-settings-templates-panel" labelledBy="doc-settings-templates-tab">
                <section className="border border-theme bg-surface">
                  <div className="border-b border-theme px-3 py-3">
                    <h2 className="text-dynamic-sm font-semibold text-foreground">{t("doc.panel.templates_title")}</h2>
                  </div>
                  <div>
                    {DOCUMENT_TEMPLATE_CATEGORY_ORDER.map((categoryKey) => {
                      const templates = DOCUMENT_TEMPLATES.filter((template) => DOCUMENT_TEMPLATE_CATEGORY_KEYS[template.id] === categoryKey);
                      if (!templates.length) return null;
                      return (
                        <div key={categoryKey}>
                          <h3 className="sticky top-0 z-10 border-b border-theme bg-surface-elevated px-3 py-2 text-dynamic-xs font-semibold text-muted">{t(categoryKey)}</h3>
                          {templates.map((template) => {
                            const isSelected = !isImportedDocument && activeTemplateId === template.id;
                            const templateLabel = t(template.id === "BLANK" ? "doc.template.blank" : `doc.template.${template.id}`);
                            return (
                              <button
                                key={template.id}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={(event) => requestTemplateSelection(template.id, event.currentTarget)}
                                className={`flex w-full items-start gap-3 border-b border-theme border-s-2 px-3 py-3 text-start transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                                  isSelected
                                    ? "border-s-primary bg-primary-soft"
                                    : "border-s-transparent text-foreground hover:bg-surface-elevated"
                                }`}
                              >
                                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center ${isSelected ? "bg-primary text-on-primary" : "bg-surface-elevated text-muted"}`}>
                                  {isSelected ? <Check className="h-4 w-4" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
                                </span>
                                <span className="min-w-0 flex-1 text-dynamic-sm font-semibold leading-snug text-foreground">{templateLabel}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </TabPanel>

              <TabPanel hidden={configPanel !== "paper"} id="doc-settings-paper-panel" labelledBy="doc-settings-paper-tab">
                <div className="bg-surface border border-theme p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Columns2 className="w-4 h-4 text-primary-text" />
                    <h2 className="text-dynamic-base font-semibold text-foreground">{t("doc.panel.page_title")}</h2>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-dynamic-xs font-bold text-muted">{t("doc.layout.label")}</label>
                    <select aria-label={t("doc.layout.label")} value={layout} onChange={(event) => setLayout(event.target.value as DocLayout)} className="w-full px-3 py-2.5 bg-surface-elevated border border-theme text-foreground text-dynamic-xs">
                      {layoutOptions.map((option) => <option key={option} value={option}>{t(`doc.layout.${option}`)}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-dynamic-xs font-bold text-muted">{t("doc.paper.size_label")}</label>
                    <select aria-label={t("doc.paper.size_label")} value={paperSize} onChange={(event) => setPaperSize(event.target.value as PaperSize)} className="w-full px-3 py-2.5 bg-surface-elevated border border-theme text-foreground text-dynamic-xs">
                      {paperSizes.map((size) => <option key={size} value={size}>{t(`doc.paper.size.${size}`)}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-dynamic-xs font-bold text-muted">{t("doc.paper.orientation_label")}</label>
                    <select aria-label={t("doc.paper.orientation_label")} value={orientation} onChange={(event) => setOrientation(event.target.value as PaperOrientation)} className="w-full px-3 py-2.5 bg-surface-elevated border border-theme text-foreground text-dynamic-xs">
                      <option value="PORTRAIT">{t("doc.paper.portrait")}</option>
                      <option value="LANDSCAPE">{t("doc.paper.landscape")}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-dynamic-xs font-bold text-muted">{t("doc.paper.margins_label")}</label>
                    <select aria-label={t("doc.paper.margins_label")} value={marginPreset} onChange={(event) => setMarginPreset(event.target.value as MarginPreset)} className="w-full px-3 py-2.5 bg-surface-elevated border border-theme text-foreground text-dynamic-xs">
                      <option value="NARROW">{t("doc.paper.margin.narrow")}</option>
                      <option value="NORMAL">{t("doc.paper.margin.normal")}</option>
                      <option value="WIDE">{t("doc.paper.margin.wide")}</option>
                    </select>
                  </div>
                  <p className="text-dynamic-xs leading-relaxed text-muted">{t("doc.column.swap_note")}</p>
                </div>
              </TabPanel>

              <TabPanel hidden={configPanel !== "letterhead"} id="doc-settings-letterhead-panel" labelledBy="doc-settings-letterhead-tab">
                <div className="bg-surface border border-theme p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <ImagePlus className="w-4 h-4 text-primary-text" />
                    <h2 className="text-dynamic-base font-semibold text-foreground">{t("doc.panel.brand_title")}</h2>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-dynamic-xs font-bold text-muted">{t("doc.letterhead.preset_label")}</label>
                    <select aria-label={t("doc.letterhead.preset_label")} value={letterheadPreset} onChange={(event) => { setLetterheadPreset(event.target.value as "NONE" | "STANDARD" | "FORMAL"); setLetterheadImage(""); }} className="w-full px-3 py-2.5 bg-surface-elevated border border-theme text-foreground text-dynamic-xs">
                      <option value="NONE">{t("doc.letterhead.none")}</option>
                      <option value="STANDARD">{t("doc.letterhead.standard")}</option>
                      <option value="FORMAL">{t("doc.letterhead.formal")}</option>
                    </select>
                  </div>
                  <input ref={letterheadInputRef} type="file" accept="image/png,image/jpeg" onChange={handleLetterheadUpload} className="hidden" />
                  <button type="button" onClick={() => letterheadInputRef.current?.click()} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-surface-elevated border border-theme text-foreground font-semibold text-dynamic-xs">
                    <Upload className="w-4 h-4" />{t("doc.letterhead.upload_btn")}
                  </button>
                  {letterheadImage && <img src={letterheadImage} alt={t("doc.sidebar.letterhead")} className="max-h-24 w-full border border-theme object-contain bg-surface-elevated p-2" />}
                  <label className="flex items-center gap-2 p-3 bg-surface-elevated border border-theme text-dynamic-xs text-foreground">
                    <input type="checkbox" checked={includeApprovalBlock} onChange={(event) => setIncludeApprovalBlock(event.target.checked)} className="accent-primary" />
                    <span>{t("doc.letterhead.show_seal")}</span>
                  </label>
                  <p className="text-dynamic-xs text-muted">{t("doc.letterhead.preview")}</p>
                </div>
              </TabPanel>

              <TabPanel hidden={configPanel !== "style"} id="doc-settings-style-panel" labelledBy="doc-settings-style-tab">
                <div className="bg-surface border border-theme p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary-text" />
                    <h2 className="text-dynamic-base font-semibold text-foreground">{t("doc.panel.styles_title")}</h2>
                  </div>
                  <input type="text" aria-label={t("doc.style.name_placeholder")} value={styleForm.name} onChange={(event) => setStyleForm((prev) => ({ ...prev, name: event.target.value }))} placeholder={t("doc.style.name_placeholder")} className="w-full px-3 py-2.5 bg-surface-elevated border border-theme text-foreground text-dynamic-xs" />
                  <div className="space-y-1">
                    <label className="block text-dynamic-xs font-bold text-muted">{t("doc.style.font_family")}</label>
                    <select aria-label={t("doc.style.font_family")} value={styleForm.fontFamily} onChange={(event) => setStyleForm((prev) => ({ ...prev, fontFamily: event.target.value }))} className="w-full px-3 py-2 bg-surface-elevated border border-theme text-foreground text-dynamic-xs">
                      {["Inter", "Roboto", "SF Pro", "Cairo", "IBM Plex Sans Arabic", "Tajawal", "Georgia", "Times New Roman"].map((font) => <option key={font} value={font}>{font}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-dynamic-xs font-bold text-muted">{t("doc.style.font_size")}</label>
                      <input aria-label={t("doc.style.font_size")} type="number" min={8} max={48} value={styleForm.fontSizePx} onChange={(event) => setStyleForm((prev) => ({ ...prev, fontSizePx: Math.max(8, Number(event.target.value) || 8) }))} className="w-full px-3 py-2 bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-dynamic-xs font-bold text-muted">{t("doc.style.ink_color")}</label>
                      <input aria-label={t("doc.style.ink_color")} type="color" value={styleForm.inkColor} onChange={(event) => setStyleForm((prev) => ({ ...prev, inkColor: event.target.value }))} className="w-full h-10 bg-surface-elevated border border-theme" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-dynamic-xs font-bold text-muted">{t("doc.style.highlight_color")}</label>
                    <input aria-label={t("doc.style.highlight_color")} type="color" value={styleForm.highlightColor} onChange={(event) => setStyleForm((prev) => ({ ...prev, highlightColor: event.target.value }))} className="w-full h-10 bg-surface-elevated border border-theme" />
                  </div>
                  <div className="p-3 bg-surface-elevated border border-theme" style={{ fontFamily: styleForm.fontFamily, fontSize: `${styleForm.fontSizePx}px`, color: styleForm.inkColor, backgroundColor: styleForm.highlightColor }}>
                    <div className="text-dynamic-xs font-bold">{t("doc.style.preview")}</div>
                    <div>{documentTitle} • العربية</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={applyCurrentStyle} className={primaryButtonClass}>{t("doc.style.apply_btn")}</button>
                    <button type="button" onClick={saveStylePreset} className={secondaryButtonClass}>{t("doc.style.save_preset_btn")}</button>
                  </div>
                  {!!savedStyles.length && (
                    <div className="space-y-2">
                      <div className="text-dynamic-xs font-bold text-muted">{t("doc.style.saved_presets")}</div>
                      {savedStyles.map((style) => <button key={style.id} type="button" onClick={() => applySavedStyle(style)} className="w-full flex items-center justify-between gap-2 p-2.5 bg-surface-elevated border border-theme text-start text-dynamic-xs font-semibold text-foreground"><span>{style.name || style.fontFamily}</span><Type className="w-4 h-4 text-primary-text" /></button>)}
                    </div>
                  )}
                </div>
              </TabPanel>

            </div>
          </div>
        </div>
        {pendingTemplateId && (
          <div
            role="alert"
            aria-labelledby="doc-template-replace-title"
            className="shrink-0 border-t border-warning bg-warning-soft p-4 focus:outline-none"
          >
            <h3 id="doc-template-replace-title" className="text-dynamic-sm font-semibold text-foreground">{t("doc.template.replace_title")}</h3>
            <p className="mt-1 text-dynamic-xs text-muted">{t("doc.template.replace_message")}</p>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <button ref={templateConfirmRef} type="button" onClick={cancelTemplateReplacement} className={secondaryButtonClass}>{t("doc.template.keep_editing")}</button>
              <button type="button" onClick={() => chooseTemplate(pendingTemplateId)} className={primaryButtonClass}>{t("doc.template.replace_confirm")}</button>
            </div>
          </div>
        )}
      </ResponsiveDrawer>
      <section className="min-w-0 overflow-hidden border border-theme bg-surface">
        <div className="grid min-w-0 gap-3 border-b border-theme bg-surface p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0 space-y-1">
            <label htmlFor="document-title" className="block text-dynamic-xs font-semibold text-muted">{t("doc.title.label")}</label>
            <input
              id="document-title"
              aria-label={t("doc.title.label")}
              type="text"
              value={documentTitle}
              onChange={(event) => setDocumentTitle(event.target.value)}
              placeholder={t("doc.title.placeholder")}
              className="w-full border-b border-theme bg-transparent py-2 text-dynamic-lg font-semibold text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:items-stretch xl:justify-end">
            <button
              type="button"
              onClick={() => setSettingsDrawerOpen(true)}
              aria-haspopup="dialog"
              aria-controls="docmaker-settings-drawer"
              aria-expanded={settingsDrawerOpen}
              aria-label={t("doc.workspace.open_setup")}
              title={t("doc.workspace.open_setup")}
              className={`${secondaryButtonClass} w-full sm:col-span-2 xl:w-auto xl:min-w-32`}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span>{t("doc.workspace.setup_short")}</span>
            </button>
            <div className="min-w-0 border border-theme px-3 py-2 xl:min-w-[10rem] xl:flex-1">
              <span className="block text-dynamic-xs text-muted">{t(isImportedDocument ? "doc.category.imported" : DOCUMENT_TEMPLATE_CATEGORY_KEYS[activeTemplateId])}</span>
              <span className="block min-w-0 max-w-full truncate text-dynamic-sm font-semibold text-foreground">
                {t(isImportedDocument ? "doc.template.imported" : activeTemplateId === "BLANK" ? "doc.template.blank" : `doc.template.${activeTemplateId}`)}
              </span>
            </div>
            <div className="min-w-0 border border-theme px-3 py-2 xl:min-w-[10rem] xl:flex-1">
              <span className="block text-dynamic-xs text-muted">{t("doc.paper.size_label")}</span>
              <span className="block min-w-0 truncate text-dynamic-sm font-semibold text-foreground">
                {t(`doc.paper.size.${paperSize}`)} · {t(orientation === "PORTRAIT" ? "doc.paper.portrait" : "doc.paper.landscape")}
              </span>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-2 border-b border-theme bg-surface-elevated px-3 py-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div role="group" aria-label={t("doc.action.formatting_toolbar")} className="flex min-w-0 flex-wrap items-center gap-1">
            {editorToolbar.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  title={t(tool.key)}
                  aria-label={t(tool.key)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => runEditorCommand(tool.command, "value" in tool ? tool.value : undefined)}
                  className={`${iconButtonBaseClass} text-foreground hover:bg-primary-soft hover:text-primary-text`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              );
            })}
            <button type="button" title={t("doc.action.insert_table")} aria-label={t("doc.action.insert_table")} onMouseDown={(event) => event.preventDefault()} onClick={insertFinancialTable} className={`${iconButtonBaseClass} text-foreground hover:bg-primary-soft hover:text-primary-text`}><Table2 className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" title={t("doc.action.insert_image")} aria-label={t("doc.action.insert_image")} onMouseDown={(event) => event.preventDefault()} onClick={() => bodyImageInputRef.current?.click()} className={`${iconButtonBaseClass} text-foreground hover:bg-primary-soft hover:text-primary-text`}><ImagePlus className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" title={t("doc.action.insert_link")} aria-label={t("doc.action.insert_link")} onMouseDown={(event) => event.preventDefault()} onClick={insertLink} className={`${iconButtonBaseClass} text-foreground hover:bg-primary-soft hover:text-primary-text`}><Link2 className="h-4 w-4" aria-hidden="true" /></button>
            <label title={t("doc.action.text_color")} className="relative inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-foreground hover:bg-primary-soft hover:text-primary-text focus-within:ring-2 focus-within:ring-primary">
              <Type className="h-4 w-4" aria-hidden="true" />
              <input type="color" value={styleForm.inkColor} onChange={(event) => { setStyleForm((prev) => ({ ...prev, inkColor: event.target.value })); runEditorCommand("foreColor", event.target.value); }} className="absolute h-0 w-0 opacity-0" aria-label={t("doc.action.text_color")} />
            </label>
            <label title={t("doc.action.highlight")} className="relative inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-foreground hover:bg-primary-soft hover:text-primary-text focus-within:ring-2 focus-within:ring-primary">
              <Highlighter className="h-4 w-4" aria-hidden="true" />
              <input type="color" value={styleForm.highlightColor} onChange={(event) => { setStyleForm((prev) => ({ ...prev, highlightColor: event.target.value })); runEditorCommand("hiliteColor", event.target.value); }} className="absolute h-0 w-0 opacity-0" aria-label={t("doc.action.highlight")} />
            </label>
            <label title={t("doc.action.font_size")} className="inline-flex h-10 items-center gap-1 border-s border-theme ps-2 text-foreground">
              <Type className="h-4 w-4" aria-hidden="true" />
              <select aria-label={t("doc.action.font_size")} value={getEditorFontSizeIndex(styleForm.fontSizePx)} onChange={(event) => { setStyleForm((prev) => ({ ...prev, fontSizePx: EDITOR_FONT_SIZE_PRESETS[event.target.value] ?? 14 })); runEditorCommand("fontSize", event.target.value); }} className="h-10 min-w-14 bg-transparent px-1 text-dynamic-xs focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="2">12</option><option value="3">14</option><option value="4">18</option><option value="5">24</option><option value="6">32</option><option value="7">48</option>
              </select>
            </label>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-2 border-t border-theme pt-2 xl:ms-0 xl:border-t-0 xl:pt-0">
            <Sparkles className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <label htmlFor="doc-smart-token" className="sr-only">{t("doc.sidebar.smart_vars")}</label>
            <select id="doc-smart-token" value={smartToken} onChange={(event) => insertSmartToken(event.target.value)} aria-label={t("doc.action.smart_var")} className="h-10 w-full max-w-52 border border-theme bg-surface px-2 text-dynamic-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">{t("doc.smart.placeholder")}</option>
              {SMART_VARIABLES.map((item) => <option key={item.token} value={item.token}>{t(item.key)}</option>)}
            </select>
          </div>
        </div>

        <div className="border-b border-theme bg-surface px-3 py-2 text-dynamic-xs text-muted">
          {t("doc.editor.live_hint")}
        </div>

        <div className="min-h-[65vh] overflow-auto bg-surface-muted p-4 sm:p-6 xl:p-8">
          <article
            aria-label={t("doc.canvas.page_label")}
            className="mx-auto border border-document-line bg-document-paper text-document-ink shadow-xl"
            style={{
              width: `min(100%, ${paperDimensions.width * 96}px)`,
              minHeight: `${paperDimensions.height * 96}px`,
              padding: `${marginInches}in`,
              boxSizing: "border-box"
            }}
          >
            {(letterheadImage || letterheadPreset !== "NONE") && (
              <div className="mb-6 border-b border-document-line pb-4">
                {letterheadImage ? (
                  <img src={letterheadImage} alt={t("doc.sidebar.letterhead")} className="max-h-28 w-full object-contain" />
                ) : (
                  <div className="flex items-center justify-between gap-4 text-document-ink">
                    <span className="text-dynamic-xl font-semibold tracking-tight">YaModeer</span>
                    {letterheadPreset === "FORMAL" && <span className="text-dynamic-xs text-muted">{t("doc.letterhead.formal")}</span>}
                  </div>
                )}
              </div>
            )}
            {showDocumentTitleOnPage && <h1 className="mb-6 text-center text-dynamic-2xl font-semibold text-document-ink">{documentTitle}</h1>}
            {isDual ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2" style={{ direction: "ltr" }}>
                {getOrderedLanguages().map((lang, index, orderedLanguages) => editorPane(lang, index < orderedLanguages.length - 1))}
              </div>
            ) : layout === "STACKED_BILINGUAL" ? (
              <div className="space-y-6">
                {editorPane("en")}
                <div className="border-t border-document-line" />
                {editorPane("ar")}
              </div>
            ) : isArabicOnly ? editorPane("ar") : isEnglishOnly ? editorPane("en") : null}
            {includeApprovalBlock && (
              <div className="mt-16 grid gap-10 border-t border-document-line pt-6 sm:grid-cols-2" style={{ direction: "ltr" }}>
                <div>
                  <div className="text-dynamic-xs font-semibold text-document-ink">{t("doc.approval.signature_en")}</div>
                  <div className="mt-1 text-dynamic-xs text-muted" dir="rtl">{t("doc.approval.signature_ar")}</div>
                  <div className="mt-12 border-b border-document-line" />
                </div>
                <div>
                  <div className="text-dynamic-xs font-semibold text-document-ink">{t("doc.approval.seal_en")}</div>
                  <div className="mt-1 text-dynamic-xs text-muted" dir="rtl">{t("doc.approval.seal_ar")}</div>
                  <div className="mt-12 border-b border-document-line" />
                </div>
              </div>
            )}
          </article>
        </div>
      </section>
    </div>
  );
};

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "enterprise-document";
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
