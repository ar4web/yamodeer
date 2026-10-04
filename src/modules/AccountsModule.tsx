import React, { useState, useMemo } from "react";
import {
  Landmark,
  BookOpen,
  FileSpreadsheet,
  PlusCircle,
  Scale,
  Receipt,
  X
} from "lucide-react";
import { useLanguage, BilingualText } from "@/context/LanguageContext";
import { useOperations } from "@/context/OperationsContext";
import { useCurrentRole } from "@/context/RBACGeofenceContext";
import { DataTableFrame, iconButtonClass, MetricCard, PageHeader, primaryButtonClass, SegmentedTabs, TabPanel } from "@/components/DesignSystem";

export type AccountClass =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE";

export interface SocpaAccountRecord {
  code: string;
  name: BilingualText;
  type: AccountClass;
  debitSar: number;
  creditSar: number;
}

export interface JournalVoucherEntry {
  id: string;
  dateIso: string;
  narration: BilingualText;
  debitAccountCode: string;
  creditAccountCode: string;
  amountSar: number;
}

const INITIAL_COA: SocpaAccountRecord[] = [
  {
    code: "110101",
    name: {
      en: "Al-Rajhi Corporate SARIE WPS Bank Account",
      ar: "مصرف الراجحي — حساب حماية الأجور المؤسسي (سريع)"
    },
    type: "ASSET",
    debitSar: 14850000,
    creditSar: 0
  },
  {
    code: "110402",
    name: {
      en: "ZATCA 15% Input VAT Recoverable",
      ar: "ضريبة القيمة المضافة للمدخلات القابلة للاسترداد (15%)"
    },
    type: "ASSET",
    debitSar: 174000,
    creditSar: 0
  },
  {
    code: "210101",
    name: {
      en: "MHRSD WPS Accrued Salaries Payable",
      ar: "رواتب وأجور مستحقة الصرف (نظام حماية الأجور)"
    },
    type: "LIABILITY",
    debitSar: 0,
    creditSar: 6500000
  },
  {
    code: "210204",
    name: {
      en: "GOSI Monthly Contribution Payable (10%/10% & 2%)",
      ar: "مستحقات المؤسسة العامة للتأمينات الاجتماعية"
    },
    type: "LIABILITY",
    debitSar: 0,
    creditSar: 384920
  },
  {
    code: "210501",
    name: {
      en: "ZATCA 15% Output VAT Payable",
      ar: "ضريبة القيمة المضافة للمخرجات المستحقة لزاتكا (15%)"
    },
    type: "LIABILITY",
    debitSar: 0,
    creditSar: 412500
  },
  {
    code: "220101",
    name: {
      en: "Statutory End-of-Service Benefits (EOSB) Provision",
      ar: "مخصص مكافأة نهاية الخدمة النظامي (المادة 84/85)"
    },
    type: "LIABILITY",
    debitSar: 0,
    creditSar: 2940000
  },
  {
    code: "410101",
    name: {
      en: "Enterprise B2B Advisory & Sovereign Cloud Revenue",
      ar: "إيرادات العقود المؤسسية والخدمات السحابية"
    },
    type: "REVENUE",
    debitSar: 0,
    creditSar: 12450000
  },
  {
    code: "510101",
    name: {
      en: "Workforce Basic Wages, Housing & Transport Allowances",
      ar: "مصروفات الرواتب الأساسية وبدلات السكن والنقل"
    },
    type: "EXPENSE",
    debitSar: 6500000,
    creditSar: 0
  },
  {
    code: "520301",
    name: {
      en: "B2B Outsourcing & Contractor SLA Retainers",
      ar: "مصروفات عقود الإسناد والمقاولين (B2B)"
    },
    type: "EXPENSE",
    debitSar: 1162520,
    creditSar: 0
  }
];

const INITIAL_JOURNAL: JournalVoucherEntry[] = [
  {
    id: "JV-2026-901",
    dateIso: "2026-10-01",
    narration: {
      en: "October 2026 Monthly WPS Payroll & GOSI Statutory Accrual",
      ar: "إثبات استحقاق مسير رواتب شهر أكتوبر 2026 وحصة التأمينات الاجتماعية"
    },
    debitAccountCode: "510101",
    creditAccountCode: "210101",
    amountSar: 6500000
  },
  {
    id: "JV-2026-902",
    dateIso: "2026-10-02",
    narration: {
      en: "Al-Yamamah Cloud B2B Retainer & ZATCA Phase 2 Invoice #419",
      ar: "إثبات مستخلص شركة اليمامة للكفاءات السحابية وفاتورة زاتكا رقم 419"
    },
    debitAccountCode: "520301",
    creditAccountCode: "110101",
    amountSar: 557750
  }
];

export const AccountsModule: React.FC = () => {
  const { t, localize, formatCurrencySAR } = useLanguage();
  const { hasPermission } = useCurrentRole();
  const { financialWorkflowItems, updateFinancialWorkflowStatus } = useOperations();
  const canSettlePayments = hasPermission("route:accounts");
  const pendingFinancialItems = financialWorkflowItems.filter((item) => item.status === "PENDING");
  const pendingInvoiceItems = pendingFinancialItems.filter((item) => item.type === "INVOICE");
  const pendingPaymentItems = pendingFinancialItems.filter((item) => item.type !== "INVOICE");
  const pendingInvoiceAmount = pendingInvoiceItems.reduce((total, item) => total + item.amountSar, 0);
  const pendingPaymentAmount = pendingPaymentItems.reduce((total, item) => total + item.amountSar, 0);

  const [activeTab, setActiveTab] = useState<"coa" | "journal" | "vat_return" | "payments">(
    "coa"
  );
  const [coa, setCoa] = useState<SocpaAccountRecord[]>(INITIAL_COA);
  const [journal, setJournal] =
    useState<JournalVoucherEntry[]>(INITIAL_JOURNAL);
  const [jvModalOpen, setJvModalOpen] = useState(false);

  const [jvForm, setJvForm] = useState({
    narrationEn: "Quarterly Article 84/85 EOSB Actuarial Provision Top-Up",
    narrationAr: "تعزيز مخصص مكافأة نهاية الخدمة الربع سنوي (المادة 84/85)",
    debitAccountCode: "510101",
    creditAccountCode: "220101",
    amountSar: 185000
  });

  const totals = useMemo(() => {
    const assets = coa
      .filter((a) => a.type === "ASSET")
      .reduce((s, a) => s + a.debitSar - a.creditSar, 0);
    const liabilities = coa
      .filter((a) => a.type === "LIABILITY")
      .reduce((s, a) => s + a.creditSar - a.debitSar, 0);
    const revenue = coa
      .filter((a) => a.type === "REVENUE")
      .reduce((s, a) => s + a.creditSar, 0);
    const expenses = coa
      .filter((a) => a.type === "EXPENSE")
      .reduce((s, a) => s + a.debitSar, 0);
    const totalDebit = coa.reduce((s, a) => s + a.debitSar, 0);
    const totalCredit = coa.reduce((s, a) => s + a.creditSar, 0);
    return { assets, liabilities, revenue, expenses, totalDebit, totalCredit };
  }, [coa]);

  const handlePostJournal = () => {
    const amt = Number(jvForm.amountSar) || 0;
    if (amt <= 0) return;

    const newJv: JournalVoucherEntry = {
      id: `JV-2026-${900 + journal.length + 1}`,
      dateIso: "2026-10-02",
      narration: { en: jvForm.narrationEn, ar: jvForm.narrationAr },
      debitAccountCode: jvForm.debitAccountCode,
      creditAccountCode: jvForm.creditAccountCode,
      amountSar: amt
    };

    setJournal((prev) => [newJv, ...prev]);
    setCoa((prev) =>
      prev.map((acc) => {
        if (acc.code === jvForm.debitAccountCode) {
          return { ...acc, debitSar: acc.debitSar + amt };
        }
        if (acc.code === jvForm.creditAccountCode) {
          return { ...acc, creditSar: acc.creditSar + amt };
        }
        return acc;
      })
    );
    setJvModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t("nav.group.finance")}
        title={t("acc.header.title")}
        
        actions={(
          <>
            <SegmentedTabs
              id="accounting"
              ariaLabel={t("ui.view_switcher")}
              value={activeTab}
              onChange={setActiveTab}
              items={[
                { value: "coa", label: t("acc.tab.coa"), icon: <Landmark className="h-4 w-4" /> },
                { value: "journal", label: t("acc.tab.journal"), icon: <BookOpen className="h-4 w-4" /> },
                { value: "vat_return", label: t("acc.tab.vat_return"), icon: <FileSpreadsheet className="h-4 w-4" /> },
                { value: "payments", label: t("acc.tab.payments"), icon: <Receipt className="h-4 w-4" /> }
              ]}
            />
            <button type="button" onClick={() => setJvModalOpen(true)} className={primaryButtonClass}>
              <PlusCircle className="h-4 w-4" />
              <span>{t("acc.btn.new_jv")}</span>
            </button>
          </>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("acc.kpi.assets")} value={formatCurrencySAR(totals.assets)} icon={<Landmark className="h-5 w-5" />} tone="primary" />
        <MetricCard label={t("acc.kpi.liabilities")} value={formatCurrencySAR(totals.liabilities)} icon={<Scale className="h-5 w-5" />} tone="warning" />
        <MetricCard label={t("acc.kpi.revenue")} value={formatCurrencySAR(totals.revenue)} icon={<FileSpreadsheet className="h-5 w-5" />} tone="success" />
        <MetricCard label={t("acc.kpi.expenses")} value={formatCurrencySAR(totals.expenses)} icon={<Receipt className="h-5 w-5" />} tone="accent" />
      </div>

      {/* TAB 1: SOCPA CHART OF ACCOUNTS */}
      <TabPanel hidden={activeTab !== "coa"} id="accounting-coa-panel" labelledBy="accounting-coa-tab">
        <DataTableFrame
          title={t("acc.table.title")}
          count={coa.length}
          countLabel={t("ui.records")}
        >
            <table className="min-w-[720px] w-full border-collapse text-start">
              <thead>
                <tr className="bg-surface-elevated border-b border-theme text-muted text-dynamic-xs uppercase">
                  <th className="py-3.5 ps-5 pe-3 text-start font-bold">
                    {t("acc.col.code")}
                  </th>
                  <th className="py-3.5 px-3 text-start font-bold">
                    {t("acc.col.name")}
                  </th>
                  <th className="py-3.5 px-3 text-start font-bold">
                    {t("acc.col.type")}
                  </th>
                  <th className="py-3.5 px-3 text-end font-bold">
                    {t("acc.col.debit")}
                  </th>
                  <th className="py-3.5 ps-3 pe-5 text-end font-bold">
                    {t("acc.col.credit")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {coa.map((acc) => (
                  <tr
                    key={acc.code}
                    className="transition-colors hover:bg-primary-soft/30"
                  >
                    <td className="py-3.5 ps-5 pe-3 font-mono font-bold text-dynamic-sm text-primary">
                      {acc.code}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-dynamic-sm text-foreground">
                        {acc.name.en}
                      </div>
                      <div dir="rtl" className="text-dynamic-xs text-muted">
                        {acc.name.ar}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-0.5 rounded-lg bg-primary-soft text-primary font-bold text-dynamic-xs">
                        {t(`acc.type.${acc.type}`)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-end font-mono text-dynamic-sm font-bold text-foreground">
                      {acc.debitSar > 0 ? formatCurrencySAR(acc.debitSar) : "—"}
                    </td>
                    <td className="py-3.5 ps-3 pe-5 text-end font-mono text-dynamic-sm font-bold text-foreground">
                      {acc.creditSar > 0
                        ? formatCurrencySAR(acc.creditSar)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </DataTableFrame>
        </TabPanel>

      {/* TAB 2: DOUBLE-ENTRY GENERAL JOURNAL */}
      <TabPanel hidden={activeTab !== "journal"} id="accounting-journal-panel" labelledBy="accounting-journal-tab">
        <div className="space-y-3">
          {journal.map((jv) => (
            <div
              key={jv.id}
              className="bg-surface border border-theme rounded-2xl p-4 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-primary-soft text-primary font-mono font-bold text-dynamic-xs">
                    {jv.id}
                  </span>
                  <span className="text-dynamic-xs font-mono text-muted">
                    {jv.dateIso}
                  </span>
                </div>
                <div className="text-dynamic-sm font-bold text-foreground">
                  {localize(jv.narration)}
                </div>
                <div className="text-dynamic-xs font-mono text-muted">
                  {t("acc.journal.dr")} #{jv.debitAccountCode} → {t("acc.journal.cr")} #{jv.creditAccountCode}
                </div>
              </div>
              <div className="text-end font-mono">
                <div className="text-dynamic-lg font-extrabold text-primary">
                  {formatCurrencySAR(jv.amountSar)}
                </div>
                <span className="text-dynamic-xs text-success font-bold">
                  {t("acc.journal.balanced")}
                </span>
              </div>
            </div>
          ))}
        </div>
        </TabPanel>

      {/* TAB 3: ZATCA 15% VAT RETURN & GOSI/EOSB RECONCILIATION */}
      <TabPanel hidden={activeTab !== "vat_return"} id="accounting-vat_return-panel" labelledBy="accounting-vat_return-tab">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
            <div className="flex items-center gap-2 border-b border-theme pb-3">
              <Scale className="w-5 h-5 text-primary" />
              <h2 className="text-dynamic-base font-bold text-foreground">
                {t("acc.vat.title")}
              </h2>
            </div>
            <div className="space-y-2.5 font-mono text-dynamic-sm">
              <div className="flex justify-between p-3 rounded-xl bg-surface-elevated">
                <span>{t("acc.vat.output")}</span>
                <strong className="text-warning">
                  {formatCurrencySAR(412500)}
                </strong>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-surface-elevated">
                <span>{t("acc.vat.input")}</span>
                <strong className="text-success">
                  - {formatCurrencySAR(174000)}
                </strong>
              </div>
              <div className="flex justify-between p-4 rounded-xl bg-primary-soft border border-primary">
                <span className="font-bold text-primary">
                  {t("acc.vat.net")}
                </span>
                <strong className="text-primary">
                  {formatCurrencySAR(238500)}
                </strong>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
            <div className="flex items-center gap-2 border-b border-theme pb-3">
              <Landmark className="w-5 h-5 text-accent" />
              <h2 className="text-dynamic-base font-bold text-foreground">
                {t("acc.vat.statutory")}
              </h2>
            </div>
            <div className="space-y-2.5 font-mono text-dynamic-sm">
              <div className="flex justify-between p-3 rounded-xl bg-surface-elevated">
                <span>{t("acc.vat.gosi")}</span>
                <strong>{formatCurrencySAR(384920)}</strong>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-surface-elevated">
                <span>{t("acc.vat.eosb")}</span>
                <strong>{formatCurrencySAR(2940000)}</strong>
              </div>
            </div>
          </div>
        </div>
        </TabPanel>

      <TabPanel hidden={activeTab !== "payments"} id="accounting-payments-panel" labelledBy="accounting-payments-tab">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-dynamic-lg font-semibold text-foreground">{t("acc.payables.heading")}</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={t("acc.payables.metric.invoices")} value={pendingInvoiceItems.length} icon={<Receipt className="h-5 w-5" />} tone="warning" />
            <MetricCard label={t("acc.payables.metric.invoice_amount")} value={formatCurrencySAR(pendingInvoiceAmount)} icon={<FileSpreadsheet className="h-5 w-5" />} tone="accent" />
            <MetricCard label={t("acc.payables.metric.payments")} value={pendingPaymentItems.length} icon={<Landmark className="h-5 w-5" />} tone="primary" />
            <MetricCard label={t("acc.payables.metric.payment_amount")} value={formatCurrencySAR(pendingPaymentAmount)} icon={<Scale className="h-5 w-5" />} tone="danger" />
          </div>
          <DataTableFrame title={t("acc.payables.table.title")} count={financialWorkflowItems.length} countLabel={t("ui.records")}>
            <table className="min-w-[980px] w-full border-collapse text-start">
              <thead><tr className="bg-surface-elevated border-b border-theme text-muted text-dynamic-xs">
                <th className="py-3 ps-4 pe-3 text-start font-bold">{t("acc.payables.col.type")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("acc.payables.col.reference")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("acc.payables.col.counterparty")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("acc.payables.col.due")}</th>
                <th className="py-3 px-3 text-end font-bold">{t("acc.payables.col.amount")}</th>
                <th className="py-3 px-3 text-start font-bold">{t("acc.payables.col.status")}</th>
                <th className="py-3 ps-3 pe-4 text-end font-bold">{t("file.col.actions")}</th>
              </tr></thead>
              <tbody className="divide-y divide-theme">
                {financialWorkflowItems.map((item) => (
                  <tr key={item.id} className="hover:bg-primary-soft/20">
                    <td className="py-3 ps-4 pe-3 text-dynamic-xs font-semibold text-foreground">{t(`dash.payable.type.${item.type}`)}</td>
                    <td className="py-3 px-3 font-mono text-dynamic-xs text-muted">{item.reference}</td>
                    <td className="py-3 px-3 text-dynamic-xs text-foreground">{localize(item.counterparty)}</td>
                    <td className="py-3 px-3 font-mono text-dynamic-xs text-muted">{item.dueDate}</td>
                    <td className="py-3 px-3 text-end font-mono text-dynamic-xs font-semibold text-foreground">{formatCurrencySAR(item.amountSar)}</td>
                    <td className="py-3 px-3"><span className={`rounded-full px-2.5 py-1 text-dynamic-xs font-semibold ${item.status === "PENDING" ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}>{t(`acc.payables.status.${item.status}`)}</span></td>
                    <td className="py-3 ps-3 pe-4 text-end">
                      {item.status === "PENDING" && canSettlePayments ? (
                        <button type="button" onClick={() => updateFinancialWorkflowStatus(item.id, "PAID")} className="rounded-lg bg-success px-2.5 py-1 text-dynamic-xs font-semibold text-on-primary">{t("acc.payables.mark_paid")}</button>
                      ) : <span className="text-dynamic-xs text-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableFrame>
        </div>
      </TabPanel>

      {/* Post Journal Voucher Modal */}
      {jvModalOpen && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-primary rounded-2xl max-w-xl w-full p-4 shadow-shell space-y-4">
            <div className="flex items-center justify-between border-b border-theme pb-3">
              <h2 className="text-dynamic-lg font-extrabold text-foreground">
                {t("acc.jv.title")}
              </h2>
              <button
                type="button"
                onClick={() => setJvModalOpen(false)}
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
                  {t("acc.jv.desc_en")}
                </label>
                <input aria-label={t("acc.jv.desc_en")}
                  type="text"
                  value={jvForm.narrationEn}
                  onChange={(e) =>
                    setJvForm((p) => ({ ...p, narrationEn: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                />
              </div>

              <div>
                <label className="block text-dynamic-xs font-bold text-muted pb-1">
                  {t("acc.jv.desc_ar")}
                </label>
                <input aria-label={t("acc.jv.desc_ar")}
                  type="text"
                  dir="rtl"
                  value={jvForm.narrationAr}
                  onChange={(e) =>
                    setJvForm((p) => ({ ...p, narrationAr: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-dynamic-xs font-bold text-muted pb-1">
                    {t("acc.jv.debit_acc")}
                  </label>
                  <select aria-label={t("acc.jv.debit_acc")}
                    value={jvForm.debitAccountCode}
                    onChange={(e) =>
                      setJvForm((p) => ({
                        ...p,
                        debitAccountCode: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-xs"
                  >
                    {coa.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} — {a.name.en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-dynamic-xs font-bold text-muted pb-1">
                    {t("acc.jv.credit_acc")}
                  </label>
                  <select aria-label={t("acc.jv.credit_acc")}
                    value={jvForm.creditAccountCode}
                    onChange={(e) =>
                      setJvForm((p) => ({
                        ...p,
                        creditAccountCode: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-xs"
                  >
                    {coa.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} — {a.name.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-dynamic-xs font-bold text-muted pb-1">
                  {t("acc.jv.amount")}
                </label>
                <input aria-label={t("acc.jv.amount")}
                  type="number"
                  value={jvForm.amountSar}
                  onChange={(e) =>
                    setJvForm((p) => ({
                      ...p,
                      amountSar: Number(e.target.value) || 0
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-theme">
              <button
                type="button"
                onClick={handlePostJournal}
                className={primaryButtonClass}
              >
                {t("acc.jv.commit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
