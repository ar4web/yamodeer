import React, { useState, useMemo } from "react";
import {
  Receipt,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Landmark,
  ShieldCheck,
  X
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useOperations } from "@/context/OperationsContext";
import { ExpenseCategory, ExpenseClaimRecord, ExpenseStatus } from "@/data/workspaceBlueprints";
import { useCurrentRole } from "@/context/RBACGeofenceContext";
import { EmployeeRecordBlueprint } from "@/data/mockBlueprints";
import { DataTableFrame, FilterDrawerEdgeTrigger, FilterDrawerTrigger, iconButtonClass, MetricCard, PageHeader, primaryButtonClass, ResponsiveFilterDrawer } from "@/components/DesignSystem";

export const ExpenseModule: React.FC<{ employees: EmployeeRecordBlueprint[]; globalSearchQuery: string }> = ({ employees, globalSearchQuery }) => {
  const { t, localize, formatCurrencySAR } = useLanguage();
  const { hasPermission, currentRole } = useCurrentRole();

  const { expenseClaims: claims, addExpenseClaim, updateExpenseStatus } = useOperations();
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | ExpenseStatus>("ALL");
  const [sortBy, setSortBy] = useState<"DATE_DESC" | "AMOUNT_DESC" | "NAME_ASC">("DATE_DESC");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const [newClaimForm, setNewClaimForm] = useState({
    employeeId: "EMP-KSA-1001",
    category: "TRAVEL_PER_DIEM" as ExpenseCategory,
    merchantNameEn: "SAR High-Speed Railway Business Class",
    merchantNameAr: "قطار الحرمين السريع — درجة الأعمال",
    merchantVatNumber: "300881920300003",
    baseAmountSar: 3200
  });

  const canApprove = hasPermission("dept:manage_team_leave_ot");
  const canSettle = hasPermission("system:raw_audit_logs");
  const [claimValidationMessage, setClaimValidationMessage] = useState("");
  const visibleEmployees = currentRole === "EMPLOYEE" ? employees.slice(0, 1) : employees;
  const visibleClaims = useMemo(
    () => currentRole === "EMPLOYEE"
      ? claims.filter((claim) => claim.employeeId === employees[0]?.id)
      : claims,
    [currentRole, claims, employees]
  );
  const filteredClaims = useMemo(() => {
    const query = globalSearchQuery.trim().toLowerCase();
    const matched = visibleClaims.filter((claim) => {
      if (statusFilter !== "ALL" && claim.status !== statusFilter) return false;
      if (!query) return true;
      return [claim.id, claim.employeeName.en, claim.employeeName.ar, claim.merchantName.en, claim.merchantName.ar]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
    return matched.sort((a, b) => {
      if (sortBy === "AMOUNT_DESC") return b.totalAmountSar - a.totalAmountSar;
      if (sortBy === "NAME_ASC") return localize(a.employeeName).localeCompare(localize(b.employeeName));
      return b.dateIso.localeCompare(a.dateIso);
    });
  }, [visibleClaims, globalSearchQuery, statusFilter, sortBy, localize]);

  const metrics = useMemo(() => {
    const totalGross = visibleClaims.reduce((s, c) => s + c.totalAmountSar, 0);
    const totalVat = visibleClaims.reduce((s, c) => s + c.vatAmountSar, 0);
    const pendingSum = visibleClaims
      .filter((c) => c.status === "PENDING")
      .reduce((s, c) => s + c.totalAmountSar, 0);
    const reimbursedSum = visibleClaims
      .filter((c) => c.status === "REIMBURSED")
      .reduce((s, c) => s + c.totalAmountSar, 0);

    return { totalGross, totalVat, pendingSum, reimbursedSum };
  }, [visibleClaims]);

  const handleStatusDecision = (id: string, nextStatus: ExpenseStatus) => {
    updateExpenseStatus(id, nextStatus);
  };

  const handleCreateClaim = () => {
    const employee = visibleEmployees.find((item) => item.id === newClaimForm.employeeId);
    if (!employee) {
      setClaimValidationMessage(t("exp.modal.validation_employee"));
      return;
    }
    const hasValidVat = /^3\d{13}3$/.test(newClaimForm.merchantVatNumber.trim());
    if (newClaimForm.category !== "GOV_FEES" && !hasValidVat) {
      setClaimValidationMessage(t("exp.modal.validation_vat"));
      return;
    }
    setClaimValidationMessage("");
    const base = Number(newClaimForm.baseAmountSar) || 0;
    const vat = newClaimForm.category !== "GOV_FEES" && hasValidVat ? Math.round(base * 0.15) : 0;

    const created: ExpenseClaimRecord = {
      id: `EXP-KSA-${400 + claims.length + 1}`,
      employeeId: employee.id,
      employeeName: employee.name,
      category: newClaimForm.category,
      merchantName: {
        en: newClaimForm.merchantNameEn,
        ar: newClaimForm.merchantNameAr
      },
      merchantVatNumber: newClaimForm.merchantVatNumber.trim(),
      baseAmountSar: base,
      vatAmountSar: vat,
      totalAmountSar: base + vat,
      dateIso: "2026-10-02",
      status: "PENDING"
    };

    addExpenseClaim(created);
    setModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t("nav.group.finance")}
        title={t("exp.header.title")}
        
        actions={(
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <FilterDrawerTrigger
              label={t("ui.filters")}
              controls="expense-claim-filters"
              expanded={filterDrawerOpen}
              activeCount={statusFilter === "ALL" ? 0 : 1}
              onClick={() => setFilterDrawerOpen(true)}
              className="md:hidden"
            />
            <div className="hidden items-center gap-2 xl:flex">
              <select aria-label={t("exp.filter.all_status")} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-10 min-w-36 bg-surface-elevated px-3 text-dynamic-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="ALL">{t("exp.filter.all_status")}</option>
                <option value="PENDING">{t("exp.status.PENDING")}</option>
                <option value="APPROVED">{t("exp.status.APPROVED")}</option>
                <option value="REIMBURSED">{t("exp.status.REIMBURSED")}</option>
                <option value="REJECTED">{t("exp.status.REJECTED")}</option>
              </select>
              <select aria-label={t("ui.sort_by")} value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="h-10 min-w-36 bg-surface-elevated px-3 text-dynamic-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="DATE_DESC">{t("ui.sort.date_desc")}</option>
                <option value="AMOUNT_DESC">{t("ui.sort.amount_desc")}</option>
                <option value="NAME_ASC">{t("ui.sort.name_asc")}</option>
              </select>
            </div>
            <button type="button" onClick={() => setModalOpen(true)} className={primaryButtonClass}>
              <PlusCircle className="h-4 w-4" />
              <span>{t("exp.btn.new_claim")}</span>
            </button>
          </div>
        )}
      />

      <ResponsiveFilterDrawer
        id="expense-claim-filters"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onClear={() => { setStatusFilter("ALL"); setSortBy("DATE_DESC"); }}
        title={t("ui.filters")}
        closeLabel={t("ui.close")}
        clearLabel={t("ui.clear_filters")}
        doneLabel={t("ui.done")}
      >
        <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
          <span>{t("exp.filter.all_status")}</span>
          <select aria-label={t("exp.filter.all_status")} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-11 w-full border border-theme bg-surface-elevated px-3 text-dynamic-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="ALL">{t("exp.filter.all_status")}</option>
            <option value="PENDING">{t("exp.status.PENDING")}</option>
            <option value="APPROVED">{t("exp.status.APPROVED")}</option>
            <option value="REIMBURSED">{t("exp.status.REIMBURSED")}</option>
            <option value="REJECTED">{t("exp.status.REJECTED")}</option>
          </select>
        </label>
        <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
          <span>{t("ui.sort_by")}</span>
          <select aria-label={t("ui.sort_by")} value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="h-11 w-full border border-theme bg-surface-elevated px-3 text-dynamic-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="DATE_DESC">{t("ui.sort.date_desc")}</option>
            <option value="AMOUNT_DESC">{t("ui.sort.amount_desc")}</option>
            <option value="NAME_ASC">{t("ui.sort.name_asc")}</option>
          </select>
        </label>
      </ResponsiveFilterDrawer>
      <FilterDrawerEdgeTrigger
        label={t("ui.filters")}
        controls="expense-claim-filters"
        expanded={filterDrawerOpen}
        activeCount={statusFilter === "ALL" ? 0 : 1}
        onClick={() => setFilterDrawerOpen(true)}
        placement="end"
        className="hidden md:flex"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("exp.kpi.total_claims")}
          value={formatCurrencySAR(metrics.totalGross)}
          icon={<Receipt className="h-5 w-5" />}
          tone="primary"
        />
        <MetricCard
          label={t("exp.kpi.recoverable_vat")}
          value={formatCurrencySAR(metrics.totalVat)}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="accent"
        />
        <MetricCard
          label={t("exp.kpi.pending_approval")}
          value={formatCurrencySAR(metrics.pendingSum)}
          icon={<Clock className="h-5 w-5" />}
          tone="warning"
        />
        <MetricCard
          label={t("exp.kpi.wps_reimbursed")}
          value={formatCurrencySAR(metrics.reimbursedSum)}
          icon={<Landmark className="h-5 w-5" />}
          tone="success"
        />
      </div>

      <DataTableFrame
        title={t("exp.table.title")}
        count={filteredClaims.length}
        countLabel={t("ui.records")}
      >
        <table className="min-w-[760px] w-full border-collapse text-start">
            <thead>
              <tr className="bg-surface-elevated border-b border-theme text-muted text-dynamic-xs uppercase tracking-wider">
                <th className="py-3.5 ps-5 pe-3 text-start font-bold">
                  {t("exp.col.claim_id")}
                </th>
                <th className="py-3.5 px-3 text-start font-bold">
                  {t("exp.col.category")}
                </th>
                <th className="py-3.5 px-3 text-start font-bold">
                  {t("exp.col.merchant_vat")}
                </th>
                <th className="py-3.5 px-3 text-end font-bold">
                  {t("exp.col.amount_vat")}
                </th>
                <th className="py-3.5 ps-3 pe-5 text-end font-bold">
                  {t("exp.col.status")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {filteredClaims.map((claim) => (
                <tr
                  key={claim.id}
                  className="transition-colors hover:bg-primary-soft/30"
                >
                  <td className="py-4 ps-5 pe-3 align-top">
                    <div className="font-bold text-dynamic-sm text-foreground">
                      {localize(claim.employeeName)}
                    </div>
                    <div className="text-dynamic-xs font-mono text-primary pt-0.5">
                      {claim.id} • {claim.dateIso}
                    </div>
                  </td>

                  <td className="py-4 px-3 align-top">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-primary-soft text-primary font-semibold text-dynamic-xs">
                      {t(`exp.cat.${claim.category}`)}
                    </span>
                  </td>

                  <td className="py-4 px-3 align-top">
                    <div className="text-dynamic-sm font-bold text-foreground">
                      {localize(claim.merchantName)}
                    </div>
                    <div className="text-dynamic-xs font-mono text-muted pt-0.5">
                      {claim.merchantVatNumber
                        ? `${t("ven.vat_short")}: ${claim.merchantVatNumber}`
                        : t("file.status.gov_exempt")}
                    </div>
                  </td>

                  <td className="py-4 px-3 align-top text-end font-mono">
                    <div className="text-dynamic-sm font-extrabold text-foreground">
                      {formatCurrencySAR(claim.totalAmountSar)}
                    </div>
                    <div className="text-dynamic-xs text-muted">
                      {t("exp.amount.base")}: {formatCurrencySAR(claim.baseAmountSar)} | {t("exp.amount.vat")}:{" "}
                      {formatCurrencySAR(claim.vatAmountSar)}
                    </div>
                  </td>

                  <td className="py-4 ps-3 pe-5 align-top text-end space-y-1.5">
                    <div>
                      <span
                        className={`inline-block px-3 py-1 rounded-full font-bold text-dynamic-xs ${
                          claim.status === "APPROVED" ||
                          claim.status === "REIMBURSED"
                            ? "bg-success-soft text-success"
                            : claim.status === "REJECTED"
                            ? "bg-danger-soft text-danger"
                            : "bg-warning-soft text-warning"
                        }`}
                      >
                        {t(`exp.status.${claim.status}`)}
                      </span>
                    </div>

                    {canSettle && claim.status === "APPROVED" && (
                      <button
                        type="button"
                        onClick={() => handleStatusDecision(claim.id, "REIMBURSED")}
                        className="inline-flex min-h-10 items-center justify-center gap-2 bg-success px-3 py-2 text-on-primary text-dynamic-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2"
                      >
                        <Landmark className="h-4 w-4" />
                        <span>{t("exp.status.settle_btn")}</span>
                      </button>
                    )}

                    {canApprove && claim.status === "PENDING" && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusDecision(claim.id, "APPROVED")
                          }
                          className="inline-flex min-h-10 items-center justify-center gap-2 bg-success px-3 py-2 text-on-primary text-dynamic-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{t("dash.leave_queue.approve")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusDecision(claim.id, "REJECTED")
                          }
                          className="inline-flex min-h-10 items-center justify-center gap-2 bg-danger px-3 py-2 text-on-primary text-dynamic-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>{t("dash.leave_queue.reject")}</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredClaims.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-dynamic-sm text-muted">
                    {t("ui.no_results")}
                  </td>
                </tr>
              )}
            </tbody>
        </table>
      </DataTableFrame>

      {/* Submit New Expense Claim Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-primary rounded-2xl max-w-xl w-full p-4 shadow-shell space-y-4">
            <div className="flex items-center justify-between border-b border-theme pb-3">
              <h2 className="text-dynamic-lg font-extrabold text-foreground">
                {t("exp.modal.title")}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                title={t("doc.action.close")}
                aria-label={t("doc.action.close")}
                className={iconButtonClass}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-dynamic-xs font-bold text-muted pb-1">
                  {t("exp.modal.emp_name")}
                </label>
                <select aria-label={t("exp.modal.emp_name")}
                  value={newClaimForm.employeeId}
                  onChange={(e) => {
                    setNewClaimForm((p) => ({ ...p, employeeId: e.target.value }));
                    setClaimValidationMessage("");
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                >
                  {visibleEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {localize(employee.name)} ({employee.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-dynamic-xs font-bold text-muted pb-1">
                  {t("exp.col.category")}
                </label>
                <select aria-label={t("exp.col.category")}
                  value={newClaimForm.category}
                  onChange={(e) => {
                    const nextCategory = e.target.value as ExpenseCategory;
                    setNewClaimForm((p) => ({
                      ...p,
                      category: nextCategory,
                      merchantVatNumber: nextCategory === "GOV_FEES" ? "" : p.merchantVatNumber
                    }));
                    setClaimValidationMessage("");
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                >
                  <option value="TRAVEL_PER_DIEM">
                    {t("exp.cat.TRAVEL_PER_DIEM")}
                  </option>
                  <option value="GOV_FEES">{t("exp.cat.GOV_FEES")}</option>
                  <option value="IT_HARDWARE">
                    {t("exp.cat.IT_HARDWARE")}
                  </option>
                  <option value="HOSPITALITY">
                    {t("exp.cat.HOSPITALITY")}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-dynamic-xs font-bold text-muted pb-1">
                  {t("exp.modal.merchant")}
                </label>
                <input aria-label={t("exp.modal.merchant")}
                  type="text"
                  value={newClaimForm.merchantNameEn}
                  onChange={(e) =>
                    setNewClaimForm((p) => ({
                      ...p,
                      merchantNameEn: e.target.value
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                />
              </div>

              <div>
                <label className="block text-dynamic-xs font-bold text-muted pb-1">
                  {t("exp.modal.vat_no")}
                </label>
                <input aria-label={t("exp.modal.vat_no")}
                  type="text"
                  maxLength={15}
                  disabled={newClaimForm.category === "GOV_FEES"}
                  value={newClaimForm.merchantVatNumber}
                  onChange={(e) => {
                    setNewClaimForm((p) => ({
                      ...p,
                      merchantVatNumber: e.target.value
                    }));
                    setClaimValidationMessage("");
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                />
                {claimValidationMessage && (
                  <div role="alert" className="text-dynamic-xs text-danger font-semibold pt-1">
                    {claimValidationMessage}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-dynamic-xs font-bold text-muted pb-1">
                  {t("exp.modal.amount")}
                </label>
                <input aria-label={t("exp.modal.amount")}
                  type="number"
                  value={newClaimForm.baseAmountSar}
                  onChange={(e) =>
                    setNewClaimForm((p) => ({
                      ...p,
                      baseAmountSar: Number(e.target.value) || 0
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-theme">
              <button
                type="button"
                onClick={handleCreateClaim}
                className={primaryButtonClass}
              >
                {t("exp.modal.submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
