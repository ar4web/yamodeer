import type { BilingualText } from "@/context/LanguageContext";

export type WorkflowStepKind =
  | "START"
  | "APPROVAL"
  | "CONDITION"
  | "PARALLEL"
  | "MERGE"
  | "NOTIFICATION"
  | "DELAY"
  | "END";

export type WorkflowApprovalRule =
  | "ANY_ONE"
  | "ALL"
  | "MAJORITY"
  | "SEQUENTIAL"
  | "WEIGHTED";

export type WorkflowApproverType =
  | "MANAGER"
  | "DEPARTMENT_HEAD"
  | "HR"
  | "FINANCE"
  | "BUDGET_OWNER"
  | "SPECIFIC_USER";

export type WorkflowTemplateStatus = "DRAFT" | "ACTIVE" | "PAUSED";
export type WorkflowInstanceStatus = "PENDING" | "APPROVED" | "REJECTED" | "RETURNED";
export type WorkflowSlaState = "ON_TRACK" | "AT_RISK" | "BREACHED";

export interface WorkflowStep {
  id: string;
  kind: WorkflowStepKind;
  name: BilingualText;
  approverType?: WorkflowApproverType;
  approvalRule?: WorkflowApprovalRule;
  slaHours?: number;
  escalationHours?: number;
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: string;
}

export interface WorkflowVersionSnapshot {
  version: number;
  name: BilingualText;
  description: BilingualText;
  status: WorkflowTemplateStatus;
  overallSlaHours: number;
  steps: WorkflowStep[];
  savedAt: string;
  changeNote: string;
}

export interface WorkflowTemplate {
  id: string;
  name: BilingualText;
  description: BilingualText;
  category: "LEAVE" | "EXPENSE" | "EMPLOYEE" | "PAYROLL" | "CONTRACT";
  status: WorkflowTemplateStatus;
  version: number;
  overallSlaHours: number;
  updatedAt: string;
  steps: WorkflowStep[];
  versions: WorkflowVersionSnapshot[];
}

export type WorkflowDemoRole = "MANAGER" | "HR_OPS" | "ADMIN" | "SUPER_ADMIN";

export interface WorkflowInstance {
  id: string;
  templateId: string;
  templateVersion: number;
  title: string;
  requester: string;
  requesterId: string;
  department: string;
  status: WorkflowInstanceStatus;
  approvalStepIndex: number;
  assignedRole: WorkflowDemoRole;
  createdAt: string;
  dueAt: string;
  completedAt?: string;
  amountSar?: number;
  lastComment?: string;
  escalatedAt?: string;
}

export interface WorkflowDelegation {
  id: string;
  delegatorRole: WorkflowDemoRole;
  delegateName: string;
  scope: "ALL" | "LEAVE" | "EXPENSE" | "EMPLOYEE" | "PAYROLL" | "CONTRACT";
  startDate: string;
  endDate: string;
  canApprove: boolean;
  canReject: boolean;
  canReturn: boolean;
  reason: string;
  enabled: boolean;
  createdAt: string;
}

export interface WorkflowAuditEvent {
  id: string;
  instanceId?: string;
  templateId?: string;
  delegationId?: string;
  source: "WORKFLOW" | "OPERATIONS" | "TEMPLATE" | "DELEGATION" | "SLA";
  action: string;
  actorRole: string;
  comment?: string;
  occurredAt: string;
}

const copySteps = (steps: WorkflowStep[]): WorkflowStep[] => steps.map((step) => ({ ...step, name: { ...step.name } }));

export const makeVersionSnapshot = (
  template: Omit<WorkflowTemplate, "versions"> | WorkflowTemplate,
  savedAt: string,
  changeNote: string
): WorkflowVersionSnapshot => ({
  version: template.version,
  name: { ...template.name },
  description: { ...template.description },
  status: template.status,
  overallSlaHours: template.overallSlaHours,
  steps: copySteps(template.steps),
  savedAt,
  changeNote
});

const createTemplate = (
  input: Omit<WorkflowTemplate, "versions" | "updatedAt"> & { updatedAt?: string; versionNote: string }
): WorkflowTemplate => {
  const { versionNote, updatedAt: inputUpdatedAt, ...template } = input;
  const updatedAt = inputUpdatedAt ?? new Date().toISOString();
  const completeTemplate = { ...template, updatedAt };
  const firstSnapshot = makeVersionSnapshot(completeTemplate, updatedAt, versionNote);
  return { ...completeTemplate, versions: [firstSnapshot] };
};

export const createInitialWorkflowTemplates = (): WorkflowTemplate[] => {
  const now = new Date().toISOString();
  return [
    createTemplate({
      id: "WF-TPL-LEAVE-001",
      name: { en: "Leave request · manager then HR", ar: "طلب إجازة · المدير ثم الموارد البشرية" },
      description: {
        en: "A simple sequential review for the local prototype. Confirm approval roles and service levels with HR before any production use.",
        ar: "مراجعة تسلسلية مبسطة للنموذج المحلي. يجب اعتماد أدوار الموافقة ومستويات الخدمة من الموارد البشرية قبل أي استخدام إنتاجي."
      },
      category: "LEAVE",
      status: "ACTIVE",
      version: 1,
      overallSlaHours: 72,
      steps: [
        { id: "leave-start", kind: "START", name: { en: "Request submitted", ar: "تقديم الطلب" } },
        {
          id: "leave-manager",
          kind: "APPROVAL",
          name: { en: "Manager review", ar: "مراجعة المدير" },
          approverType: "MANAGER",
          approvalRule: "ANY_ONE",
          slaHours: 24,
          escalationHours: 36
        },
        {
          id: "leave-hr",
          kind: "APPROVAL",
          name: { en: "HR review", ar: "مراجعة الموارد البشرية" },
          approverType: "HR",
          approvalRule: "ANY_ONE",
          slaHours: 24,
          escalationHours: 48
        },
        { id: "leave-notice", kind: "NOTIFICATION", name: { en: "Notify requester", ar: "إشعار مقدم الطلب" } },
        { id: "leave-end", kind: "END", name: { en: "Complete", ar: "اكتمل" } }
      ],
      versionNote: "Initial local prototype template"
    }),
    createTemplate({
      id: "WF-TPL-EXP-002",
      name: { en: "Expense threshold routing · design only", ar: "توجيه المطالبات حسب المبلغ · تصميم فقط" },
      description: {
        en: "Illustrates a manager review, amount condition and finance path. The documentation's > SAR 5,000 approver graph needs policy clarification; no route is executed here.",
        ar: "يوضح مراجعة المدير وشرط المبلغ ومسار المالية. يحتاج مخطط الموافقات لأكثر من ٥٬٠٠٠ ريال إلى توضيح السياسة؛ ولا يُنفذ أي مسار هنا."
      },
      category: "EXPENSE",
      status: "DRAFT",
      version: 1,
      overallSlaHours: 72,
      steps: [
        { id: "expense-start", kind: "START", name: { en: "Claim submitted", ar: "تقديم المطالبة" } },
        {
          id: "expense-manager",
          kind: "APPROVAL",
          name: { en: "Manager review", ar: "مراجعة المدير" },
          approverType: "MANAGER",
          approvalRule: "ANY_ONE",
          slaHours: 24,
          escalationHours: 36
        },
        {
          id: "expense-condition",
          kind: "CONDITION",
          name: { en: "Amount above SAR 5,000?", ar: "هل يتجاوز المبلغ ٥٬٠٠٠ ريال؟" },
          conditionField: "amountSar",
          conditionOperator: "greater_than",
          conditionValue: "5000"
        },
        { id: "expense-parallel", kind: "PARALLEL", name: { en: "Parallel review (not executed)", ar: "مراجعة متوازية (غير منفذة)" } },
        {
          id: "expense-finance",
          kind: "APPROVAL",
          name: { en: "Finance review", ar: "مراجعة المالية" },
          approverType: "FINANCE",
          approvalRule: "ALL",
          slaHours: 24,
          escalationHours: 48
        },
        { id: "expense-merge", kind: "MERGE", name: { en: "Join paths (not executed)", ar: "دمج المسارات (غير منفذ)" } },
        { id: "expense-end", kind: "END", name: { en: "Complete", ar: "اكتمل" } }
      ],
      versionNote: "Initial illustrative design; policy review required"
    }),
    createTemplate({
      id: "WF-TPL-CONTRACT-003",
      name: { en: "Contract review · parallel design", ar: "مراجعة العقد · تصميم متوازٍ" },
      description: {
        en: "Shows legal and finance review branches for design discussion. Parallel execution and merge behavior are not part of this local prototype runtime.",
        ar: "يعرض مساري مراجعة قانونية ومالية للنقاش التصميمي. لا يدعم تشغيل التوازي أو الدمج وقت التنفيذ في هذا النموذج المحلي."
      },
      category: "CONTRACT",
      status: "DRAFT",
      version: 1,
      overallSlaHours: 120,
      steps: [
        { id: "contract-start", kind: "START", name: { en: "Contract submitted", ar: "تقديم العقد" } },
        { id: "contract-parallel", kind: "PARALLEL", name: { en: "Start parallel review", ar: "بدء المراجعة المتوازية" } },
        {
          id: "contract-legal",
          kind: "APPROVAL",
          name: { en: "Legal review", ar: "مراجعة قانونية" },
          approverType: "HR",
          approvalRule: "ANY_ONE",
          slaHours: 48,
          escalationHours: 72
        },
        {
          id: "contract-finance",
          kind: "APPROVAL",
          name: { en: "Finance review", ar: "مراجعة المالية" },
          approverType: "FINANCE",
          approvalRule: "ANY_ONE",
          slaHours: 48,
          escalationHours: 72
        },
        { id: "contract-merge", kind: "MERGE", name: { en: "Join reviews", ar: "دمج المراجعتين" } },
        { id: "contract-end", kind: "END", name: { en: "Complete", ar: "اكتمل" } }
      ],
      versionNote: "Initial illustrative design; parallel execution not available"
    })
  ];
};

export const createInitialWorkflowInstances = (): WorkflowInstance[] => {
  const now = Date.now();
  const hours = (value: number) => new Date(now + value * 60 * 60 * 1000).toISOString();
  return [
    {
      id: "WF-LOCAL-1001",
      templateId: "WF-TPL-LEAVE-001",
      templateVersion: 1,
      title: "Annual leave · 5 working days",
      requester: "Noura Al-Dosari",
      requesterId: "EMP-KSA-1003",
      department: "People Operations",
      status: "PENDING",
      approvalStepIndex: 0,
      assignedRole: "MANAGER",
      createdAt: hours(-18),
      dueAt: hours(5)
    },
    {
      id: "WF-LOCAL-1002",
      templateId: "WF-TPL-LEAVE-001",
      templateVersion: 1,
      title: "Leave request · family event",
      requester: "Mahmoud Mansour",
      requesterId: "EMP-KSA-1002",
      department: "Finance Operations",
      status: "PENDING",
      approvalStepIndex: 1,
      assignedRole: "HR_OPS",
      createdAt: hours(-50),
      dueAt: hours(-4),
      lastComment: "Manager approval recorded in the local demo."
    },
    {
      id: "WF-LOCAL-1003",
      templateId: "WF-TPL-LEAVE-001",
      templateVersion: 1,
      title: "Leave request · personal appointment",
      requester: "Faisal Al-Harbi",
      requesterId: "EMP-KSA-1005",
      department: "Procurement",
      status: "APPROVED",
      approvalStepIndex: 1,
      assignedRole: "HR_OPS",
      createdAt: hours(-96),
      dueAt: hours(-24),
      completedAt: hours(-32),
      lastComment: "Completed in the local workflow prototype."
    }
  ];
};

export const createInitialWorkflowAudit = (): WorkflowAuditEvent[] => {
  const now = Date.now();
  const ago = (hours: number) => new Date(now - hours * 60 * 60 * 1000).toISOString();
  return [
    {
      id: "AUDIT-LOCAL-001",
      instanceId: "WF-LOCAL-1003",
      source: "WORKFLOW",
      action: "APPROVED",
      actorRole: "MANAGER",
      comment: "Local illustrative event — not an authoritative approval record.",
      occurredAt: ago(32)
    },
    {
      id: "AUDIT-LOCAL-002",
      instanceId: "WF-LOCAL-1002",
      source: "WORKFLOW",
      action: "STEP_APPROVED",
      actorRole: "MANAGER",
      comment: "Moved to HR review in the local demo only.",
      occurredAt: ago(20)
    },
    {
      id: "AUDIT-LOCAL-003",
      templateId: "WF-TPL-LEAVE-001",
      source: "TEMPLATE",
      action: "TEMPLATE_CREATED",
      actorRole: "ADMIN",
      comment: "Illustrative starter template.",
      occurredAt: ago(120)
    }
  ];
};

export const getWorkflowSlaState = (dueAt: string, now = Date.now()): WorkflowSlaState => {
  const remaining = new Date(dueAt).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return "BREACHED";
  if (remaining <= 8 * 60 * 60 * 1000) return "AT_RISK";
  return "ON_TRACK";
};

export const getApprovalSteps = (template: WorkflowTemplate): WorkflowStep[] =>
  template.steps.filter((step) => step.kind === "APPROVAL");

export const supportsLinearDemoExecution = (template: WorkflowTemplate): boolean =>
  template.steps[0]?.kind === "START" &&
  template.steps[template.steps.length - 1]?.kind === "END" &&
  template.steps.every((step) => ["START", "APPROVAL", "NOTIFICATION", "END"].includes(step.kind)) &&
  getApprovalSteps(template).length > 0;

export const getDemoRoleForApprover = (approver?: WorkflowApproverType): WorkflowDemoRole => {
  if (approver === "HR") return "HR_OPS";
  if (approver === "FINANCE" || approver === "BUDGET_OWNER") return "ADMIN";
  if (approver === "SPECIFIC_USER") return "ADMIN";
  return "MANAGER";
};

export const getWorkflowTemplateCategoryLabel = (category: WorkflowTemplate["category"]): BilingualText => {
  const labels: Record<WorkflowTemplate["category"], BilingualText> = {
    LEAVE: { en: "Leave", ar: "الإجازات" },
    EXPENSE: { en: "Expense", ar: "المصروفات" },
    EMPLOYEE: { en: "Employee request", ar: "طلب موظف" },
    PAYROLL: { en: "Payroll", ar: "الرواتب" },
    CONTRACT: { en: "Contract", ar: "العقود" }
  };
  return labels[category];
};
