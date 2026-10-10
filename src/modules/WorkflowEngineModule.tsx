import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  GitBranch,
  History,
  Info,
  ListChecks,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
  XCircle
} from "lucide-react";
import { EngineDetailPanel } from "./EngineDetailPanel";
import {
  dangerButtonClass,
  formControlClassName,
  HorizontalBarChart,
  inlineFormControlClassName,
  MetricCard,
  PageHeader,
  primaryButtonClass,
  PrototypeNotice,
  secondaryButtonClass,
  successButtonClass,
  surfaceClassName
} from "@/components/DesignSystem";
import { useLanguage } from "@/context/LanguageContext";
import { useOperations } from "@/context/OperationsContext";
import { useNotificationCenter } from "@/context/NotificationCenterContext";
import { CorporateRole, useCurrentRole } from "@/context/RBACGeofenceContext";
import type { EmployeeRecordBlueprint } from "@/data/mockBlueprints";
import type {
  EmployeeRequestRecord,
  EmployeeTransferRequest,
  ExpenseClaimRecord,
  WorkflowStatus
} from "@/data/workspaceBlueprints";
import {
  createInitialWorkflowAudit,
  createInitialWorkflowInstances,
  createInitialWorkflowTemplates,
  getApprovalSteps,
  getDemoRoleForApprover,
  getWorkflowSlaState,
  getWorkflowTemplateCategoryLabel,
  makeVersionSnapshot,
  supportsLinearDemoExecution,
  type WorkflowApprovalRule,
  type WorkflowApproverType,
  type WorkflowAuditEvent,
  type WorkflowDelegation,
  type WorkflowDemoRole,
  type WorkflowInstance,
  type WorkflowInstanceStatus,
  type WorkflowSlaState,
  type WorkflowStep,
  type WorkflowStepKind,
  type WorkflowTemplate,
  type WorkflowTemplateStatus,
  type WorkflowVersionSnapshot
} from "@/services/workflowPrototype";
import { addISOCalendarDays, getLocalISODate } from "@/services/dateUtils";

interface WorkflowEngineModuleProps {
  employees: EmployeeRecordBlueprint[];
  globalSearchQuery: string;
}

type WorkflowTab = "INBOX" | "BUILDER" | "DELEGATIONS" | "ANALYTICS" | "ACTIVITY";
type QueueFilter = "OPEN" | "HISTORY" | "ALL";
type WorkItemKind = "WORKFLOW" | "EXPENSE" | "EMPLOYEE_REQUEST" | "TRANSFER";
type WorkItemOrigin = "ENGINE" | "OPERATIONS";

type UnifiedWorkItem = {
  key: string;
  origin: WorkItemOrigin;
  kind: WorkItemKind;
  title: string;
  summary: string;
  requester: string;
  requesterId: string;
  department: string;
  status: string;
  createdAt: string;
  dueAt?: string;
  amountSar?: number;
  assignedRole?: WorkflowDemoRole;
  instance?: WorkflowInstance;
  operationId?: string;
  operationRecord?: ExpenseClaimRecord | EmployeeRequestRecord | EmployeeTransferRequest;
};

type Notice = { id: string; message: { en: string; ar: string }; createdAt: string };

type DelegationForm = {
  delegatorRole: WorkflowDemoRole;
  delegateName: string;
  scope: WorkflowDelegation["scope"];
  startDate: string;
  endDate: string;
  canApprove: boolean;
  canReject: boolean;
  canReturn: boolean;
  reason: string;
};

const WORKFLOW_SESSION_PREFIX = "yamodeer.workflow.prototype.v1";
const useSessionDemoState = <T,>(slot: string, fallback: () => T[]): [T[], React.Dispatch<React.SetStateAction<T[]>>] => {
  const key = `${WORKFLOW_SESSION_PREFIX}.${slot}`;
  const [value, setValue] = useState<T[]>(() => {
    try {
      const saved = window.sessionStorage.getItem(key);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed as T[];
      }
    } catch {
      // Keep the prototype usable when browser storage is unavailable.
    }
    return fallback();
  });
  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Keep workflow behavior available in memory if storage is blocked or full.
    }
  }, [key, value]);
  return [value, setValue];
};

const STEP_KIND_OPTIONS: WorkflowStepKind[] = [
  "START", "APPROVAL", "CONDITION", "PARALLEL", "MERGE", "NOTIFICATION", "DELAY", "END"
];
const APPROVER_OPTIONS: WorkflowApproverType[] = [
  "MANAGER", "DEPARTMENT_HEAD", "HR", "FINANCE", "BUDGET_OWNER", "SPECIFIC_USER"
];
const APPROVAL_RULE_OPTIONS: WorkflowApprovalRule[] = [
  "ANY_ONE", "ALL", "MAJORITY", "SEQUENTIAL", "WEIGHTED"
];
const workflowPanelClass = "rounded-xl border border-theme bg-surface shadow-card";
const subtlePanelClass = "rounded-xl border border-theme bg-surface-elevated";
const labelClass = "mb-1.5 block text-dynamic-xs font-semibold text-muted";
const neutralPillClass = "inline-flex items-center rounded-full border border-theme bg-surface-elevated px-2.5 py-1 text-dynamic-xs font-semibold text-muted";

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const cloneSteps = (steps: WorkflowStep[]): WorkflowStep[] => steps.map((step) => ({ ...step, name: { ...step.name } }));
const cloneTemplate = (template: WorkflowTemplate): WorkflowTemplate => ({
  ...template,
  name: { ...template.name },
  description: { ...template.description },
  steps: cloneSteps(template.steps),
  versions: template.versions.map((version) => ({
    ...version,
    name: { ...version.name },
    description: { ...version.description },
    steps: cloneSteps(version.steps)
  }))
});
const asDateTime = (value: string, language: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
};
const asDate = (value: string, language: string) => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium" }).format(date);
};
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
const statusToneClass = (status: string) => {
  if (status === "APPROVED" || status === "REIMBURSED") return "border-success/40 bg-success-soft text-success-text";
  if (status === "REJECTED") return "border-danger/40 bg-danger-soft text-danger-text";
  if (status === "RETURNED") return "border-warning/40 bg-warning-soft text-warning-text";
  return "border-primary/30 bg-primary-soft text-primary-text";
};
const slaToneClass = (state: WorkflowSlaState) => {
  if (state === "BREACHED") return "border-danger/40 bg-danger-soft text-danger-text";
  if (state === "AT_RISK") return "border-warning/40 bg-warning-soft text-warning-text";
  return "border-success/40 bg-success-soft text-success-text";
};
const workflowRoleForAppRole = (role: CorporateRole): WorkflowDemoRole | null => {
  if (role === "MANAGER") return "MANAGER";
  if (role === "HR_OPS") return "HR_OPS";
  if (role === "ADMIN") return "ADMIN";
  if (role === "SUPER_ADMIN") return "SUPER_ADMIN";
  return null;
};
const canOverrideDemoAssignment = (role: CorporateRole) => role === "ADMIN" || role === "SUPER_ADMIN";
const getOperationsStatus = (status: string) => status === "PENDING" ? "PENDING" : status;
const DEFAULT_STEP_NAMES: Record<WorkflowStepKind, { en: string; ar: string }> = {
  START: { en: "Start", ar: "بدء" },
  APPROVAL: { en: "Approval", ar: "موافقة" },
  CONDITION: { en: "Condition", ar: "شرط" },
  PARALLEL: { en: "Parallel", ar: "توازي" },
  MERGE: { en: "Merge", ar: "دمج" },
  NOTIFICATION: { en: "Notification", ar: "إشعار" },
  DELAY: { en: "Delay", ar: "تأخير" },
  END: { en: "End", ar: "إنهاء" }
};

const makeDraftStep = (kind: WorkflowStepKind): WorkflowStep => {
  const base: WorkflowStep = { id: createId("step"), kind, name: { ...DEFAULT_STEP_NAMES[kind] } };
  if (kind === "APPROVAL") {
    base.approverType = "MANAGER";
    base.approvalRule = "ANY_ONE";
    base.slaHours = 24;
    base.escalationHours = 36;
  }
  if (kind === "CONDITION") {
    base.conditionField = "amountSar";
    base.conditionOperator = "greater_than";
    base.conditionValue = "5000";
  }
  return base;
};

export const WorkflowEngineModule: React.FC<WorkflowEngineModuleProps> = ({ employees, globalSearchQuery }) => {
  const { t, language, localize, formatCurrencySAR } = useLanguage();
  const { currentRole, hasPermission } = useCurrentRole();
  const { addNotification } = useNotificationCenter();
  const {
    expenseClaims,
    updateExpenseStatus,
    employeeRequests,
    updateEmployeeRequestStatus,
    transferRequests,
    updateTransferStatus
  } = useOperations();

  const [activeTab, setActiveTab] = useState<WorkflowTab>("INBOX");
  const [templates, setTemplates] = useSessionDemoState("templates", createInitialWorkflowTemplates);
  const [instances, setInstances] = useSessionDemoState("instances", createInitialWorkflowInstances);
  const [auditEvents, setAuditEvents] = useSessionDemoState("audit", createInitialWorkflowAudit);
  const [notices, setNotices] = useSessionDemoState<Notice>("notices", () => [{
    id: "NOTICE-LOCAL-001",
    message: {
      en: "This page uses illustrative records. No message has been sent to email or SMS.",
      ar: "تستخدم هذه الصفحة سجلات توضيحية. لم يتم إرسال أي رسالة عبر البريد الإلكتروني أو الرسائل النصية."
    },
    createdAt: new Date().toISOString()
  }]);
  const [selectedWorkKey, setSelectedWorkKey] = useState("");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("OPEN");
  const [queueTypeFilter, setQueueTypeFilter] = useState<"ALL" | WorkItemKind>("ALL");
  const [queueSearch, setQueueSearch] = useState("");
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [toast, setToast] = useState("");
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [requestFormError, setRequestFormError] = useState("");
  const [requestForm, setRequestForm] = useState({
    templateId: "WF-TPL-LEAVE-001",
    title: "",
    requesterId: employees[0]?.id ?? "",
    amountSar: ""
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState("WF-TPL-LEAVE-001");
  const [editorDraft, setEditorDraft] = useState<WorkflowTemplate | null>(null);
  const [templateSaveNote, setTemplateSaveNote] = useState("");
  const [builderError, setBuilderError] = useState("");
  const [newStepKind, setNewStepKind] = useState<WorkflowStepKind>("APPROVAL");
  const [delegations, setDelegations] = useSessionDemoState<WorkflowDelegation>("delegations", () => []);
  const [delegationError, setDelegationError] = useState("");
  const [delegationForm, setDelegationForm] = useState<DelegationForm>(() => {
    const today = getLocalISODate();
    const nextWeek = addISOCalendarDays(today, 7);
    return {
      delegatorRole: "MANAGER",
      delegateName: "",
      scope: "ALL",
      startDate: today,
      endDate: nextWeek,
      canApprove: true,
      canReject: true,
      canReturn: true,
      reason: ""
    };
  });

  const canApprove = hasPermission("dept:manage_team_leave_ot") || hasPermission("system:raw_audit_logs");
  const canManageTemplates = currentRole === "HR_OPS" || currentRole === "ADMIN" || currentRole === "SUPER_ADMIN";
  const canViewManagerTools = canApprove;
  const visibleTabs: Array<{ id: WorkflowTab; labelKey: string; icon: React.ReactNode }> = [
    { id: "INBOX", labelKey: "workflow.tab.inbox", icon: <ListChecks className="h-4 w-4" aria-hidden="true" /> },
    ...(canManageTemplates ? [{ id: "BUILDER" as const, labelKey: "workflow.tab.builder", icon: <GitBranch className="h-4 w-4" aria-hidden="true" /> }] : []),
    ...(currentRole !== "EMPLOYEE" ? [{ id: "DELEGATIONS" as const, labelKey: "workflow.tab.delegations", icon: <Users className="h-4 w-4" aria-hidden="true" /> }] : []),
    ...(canViewManagerTools ? [{ id: "ANALYTICS" as const, labelKey: "workflow.tab.analytics", icon: <BarChart3 className="h-4 w-4" aria-hidden="true" /> }] : []),
    ...(canViewManagerTools ? [{ id: "ACTIVITY" as const, labelKey: "workflow.tab.activity", icon: <History className="h-4 w-4" aria-hidden="true" /> }] : [])
  ];

  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);

  const operationWorkItems = useMemo<UnifiedWorkItem[]>(() => {
    const items: UnifiedWorkItem[] = [];
    expenseClaims.forEach((claim) => {
      const employee = employeeById.get(claim.employeeId);
      items.push({
        key: `op:expense:${claim.id}`,
        origin: "OPERATIONS",
        kind: "EXPENSE",
        title: `${t("workflow.source.expense")}: ${claim.id}`,
        summary: `${localize(claim.merchantName)} · ${t("workflow.source.expense_claim")}`,
        requester: localize(claim.employeeName) || (employee ? localize(employee.name) : claim.employeeId),
        requesterId: claim.employeeId,
        department: employee ? localize(employee.department) : t("workflow.common.department_not_set"),
        status: getOperationsStatus(claim.status),
        createdAt: `${claim.dateIso}T12:00:00`,
        amountSar: claim.totalAmountSar,
        operationId: claim.id,
        operationRecord: claim
      });
    });
    employeeRequests.forEach((request) => {
      const employee = employeeById.get(request.employeeId);
      const typeLabel = t(`workflow.request_type.${request.type.toLowerCase()}`);
      items.push({
        key: `op:employee-request:${request.id}`,
        origin: "OPERATIONS",
        kind: "EMPLOYEE_REQUEST",
        title: `${typeLabel} · ${request.id}`,
        summary: request.requestedDate
          ? `${t("workflow.detail.requested_date")}: ${asDate(request.requestedDate, language)}`
          : t("workflow.source.employee_request"),
        requester: employee ? localize(employee.name) : request.employeeId,
        requesterId: request.employeeId,
        department: employee ? localize(employee.department) : t("workflow.common.department_not_set"),
        status: getOperationsStatus(request.status),
        createdAt: `${request.submittedDate}T12:00:00`,
        operationId: request.id,
        operationRecord: request
      });
    });
    transferRequests.forEach((request) => {
      const employee = employeeById.get(request.employeeId);
      items.push({
        key: `op:transfer:${request.id}`,
        origin: "OPERATIONS",
        kind: "TRANSFER",
        title: `${t("workflow.source.transfer")}: ${request.id}`,
        summary: `${request.fromDepartmentCode} → ${request.toDepartmentCode} · ${t("workflow.detail.effective")}: ${asDate(request.effectiveDate, language)}`,
        requester: employee ? localize(employee.name) : request.employeeId,
        requesterId: request.employeeId,
        department: employee ? localize(employee.department) : t("workflow.common.department_not_set"),
        status: getOperationsStatus(request.status),
        createdAt: `${request.requestedDate}T12:00:00`,
        operationId: request.id,
        operationRecord: request
      });
    });
    return items;
  }, [expenseClaims, employeeRequests, transferRequests, employeeById, localize, t, language]);

  const instanceWorkItems = useMemo<UnifiedWorkItem[]>(() => instances.map((instance) => {
    const template = templates.find((item) => item.id === instance.templateId);
    const currentStep = template ? getApprovalSteps(template)[instance.approvalStepIndex] : undefined;
    return {
      key: `engine:${instance.id}`,
      origin: "ENGINE",
      kind: "WORKFLOW",
      title: instance.title,
      summary: template ? localize(template.name) : t("workflow.common.unknown_template"),
      requester: instance.requester,
      requesterId: instance.requesterId,
      department: instance.department,
      status: instance.status,
      createdAt: instance.createdAt,
      dueAt: instance.dueAt,
      amountSar: instance.amountSar,
      assignedRole: instance.assignedRole,
      instance
    };
  }), [instances, templates, localize, t]);

  const allWorkItems = useMemo(() => [...instanceWorkItems, ...operationWorkItems], [instanceWorkItems, operationWorkItems]);
  const employeeId = employees[0]?.id ?? "";
  const normalizedSearch = `${globalSearchQuery} ${queueSearch}`.trim().toLowerCase();
  const visibleWorkItems = useMemo(() => {
    const query = normalizedSearch;
    return allWorkItems
      .filter((item) => currentRole !== "EMPLOYEE" || item.requesterId === employeeId)
      .filter((item) => queueFilter === "ALL" || (queueFilter === "OPEN" ? item.status === "PENDING" : item.status !== "PENDING"))
      .filter((item) => queueTypeFilter === "ALL" || item.kind === queueTypeFilter)
      .filter((item) => !query || [item.title, item.summary, item.requester, item.requesterId, item.department, item.status]
        .join(" ")
        .toLowerCase()
        .includes(query))
      .sort((a, b) => {
        const statusOrder = Number(b.status === "PENDING") - Number(a.status === "PENDING");
        if (statusOrder !== 0) return statusOrder;
        if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
        if (a.dueAt) return -1;
        if (b.dueAt) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [allWorkItems, currentRole, employeeId, queueFilter, queueTypeFilter, normalizedSearch]);

  const selectedWorkItem = visibleWorkItems.find((item) => item.key === selectedWorkKey) ?? visibleWorkItems[0];
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
  const draftTemplate = editorDraft ?? (selectedTemplate ? cloneTemplate(selectedTemplate) : null);
  const currentAppRole = workflowRoleForAppRole(currentRole);
  const canActOnItem = (item?: UnifiedWorkItem) => {
    if (!item || item.status !== "PENDING" || !canApprove) return false;
    if (item.origin === "OPERATIONS") return currentRole !== "EMPLOYEE";
    return canOverrideDemoAssignment(currentRole) || item.assignedRole === currentAppRole;
  };

  const addAuditEvent = (event: Omit<WorkflowAuditEvent, "id" | "occurredAt">) => {
    setAuditEvents((current) => [{ ...event, id: createId("AUDIT-LOCAL"), occurredAt: new Date().toISOString() }, ...current]);
  };
  const addLocalNotice = (message: { en: string; ar: string }) => {
    const notice: Notice = { id: createId("NOTICE-LOCAL"), message, createdAt: new Date().toISOString() };
    setNotices((current) => [notice, ...current].slice(0, 12));
    addNotification({
      category: "WORKFLOW",
      title: { en: "Workflow demo activity", ar: "نشاط تجريبي لمسار عمل" },
      body: message,
      route: "workflows"
    });
    setToast(localize(message));
    window.setTimeout(() => setToast(""), 4200);
  };

  const handleWorkflowDecision = (instance: WorkflowInstance, decision: "APPROVE" | "REJECT" | "RETURN") => {
    const template = templates.find((item) => item.id === instance.templateId);
    const approvalSteps = template ? getApprovalSteps(template) : [];
    const currentStep = approvalSteps[instance.approvalStepIndex];
    const note = decisionComment.trim();
    if (decision !== "APPROVE" && !note) {
      setDecisionError(t("workflow.action.comment_required"));
      return;
    }
    setDecisionError("");

    if (decision === "APPROVE" && currentStep && instance.approvalStepIndex < approvalSteps.length - 1) {
      const nextIndex = instance.approvalStepIndex + 1;
      const nextStep = approvalSteps[nextIndex];
      const updated: WorkflowInstance = {
        ...instance,
        approvalStepIndex: nextIndex,
        assignedRole: getDemoRoleForApprover(nextStep?.approverType),
        dueAt: hoursFromNow(nextStep?.slaHours ?? 24),
        lastComment: note || undefined
      };
      setInstances((current) => current.map((item) => item.id === instance.id ? updated : item));
      addAuditEvent({
        instanceId: instance.id,
        source: "WORKFLOW",
        action: "STEP_APPROVED",
        actorRole: currentRole,
        comment: note || t("workflow.audit.step_approved_local")
      });
      addLocalNotice({
        en: `Local demo approval recorded; the next step is ${nextStep ? localize(nextStep.name) : "the next reviewer"}.`,
        ar: `تم تسجيل الموافقة محلياً في العرض؛ والخطوة التالية هي ${nextStep ? localize(nextStep.name) : "المراجع التالي"}.`
      });
    } else {
      const nextStatus: WorkflowInstanceStatus = decision === "APPROVE" ? "APPROVED" : decision === "REJECT" ? "REJECTED" : "RETURNED";
      const updated: WorkflowInstance = {
        ...instance,
        status: nextStatus,
        completedAt: new Date().toISOString(),
        lastComment: note || undefined
      };
      setInstances((current) => current.map((item) => item.id === instance.id ? updated : item));
      addAuditEvent({
        instanceId: instance.id,
        source: "WORKFLOW",
        action: nextStatus,
        actorRole: currentRole,
        comment: note || t("workflow.audit.approved_local")
      });
      const messages = {
        APPROVED: { en: "Demo workflow marked approved locally; no HR record or external system was changed.", ar: "تم وضع علامة الموافقة على مسار العرض محلياً؛ ولم يتغير أي سجل للموارد البشرية أو نظام خارجي." },
        REJECTED: { en: "Demo workflow marked rejected locally; no external notice was sent.", ar: "تم وضع علامة الرفض على مسار العرض محلياً؛ ولم يُرسل أي إشعار خارجي." },
        RETURNED: { en: "Demo workflow returned locally for revision; no external notice was sent.", ar: "أُعيد مسار العرض محلياً للمراجعة؛ ولم يُرسل أي إشعار خارجي." }
      };
      addLocalNotice(messages[nextStatus]);
    }
    setDecisionComment("");
  };

  const handleResubmit = (instance: WorkflowInstance) => {
    const template = templates.find((item) => item.id === instance.templateId);
    const firstStep = template ? getApprovalSteps(template)[0] : undefined;
    if (!firstStep) return;
    const updated: WorkflowInstance = {
      ...instance,
      status: "PENDING",
      approvalStepIndex: 0,
      assignedRole: getDemoRoleForApprover(firstStep.approverType),
      createdAt: new Date().toISOString(),
      dueAt: hoursFromNow(firstStep.slaHours ?? 24),
      completedAt: undefined,
      lastComment: t("workflow.action.resubmitted_local")
    };
    setInstances((current) => current.map((item) => item.id === instance.id ? updated : item));
    addAuditEvent({ instanceId: instance.id, source: "WORKFLOW", action: "RESUBMITTED", actorRole: currentRole, comment: t("workflow.action.resubmitted_local") });
    addLocalNotice({ en: "Demo request resubmitted to its first approval step locally.", ar: "أُعيد تقديم طلب العرض إلى خطوة الموافقة الأولى محلياً." });
    setQueueFilter("OPEN");
    setSelectedWorkKey(`engine:${instance.id}`);
  };

  const handleOperationsDecision = (item: UnifiedWorkItem, decision: "APPROVED" | "REJECTED") => {
    const note = decisionComment.trim();
    if (decision === "REJECTED" && !note) {
      setDecisionError(t("workflow.action.comment_required"));
      return;
    }
    setDecisionError("");
    if (item.kind === "EXPENSE") updateExpenseStatus(item.operationId ?? "", decision);
    if (item.kind === "EMPLOYEE_REQUEST") updateEmployeeRequestStatus(item.operationId ?? "", decision as WorkflowStatus);
    if (item.kind === "TRANSFER") updateTransferStatus(item.operationId ?? "", decision as WorkflowStatus);
    addAuditEvent({
      source: "OPERATIONS",
      action: decision === "APPROVED" ? "LOCAL_OPERATION_APPROVED" : "LOCAL_OPERATION_REJECTED",
      actorRole: currentRole,
      comment: `${item.operationId ?? item.title}${note ? ` — ${note}` : ""}`
    });
    addLocalNotice({
      en: `${item.operationId ?? item.title} was updated in local app memory only.`,
      ar: `تم تحديث ${item.operationId ?? item.title} في ذاكرة التطبيق المحلية فقط.`
    });
    setDecisionComment("");
  };

  const handleEscalationLog = (instance: WorkflowInstance) => {
    const updated = { ...instance, escalatedAt: new Date().toISOString() };
    setInstances((current) => current.map((item) => item.id === instance.id ? updated : item));
    addAuditEvent({ instanceId: instance.id, source: "SLA", action: "MANUAL_ESCALATION_LOGGED", actorRole: currentRole, comment: t("workflow.sla.manual_escalation_note") });
    addLocalNotice({ en: "A manual demo escalation note was recorded. No scheduler or escalation message ran.", ar: "تم تسجيل ملاحظة تصعيد يدوية في العرض. لم تعمل أي جدولة أو رسالة تصعيد." });
  };

  const handleCreateRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const template = templates.find((item) => item.id === requestForm.templateId);
    const requester = employeeById.get(requestForm.requesterId);
    if (!template || template.status !== "ACTIVE" || !supportsLinearDemoExecution(template)) {
      setRequestFormError(t("workflow.request.linear_template_required"));
      return;
    }
    if (!requestForm.title.trim() || !requester) {
      setRequestFormError(t("workflow.request.required_fields"));
      return;
    }
    const approvalSteps = getApprovalSteps(template);
    const firstStep = approvalSteps[0];
    if (!firstStep) {
      setRequestFormError(t("workflow.request.linear_template_required"));
      return;
    }
    const id = `WF-LOCAL-${String(Date.now()).slice(-7)}`;
    const amount = Number(requestForm.amountSar);
    const instance: WorkflowInstance = {
      id,
      templateId: template.id,
      templateVersion: template.version,
      title: requestForm.title.trim(),
      requester: localize(requester.name),
      requesterId: requester.id,
      department: localize(requester.department),
      status: "PENDING",
      approvalStepIndex: 0,
      assignedRole: getDemoRoleForApprover(firstStep.approverType),
      createdAt: new Date().toISOString(),
      dueAt: hoursFromNow(firstStep.slaHours ?? 24),
      ...(Number.isFinite(amount) && amount > 0 ? { amountSar: amount } : {})
    };
    setInstances((current) => [instance, ...current]);
    addAuditEvent({ instanceId: id, templateId: template.id, source: "WORKFLOW", action: "INSTANCE_CREATED_LOCAL", actorRole: currentRole, comment: `${template.name.en} v${template.version}` });
    addLocalNotice({ en: `${id} was created as an in-memory demo request.`, ar: `أُنشئ ${id} كطلب تجريبي في الذاكرة المحلية.` });
    setSelectedWorkKey(`engine:${id}`);
    setQueueFilter("OPEN");
    setActiveTab("INBOX");
    setRequestFormOpen(false);
    setRequestFormError("");
    setRequestForm((current) => ({ ...current, title: "", amountSar: "" }));
  };

  const openTemplateInBuilder = (template: WorkflowTemplate) => {
    setSelectedTemplateId(template.id);
    setEditorDraft(cloneTemplate(template));
    setBuilderError("");
    setActiveTab("BUILDER");
  };

  const startNewTemplate = () => {
    const id = createId("WF-TPL-LOCAL");
    const blank: WorkflowTemplate = {
      id,
      name: { en: "New workflow template", ar: "قالب مسار عمل جديد" },
      description: { en: "Local draft only.", ar: "مسودة محلية فقط." },
      category: "EMPLOYEE",
      status: "DRAFT",
      version: 0,
      overallSlaHours: 48,
      updatedAt: new Date().toISOString(),
      steps: [
        { id: createId("step"), kind: "START", name: { ...DEFAULT_STEP_NAMES.START } },
        makeDraftStep("APPROVAL"),
        { id: createId("step"), kind: "END", name: { ...DEFAULT_STEP_NAMES.END } }
      ],
      versions: []
    };
    setSelectedTemplateId(id);
    setEditorDraft(blank);
    setTemplateSaveNote("");
    setBuilderError("");
    setActiveTab("BUILDER");
  };

  const updateDraft = (updater: (draft: WorkflowTemplate) => WorkflowTemplate) => {
    if (!draftTemplate) return;
    setEditorDraft(updater(cloneTemplate(draftTemplate)));
  };

  const saveTemplate = (candidate = draftTemplate, note = templateSaveNote.trim()) => {
    if (!candidate) return;
    if (!candidate.name.en.trim() || !candidate.name.ar.trim()) {
      setBuilderError(t("workflow.builder.name_required"));
      return;
    }
    if (!candidate.steps.some((step) => step.kind === "APPROVAL")) {
      setBuilderError(t("workflow.builder.approval_step_required"));
      return;
    }
    if (candidate.steps[0]?.kind !== "START" || candidate.steps[candidate.steps.length - 1]?.kind !== "END") {
      setBuilderError(t("workflow.builder.start_end_required"));
      return;
    }
    if (candidate.overallSlaHours < 1 || candidate.overallSlaHours > 8760) {
      setBuilderError(t("workflow.builder.sla_range"));
      return;
    }
    const existing = templates.find((template) => template.id === candidate.id);
    const version = existing ? existing.version + 1 : 1;
    const updatedAt = new Date().toISOString();
    const savedBase: WorkflowTemplate = {
      ...candidate,
      version,
      updatedAt,
      steps: cloneSteps(candidate.steps),
      versions: existing ? existing.versions : []
    };
    const snapshot = makeVersionSnapshot(savedBase, updatedAt, note || t("workflow.builder.default_change_note"));
    const saved: WorkflowTemplate = { ...savedBase, versions: [...savedBase.versions, snapshot] };
    setTemplates((current) => existing
      ? current.map((template) => template.id === saved.id ? saved : template)
      : [saved, ...current]);
    setSelectedTemplateId(saved.id);
    setEditorDraft(cloneTemplate(saved));
    setBuilderError("");
    setTemplateSaveNote("");
    addAuditEvent({ templateId: saved.id, source: "TEMPLATE", action: existing ? "TEMPLATE_VERSION_SAVED_LOCAL" : "TEMPLATE_CREATED_LOCAL", actorRole: currentRole, comment: `v${version} · ${note || t("workflow.builder.default_change_note")}` });
    addLocalNotice({ en: `Template v${version} saved in this page's local demo state.`, ar: `حُفظ الإصدار ${version} من القالب في حالة العرض المحلية لهذه الصفحة.` });
  };

  const restoreTemplateVersion = (snapshot: WorkflowVersionSnapshot) => {
    if (!draftTemplate) return;
    const restored: WorkflowTemplate = {
      ...draftTemplate,
      name: { ...snapshot.name },
      description: { ...snapshot.description },
      status: snapshot.status,
      overallSlaHours: snapshot.overallSlaHours,
      steps: cloneSteps(snapshot.steps)
    };
    saveTemplate(restored, `${t("workflow.history.restore_as_new_version")} ${snapshot.version}`);
  };

  const addDraftStep = () => {
    updateDraft((draft) => ({ ...draft, steps: [...draft.steps, makeDraftStep(newStepKind)] }));
  };
  const updateDraftStep = (stepId: string, patch: Partial<WorkflowStep>) => {
    updateDraft((draft) => ({
      ...draft,
      steps: draft.steps.map((step) => step.id === stepId ? { ...step, ...patch } : step)
    }));
  };
  const moveDraftStep = (stepId: string, delta: number) => {
    updateDraft((draft) => {
      const index = draft.steps.findIndex((step) => step.id === stepId);
      const nextIndex = index + delta;
      if (index < 0 || nextIndex < 0 || nextIndex >= draft.steps.length) return draft;
      const steps = [...draft.steps];
      [steps[index], steps[nextIndex]] = [steps[nextIndex], steps[index]];
      return { ...draft, steps };
    });
  };
  const deleteDraftStep = (stepId: string) => {
    updateDraft((draft) => ({ ...draft, steps: draft.steps.filter((step) => step.id !== stepId) }));
  };

  const createDelegation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!delegationForm.delegateName.trim() || !delegationForm.reason.trim() || !(delegationForm.canApprove || delegationForm.canReject || delegationForm.canReturn)) {
      setDelegationError(t("workflow.delegation.required_fields"));
      return;
    }
    if (delegationForm.endDate < delegationForm.startDate) {
      setDelegationError(t("workflow.delegation.date_order"));
      return;
    }
    const delegation: WorkflowDelegation = {
      ...delegationForm,
      id: createId("DELEGATION-LOCAL"),
      delegateName: delegationForm.delegateName.trim(),
      reason: delegationForm.reason.trim(),
      enabled: true,
      createdAt: new Date().toISOString()
    };
    setDelegations((current) => [delegation, ...current]);
    addAuditEvent({ delegationId: delegation.id, source: "DELEGATION", action: "DELEGATION_CREATED_LOCAL", actorRole: currentRole, comment: delegation.reason });
    addLocalNotice({ en: "Delegation saved for local preview only; it does not grant approval authority.", ar: "حُفظ التفويض للمعاينة المحلية فقط؛ ولا يمنح صلاحية اعتماد فعلية." });
    setDelegationForm((current) => ({ ...current, delegateName: "", reason: "" }));
    setDelegationError("");
  };

  const toggleDelegation = (delegation: WorkflowDelegation) => {
    const nextEnabled = !delegation.enabled;
    setDelegations((current) => current.map((item) => item.id === delegation.id ? { ...item, enabled: nextEnabled } : item));
    addAuditEvent({ delegationId: delegation.id, source: "DELEGATION", action: nextEnabled ? "DELEGATION_ENABLED_LOCAL" : "DELEGATION_PAUSED_LOCAL", actorRole: currentRole, comment: delegation.reason });
  };

  const getMatchingDelegation = (item: UnifiedWorkItem) => {
    if (!item.assignedRole || item.origin !== "ENGINE") return undefined;
    const today = getLocalISODate();
    const template = item.instance ? templates.find((candidate) => candidate.id === item.instance?.templateId) : undefined;
    const categoryScope = template?.category === "LEAVE" ? "LEAVE"
      : template?.category === "EXPENSE" ? "EXPENSE"
        : template?.category === "PAYROLL" ? "PAYROLL"
          : template?.category === "CONTRACT" ? "CONTRACT"
            : "EMPLOYEE";
    return delegations.find((delegation) =>
      delegation.enabled &&
      delegation.delegatorRole === item.assignedRole &&
      (delegation.scope === "ALL" || delegation.scope === categoryScope) &&
      delegation.startDate <= today &&
      delegation.endDate >= today
);
};

  const filteredInstances = instances.filter((instance) => currentRole !== "EMPLOYEE" || instance.requesterId === employeeId);
  const pendingInstances = filteredInstances.filter((instance) => instance.status === "PENDING");
  const completedInstances = filteredInstances.filter((instance) => instance.status !== "PENDING" && instance.completedAt);
  const atRiskCount = pendingInstances.filter((instance) => getWorkflowSlaState(instance.dueAt) !== "ON_TRACK").length;
  const completionDurations = completedInstances.map((instance) => Math.max(0, (new Date(instance.completedAt ?? instance.createdAt).getTime() - new Date(instance.createdAt).getTime()) / 3600000));
  const averageCompletionHours = completionDurations.length
    ? completionDurations.reduce((sum, hours) => sum + hours, 0) / completionDurations.length
    : null;
  const completedWithinSla = completedInstances.filter((instance) => new Date(instance.completedAt ?? 0).getTime() <= new Date(instance.dueAt).getTime()).length;
  const slaCompliance = completedInstances.length ? Math.round((completedWithinSla / completedInstances.length) * 100) : null;
  const activeTemplateCount = templates.filter((template) => template.status === "ACTIVE").length;
  const operationOpenCount = operationWorkItems.filter((item) => item.status === "PENDING" && (currentRole !== "EMPLOYEE" || item.requesterId === employeeId)).length;

  const sourceLabel = (kind: WorkItemKind) => {
    if (kind === "EXPENSE") return t("workflow.source.expense");
    if (kind === "EMPLOYEE_REQUEST") return t("workflow.source.employee_request");
    if (kind === "TRANSFER") return t("workflow.source.transfer");
    return t("workflow.source.workflow_request");
  };
  const statusLabel = (status: string) => t(`workflow.status.${status.toLowerCase()}`);
  const roleLabel = (role: WorkflowDemoRole) => t(`role.${role}`);
  const slaLabel = (state: WorkflowSlaState) => t(`workflow.sla.${state.toLowerCase()}`);

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tab: WorkflowTab) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = visibleTabs.findIndex((item) => item.id === tab);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? visibleTabs.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + visibleTabs.length) % visibleTabs.length;
    setActiveTab(visibleTabs[nextIndex].id);
    document.getElementById(`workflow-tab-${visibleTabs[nextIndex].id}`)?.focus();
  };

  const currentItemDelegation = selectedWorkItem ? getMatchingDelegation(selectedWorkItem) : undefined;
  const selectedCanAct = canActOnItem(selectedWorkItem);
  const displayedQueueItems = visibleWorkItems.slice(0, 40);
  const inputSearchValue = queueSearch;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t("nav.group.operations")}
        title={t("workflow.header.title")}
        meta={(
          <span className="inline-flex items-center gap-1.5 rounded-full border border-theme bg-surface-elevated px-2.5 py-1 text-dynamic-xs font-semibold text-muted">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {t("workflow.header.meta")}
          </span>
        )}
        actions={activeTab === "INBOX" ? (
          <button type="button" className={primaryButtonClass} onClick={() => setRequestFormOpen((open) => !open)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {requestFormOpen ? t("workflow.request.close") : t("workflow.request.new")}
          </button>
        ) : activeTab === "BUILDER" && canManageTemplates ? (
          <button type="button" className={primaryButtonClass} onClick={startNewTemplate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("workflow.builder.new_template")}
          </button>
        ) : undefined}
      />

      <PrototypeNotice label={t("app.badge.demo_data")}>
        {t("workflow.prototype.notice")}
      </PrototypeNotice>

      {toast && (
        <div role="status" aria-live="polite" className="flex items-start gap-2 rounded-lg border border-success/40 bg-success-soft px-3 py-2 text-dynamic-sm text-success-text">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{toast}</span>
        </div>
      )}

      <div role="tablist" aria-label={t("workflow.tabs.label")} className="flex gap-1 overflow-x-auto rounded-xl border border-theme bg-surface p-1">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            id={`workflow-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`workflow-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => onTabKeyDown(event, tab.id)}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-dynamic-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeTab === tab.id ? "bg-primary-soft text-primary-text" : "text-muted hover:bg-surface-elevated hover:text-foreground"}`}
          >
            {tab.icon}
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {activeTab === "INBOX" && (
        <section id="workflow-panel-INBOX" role="tabpanel" aria-labelledby="workflow-tab-INBOX" tabIndex={0} className="space-y-4 outline-none">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={t("workflow.metric.pending")}
              value={pendingInstances.length + operationOpenCount}
              icon={<ListChecks className="h-5 w-5" aria-hidden="true" />}
              note={t("workflow.metric.pending_note")}
              tone="primary" />
            <MetricCard label={t("workflow.metric.at_risk")}
              value={atRiskCount}
              icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
              note={t("workflow.metric.at_risk_note")}
              tone={atRiskCount ? "warning" : "success"} />
            <MetricCard label={t("workflow.metric.active_templates")}
              value={activeTemplateCount}
              icon={<GitBranch className="h-5 w-5" aria-hidden="true" />}
              note={t("workflow.metric.template_note")}
              tone="accent" />
            <MetricCard label={t("workflow.metric.completed")}
              value={completedInstances.length}
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
              note={t("workflow.metric.completed_note")}
              tone="success" />
          </div>

          {requestFormOpen && (
            <form onSubmit={handleCreateRequest} className={`${workflowPanelClass} grid grid-cols-1 gap-4 p-4 sm:p-5 lg:grid-cols-2`}>
              <div className="flex items-start gap-3 lg:col-span-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-text"><Plus className="h-5 w-5" aria-hidden="true" /></div>
                <div className="min-w-0">
                  <h2 className="text-dynamic-lg font-bold text-foreground">{t("workflow.request.title")}</h2>
                  <p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{t("workflow.request.description")}</p>
                </div>
              </div>
              <label className="block">
                <span className={labelClass}>{t("workflow.request.template")}</span>
                <select className={formControlClassName} value={requestForm.templateId} onChange={(event) => setRequestForm((current) => ({ ...current, templateId: event.target.value }))}>
                  {templates.filter((template) => template.status === "ACTIVE" && supportsLinearDemoExecution(template)).map((template) => (
                    <option key={template.id} value={template.id}>{localize(template.name)} ┬╖ v{template.version}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>{t("workflow.request.requester")}</span>
                <select className={formControlClassName} value={requestForm.requesterId} onChange={(event) => setRequestForm((current) => ({ ...current, requesterId: event.target.value }))} disabled={currentRole === "EMPLOYEE"}>
                  {(currentRole === "EMPLOYEE" ? employees.slice(0, 1) : employees).map((employee) => (
                    <option key={employee.id} value={employee.id}>{localize(employee.name)} ┬╖ {employee.id}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>{t("workflow.request.subject")}</span>
                <input required maxLength={120} className={formControlClassName} value={requestForm.title} onChange={(event) => setRequestForm((current) => ({ ...current, title: event.target.value }))} placeholder={t("workflow.request.subject_placeholder")} />
              </label>
              <label className="block">
                <span className={labelClass}>{t("workflow.request.amount_optional")}</span>
                <input type="number" min="0" step="0.01" className={formControlClassName} value={requestForm.amountSar} onChange={(event) => setRequestForm((current) => ({ ...current, amountSar: event.target.value }))} placeholder="0.00" />
              </label>
              {requestFormError && <p role="alert" className="text-dynamic-xs font-semibold text-danger-text lg:col-span-2">{requestFormError}</p>}
              <div className="flex flex-wrap justify-end gap-2 lg:col-span-2">
                <button type="button" className={secondaryButtonClass} onClick={() => { setRequestFormOpen(false); setRequestFormError(""); }}>{t("workflow.request.close")}</button>
                <button type="submit" className={primaryButtonClass}><Plus className="h-4 w-4" aria-hidden="true" />{t("workflow.request.create_local")}</button>
              </div>
            </form>
          )}

          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.2fr)]">
            <section className={`${workflowPanelClass} min-w-0 overflow-hidden`} aria-label={t("workflow.inbox.title")}>
              <div className="border-b border-theme p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-dynamic-lg font-bold text-foreground">{t("workflow.inbox.title")}</h2>
                    <p className="mt-1 text-dynamic-xs text-muted">{t("workflow.inbox.subtitle")}</p>
                  </div>
                  <span className={neutralPillClass}>{visibleWorkItems.length} {t("workflow.inbox.items")}</span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                    <input aria-label={t("workflow.inbox.search")} className={`${formControlClassName} ps-9`} value={inputSearchValue} onChange={(event) => setQueueSearch(event.target.value)} placeholder={t("workflow.inbox.search")} />
                  </label>
                  <select aria-label={t("workflow.inbox.type_filter")} className={inlineFormControlClassName} value={queueTypeFilter} onChange={(event) => setQueueTypeFilter(event.target.value as typeof queueTypeFilter)}>
                    <option value="ALL">{t("workflow.inbox.all_types")}</option>
                    <option value="WORKFLOW">{t("workflow.source.workflow_request")}</option>
                    <option value="EMPLOYEE_REQUEST">{t("workflow.source.employee_request")}</option>
                    <option value="TRANSFER">{t("workflow.source.transfer")}</option>
                    <option value="EXPENSE">{t("workflow.source.expense")}</option>
                  </select>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={t("workflow.inbox.status_filter")}>
                  {(["OPEN", "HISTORY", "ALL"] as QueueFilter[]).map((filter) => (
                    <button key={filter} type="button" aria-pressed={queueFilter === filter} onClick={() => setQueueFilter(filter)} className={`rounded-full px-3 py-1.5 text-dynamic-xs font-semibold transition ${queueFilter === filter ? "bg-primary text-white" : "bg-surface-elevated text-muted hover:text-foreground"}`}>
                      {t(`workflow.inbox.filter.${filter.toLowerCase()}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-[36rem] space-y-1 overflow-y-auto p-2">
                {displayedQueueItems.length === 0 ? (
                  <div className="m-2 rounded-lg border border-dashed border-theme p-6 text-center">
                    <ListChecks className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                    <p className="mt-2 text-dynamic-sm font-semibold text-foreground">{t("workflow.inbox.empty.title")}</p>
                    <p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{t("workflow.inbox.empty.body")}</p>
                  </div>
                ) : displayedQueueItems.map((item) => {
                  const isSelected = selectedWorkItem?.key === item.key;
                  const slaState = item.dueAt ? getWorkflowSlaState(item.dueAt) : undefined;
                  return (
                    <button key={item.key} type="button" onClick={() => { setSelectedWorkKey(item.key); setDecisionComment(""); setDecisionError(""); }} aria-pressed={isSelected} className={`w-full rounded-lg border p-3 text-start transition-colors ${isSelected ? "border-primary/60 bg-primary-soft/50" : "border-transparent hover:border-theme hover:bg-surface-elevated"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-dynamic-xs font-bold ${statusToneClass(item.status)}`}>{statusLabel(item.status)}</span>
                            <span className="text-dynamic-xs font-semibold text-muted">{sourceLabel(item.kind)}</span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-dynamic-sm font-bold text-foreground">{item.title}</p>
                          <p className="mt-1 truncate text-dynamic-xs text-muted">{item.requester} ┬╖ {item.department}</p>
                        </div>
                        {item.amountSar !== undefined && <span className="shrink-0 text-dynamic-xs font-bold tabular-nums text-foreground">{formatCurrencySAR(item.amountSar)}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-dynamic-xs text-muted">
                        <span>{asDateTime(item.createdAt, language)}</span>
                        {slaState && <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${slaToneClass(slaState)}`}><Clock3 className="h-3 w-3" aria-hidden="true" />{slaLabel(slaState)}</span>}
                        {item.origin === "OPERATIONS" && <span>{t("workflow.inbox.shared_state")}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={`${workflowPanelClass} min-w-0`} aria-label={t("workflow.detail.title")}>
              {!selectedWorkItem ? (
                <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
                  <ListChecks className="h-10 w-10 text-muted" aria-hidden="true" />
                  <h2 className="mt-3 text-dynamic-lg font-bold text-foreground">{t("workflow.inbox.empty.title")}</h2>
                  <p className="mt-1 max-w-md text-dynamic-sm text-muted">{t("workflow.inbox.empty.body")}</p>
                </div>
              ) : (
                <div className="space-y-5 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-theme pb-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-dynamic-xs font-bold ${statusToneClass(selectedWorkItem.status)}`}>{statusLabel(selectedWorkItem.status)}</span>
                        <span className={neutralPillClass}>{sourceLabel(selectedWorkItem.kind)}</span>
                      </div>
                      <h2 className="mt-2 break-words text-dynamic-xl font-bold text-foreground">{selectedWorkItem.title}</h2>
                      <p className="mt-1 text-dynamic-sm text-muted">{selectedWorkItem.summary}</p>
                    </div>
                    {selectedWorkItem.amountSar !== undefined && (
                      <div className="rounded-lg bg-surface-elevated px-3 py-2 text-end">
                        <span className="block text-dynamic-xs text-muted">{t("workflow.detail.amount")}</span>
                        <strong className="text-dynamic-lg tabular-nums text-foreground">{formatCurrencySAR(selectedWorkItem.amountSar)}</strong>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className={subtlePanelClass + " p-3"}><span className="block text-dynamic-xs text-muted">{t("workflow.detail.requester")}</span><strong className="mt-1 block break-words text-dynamic-sm text-foreground">{selectedWorkItem.requester}</strong><span className="mt-0.5 block text-dynamic-xs text-muted">{selectedWorkItem.requesterId}</span></div>
                    <div className={subtlePanelClass + " p-3"}><span className="block text-dynamic-xs text-muted">{t("workflow.detail.department")}</span><strong className="mt-1 block break-words text-dynamic-sm text-foreground">{selectedWorkItem.department}</strong><span className="mt-0.5 block text-dynamic-xs text-muted">{t("workflow.detail.submitted")}: {asDateTime(selectedWorkItem.createdAt, language)}</span></div>
                  </div>

                  {selectedWorkItem.origin === "ENGINE" && selectedWorkItem.instance && (() => {
                    const instance = selectedWorkItem.instance;
                    const template = templates.find((item) => item.id === instance.templateId);
                    const approvalSteps = template ? getApprovalSteps(template) : [];
                    const currentStep = approvalSteps[instance.approvalStepIndex];
                    const state = getWorkflowSlaState(instance.dueAt);
                    const matchingDelegation = getMatchingDelegation(selectedWorkItem);
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className={`rounded-lg border p-3 ${slaToneClass(state)}`}>
                            <div className="flex items-center gap-2 text-dynamic-xs font-bold"><CalendarClock className="h-4 w-4" aria-hidden="true" />{t("workflow.detail.sla_status")}</div>
                            <div className="mt-1 text-dynamic-sm font-semibold">{slaLabel(state)}</div>
                            <div className="mt-1 text-dynamic-xs">{t("workflow.detail.due")}: {asDateTime(instance.dueAt, language)}</div>
                          </div>
                          <div className={subtlePanelClass + " p-3"}>
                            <span className="block text-dynamic-xs text-muted">{t("workflow.detail.current_step")}</span>
                            <strong className="mt-1 block text-dynamic-sm text-foreground">{currentStep ? localize(currentStep.name) : t("workflow.detail.no_step")}</strong>
                            <span className="mt-0.5 block text-dynamic-xs text-muted">{t("workflow.detail.assigned_to")}: {roleLabel(instance.assignedRole)}</span>
                            {matchingDelegation && <span className="mt-1 block text-dynamic-xs font-semibold text-warning-text">{t("workflow.delegation.preview")}: {matchingDelegation.delegateName}</span>}
                          </div>
                        </div>
                        {template && (
                          <div className="rounded-lg border border-theme p-3">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <div><span className="text-dynamic-xs font-semibold text-muted">{t("workflow.detail.template")}</span><div className="text-dynamic-sm font-bold text-foreground">{localize(template.name)} ┬╖ v{instance.templateVersion}</div></div>
                              <span className={neutralPillClass}>{t(`workflow.category.${template.category.toLowerCase()}`)}</span>
                            </div>
                            <ol className="flex flex-wrap items-center gap-2" aria-label={t("workflow.detail.approval_progress")}>
                              {approvalSteps.map((step, index) => {
                                const stepState = index < instance.approvalStepIndex || instance.status === "APPROVED" ? "done" : index === instance.approvalStepIndex && instance.status === "PENDING" ? "current" : "upcoming";
                                return (
                                  <React.Fragment key={step.id}>
                                    <li className={`flex min-w-28 items-center gap-2 rounded-lg border px-2.5 py-2 text-dynamic-xs ${stepState === "done" ? "border-success/40 bg-success-soft text-success-text" : stepState === "current" ? "border-primary/40 bg-primary-soft text-primary-text" : "border-theme bg-surface-elevated text-muted"}`}>
                                      {stepState === "done" ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> : <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[0.625rem] font-bold">{index + 1}</span>}
                                      <span className="min-w-0"><strong className="block truncate">{localize(step.name)}</strong><small>{t(`workflow.rule.${(step.approvalRule ?? "ANY_ONE").toLowerCase()}`)}</small></span>
                                    </li>
                                    {index < approvalSteps.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />}
                                  </React.Fragment>
                                );
                              })}
                            </ol>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                                    {selectedWorkItem.origin === "OPERATIONS" && (
<div className="rounded-lg border border-primary/20 bg-primary-soft/40 p-3 text-dynamic-xs leading-relaxed text-primary-text">
                      <div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{t("workflow.operations.sync_notice")}</p></div>
                      <p className="mt-2"><strong>{t("workflow.operations.policy_note")}</strong></p>
                    </div>
                  )}

                  {selectedWorkItem.origin === "ENGINE" && selectedWorkItem.instance?.lastComment && (
                    <div className="rounded-lg border border-theme bg-surface-elevated p-3">
                      <div className="flex items-center gap-2 text-dynamic-xs font-semibold text-muted"><MessageSquare className="h-4 w-4" aria-hidden="true" />{t("workflow.detail.last_comment")}</div>
                      <p className="mt-1 text-dynamic-sm text-foreground">{selectedWorkItem.instance.lastComment}</p>
                    </div>
                  )}

                  {selectedWorkItem.status === "PENDING" && canActOnItem(selectedWorkItem) ? (
                    <div className="space-y-3 rounded-lg border border-theme p-3 sm:p-4">
                      <label className="block">
                        <span className={labelClass}>{t("workflow.action.comment_optional")}</span>
                        <textarea rows={3} maxLength={500} className={formControlClassName} value={decisionComment} onChange={(event) => setDecisionComment(event.target.value)} placeholder={t("workflow.action.comment_placeholder")} />
                      </label>
                      {decisionError && <p role="alert" className="text-dynamic-xs font-semibold text-danger-text">{decisionError}</p>}
                      <div className="flex flex-wrap gap-2">
                        {selectedWorkItem.origin === "ENGINE" && selectedWorkItem.instance ? (
                          <>
                            <button type="button" className={successButtonClass} onClick={() => handleWorkflowDecision(selectedWorkItem.instance!, "APPROVE")}><Check className="h-4 w-4" aria-hidden="true" />{t("workflow.action.approve_local")}</button>
                            <button type="button" className={secondaryButtonClass} onClick={() => handleWorkflowDecision(selectedWorkItem.instance!, "RETURN")}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t("workflow.action.return_local")}</button>
                            <button type="button" className={dangerButtonClass} onClick={() => handleWorkflowDecision(selectedWorkItem.instance!, "REJECT")}><XCircle className="h-4 w-4" aria-hidden="true" />{t("workflow.action.reject_local")}</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className={successButtonClass} onClick={() => handleOperationsDecision(selectedWorkItem, "APPROVED")}><Check className="h-4 w-4" aria-hidden="true" />{t("workflow.action.approve_local")}</button>
                            <button type="button" className={dangerButtonClass} onClick={() => handleOperationsDecision(selectedWorkItem, "REJECTED")}><XCircle className="h-4 w-4" aria-hidden="true" />{t("workflow.action.reject_local")}</button>
                          </>
                        )}
                      </div>
                      <p className="text-dynamic-xs leading-relaxed text-muted">{t("workflow.action.local_only")}</p>
                    </div>
                  ) : selectedWorkItem.status === "RETURNED" && selectedWorkItem.origin === "ENGINE" && selectedWorkItem.instance ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning-soft p-3">
                      <p className="text-dynamic-xs leading-relaxed text-warning-text">{t("workflow.action.returned_note")}</p>
                      {selectedWorkItem.requesterId === employeeId || canOverrideDemoAssignment(currentRole) ? <button type="button" className={primaryButtonClass} onClick={() => handleResubmit(selectedWorkItem.instance!)}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t("workflow.action.resubmit_local")}</button> : null}
                    </div>
                  ) : selectedWorkItem.status === "PENDING" && !canActOnItem(selectedWorkItem) ? (
                    <div className="flex items-start gap-2 rounded-lg border border-theme bg-surface-elevated p-3 text-dynamic-xs leading-relaxed text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{t("workflow.action.not_assigned")}</p></div>
                  ) : (
                    <div className="rounded-lg border border-theme bg-surface-elevated p-3 text-dynamic-xs leading-relaxed text-muted">{t("workflow.action.closed_note")}</div>
                  )}

                  {selectedWorkItem.origin === "ENGINE" && selectedWorkItem.instance && selectedWorkItem.status === "PENDING" && selectedWorkItem.dueAt && getWorkflowSlaState(selectedWorkItem.dueAt) !== "ON_TRACK" && canApprove && (
                    <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-warning/50 bg-warning-soft px-3 py-2 text-dynamic-xs font-bold text-warning-text hover:bg-warning/10" onClick={() => handleEscalationLog(selectedWorkItem.instance!)}>
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />{t("workflow.sla.log_escalation")}
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </section>
      )}

      {activeTab === "BUILDER" && canManageTemplates && (
        <section id="workflow-panel-BUILDER" role="tabpanel" aria-labelledby="workflow-tab-BUILDER" tabIndex={0} className="grid min-w-0 grid-cols-1 gap-4 outline-none xl:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className={`${workflowPanelClass} min-w-0 overflow-hidden`} aria-label={t("workflow.builder.library")}>
            <div className="flex items-center justify-between gap-2 border-b border-theme p-4">
              <div><h2 className="text-dynamic-lg font-bold text-foreground">{t("workflow.builder.library")}</h2><p className="mt-1 text-dynamic-xs text-muted">{templates.length} {t("workflow.builder.templates")}</p></div>
              <button type="button" className={secondaryButtonClass} onClick={startNewTemplate}><Plus className="h-4 w-4" aria-hidden="true" /><span className="sr-only">{t("workflow.builder.new_template")}</span></button>
            </div>
            <div className="space-y-1 p-2">
              {templates.map((template) => (
                <button key={template.id} type="button" onClick={() => openTemplateInBuilder(template)} aria-current={selectedTemplateId === template.id ? "true" : undefined} className={`w-full rounded-lg border p-3 text-start transition-colors ${selectedTemplateId === template.id ? "border-primary/50 bg-primary-soft/50" : "border-transparent hover:border-theme hover:bg-surface-elevated"}`}>
                  <div className="flex items-start justify-between gap-2"><span className="min-w-0 text-dynamic-sm font-bold text-foreground">{localize(template.name)}</span><span className={`shrink-0 rounded-full border px-2 py-0.5 text-dynamic-xs font-semibold ${template.status === "ACTIVE" ? "border-success/40 bg-success-soft text-success-text" : template.status === "PAUSED" ? "border-warning/40 bg-warning-soft text-warning-text" : "border-theme bg-surface-elevated text-muted"}`}>{t(`workflow.template_status.${template.status.toLowerCase()}`)}</span></div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-dynamic-xs text-muted"><span>{t(`workflow.category.${template.category.toLowerCase()}`)}</span><span>·</span><span>v{template.version}</span><span>·</span><span>{template.steps.length} {t("workflow.builder.steps")}</span></div>
                </button>
              ))}
            </div>
          </aside>

          <div className={`${workflowPanelClass} min-w-0 overflow-hidden`}>
            {!draftTemplate ? (
              <div className="p-8 text-center text-dynamic-sm text-muted">{t("workflow.builder.select_template")}</div>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); saveTemplate(); }}>
                <div className="border-b border-theme p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0"><p className="text-dynamic-xs font-semibold uppercase tracking-wide text-muted">{t("workflow.builder.header")}</p><h2 className="mt-1 break-words text-dynamic-xl font-bold text-foreground">{localize(draftTemplate.name)}</h2><p className="mt-1 text-dynamic-xs text-muted">{draftTemplate.id} · {t("workflow.builder.version")}: v{Math.max(draftTemplate.version, 1)}</p></div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={secondaryButtonClass} onClick={() => setEditorDraft(cloneTemplate(selectedTemplate ?? draftTemplate))}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t("workflow.builder.discard")}</button>
                      <button type="submit" className={primaryButtonClass}><Save className="h-4 w-4" aria-hidden="true" />{t("workflow.builder.save_version")}</button>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-4 sm:p-5">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="block"><span className={labelClass}>{t("workflow.builder.name_en")}</span><input className={formControlClassName} maxLength={100} value={draftTemplate.name.en} onChange={(event) => updateDraft((draft) => ({ ...draft, name: { ...draft.name, en: event.target.value } }))} /></label>
                    <label className="block"><span className={labelClass}>{t("workflow.builder.name_ar")}</span><input dir="rtl" className={formControlClassName} maxLength={100} value={draftTemplate.name.ar} onChange={(event) => updateDraft((draft) => ({ ...draft, name: { ...draft.name, ar: event.target.value } }))} /></label>
                    <label className="block md:col-span-2"><span className={labelClass}>{t("workflow.builder.description_en")}</span><textarea rows={2} maxLength={320} className={formControlClassName} value={draftTemplate.description.en} onChange={(event) => updateDraft((draft) => ({ ...draft, description: { ...draft.description, en: event.target.value } }))} /></label>
                    <label className="block md:col-span-2"><span className={labelClass}>{t("workflow.builder.description_ar")}</span><textarea dir="rtl" rows={2} maxLength={320} className={formControlClassName} value={draftTemplate.description.ar} onChange={(event) => updateDraft((draft) => ({ ...draft, description: { ...draft.description, ar: event.target.value } }))} /></label>
                    <label className="block"><span className={labelClass}>{t("workflow.builder.category")}</span><select className={formControlClassName} value={draftTemplate.category} onChange={(event) => updateDraft((draft) => ({ ...draft, category: event.target.value as WorkflowTemplate["category"] }))}>{(["LEAVE", "EXPENSE", "EMPLOYEE", "PAYROLL", "CONTRACT"] as WorkflowTemplate["category"][]).map((category) => <option key={category} value={category}>{localize(getWorkflowTemplateCategoryLabel(category))}</option>)}</select></label>
                    <label className="block"><span className={labelClass}>{t("workflow.builder.status")}</span><select className={formControlClassName} value={draftTemplate.status} onChange={(event) => updateDraft((draft) => ({ ...draft, status: event.target.value as WorkflowTemplateStatus }))}><option value="DRAFT">{t("workflow.template_status.draft")}</option><option value="ACTIVE">{t("workflow.template_status.active")}</option><option value="PAUSED">{t("workflow.template_status.paused")}</option></select></label>
                    <label className="block"><span className={labelClass}>{t("workflow.builder.overall_sla")}</span><div className="flex items-center gap-2"><input type="number" min={1} max={8760} className={formControlClassName} value={draftTemplate.overallSlaHours} onChange={(event) => updateDraft((draft) => ({ ...draft, overallSlaHours: Number(event.target.value) }))} /><span className="shrink-0 text-dynamic-xs text-muted">{t("workflow.common.hours")}</span></div></label>
                    <label className="block"><span className={labelClass}>{t("workflow.builder.change_note")}</span><input className={formControlClassName} maxLength={120} value={templateSaveNote} onChange={(event) => setTemplateSaveNote(event.target.value)} placeholder={t("workflow.builder.change_note_placeholder")} /></label>
                  </div>

                  <div className="rounded-lg border border-theme bg-surface-elevated p-3 text-dynamic-xs leading-relaxed text-muted">
                    <div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" /><p>{supportsLinearDemoExecution(draftTemplate) ? t("workflow.builder.runtime_linear_note") : t("workflow.builder.runtime_graph_note")}</p></div>
                  </div>

                  <div>
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                      <div><h3 className="text-dynamic-lg font-bold text-foreground">{t("workflow.builder.canvas_title")}</h3><p className="mt-1 text-dynamic-xs text-muted">{t("workflow.builder.canvas_subtitle")}</p></div>
                      <div className="flex items-center gap-2">
                        <select aria-label={t("workflow.builder.add_step_type")} className={inlineFormControlClassName} value={newStepKind} onChange={(event) => setNewStepKind(event.target.value as WorkflowStepKind)}>{STEP_KIND_OPTIONS.map((kind) => <option key={kind} value={kind}>{t(`workflow.step.${kind.toLowerCase()}`)}</option>)}</select>
                        <button type="button" className={secondaryButtonClass} onClick={addDraftStep}><Plus className="h-4 w-4" aria-hidden="true" />{t("workflow.builder.add_step")}</button>
                      </div>
                    </div>

                    <ol className="space-y-3" aria-label={t("workflow.builder.canvas_title")}>
                      {draftTemplate.steps.map((step, index) => (
                        <li key={step.id} className="relative">
                          {index > 0 && <div aria-hidden="true" className="absolute -top-3 start-5 h-3 border-s border-dashed border-theme" />}
                          <article className="rounded-xl border border-theme bg-surface p-3 sm:p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${step.kind === "APPROVAL" ? "bg-primary-soft text-primary-text" : step.kind === "CONDITION" ? "bg-warning-soft text-warning-text" : "bg-surface-elevated text-muted"}`}><span className="text-dynamic-xs font-extrabold">{index + 1}</span></div>
                                <div className="min-w-0"><span className="text-dynamic-xs font-bold uppercase tracking-wide text-muted">{t(`workflow.step.${step.kind.toLowerCase()}`)}</span><h4 className="mt-0.5 break-words text-dynamic-sm font-bold text-foreground">{localize(step.name)}</h4></div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button type="button" aria-label={`${t("workflow.builder.move_up")} ${index + 1}`} disabled={index === 0} className="rounded-md p-2 text-muted hover:bg-surface-elevated disabled:opacity-40" onClick={() => moveDraftStep(step.id, -1)}><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                                <button type="button" aria-label={`${t("workflow.builder.move_down")} ${index + 1}`} disabled={index === draftTemplate.steps.length - 1} className="rounded-md p-2 text-muted hover:bg-surface-elevated disabled:opacity-40" onClick={() => moveDraftStep(step.id, 1)}><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                                <button type="button" aria-label={`${t("workflow.builder.remove_step")} ${localize(step.name)}`} className="rounded-md p-2 text-danger-text hover:bg-danger-soft" onClick={() => deleteDraftStep(step.id)}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                              <label className="block"><span className={labelClass}>{t("workflow.builder.step_name_en")}</span><input className={formControlClassName} value={step.name.en} maxLength={90} onChange={(event) => updateDraftStep(step.id, { name: { ...step.name, en: event.target.value } })} /></label>
                              <label className="block"><span className={labelClass}>{t("workflow.builder.step_name_ar")}</span><input dir="rtl" className={formControlClassName} value={step.name.ar} maxLength={90} onChange={(event) => updateDraftStep(step.id, { name: { ...step.name, ar: event.target.value } })} /></label>
                              {step.kind === "APPROVAL" && (
                                <>
                                  <label className="block"><span className={labelClass}>{t("workflow.builder.approver")}</span><select className={formControlClassName} value={step.approverType ?? "MANAGER"} onChange={(event) => updateDraftStep(step.id, { approverType: event.target.value as WorkflowApproverType })}>{APPROVER_OPTIONS.map((approver) => <option key={approver} value={approver}>{t(`workflow.approver.${approver.toLowerCase()}`)}</option>)}</select></label>
                                  <label className="block"><span className={labelClass}>{t("workflow.builder.approval_rule")}</span><select className={formControlClassName} value={step.approvalRule ?? "ANY_ONE"} onChange={(event) => updateDraftStep(step.id, { approvalRule: event.target.value as WorkflowApprovalRule })}>{APPROVAL_RULE_OPTIONS.map((rule) => <option key={rule} value={rule}>{t(`workflow.rule.${rule.toLowerCase()}`)}</option>)}</select></label>
                                  <label className="block"><span className={labelClass}>{t("workflow.builder.step_sla")}</span><div className="flex items-center gap-2"><input type="number" min={1} max={8760} className={formControlClassName} value={step.slaHours ?? 24} onChange={(event) => updateDraftStep(step.id, { slaHours: Number(event.target.value) })} /><span className="shrink-0 text-dynamic-xs text-muted">{t("workflow.common.hours")}</span></div></label>
                                  <label className="block"><span className={labelClass}>{t("workflow.builder.escalate_after")}</span><div className="flex items-center gap-2"><input type="number" min={0} max={8760} className={formControlClassName} value={step.escalationHours ?? 0} onChange={(event) => updateDraftStep(step.id, { escalationHours: Number(event.target.value) })} /><span className="shrink-0 text-dynamic-xs text-muted">{t("workflow.common.hours")}</span></div></label>
                                </>
                              )}
                              {step.kind === "CONDITION" && (
                                <>
                                  <label className="block"><span className={labelClass}>{t("workflow.builder.condition_field")}</span><input className={formControlClassName} value={step.conditionField ?? ""} onChange={(event) => updateDraftStep(step.id, { conditionField: event.target.value })} placeholder="amountSar" /></label>
                                  <label className="block"><span className={labelClass}>{t("workflow.builder.condition_operator")}</span><select className={formControlClassName} value={step.conditionOperator ?? "equals"} onChange={(event) => updateDraftStep(step.id, { conditionOperator: event.target.value })}>{["equals", "not_equals", "greater_than", "less_than", "contains", "in", "between"].map((operator) => <option key={operator} value={operator}>{t(`workflow.operator.${operator}`)}</option>)}</select></label>
                                  <label className="block md:col-span-2"><span className={labelClass}>{t("workflow.builder.condition_value")}</span><input className={formControlClassName} value={step.conditionValue ?? ""} onChange={(event) => updateDraftStep(step.id, { conditionValue: event.target.value })} /></label>
                                </>
                              )}
                            </div>
                          </article>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {builderError && <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-dynamic-xs font-semibold text-danger-text">{builderError}</p>}

                  <div className="rounded-xl border border-theme p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-dynamic-sm font-bold text-foreground">{t("workflow.history.title")}</h3><p className="mt-1 text-dynamic-xs text-muted">{t("workflow.history.local_note")}</p></div><span className={neutralPillClass}>{draftTemplate.versions.length} {t("workflow.history.versions")}</span></div>
                    {draftTemplate.versions.length === 0 ? <p className="mt-3 text-dynamic-xs text-muted">{t("workflow.history.empty")}</p> : <ol className="mt-3 divide-y divide-theme">{[...draftTemplate.versions].reverse().map((version) => <li key={`${version.version}-${version.savedAt}`} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="text-dynamic-xs font-bold text-foreground">v{version.version} · {version.changeNote}</p><p className="mt-0.5 text-dynamic-xs text-muted">{asDateTime(version.savedAt, language)} · {version.steps.length} {t("workflow.builder.steps")}</p></div><button type="button" className={secondaryButtonClass} onClick={() => restoreTemplateVersion(version)}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t("workflow.history.restore")}</button></li>)}</ol>}
                  </div>

                  <div className="flex justify-end"><button type="submit" className={primaryButtonClass}><Save className="h-4 w-4" aria-hidden="true" />{t("workflow.builder.save_version")}</button></div>
                </div>
              </form>
            )}
          </div>
        </section>
      )}

      {activeTab === "DELEGATIONS" && currentRole !== "EMPLOYEE" && (
        <section id="workflow-panel-DELEGATIONS" role="tabpanel" aria-labelledby="workflow-tab-DELEGATIONS" tabIndex={0} className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.1fr)] outline-none">
          <form onSubmit={createDelegation} className={`${workflowPanelClass} space-y-4 p-4 sm:p-5`}>
            <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-text"><Users className="h-5 w-5" aria-hidden="true" /></div><div><h2 className="text-dynamic-lg font-bold text-foreground">{t("workflow.delegation.new_title")}</h2><p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{t("workflow.delegation.new_description")}</p></div></div>
            <label className="block"><span className={labelClass}>{t("workflow.delegation.from_role")}</span><select className={formControlClassName} value={delegationForm.delegatorRole} onChange={(event) => setDelegationForm((current) => ({ ...current, delegatorRole: event.target.value as WorkflowDemoRole }))}>{(["MANAGER", "HR_OPS", "ADMIN", "SUPER_ADMIN"] as WorkflowDemoRole[]).map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></label>
            <label className="block"><span className={labelClass}>{t("workflow.delegation.delegate")}</span><input required maxLength={100} className={formControlClassName} value={delegationForm.delegateName} onChange={(event) => setDelegationForm((current) => ({ ...current, delegateName: event.target.value }))} placeholder={t("workflow.delegation.delegate_placeholder")} /></label>
            <label className="block"><span className={labelClass}>{t("workflow.delegation.scope")}</span><select className={formControlClassName} value={delegationForm.scope} onChange={(event) => setDelegationForm((current) => ({ ...current, scope: event.target.value as WorkflowDelegation["scope"] }))}>{(["ALL", "LEAVE", "EXPENSE", "EMPLOYEE", "PAYROLL", "CONTRACT"] as WorkflowDelegation["scope"][]).map((scope) => <option key={scope} value={scope}>{t(`workflow.delegation.scope_${scope.toLowerCase()}`)}</option>)}</select></label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="block"><span className={labelClass}>{t("workflow.delegation.start_date")}</span><input type="date" className={formControlClassName} value={delegationForm.startDate} onChange={(event) => setDelegationForm((current) => ({ ...current, startDate: event.target.value }))} /></label><label className="block"><span className={labelClass}>{t("workflow.delegation.end_date")}</span><input type="date" className={formControlClassName} value={delegationForm.endDate} onChange={(event) => setDelegationForm((current) => ({ ...current, endDate: event.target.value }))} /></label></div>
            <fieldset className="rounded-lg border border-theme p-3"><legend className="px-1 text-dynamic-xs font-semibold text-muted">{t("workflow.delegation.permissions")}</legend><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{(["canApprove", "canReject", "canReturn"] as const).map((permission) => <label key={permission} className="flex items-center gap-2 text-dynamic-xs text-foreground"><input type="checkbox" checked={delegationForm[permission]} onChange={(event) => setDelegationForm((current) => ({ ...current, [permission]: event.target.checked }))} />{t(`workflow.delegation.${permission}`)}</label>)}</div></fieldset>
            <label className="block"><span className={labelClass}>{t("workflow.delegation.reason")}</span><textarea required rows={3} maxLength={300} className={formControlClassName} value={delegationForm.reason} onChange={(event) => setDelegationForm((current) => ({ ...current, reason: event.target.value }))} placeholder={t("workflow.delegation.reason_placeholder")} /></label>
            {delegationError && <p role="alert" className="text-dynamic-xs font-semibold text-danger-text">{delegationError}</p>}
            <button type="submit" className={primaryButtonClass}><Plus className="h-4 w-4" aria-hidden="true" />{t("workflow.delegation.create_local")}</button>
          </form>

          <section className={`${workflowPanelClass} min-w-0 overflow-hidden`} aria-label={t("workflow.delegation.list_title")}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-theme p-4"><div><h2 className="text-dynamic-lg font-bold text-foreground">{t("workflow.delegation.list_title")}</h2><p className="mt-1 text-dynamic-xs text-muted">{t("workflow.delegation.list_subtitle")}</p></div><span className={neutralPillClass}>{delegations.length} {t("workflow.delegation.records")}</span></div>
            {delegations.length === 0 ? <div className="p-8 text-center"><Users className="mx-auto h-9 w-9 text-muted" aria-hidden="true" /><p className="mt-3 text-dynamic-sm font-semibold text-foreground">{t("workflow.delegation.empty.title")}</p><p className="mx-auto mt-1 max-w-lg text-dynamic-xs leading-relaxed text-muted">{t("workflow.delegation.empty.body")}</p></div> : <ul className="divide-y divide-theme">{delegations.map((delegation) => {
              const today = getLocalISODate();
              const dateActive = delegation.startDate <= today && delegation.endDate >= today;
              const isActive = delegation.enabled && dateActive;
              return <li key={delegation.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-dynamic-sm font-bold text-foreground">{delegation.delegateName}</h3><span className={`rounded-full border px-2 py-0.5 text-dynamic-xs font-semibold ${isActive ? "border-success/40 bg-success-soft text-success-text" : "border-theme bg-surface-elevated text-muted"}`}>{isActive ? t("workflow.delegation.active") : t("workflow.delegation.inactive")}</span></div><p className="mt-1 text-dynamic-xs text-muted">{t("workflow.delegation.from_role")}: {roleLabel(delegation.delegatorRole)} · {t(`workflow.delegation.scope_${delegation.scope.toLowerCase()}`)}</p><p className="mt-1 text-dynamic-xs text-muted">{asDate(delegation.startDate, language)} — {asDate(delegation.endDate, language)}</p><p className="mt-2 text-dynamic-xs leading-relaxed text-foreground">{delegation.reason}</p></div><button type="button" className={delegation.enabled ? secondaryButtonClass : primaryButtonClass} onClick={() => toggleDelegation(delegation)}>{delegation.enabled ? t("workflow.delegation.pause") : t("workflow.delegation.enable")}</button></div><div className="mt-3 flex flex-wrap gap-1.5">{delegation.canApprove && <span className={neutralPillClass}>{t("workflow.delegation.canApprove")}</span>}{delegation.canReject && <span className={neutralPillClass}>{t("workflow.delegation.canReject")}</span>}{delegation.canReturn && <span className={neutralPillClass}>{t("workflow.delegation.canReturn")}</span>}</div></li>;
            })}</ul>}
          </section>
          <div className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-dynamic-xs leading-relaxed text-warning-text xl:col-span-2"><strong>{t("workflow.prototype.boundary_label")}</strong> {t("workflow.delegation.boundary")}</div>
        </section>
      )}

      {activeTab === "ANALYTICS" && canViewManagerTools && (
        <section id="workflow-panel-ANALYTICS" role="tabpanel" aria-labelledby="workflow-tab-ANALYTICS" tabIndex={0} className="space-y-4 outline-none">
          <div className="rounded-lg border border-primary/20 bg-primary-soft/40 p-3 text-dynamic-xs leading-relaxed text-primary-text"><div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{t("workflow.analytics.local_note")}</p></div></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={t("workflow.analytics.total_instances")} value={filteredInstances.length} icon={<Activity className="h-5 w-5" aria-hidden="true" />} tone="primary" note={t("workflow.analytics.local_records")} />
            <MetricCard label={t("workflow.analytics.approved_rejected")} value={`${filteredInstances.filter((item) => item.status === "APPROVED").length} / ${filteredInstances.filter((item) => item.status === "REJECTED").length}`} icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />} tone="success" note={t("workflow.analytics.approved_rejected_note")} />
            <MetricCard label={t("workflow.analytics.sla_compliance")} value={slaCompliance === null ? "—" : `${slaCompliance}%`} icon={<Clock3 className="h-5 w-5" aria-hidden="true" />} tone={slaCompliance !== null && slaCompliance < 80 ? "warning" : "accent"} note={t("workflow.analytics.sla_note")} />
            <MetricCard label={t("workflow.analytics.avg_completion")} value={averageCompletionHours === null ? "—" : `${averageCompletionHours.toFixed(1)} ${t("workflow.common.hours")}`} icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />} tone="neutral" note={t("workflow.analytics.average_note")} />
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
            <section className={`${workflowPanelClass} p-4 sm:p-5`}>
              <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary-text" aria-hidden="true" /><h2 className="text-dynamic-lg font-bold text-foreground">{t("workflow.analytics.status_mix")}</h2></div>
              <div className="mt-4"><HorizontalBarChart data={[
                { label: t("workflow.status.pending"), value: filteredInstances.filter((item) => item.status === "PENDING").length, tone: "warning" },
                { label: t("workflow.status.approved"), value: filteredInstances.filter((item) => item.status === "APPROVED").length, tone: "success" },
                { label: t("workflow.status.rejected"), value: filteredInstances.filter((item) => item.status === "REJECTED").length, tone: "danger" },
                { label: t("workflow.status.returned"), value: filteredInstances.filter((item) => item.status === "RETURNED").length, tone: "accent" }
              ]} valueFormatter={(value) => String(value)} /></div>
            </section>
            <section className={`${workflowPanelClass} overflow-hidden`}>
              <div className="flex items-center gap-2 border-b border-theme p-4"><GitBranch className="h-5 w-5 text-primary-text" aria-hidden="true" /><h2 className="text-dynamic-lg font-bold text-foreground">{t("workflow.analytics.template_breakdown")}</h2></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[28rem] text-start text-dynamic-xs"><thead className="bg-surface-elevated text-muted"><tr><th className="px-4 py-3 font-semibold">{t("workflow.builder.template")}</th><th className="px-3 py-3 font-semibold">{t("workflow.status.pending")}</th><th className="px-3 py-3 font-semibold">{t("workflow.analytics.completed_short")}</th><th className="px-3 py-3 font-semibold">{t("workflow.analytics.sla_short")}</th></tr></thead><tbody className="divide-y divide-theme">{templates.map((template) => { const linked = filteredInstances.filter((instance) => instance.templateId === template.id); const complete = linked.filter((instance) => instance.status !== "PENDING"); const compliant = complete.filter((instance) => new Date(instance.completedAt ?? 0).getTime() <= new Date(instance.dueAt).getTime()).length; return <tr key={template.id}><td className="max-w-56 px-4 py-3"><span className="block truncate font-semibold text-foreground">{localize(template.name)}</span><span className="text-muted">v{template.version}</span></td><td className="px-3 py-3 tabular-nums text-foreground">{linked.filter((instance) => instance.status === "PENDING").length}</td><td className="px-3 py-3 tabular-nums text-foreground">{complete.length}</td><td className="px-3 py-3 tabular-nums text-foreground">{complete.length ? `${Math.round((compliant / complete.length) * 100)}%` : "—"}</td></tr>; })}</tbody></table></div>
            </section>
          </div>
          <div className={`${workflowPanelClass} p-4 text-dynamic-xs leading-relaxed text-muted`}><div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{t("workflow.analytics.scope_note")}</p></div></div>
        </section>
      )}

      {activeTab === "ACTIVITY" && canViewManagerTools && (
        <section id="workflow-panel-ACTIVITY" role="tabpanel" aria-labelledby="workflow-tab-ACTIVITY" tabIndex={0} className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)] outline-none">
          <section className={`${workflowPanelClass} min-w-0 overflow-hidden`}>
            <div className="flex items-center gap-2 border-b border-theme p-4"><Bell className="h-5 w-5 text-primary-text" aria-hidden="true" /><div><h2 className="text-dynamic-lg font-bold text-foreground">{t("workflow.activity.notices")}</h2><p className="mt-1 text-dynamic-xs text-muted">{t("workflow.activity.notices_note")}</p></div></div>
            <ul className="divide-y divide-theme">{notices.map((notice) => <li key={notice.id} className="p-4"><p className="text-dynamic-sm text-foreground">{localize(notice.message)}</p><p className="mt-1 text-dynamic-xs text-muted">{asDateTime(notice.createdAt, language)} · {t("workflow.activity.local_channel")}</p></li>)}</ul>
          </section>
          <section className={`${workflowPanelClass} min-w-0 overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-theme p-4"><div className="flex items-center gap-2"><History className="h-5 w-5 text-primary-text" aria-hidden="true" /><div><h2 className="text-dynamic-lg font-bold text-foreground">{t("workflow.activity.audit_title")}</h2><p className="mt-1 text-dynamic-xs text-muted">{t("workflow.activity.audit_note")}</p></div></div><span className={neutralPillClass}>{auditEvents.length} {t("workflow.activity.events")}</span></div>
            {auditEvents.length === 0 ? <p className="p-6 text-center text-dynamic-sm text-muted">{t("workflow.activity.empty")}</p> : <ol className="max-h-[44rem] divide-y divide-theme overflow-y-auto">{auditEvents.map((event) => <li key={event.id} className="p-4"><div className="flex items-start gap-3"><div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${event.source === "SLA" ? "bg-warning-soft text-warning-text" : event.source === "TEMPLATE" ? "bg-accent-soft text-accent-text" : "bg-primary-soft text-primary-text"}`}>{event.source === "SLA" ? <AlertTriangle className="h-4 w-4" aria-hidden="true" /> : event.source === "TEMPLATE" ? <GitBranch className="h-4 w-4" aria-hidden="true" /> : <Activity className="h-4 w-4" aria-hidden="true" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-dynamic-sm text-foreground">{t(`workflow.audit_action.${event.action.toLowerCase()}`)}</strong><span className={neutralPillClass}>{event.actorRole === "MANAGER" || event.actorRole === "HR_OPS" || event.actorRole === "ADMIN" || event.actorRole === "SUPER_ADMIN" ? roleLabel(event.actorRole) : event.actorRole}</span></div><p className="mt-1 break-words text-dynamic-xs text-muted">{event.comment || t("workflow.activity.no_comment")}</p><p className="mt-1 text-dynamic-xs text-muted">{asDateTime(event.occurredAt, language)}{event.instanceId ? ` · ${event.instanceId}` : event.templateId ? ` · ${event.templateId}` : ""}</p></div></div></li>)}</ol>}
          </section>
          <div className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-dynamic-xs leading-relaxed text-warning-text xl:col-span-2"><strong>{t("workflow.prototype.boundary_label")}</strong> {t("workflow.activity.boundary")}</div>
        </section>
      )}
    </div>
  );
};
