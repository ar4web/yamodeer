import React from "react";
import { ArrowRight, CalendarClock, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type {
  WorkflowDemoRole,
  WorkflowInstance,
  WorkflowSlaState,
  WorkflowStep,
  WorkflowTemplate
} from "@/services/workflowPrototype";

type ApprovalStep = WorkflowStep;
type SLAState = WorkflowSlaState;

export const EngineDetailPanel: React.FC<{
  instance: WorkflowInstance;
  templates: WorkflowTemplate[];
  getApprovalSteps: (template: WorkflowTemplate | undefined) => ApprovalStep[];
  getWorkflowSlaState: (dueAt: string | null) => SLAState;
  getMatchingDelegation: (instance: WorkflowInstance) => { delegateName?: string } | null;
  slaToneClass: (state: SLAState) => string;
  slaLabel: (state: SLAState) => string;
  asDateTime: (date: string | null, language: string) => string;
  language: string;
  t: (...args: any[]) => string;
  subtlePanelClass: string;
}> = ({
  instance,
  templates,
  getApprovalSteps,
  getWorkflowSlaState,
  getMatchingDelegation,
  slaToneClass,
  slaLabel,
  asDateTime,
  language,
  t,
  subtlePanelClass
}) => {
  const { localize } = useLanguage();
  const template = templates.find((item) => item.id === instance.templateId);
  const approvalSteps = template ? getApprovalSteps(template) : [];
  const currentStep = approvalSteps[instance.approvalStepIndex];
  const state = getWorkflowSlaState(instance.dueAt);
  const matchingDelegation = getMatchingDelegation(instance);
  const roleLabel = (role: WorkflowDemoRole) => t(`role.${role}`);
  const neutralPillClass = "inline-flex items-center gap-1 rounded-full border border-theme bg-surface-elevated px-2.5 py-1 text-dynamic-xs font-semibold text-muted";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={`rounded-lg border p-3 ${slaToneClass(state)}`}>
          <div className="flex items-center gap-2 text-dynamic-xs font-bold"><CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />{t("workflow.detail.sla_status")}</div>
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
            <div><span className="text-dynamic-xs font-semibold text-muted">{t("workflow.detail.template")}</span><div className="text-dynamic-sm font-bold text-foreground">{localize(template.name)} · v{instance.templateVersion}</div></div>
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
};
