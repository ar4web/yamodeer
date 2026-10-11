import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FilePlus2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formControlClassName, PageHeader, primaryButtonClass, secondaryButtonClass, surfaceClassName } from "@/components/DesignSystem";
import {
  calculateInvoiceDueDate,
  calculateInvoiceLines,
  calculateInvoiceTotals,
  isPurchaseOrderInvoiceEligible,
  InvoiceDraftStatus,
  fetchClientDetails,
  fetchClientPurchaseOrders,
  InvoiceDraftRecord,
  InvoiceLineInput,
  InvoiceSourceType,
  ClientProfile,
  ClientPurchaseOrder,
  searchClients
} from "@/services/invoiceWorkspace";
import { getLocalISODate } from "@/services/dateUtils";

interface InvoicingModuleProps {
  drafts: InvoiceDraftRecord[];
  onSaveDraft: (draft: InvoiceDraftRecord) => void;
  canCreateDraft: boolean;
  directInvoicingAllowed: boolean;
  globalSearchQuery: string;
}

type InvoiceScreen = "LIST" | "FORM" | "PREVIEW";
type InvoiceStatusFilter = "ALL" | InvoiceDraftStatus;
type InvoiceSourceFilter = "ALL" | InvoiceSourceType;

const fieldClassName = formControlClassName;
const sectionClassName = `${surfaceClassName} p-4`;

const todayIsoDate = (): string => getLocalISODate();

const makeEmptyLine = (): InvoiceLineInput => ({
  id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  descriptionEn: "",
  descriptionAr: "",
  quantity: 1,
  unitPriceSar: 0,
  vatRatePercent: 15
});

const formatDate = (isoDate: string, language: "en" | "ar"): string => {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
};

const createDraftId = (): string =>
  `DRAFT-${Date.now().toString(36).toUpperCase()}`;

export const InvoicingModule: React.FC<InvoicingModuleProps> = ({
  drafts,
  onSaveDraft,
  canCreateDraft,
  directInvoicingAllowed,
  globalSearchQuery
}) => {
  const { t, localize, formatCurrencySAR, language } = useLanguage();
  const [screen, setScreen] = useState<InvoiceScreen>("LIST");
  const [noticeKey, setNoticeKey] = useState("");
  const [formErrorKey, setFormErrorKey] = useState("");
  const [attemptedReview, setAttemptedReview] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] = useState<InvoiceDraftRecord | null>(null);
  const [previewIsPending, setPreviewIsPending] = useState(false);

  const [clientMatches, setClientMatches] = useState<ClientProfile[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>("ALL");
  const [sourceFilter, setSourceFilter] = useState<InvoiceSourceFilter>("ALL");
  const [searchingClients, setSearchingClients] = useState(false);
  const [loadingClientDetails, setLoadingClientDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);

  const [sourceType, setSourceType] = useState<InvoiceSourceType>("PURCHASE_ORDER");
  const [purchaseOrders, setPurchaseOrders] = useState<ClientPurchaseOrder[]>([]);
  const [purchaseOrdersChecked, setPurchaseOrdersChecked] = useState(false);
  const [checkingPurchaseOrders, setCheckingPurchaseOrders] = useState(false);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayIsoDate);
  const [dueDate, setDueDate] = useState(todayIsoDate);
  const [dueDateWasManuallySet, setDueDateWasManuallySet] = useState(false);
  const [lines, setLines] = useState<InvoiceLineInput[]>([makeEmptyLine()]);

  useEffect(() => {
    let cancelled = false;
    const query = clientSearchQuery.trim();
    if (!query || screen !== "FORM" || selectedClient) {
      setClientMatches([]);
      setSearchingClients(false);
      return () => {
        cancelled = true;
      };
    }
    setSearchingClients(true);
    void searchClients(query)
      .then((matches) => {
        if (!cancelled) setClientMatches(matches);
      })
      .finally(() => {
        if (!cancelled) setSearchingClients(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientSearchQuery, screen, selectedClient]);

  const selectedPurchaseOrder = purchaseOrders.find(
    (purchaseOrder) => purchaseOrder.id === selectedPurchaseOrderId
  ) ?? null;
  const receivedPurchaseOrders = purchaseOrders.filter(
    (purchaseOrder) => purchaseOrder.status === "RECEIVED"
  );
  const eligiblePurchaseOrders = purchaseOrders.filter(
    (purchaseOrder) => isPurchaseOrderInvoiceEligible(purchaseOrder, invoiceDate)
  );
  const calculated = useMemo(() => {
    try {
      const calculatedLines = calculateInvoiceLines(lines);
      return { lines: calculatedLines, totals: calculateInvoiceTotals(calculatedLines) };
    } catch {
      return null;
    }
  }, [lines]);

  const validationKey = useMemo(() => {
    if (!selectedClient) return "invoice.error.select_client";
    if (sourceType === "DIRECT" && !directInvoicingAllowed) return "invoice.direct.restricted";
    if (
      sourceType === "PURCHASE_ORDER" &&
      (!selectedPurchaseOrder || selectedPurchaseOrder.status !== "RECEIVED")
    ) {
      return "invoice.error.po";
    }
    if (
      sourceType === "PURCHASE_ORDER" &&
      selectedPurchaseOrder &&
      !isPurchaseOrderInvoiceEligible(selectedPurchaseOrder, invoiceDate)
    ) {
      return "invoice.error.po_expired";
    }
    if (!invoiceDate || !dueDate || dueDate < invoiceDate) return "invoice.error.dates";
    if (!calculated) return "invoice.error.lines";
    return "";
  }, [
    selectedClient,
    sourceType,
    directInvoicingAllowed,
    selectedPurchaseOrder,
    invoiceDate,
    dueDate,
    calculated
  ]);

  const previewIsSaved = Boolean(
    previewDraft && !previewIsPending && drafts.some((draft) => draft.id === previewDraft.id)
  );
  const invoiceMetrics = useMemo(() => ({
    draftCount: drafts.filter((draft) => draft.status === "DRAFT").length,
    readyCount: drafts.filter((draft) => draft.status === "READY_TO_ISSUE").length,
    poBackedCount: drafts.filter((draft) => draft.sourceType === "PURCHASE_ORDER").length,
    openValueSar: drafts.reduce((sum, draft) => sum + draft.totals.grandTotalSar, 0)
  }), [drafts]);
  const filteredDrafts = useMemo(() => {
    const rawQuery = globalSearchQuery.trim();
    const query = rawQuery.toLocaleLowerCase(language === "ar" ? "ar-SA" : "en-US");
    return drafts
      .filter((draft) => statusFilter === "ALL" || draft.status === statusFilter)
      .filter((draft) => sourceFilter === "ALL" || draft.sourceType === sourceFilter)
      .filter((draft) => {
        if (!query) return true;
        const searchable = [
          draft.id,
          draft.client.id,
          draft.client.legalName.en,
          draft.client.legalName.ar,
          draft.client.vatRegistrationNumber,
          draft.client.commercialRegistrationNumber,
          draft.sourceReference
        ].join(" ").toLocaleLowerCase(language === "ar" ? "ar-SA" : "en-US");
        return searchable.includes(query);
      })
      .sort((first, second) => Date.parse(second.createdAtIso) - Date.parse(first.createdAtIso));
  }, [drafts, globalSearchQuery, language, sourceFilter, statusFilter]);

  const resetForNewInvoice = () => {
    const date = todayIsoDate();
    setEditingDraftId(null);
    setPreviewDraft(null);
    setPreviewIsPending(false);
    setNoticeKey("");
    setFormErrorKey("");
    setAttemptedReview(false);
    setClientMatches([]);
    setClientSearchQuery("");
    setSelectedClient(null);
    setSourceType("PURCHASE_ORDER");
    setPurchaseOrders([]);
    setPurchaseOrdersChecked(false);
    setSelectedPurchaseOrderId("");
    setInvoiceDate(date);
    setDueDate(date);
    setDueDateWasManuallySet(false);
    setLines([makeEmptyLine()]);
    setScreen("FORM");
  };

  const selectClient = async (client: ClientProfile) => {
    setLoadingClientDetails(true);
    setFormErrorKey("");
    setClientMatches([]);
    setClientSearchQuery("");
    setPurchaseOrders([]);
    setPurchaseOrdersChecked(false);
    setSelectedPurchaseOrderId("");
    setLines([makeEmptyLine()]);
    try {
      const currentDetails = await fetchClientDetails(client.id);
      if (!currentDetails) {
        setFormErrorKey("invoice.error.details");
        return;
      }
      setSelectedClient(currentDetails);
      setDueDate(invoiceDate ? calculateInvoiceDueDate(invoiceDate, currentDetails.paymentTermsDays) : "");
      setDueDateWasManuallySet(false);
    } catch {
      setFormErrorKey("invoice.error.details");
    } finally {
      setLoadingClientDetails(false);
    }
  };

  const refreshClientDetails = async () => {
    if (!selectedClient) return;
    setLoadingClientDetails(true);
    try {
      const currentDetails = await fetchClientDetails(selectedClient.id);
      if (currentDetails) {
        setSelectedClient(currentDetails);
        if (!dueDateWasManuallySet && invoiceDate) setDueDate(calculateInvoiceDueDate(invoiceDate, currentDetails.paymentTermsDays));
      } else setFormErrorKey("invoice.error.details");
    } catch {
      setFormErrorKey("invoice.error.details");
    } finally {
      setLoadingClientDetails(false);
    }
  };

  const checkPurchaseOrders = async () => {
    if (!selectedClient) return;
    setCheckingPurchaseOrders(true);
    setFormErrorKey("");
    try {
      const records = await fetchClientPurchaseOrders(selectedClient.id);
      setPurchaseOrders(records);
      setPurchaseOrdersChecked(true);
      setSelectedPurchaseOrderId("");
      setLines([makeEmptyLine()]);
    } catch {
      setFormErrorKey("invoice.error.po");
    } finally {
      setCheckingPurchaseOrders(false);
    }
  };

  const changeSourceType = (nextSource: InvoiceSourceType) => {
    if (nextSource === "DIRECT" && !directInvoicingAllowed) return;
    setSourceType(nextSource);
    setSelectedPurchaseOrderId("");
    setLines([makeEmptyLine()]);
    setFormErrorKey("");
  };

  const choosePurchaseOrder = (purchaseOrderId: string) => {
    setSelectedPurchaseOrderId(purchaseOrderId);
    const purchaseOrder = purchaseOrders.find((item) => item.id === purchaseOrderId);
    if (purchaseOrder?.status === "RECEIVED") {
      setLines(purchaseOrder.lines.map((line) => ({ ...line })));
    } else {
      setLines([makeEmptyLine()]);
    }
  };

  const updateLine = <K extends keyof InvoiceLineInput>(
    lineId: string,
    key: K,
    value: InvoiceLineInput[K]
  ) => {
    setLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, [key]: value } : line))
    );
  };

  const buildDraftRecord = (id: string): InvoiceDraftRecord | null => {
    if (!selectedClient || !calculated || validationKey) return null;
    const sourceReference = selectedPurchaseOrder?.reference ?? "";
    return {
      id,
      sourceType,
      sourceId: selectedPurchaseOrder?.id ?? "",
      sourceReference,
      client: selectedClient,
      invoiceDate,
      dueDate,
      lines: calculated.lines,
      totals: calculated.totals,
      status: "DRAFT",
      createdAtIso: new Date().toISOString()
    };
  };

  const reviewInvoice = () => {
    setAttemptedReview(true);
    setNoticeKey("");
    if (!canCreateDraft) return;
    if (validationKey) {
      setFormErrorKey(validationKey);
      return;
    }
    const draft = buildDraftRecord(editingDraftId ?? createDraftId());
    if (!draft) {
      setFormErrorKey("invoice.error.lines");
      return;
    }
    setFormErrorKey("");
    setPreviewDraft(draft);
    setPreviewIsPending(true);
    setScreen("PREVIEW");
  };

  const saveCurrentDraft = () => {
    if (!canCreateDraft || !previewDraft) return;
    const savedDraft = {
      ...previewDraft,
      id: editingDraftId ?? previewDraft.id,
      status: "DRAFT" as const,
      createdAtIso: new Date().toISOString()
    };
    onSaveDraft(savedDraft);
    setStatusFilter("ALL");
    setNoticeKey("invoice.draft.saved");
    setEditingDraftId(null);
    setPreviewDraft(savedDraft);
    setPreviewIsPending(false);
    setScreen("LIST");
  };

  const updateSavedDraftStatus = (status: InvoiceDraftStatus) => {
    if (!canCreateDraft || !previewIsSaved || !previewDraft) return;
    const updatedDraft = { ...previewDraft, status };
    onSaveDraft(updatedDraft);
    setPreviewDraft(updatedDraft);
    setStatusFilter("ALL");
    setNoticeKey(status === "READY_TO_ISSUE" ? "invoice.status.ready_saved" : "invoice.status.reopened");
    setScreen("LIST");
  };

  const openSavedDraft = (draft: InvoiceDraftRecord) => {
    setPreviewDraft(draft);
    setPreviewIsPending(false);
    setFormErrorKey("");
    setScreen("PREVIEW");
  };

  const editSavedDraft = async (draft: InvoiceDraftRecord) => {
    setEditingDraftId(draft.id);
    setPreviewDraft(draft);
    setPreviewIsPending(false);
    setSelectedClient(draft.client);
    setClientMatches([]);
    setClientSearchQuery("");
    setSourceType(draft.sourceType);
    setSelectedPurchaseOrderId(draft.sourceId);
    setInvoiceDate(draft.invoiceDate);
    setDueDate(draft.dueDate);
    setDueDateWasManuallySet(true);
    setLines(
      draft.lines.map((line) => ({
        id: line.id,
        descriptionEn: line.descriptionEn,
        descriptionAr: line.descriptionAr,
        quantity: line.quantity,
        unitPriceSar: line.unitPriceSar,
        vatRatePercent: line.vatRatePercent
      }))
    );
    setFormErrorKey("");
    setAttemptedReview(false);
    setScreen("FORM");

    if (draft.sourceType === "PURCHASE_ORDER") {
      setCheckingPurchaseOrders(true);
      try {
        const records = await fetchClientPurchaseOrders(draft.client.id);
        setPurchaseOrders(records);
        setPurchaseOrdersChecked(true);
      } catch {
        setPurchaseOrders([]);
        setPurchaseOrdersChecked(false);
      } finally {
        setCheckingPurchaseOrders(false);
      }
    } else {
      setPurchaseOrders([]);
      setPurchaseOrdersChecked(false);
    }
  };

  const startDirectInvoice = () => changeSourceType("DIRECT");
  const isPoLineReadOnly = Boolean(
    sourceType === "PURCHASE_ORDER" && selectedPurchaseOrder?.status === "RECEIVED"
  );

  if (screen === "LIST") {
    return (
      <div className="space-y-4">
        <PageHeader
          title={t("invoice.page.title")}
          actions={canCreateDraft ? (
            <button type="button" className={primaryButtonClass} onClick={resetForNewInvoice}>
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              {t("invoice.new")}
            </button>
          ) : null}
          helper={(
            <div className="space-y-3">
              <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
                <span>{t("invoice.list.filter.status")}</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as InvoiceStatusFilter)}
                  aria-label={t("invoice.list.filter.status")}
                  className={`${fieldClassName} h-11`}
                >
                  <option value="ALL">{t("invoice.list.filter.all_statuses")}</option>
                  <option value="DRAFT">{t("invoice.status.draft")}</option>
                  <option value="READY_TO_ISSUE">{t("invoice.status.ready_to_issue")}</option>
                </select>
              </label>
              <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
                <span>{t("invoice.list.filter.source")}</span>
                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value as InvoiceSourceFilter)}
                  aria-label={t("invoice.list.filter.source")}
                  className={`${fieldClassName} h-11`}
                >
                  <option value="ALL">{t("invoice.list.filter.all_sources")}</option>
                  <option value="PURCHASE_ORDER">{t("invoice.source.po")}</option>
                  <option value="DIRECT">{t("invoice.source.direct")}</option>
                </select>
              </label>
            </div>
          )}
        />

        {noticeKey && (
          <div role="status" className="border border-success/40 bg-success-soft px-4 py-3 text-dynamic-sm text-foreground">
            {t(noticeKey)}
          </div>
        )}
        {!canCreateDraft && (
          <div role="status" className="border border-theme bg-surface px-4 py-3 text-dynamic-sm text-muted">
            {t("invoice.no_permission")}
          </div>
        )}

        <div role="note" className="border border-warning/40 bg-warning-soft px-4 py-3 text-dynamic-xs leading-relaxed text-foreground">
          {t("invoice.prototype.notice")}
        </div>

        <section aria-label={t("invoice.overview")} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className={`${sectionClassName} space-y-1`}>
            <p className="text-dynamic-xs font-semibold text-muted">{t("invoice.metric.drafts")}</p>
            <p className="text-dynamic-xl font-bold tabular-nums text-foreground">{invoiceMetrics.draftCount}</p>
          </div>
          <div className={`${sectionClassName} space-y-1`}>
            <p className="text-dynamic-xs font-semibold text-muted">{t("invoice.metric.ready")}</p>
            <p className="text-dynamic-xl font-bold tabular-nums text-foreground">{invoiceMetrics.readyCount}</p>
          </div>
          <div className={`${sectionClassName} space-y-1`}>
            <p className="text-dynamic-xs font-semibold text-muted">{t("invoice.metric.po_backed")}</p>
            <p className="text-dynamic-xl font-bold tabular-nums text-foreground">{invoiceMetrics.poBackedCount}</p>
          </div>
          <div className={`${sectionClassName} space-y-1`}>
            <p className="text-dynamic-xs font-semibold text-muted">{t("invoice.metric.open_value")}</p>
            <p className="break-words text-dynamic-base font-bold tabular-nums text-foreground">{formatCurrencySAR(invoiceMetrics.openValueSar)}</p>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as InvoiceStatusFilter)}
            aria-label={t("invoice.list.filter.status")}
            className={fieldClassName}
          >
            <option value="ALL">{t("invoice.list.filter.all_statuses")}</option>
            <option value="DRAFT">{t("invoice.status.draft")}</option>
            <option value="READY_TO_ISSUE">{t("invoice.status.ready_to_issue")}</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as InvoiceSourceFilter)}
            aria-label={t("invoice.list.filter.source")}
            className={fieldClassName}
          >
            <option value="ALL">{t("invoice.list.filter.all_sources")}</option>
            <option value="PURCHASE_ORDER">{t("invoice.source.po")}</option>
            <option value="DIRECT">{t("invoice.source.direct")}</option>
          </select>
        </div>
        <p role="status" className="text-dynamic-xs text-muted">
          <bdi>{filteredDrafts.length.toLocaleString(language === "ar" ? "ar-SA" : "en-US")}</bdi> {t("invoice.list.results_count")}
        </p>

        {drafts.length === 0 ? (
          <section className={`${sectionClassName} flex min-h-56 flex-col items-center justify-center gap-2 text-center`}>
            <FilePlus2 className="h-7 w-7 text-muted" aria-hidden="true" />
            <h2 className="text-dynamic-lg font-semibold text-foreground">{t("invoice.list.empty.title")}</h2>
            <p className="max-w-lg text-dynamic-sm text-muted">{t("invoice.list.empty.body")}</p>
          </section>
        ) : filteredDrafts.length === 0 ? (
          <section className={`${sectionClassName} flex min-h-40 items-center justify-center text-center text-dynamic-sm text-muted`}>
            {t("invoice.list.no_results")}
          </section>
        ) : (
          <section className={`${sectionClassName} p-0`}>
            <div role="region" aria-label={t("invoice.page.title")} tabIndex={0} className="max-w-full overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
              <table className="min-w-[1040px] w-full border-collapse text-start text-dynamic-sm">
                <caption className="sr-only">{t("invoice.page.title")}</caption>
                <thead className="bg-surface-elevated text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">{t("invoice.list.column.reference")}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{t("invoice.list.column.client")}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{t("invoice.list.column.source")}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{t("invoice.list.column.date")}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{t("invoice.list.column.due_date")}</th>
                    <th scope="col" className="px-4 py-3 text-end font-semibold">{t("invoice.list.column.amount")}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{t("invoice.list.column.status")}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{t("invoice.list.column.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrafts.map((draft) => (
                    <tr key={draft.id} className="border-t border-theme hover:bg-surface-elevated">
                      <td className="px-4 py-3">
                        <button type="button" className="font-semibold text-primary-text underline-offset-2 hover:underline" onClick={() => openSavedDraft(draft)}>
                          {draft.id}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-foreground">{localize(draft.client.legalName)}</td>
                      <td className="px-4 py-3 text-muted">
                        {draft.sourceType === "PURCHASE_ORDER"
                          ? `${t("invoice.source.po")} · ${draft.sourceReference}`
                          : t("invoice.source.direct")}
                      </td>
                      <td className="px-4 py-3 text-muted"><bdi>{formatDate(draft.invoiceDate, language)}</bdi></td>
                      <td className="px-4 py-3 text-muted"><bdi>{formatDate(draft.dueDate, language)}</bdi></td>
                      <td className="px-4 py-3 text-end font-semibold tabular-nums text-foreground">{formatCurrencySAR(draft.totals.grandTotalSar)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex border px-2 py-1 text-dynamic-xs font-semibold ${
                          draft.status === "READY_TO_ISSUE"
                            ? "border-success/40 bg-success-soft text-success-text"
                            : "border-theme bg-surface-elevated text-muted"
                        }`}>
                          {draft.status === "READY_TO_ISSUE" ? t("invoice.status.ready_to_issue") : t("invoice.status.draft")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          aria-label={`${t("invoice.action.open")} ${draft.id}`}
                          className={secondaryButtonClass}
                          onClick={() => openSavedDraft(draft)}
                        >
                          {t("invoice.action.open")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    );
  }

  if (screen === "PREVIEW") {
    if (!previewDraft) {
      return (
        <div className="space-y-4">
          <PageHeader title={t("invoice.review.title")} />
          <button type="button" className={secondaryButtonClass} onClick={() => setScreen("LIST")}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("invoice.back_to_list")}
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <PageHeader
          title={t("invoice.review.title")}
          actions={(
            <button type="button" className={secondaryButtonClass} onClick={() => setScreen("LIST")}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("invoice.back_to_list")}
            </button>
          )}
        />
        <div role="note" className="border border-warning/40 bg-warning-soft px-4 py-3 text-dynamic-xs leading-relaxed text-foreground">
          {t("invoice.prototype.notice")}
        </div>
        {!previewIsSaved && (
          <p className="border border-theme bg-surface px-4 py-3 text-dynamic-sm text-muted">
            {t("invoice.review.info")}
          </p>
        )}
        {previewIsSaved && previewDraft.status === "READY_TO_ISSUE" && (
          <p role="note" className="border border-warning/40 bg-warning-soft px-4 py-3 text-dynamic-sm text-foreground">
            {t("invoice.status.ready_note")}
          </p>
        )}
        <InvoiceDraftPreview draft={previewDraft} />
        <div className="flex flex-wrap justify-end gap-2">
          {previewIsSaved ? (
            <>
              <button type="button" className={secondaryButtonClass} onClick={() => setScreen("LIST")}>
                {t("invoice.back_to_list")}
              </button>
              {canCreateDraft && (
                <>
                  <button type="button" className={secondaryButtonClass} onClick={() => void editSavedDraft(previewDraft)}>
                    {t("invoice.back_to_edit")}
                  </button>
                  {previewDraft.status === "DRAFT" ? (
                    <button type="button" className={primaryButtonClass} onClick={() => updateSavedDraftStatus("READY_TO_ISSUE")}>
                      {t("invoice.action.mark_ready")}
                    </button>
                  ) : (
                    <button type="button" className={primaryButtonClass} onClick={() => updateSavedDraftStatus("DRAFT")}>
                      {t("invoice.action.reopen_draft")}
                    </button>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <button type="button" className={secondaryButtonClass} onClick={() => setScreen("FORM")}>
                {t("invoice.back_to_edit")}
              </button>
              {canCreateDraft && (
                <button type="button" className={primaryButtonClass} onClick={saveCurrentDraft}>
                  {t("invoice.save_draft")}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={editingDraftId ? t("invoice.review.title") : t("invoice.form.title")}
        actions={(
          <button type="button" className={secondaryButtonClass} onClick={() => setScreen("LIST")}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("invoice.back_to_list")}
          </button>
        )}
      />

      <div role="note" className="border border-warning/40 bg-warning-soft px-4 py-3 text-dynamic-xs leading-relaxed text-foreground">
        {t("invoice.prototype.notice")}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <section className={`${sectionClassName} space-y-3`}>
            <div>
              <h2 className="text-dynamic-base font-semibold text-foreground">{t("invoice.source.title")}</h2>
              <p className="mt-1 text-dynamic-xs text-muted">{t("invoice.source.hint")}</p>
            </div>
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">{t("invoice.source.title")}</legend>
              <label className={`flex cursor-pointer items-start gap-3 border p-3 ${sourceType === "PURCHASE_ORDER" ? "border-primary bg-primary-soft" : "border-theme bg-surface-elevated"}`}>
                <input
                  type="radio"
                  name="invoice-source"
                  value="PURCHASE_ORDER"
                  checked={sourceType === "PURCHASE_ORDER"}
                  onChange={() => changeSourceType("PURCHASE_ORDER")}
                  className="mt-1 accent-primary"
                />
                <span className="text-dynamic-sm font-semibold text-foreground">{t("invoice.source.po")}</span>
              </label>
              <label className={`flex items-start gap-3 border p-3 ${sourceType === "DIRECT" ? "border-primary bg-primary-soft" : "border-theme bg-surface-elevated"} ${!directInvoicingAllowed ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  name="invoice-source"
                  value="DIRECT"
                  checked={sourceType === "DIRECT"}
                  disabled={!directInvoicingAllowed}
                  onChange={() => changeSourceType("DIRECT")}
                  className="mt-1 accent-primary"
                />
                <span className="space-y-1 text-dynamic-sm font-semibold text-foreground">
                  <span className="block">{t("invoice.source.direct")}</span>
                  {!directInvoicingAllowed && <span className="block text-dynamic-xs font-normal text-muted">{t("invoice.direct.restricted")}</span>}
                </span>
              </label>
            </fieldset>
          </section>

          <section className={`${sectionClassName} space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-dynamic-base font-semibold text-foreground">{t("invoice.form.client")}</h2>
              {selectedClient && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={secondaryButtonClass} onClick={() => void refreshClientDetails()} disabled={loadingClientDetails}>
                    <RefreshCw className={`h-4 w-4 ${loadingClientDetails ? "animate-spin" : ""}`} aria-hidden="true" />
                    {t("invoice.client.refresh")}
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => {
                      setSelectedClient(null);
                      setPurchaseOrders([]);
                      setPurchaseOrdersChecked(false);
                      setSelectedPurchaseOrderId("");
                      setLines([makeEmptyLine()]);
                    }}
                  >
                    {t("invoice.client.change")}
                  </button>
                </div>
              )}
            </div>

            {!selectedClient ? (
              <div className="space-y-2">
                <div className="w-full space-y-1.5 md:w-1/2 xl:w-1/4 xl:min-w-[12rem]">
                  <label htmlFor="invoice-client-search" className="text-dynamic-xs font-semibold text-muted">{t("invoice.client.search")}</label>
                  <div className="relative">
                    <Search aria-hidden="true" className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="invoice-client-search"
                      type="search"
                      value={clientSearchQuery}
                      onChange={(event) => setClientSearchQuery(event.target.value)}
                      autoComplete="off"
                      placeholder={t("invoice.client.search")}
                      className={`${fieldClassName} ps-10`}
                    />
                  </div>
                  <p className="text-dynamic-xs text-muted">{t("invoice.client.search_help")}</p>
                </div>
                {searchingClients && <p role="status" className="text-dynamic-xs text-muted">{t("invoice.searching")}</p>}
                {clientSearchQuery.trim() && !searchingClients && clientMatches.length === 0 && (
                  <p className="border border-theme bg-surface-elevated px-3 py-2 text-dynamic-sm text-muted">{t("invoice.client.no_results")}</p>
                )}
                {clientMatches.length > 0 && (
                  <div id="invoice-client-results" role="group" aria-label={t("invoice.client.results")} className="max-h-64 overflow-y-auto border border-theme">
                    {clientMatches.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        className="flex w-full flex-col items-start gap-1 border-b border-theme px-3 py-3 text-start last:border-b-0 hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                        onClick={() => void selectClient(client)}
                      >
                        <span className="font-semibold text-foreground">{localize(client.legalName)}</span>
                        <span className="text-dynamic-xs text-muted">{client.id} · {t("invoice.client.vat")}: {client.vatRegistrationNumber}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3 border-s-2 border-primary bg-surface-elevated p-3">
                  <div>
                    <div className="font-semibold text-foreground">{localize(selectedClient.legalName)}</div>
                    <div className="mt-1 text-dynamic-xs text-muted">{selectedClient.id}</div>
                  </div>
                  {loadingClientDetails && <span role="status" className="text-dynamic-xs text-muted">{t("invoice.loading")}</span>}
                </div>
                <dl className="grid gap-x-4 gap-y-3 text-dynamic-xs sm:grid-cols-2 xl:grid-cols-3">
                  <div className="min-w-0">
                    <dt className="font-semibold text-muted">{t("invoice.client.vat")}</dt>
                    <dd className="mt-1 break-all text-foreground">{selectedClient.vatRegistrationNumber}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-semibold text-muted">{t("invoice.client.cr")}</dt>
                    <dd className="mt-1 break-all text-foreground">{selectedClient.commercialRegistrationNumber}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-semibold text-muted">{t("invoice.client.email")}</dt>
                    <dd className="mt-1 break-all text-foreground">{selectedClient.billingEmail}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-semibold text-muted">{t("invoice.client.address")}</dt>
                    <dd className="mt-1 text-foreground">{localize(selectedClient.address)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-semibold text-muted">{t("invoice.client.terms")}</dt>
                    <dd className="mt-1 text-foreground">{selectedClient.paymentTermsDays} {t("invoice.days")}</dd>
                  </div>
                </dl>
              </div>
            )}
          </section>

          {selectedClient && sourceType === "PURCHASE_ORDER" && (
            <section className={`${sectionClassName} space-y-3`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-dynamic-base font-semibold text-foreground">{t("invoice.source.po")}</h2>
                  <p className="mt-1 text-dynamic-xs text-muted">{t("invoice.po.check_help")}</p>
                </div>
                <button type="button" className={secondaryButtonClass} onClick={() => void checkPurchaseOrders()} disabled={checkingPurchaseOrders}>
                  <RefreshCw className={`h-4 w-4 ${checkingPurchaseOrders ? "animate-spin" : ""}`} aria-hidden="true" />
                  {checkingPurchaseOrders ? t("invoice.po.checking") : t("invoice.po.check")}
                </button>
              </div>

              {checkingPurchaseOrders && <p role="status" className="text-dynamic-xs text-muted">{t("invoice.loading")}</p>}
              {purchaseOrdersChecked && eligiblePurchaseOrders.length > 0 && (
                <div className="space-y-2">
                  <label htmlFor="invoice-po-select" className="text-dynamic-xs font-semibold text-muted">{t("invoice.po.select")}</label>
                  <select
                    id="invoice-po-select"
                    value={selectedPurchaseOrderId}
                    onChange={(event) => choosePurchaseOrder(event.target.value)}
                    className={fieldClassName}
                  >
                    <option value="">{t("invoice.po.select")}</option>
                    {purchaseOrders.map((purchaseOrder) => {
                      const isExpired = Boolean(purchaseOrder.validUntilIso && purchaseOrder.validUntilIso < invoiceDate);
                      const statusKey = isExpired && purchaseOrder.status === "RECEIVED"
                        ? "expired"
                        : purchaseOrder.status.toLowerCase() === "awaiting_receipt"
                          ? "awaiting"
                          : purchaseOrder.status.toLowerCase();
                      return (
                        <option
                          key={purchaseOrder.id}
                          value={purchaseOrder.id}
                          disabled={purchaseOrder.status !== "RECEIVED" || isExpired}
                        >
                          {purchaseOrder.reference} · {t(`invoice.po.${statusKey}`)}
                        </option>
                      );
                    })}
                  </select>
                  {selectedPurchaseOrder && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-dynamic-xs text-muted">
                      <span>{t("invoice.po.received_date")}: {formatDate(selectedPurchaseOrder.receivedAtIso ?? "", language)}</span>
                      <span>{t("invoice.po.valid_until")}: {formatDate(selectedPurchaseOrder.validUntilIso, language)}</span>
                    </div>
                  )}
                </div>
              )}

              {purchaseOrdersChecked && eligiblePurchaseOrders.length === 0 && (
                <div className="space-y-3 border border-warning/40 bg-warning-soft p-3">
                  <p className="text-dynamic-sm text-foreground">
                    {receivedPurchaseOrders.length > 0
                      ? t("invoice.po.none_valid")
                      : directInvoicingAllowed ? t("invoice.po.none") : t("invoice.direct.contact_admin")}
                  </p>
                  {directInvoicingAllowed && (
                    <button type="button" className={secondaryButtonClass} onClick={startDirectInvoice}>
                      {t("invoice.source.switch_direct")}
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          <section className={`${sectionClassName} space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-dynamic-base font-semibold text-foreground">{t("invoice.dates.title")}</h2>
              {selectedClient && dueDateWasManuallySet && (
                <button
                  type="button"
                  className="text-dynamic-xs font-semibold text-primary-text underline-offset-2 hover:underline"
                  onClick={() => {
                    setDueDateWasManuallySet(false);
                    if (invoiceDate) setDueDate(calculateInvoiceDueDate(invoiceDate, selectedClient.paymentTermsDays));
                  }}
                >
                  {t("invoice.dates.use_terms")}
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="invoice-date" className="text-dynamic-xs font-semibold text-muted">{t("invoice.date")}</label>
                <input
                  id="invoice-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    setInvoiceDate(nextDate);
                    if (nextDate && selectedClient && !dueDateWasManuallySet) {
                      setDueDate(calculateInvoiceDueDate(nextDate, selectedClient.paymentTermsDays));
                    }
                  }}
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="invoice-due-date" className="text-dynamic-xs font-semibold text-muted">{t("invoice.due_date")}</label>
                <input
                  id="invoice-due-date"
                  type="date"
                  min={invoiceDate}
                  value={dueDate}
                  onChange={(event) => {
                    setDueDate(event.target.value);
                    setDueDateWasManuallySet(true);
                  }}
                  className={fieldClassName}
                />
              </div>
            </div>
          </section>

          <section className={`${sectionClassName} space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-dynamic-base font-semibold text-foreground">{t("invoice.lines.title")}</h2>
                {isPoLineReadOnly && <p className="mt-1 text-dynamic-xs text-muted">{t("invoice.lines.po_readonly")}</p>}
              </div>
              {!isPoLineReadOnly && sourceType === "DIRECT" && (
                <button type="button" className={secondaryButtonClass} onClick={() => setLines((current) => [...current, makeEmptyLine()])}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t("invoice.line.add")}
                </button>
              )}
            </div>
            {lines.length === 0 ? (
              <p className="text-dynamic-sm text-muted">{t("invoice.error.lines")}</p>
            ) : (
              <div className="space-y-3">
                {lines.map((line, index) => {
                  const calculatedLine = calculated?.lines.find((item) => item.id === line.id);
                  return (
                    <div key={line.id} className="border border-theme p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-dynamic-xs font-semibold text-muted">{index + 1}</span>
                        {!isPoLineReadOnly && sourceType === "DIRECT" && lines.length > 1 && (
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center border border-theme text-muted hover:bg-danger-soft hover:text-danger-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label={`${t("invoice.line.remove")} ${index + 1}`}
                            onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <label htmlFor={`${line.id}-description-en`} className="text-dynamic-xs font-semibold text-muted">{t("invoice.line.description.en")}</label>
                          <input
                            id={`${line.id}-description-en`}
                            type="text"
                            value={line.descriptionEn}
                            readOnly={isPoLineReadOnly}
                            onChange={(event) => updateLine(line.id, "descriptionEn", event.target.value)}
                            dir="ltr"
                            className={`${fieldClassName} ${isPoLineReadOnly ? "bg-surface-elevated" : ""}`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor={`${line.id}-description-ar`} className="text-dynamic-xs font-semibold text-muted">{t("invoice.line.description.ar")}</label>
                          <input
                            id={`${line.id}-description-ar`}
                            type="text"
                            value={line.descriptionAr}
                            readOnly={isPoLineReadOnly}
                            onChange={(event) => updateLine(line.id, "descriptionAr", event.target.value)}
                            dir="rtl"
                            className={`${fieldClassName} ${isPoLineReadOnly ? "bg-surface-elevated" : ""}`}
                          />
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <label htmlFor={`${line.id}-quantity`} className="text-dynamic-xs font-semibold text-muted">{t("invoice.line.quantity")}</label>
                          <input
                            id={`${line.id}-quantity`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={line.quantity}
                            readOnly={isPoLineReadOnly}
                            onChange={(event) => updateLine(line.id, "quantity", Number(event.target.value))}
                            className={`${fieldClassName} ${isPoLineReadOnly ? "bg-surface-elevated" : ""}`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor={`${line.id}-unit-price`} className="text-dynamic-xs font-semibold text-muted">{t("invoice.line.unit_price")}</label>
                          <input
                            id={`${line.id}-unit-price`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPriceSar}
                            readOnly={isPoLineReadOnly}
                            onChange={(event) => updateLine(line.id, "unitPriceSar", Number(event.target.value))}
                            className={`${fieldClassName} ${isPoLineReadOnly ? "bg-surface-elevated" : ""}`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <span className="block text-dynamic-xs font-semibold text-muted">{t("invoice.line.vat_rate")}</span>
                          <div className="border border-theme bg-surface-elevated px-3 py-2 text-dynamic-sm text-foreground">{line.vatRatePercent}%</div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-dynamic-xs">
                        <span className="text-muted">{t("invoice.summary.subtotal")}: <bdi>{calculatedLine ? formatCurrencySAR(calculatedLine.netAmountSar) : "—"}</bdi></span>
                        <span className="text-muted">{t("invoice.summary.vat")}: <bdi>{calculatedLine ? formatCurrencySAR(calculatedLine.vatAmountSar) : "—"}</bdi></span>
                        <span className="font-bold text-foreground">{t("invoice.summary.total")}: <bdi>{calculatedLine ? formatCurrencySAR(calculatedLine.totalAmountSar) : "—"}</bdi></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className={`${sectionClassName} space-y-4 xl:sticky xl:top-4`}>
          <h2 className="text-dynamic-base font-semibold text-foreground">{t("invoice.summary.total")}</h2>
          <dl className="space-y-3 text-dynamic-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{t("invoice.summary.subtotal")}</dt>
              <dd className="font-medium tabular-nums text-foreground">{formatCurrencySAR(calculated?.totals.taxableSubtotalSar ?? 0)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{t("invoice.summary.vat")}</dt>
              <dd className="font-medium tabular-nums text-foreground">{formatCurrencySAR(calculated?.totals.totalVatSar ?? 0)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-theme pt-3">
              <dt className="font-semibold text-foreground">{t("invoice.summary.total")}</dt>
              <dd className="text-dynamic-base font-bold tabular-nums text-foreground">{formatCurrencySAR(calculated?.totals.grandTotalSar ?? 0)}</dd>
            </div>
          </dl>
          {formErrorKey && (attemptedReview || formErrorKey === "invoice.error.details") && (
            <p role="alert" className="border border-danger/40 bg-danger-soft px-3 py-2 text-dynamic-xs text-foreground">{t(formErrorKey)}</p>
          )}
          <button
            type="button"
            className={`${primaryButtonClass} w-full`}
            disabled={!canCreateDraft}
            onClick={reviewInvoice}
          >
            {t("invoice.review")}
          </button>
        </aside>
      </div>
    </div>
  );
};

const InvoiceDraftPreview: React.FC<{ draft: InvoiceDraftRecord }> = ({ draft }) => {
  const { t, localize, formatCurrencySAR, language } = useLanguage();
  return (
    <article className="border border-theme bg-surface shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-theme p-4">
        <div>
          <p className="text-dynamic-xs font-semibold text-muted">{t("invoice.draft.id")}</p>
          <h2 className="mt-1 text-dynamic-lg font-semibold text-foreground">{draft.id}</h2>
        </div>
        <span className={`border px-2.5 py-1 text-dynamic-xs font-semibold ${draft.status === "READY_TO_ISSUE" ? "border-success/40 bg-success-soft text-success-text" : "border-theme bg-surface-elevated text-muted"}`}>
          {draft.status === "READY_TO_ISSUE" ? t("invoice.status.ready_to_issue") : t("invoice.status.draft")}
        </span>
      </div>
      <div className="grid gap-4 border-b border-theme p-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-dynamic-xs font-semibold text-muted">{t("invoice.form.client")}</p>
          <p className="mt-1 font-semibold text-foreground">{localize(draft.client.legalName)}</p>
          <p className="mt-1 text-dynamic-xs text-muted">{draft.client.id}</p>
        </div>
        <div>
          <p className="text-dynamic-xs font-semibold text-muted">{t("invoice.list.column.source")}</p>
          <p className="mt-1 text-dynamic-sm text-foreground">
            {draft.sourceType === "PURCHASE_ORDER" ? `${t("invoice.source.po")} · ${draft.sourceReference}` : t("invoice.source.direct")}
          </p>
        </div>
        <div>
          <p className="text-dynamic-xs font-semibold text-muted">{t("invoice.date")}</p>
          <p className="mt-1 text-dynamic-sm text-foreground">{formatDate(draft.invoiceDate, language)}</p>
        </div>
        <div>
          <p className="text-dynamic-xs font-semibold text-muted">{t("invoice.due_date")}</p>
          <p className="mt-1 text-dynamic-sm text-foreground">{formatDate(draft.dueDate, language)}</p>
        </div>
      </div>
      <div className="grid gap-3 border-b border-theme p-4 text-dynamic-xs sm:grid-cols-2 xl:grid-cols-3">
        <div><span className="font-semibold text-muted">{t("invoice.client.vat")}: </span><span className="text-foreground">{draft.client.vatRegistrationNumber}</span></div>
        <div><span className="font-semibold text-muted">{t("invoice.client.cr")}: </span><span className="text-foreground">{draft.client.commercialRegistrationNumber}</span></div>
        <div><span className="font-semibold text-muted">{t("invoice.client.email")}: </span><span className="break-all text-foreground">{draft.client.billingEmail}</span></div>
        <div className="sm:col-span-2 xl:col-span-3"><span className="font-semibold text-muted">{t("invoice.client.address")}: </span><span className="text-foreground">{localize(draft.client.address)}</span></div>
      </div>
      <div role="region" aria-label={t("invoice.review.title")} tabIndex={0} className="max-w-full overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
        <table className="min-w-[920px] w-full border-collapse text-start text-dynamic-sm">
          <caption className="sr-only">{t("invoice.review.title")}</caption>
          <thead className="bg-surface-elevated text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">{t("invoice.line.description.en")}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{t("invoice.line.description.ar")}</th>
              <th scope="col" className="px-4 py-3 text-end font-semibold">{t("invoice.line.quantity")}</th>
              <th scope="col" className="px-4 py-3 text-end font-semibold">{t("invoice.line.unit_price")}</th>
              <th scope="col" className="px-4 py-3 text-end font-semibold">{t("invoice.line.vat_rate")}</th>
              <th scope="col" className="px-4 py-3 text-end font-semibold">{t("invoice.summary.vat")}</th>
              <th scope="col" className="px-4 py-3 text-end font-semibold">{t("invoice.summary.total")}</th>
            </tr>
          </thead>
          <tbody>
            {draft.lines.map((line) => (
              <tr key={line.id} className="border-t border-theme">
                <td className="px-4 py-3 text-foreground" dir="ltr">{line.descriptionEn}</td>
                <td className="px-4 py-3 text-foreground" dir="rtl">{line.descriptionAr}</td>
                <td className="px-4 py-3 text-end tabular-nums text-foreground">{line.quantity}</td>
                <td className="px-4 py-3 text-end tabular-nums text-foreground">{formatCurrencySAR(line.unitPriceSar)}</td>
                <td className="px-4 py-3 text-end tabular-nums text-foreground">{line.vatRatePercent}%</td>
                <td className="px-4 py-3 text-end tabular-nums text-foreground">{formatCurrencySAR(line.vatAmountSar)}</td>
                <td className="px-4 py-3 text-end font-semibold tabular-nums text-foreground">{formatCurrencySAR(line.totalAmountSar)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ms-auto max-w-md space-y-2 border-t border-theme p-4 text-dynamic-sm">
        <div className="flex justify-between gap-4"><span className="text-muted">{t("invoice.summary.subtotal")}</span><span className="tabular-nums text-foreground">{formatCurrencySAR(draft.totals.taxableSubtotalSar)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-muted">{t("invoice.summary.vat")}</span><span className="tabular-nums text-foreground">{formatCurrencySAR(draft.totals.totalVatSar)}</span></div>
        <div className="flex justify-between gap-4 border-t border-theme pt-2 font-bold"><span className="text-foreground">{t("invoice.summary.total")}</span><span className="tabular-nums text-foreground">{formatCurrencySAR(draft.totals.grandTotalSar)}</span></div>
      </div>
    </article>
  );
};
