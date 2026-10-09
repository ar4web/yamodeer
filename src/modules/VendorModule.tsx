import React, { useState, useMemo } from "react";
import {
  Briefcase,
  Building,
  ShieldCheck,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  XOctagon,
  PlusCircle,
  Landmark,
  Eye,
  RefreshCw,
  X
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrentRole } from "@/context/RBACGeofenceContext";
import { addISOCalendarYears } from "@/services/dateUtils";
import {
  VendorContractorBlueprint,
  ZatcaPhase2InvoiceBlueprint,
  buildZatcaTlvHexArray
} from "@/data/mockBlueprints";
import { DataTableFrame, FilterDrawerEdgeTrigger, FilterDrawerTrigger, formControlClassName, iconButtonClass, inlineFormControlClassName, MetricCard, PageHeader, primaryButtonClass, PrototypeNotice, ResponsiveFilterDrawer, secondaryButtonClass, SegmentedTabs, surfaceClassName, TabPanel, useModalFocus } from "@/components/DesignSystem";

interface VendorModuleProps {
  vendors: VendorContractorBlueprint[];
  onAddVendor?: (newVen: VendorContractorBlueprint) => void;
  onUpdateVendor?: (updatedVen: VendorContractorBlueprint) => void;
  onEmitZatcaInvoice: (invoice: ZatcaPhase2InvoiceBlueprint) => void;
  globalSearchQuery: string;
}

export const VendorModule: React.FC<VendorModuleProps> = ({
  vendors,
  onAddVendor,
  onUpdateVendor,
  onEmitZatcaInvoice,
  globalSearchQuery
}) => {
  const { t, localize, formatCurrencySAR } = useLanguage();
  const { hasPermission } = useCurrentRole();

  const [activeTab, setActiveTab] = useState<"ledger" | "pipeline" | "onboard">(
    "ledger"
  );
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "VERIFIED" | "EXPIRING_CR" | "AUDIT_HOLD"
  >("ALL");
  const [sortBy, setSortBy] = useState<"NAME_ASC" | "EXPIRY_ASC" | "VALUE_DESC">("NAME_ASC");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // 360° Vendor MOCI CR & Saudization Audit Modal State
  const [selectedAuditVendorId, setSelectedAuditVendorId] = useState<
    string | null
  >(null);
  const [auditToast, setAuditToast] = useState(false);

  // New B2B Vendor Onboarding Form State
  const [vendorForm, setVendorForm] = useState({
    companyNameEn: "Tuwaiq Sovereign AI & Cloud Integrators",
    companyNameAr: "شركة طويق لتكامل الذكاء الاصطناعي السيادي والسحابة",
    categoryEn: "Sovereign Cloud & SDAIA Data Engineering",
    categoryAr: "السحابة السيادية وهندسة البيانات (سدايا)",
    commercialRegistrationCr: "1010948271",
    crExpiryDate: "2028-06-30",
    chamberOfCommerceId: "RUH-COC-884120",
    vatRegistrationNumber: "310948271600003",
    saudizationTargetPercent: 45,
    saudizationActualPercent: 52,
    suppliedContractorsCount: 24,
    monthlyRetainerSar: 360000
  });

  const filteredVendors = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    const matched = vendors.filter((ven) => {
      if (statusFilter !== "ALL" && ven.complianceStatus !== statusFilter) {
        return false;
      }
      if (q) {
        const hay = [
          ven.id,
          ven.companyName.en,
          ven.companyName.ar,
          ven.commercialRegistrationCr,
          ven.chamberOfCommerceId,
          ven.vatRegistrationNumber
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      }
      return true;
    });

    return matched.sort((a, b) => {
      if (sortBy === "EXPIRY_ASC") return a.crExpiryDate.localeCompare(b.crExpiryDate);
      if (sortBy === "VALUE_DESC") return b.monthlyRetainerSar - a.monthlyRetainerSar;
      return localize(a.companyName).localeCompare(localize(b.companyName));
    });
  }, [vendors, statusFilter, globalSearchQuery, sortBy, localize]);

  const totalMonthlyPipeline = vendors.reduce(
    (acc, v) => acc + v.monthlyRetainerSar,
    0
  );
  const verifiedCount = vendors.filter(
    (v) => v.complianceStatus === "VERIFIED"
  ).length;
  const avgSaudization = (
    vendors.reduce((acc, v) => acc + v.saudizationActualPercent, 0) /
    vendors.length
  ).toFixed(1);

  const selectedAuditVendor = useMemo(
    () => vendors.find((v) => v.id === selectedAuditVendorId) || null,
    [vendors, selectedAuditVendorId]
  );
  const vendorAuditDialogRef = useModalFocus(Boolean(selectedAuditVendor), () => setSelectedAuditVendorId(null));

  // Live KSA 10-Digit MOCI CR & 15-Digit ZATCA VAT Validators
  const isCrValid = useMemo(
    () => /^\d{10}$/.test(vendorForm.commercialRegistrationCr.trim()),
    [vendorForm.commercialRegistrationCr]
  );

  const isVatValid = useMemo(
    () => /^3\d{13}3$/.test(vendorForm.vatRegistrationNumber.trim()),
    [vendorForm.vatRegistrationNumber]
  );

  const handleEmitB2BInvoice = (vendor: VendorContractorBlueprint) => {
    const meetsSaudization =
      vendor.saudizationActualPercent >= vendor.saudizationTargetPercent;
    const holdbackSar = meetsSaudization
      ? 0
      : Math.round(vendor.monthlyRetainerSar * 0.1);
    const netTaxableSar = vendor.monthlyRetainerSar - holdbackSar;
    const vatAmount = Math.round(netTaxableSar * 0.15);
    const grandTotal = netTaxableSar + vatAmount;

    const timestampIso = new Date().toISOString();
    const icv = Math.floor(421 + Math.random() * 90);
    const uuid = `b2b-${vendor.id.toLowerCase()}-4e21-9c04-${icv}93a4b5c6`;
    const xmlHash = `sha256_${vendor.commercialRegistrationCr}_${icv}_zatca_phase2`;
    const sig = `ECDSA_SECP256K1_SIG_${vendor.vatRegistrationNumber}_${icv}`;
    const stamp = `CSID-DEMO-KSA-${vendor.commercialRegistrationCr}-V2`;

    const newInvoice: ZatcaPhase2InvoiceBlueprint = {
      invoiceNumber: `INV-ZATCA-2026-00${icv}`,
      uuid,
      invoiceCounterValueIcv: icv,
      previousInvoiceHashPih:
        "N2E4YjljMGRlMWYyY2IzNDRkNWU2ZjdhOGI5YzBkMWUyZjNhNGI1YzZkN2U4ZjBhMWIyYzNkNGU1ZjZhN2I=",
      currentCryptographicHash: btoa(xmlHash),
      digitalSignatureEcdsa: btoa(sig),
      csidStampId: stamp,
      issueTimestampIso: timestampIso,
      supplierNameEn: vendor.companyName.en,
      supplierNameAr: vendor.companyName.ar,
      supplierVatNumber: vendor.vatRegistrationNumber,
      supplierAddressEn: `CR #${vendor.commercialRegistrationCr} • Chamber #${vendor.chamberOfCommerceId}, KSA`,
      supplierAddressAr: `سجل تجاري ${vendor.commercialRegistrationCr} • الغرفة التجارية ${vendor.chamberOfCommerceId}`,
      buyerNameEn: "NOOR Enterprise Holdings KSA (Closed Joint Stock)",
      buyerNameAr: "شركة نور القابضة للمشاريع السعودية (مساهمة مقفلة)",
      buyerVatNumber: "300918273600003",
      buyerAddressEn:
        "Parcel 4.08, King Abdullah Financial District, Riyadh 13519",
      buyerAddressAr: "القطعة 4.08، مركز الملك عبدالله المالي، الرياض 13519",
      lineItems: [
        {
          id: `LI-${icv}`,
          descriptionEn: `${vendor.category.en} (${vendor.suppliedContractorsCount} Active Contractors)`,
          descriptionAr: `${vendor.category.ar} (${vendor.suppliedContractorsCount} متعاقدين نشطين)`,
          quantity: 1,
          unitPriceSar: netTaxableSar,
          vatRatePercent: 15,
          vatAmountSar: vatAmount,
          lineTotalWithVatSar: grandTotal
        }
      ],
      taxableSubtotalSar: netTaxableSar,
      totalVatSar: vatAmount,
      grandTotalSar: grandTotal,
      tlvHexArray: buildZatcaTlvHexArray({
        sellerName: `${vendor.companyName.en} | ${vendor.companyName.ar}`,
        vatRegistrationNumber: vendor.vatRegistrationNumber,
        timestampIso,
        invoiceTotalWithVat: grandTotal.toFixed(2),
        vatTotal: vatAmount.toFixed(2),
        xmlInvoiceHash: xmlHash,
        ecdsaSignature: sig,
        cryptographicStampPublicKey: stamp
      })
    };

    onEmitZatcaInvoice(newInvoice);
  };

  const handleRegisterVendor = () => {
    if (!onAddVendor) return;
    const meetsSaud =
      vendorForm.saudizationActualPercent >= vendorForm.saudizationTargetPercent;

    const newVendor: VendorContractorBlueprint = {
      id: `VEN-KSA-${800 + vendors.length + 1}`,
      companyName: {
        en: vendorForm.companyNameEn,
        ar: vendorForm.companyNameAr
      },
      category: {
        en: vendorForm.categoryEn,
        ar: vendorForm.categoryAr
      },
      commercialRegistrationCr: vendorForm.commercialRegistrationCr,
      crExpiryDate: vendorForm.crExpiryDate,
      chamberOfCommerceId: vendorForm.chamberOfCommerceId,
      vatRegistrationNumber: vendorForm.vatRegistrationNumber,
      saudizationTargetPercent: Number(vendorForm.saudizationTargetPercent),
      saudizationActualPercent: Number(vendorForm.saudizationActualPercent),
      suppliedContractorsCount: Number(vendorForm.suppliedContractorsCount),
      monthlyRetainerSar: Number(vendorForm.monthlyRetainerSar),
      slaTier: {
        en: "Platinum 99.9% Enterprise SLA — KAFD",
        ar: "اتفاقية مستوى خدمة بلاتينية 99.9% — كافد"
      },
      complianceStatus: meetsSaud ? "VERIFIED" : "AUDIT_HOLD"
    };

    onAddVendor(newVendor);
    setActiveTab("ledger");
  };

  const handleRenewVendorCr = (ven: VendorContractorBlueprint) => {
    if (!onUpdateVendor) return;
    onUpdateVendor({
      ...ven,
      crExpiryDate: addISOCalendarYears(ven.crExpiryDate, 1),
      complianceStatus:
        ven.saudizationActualPercent >= ven.saudizationTargetPercent
          ? "VERIFIED"
          : "AUDIT_HOLD"
    });
    setAuditToast(true);
    setTimeout(() => setAuditToast(false), 3000);
  };

  const handleBoostVendorSaudization = (ven: VendorContractorBlueprint) => {
    if (!onUpdateVendor) return;
    const nextSaud = Math.min(100, Number((ven.saudizationActualPercent + 10).toFixed(1)));
    onUpdateVendor({
      ...ven,
      saudizationActualPercent: nextSaud,
      complianceStatus:
        nextSaud >= ven.saudizationTargetPercent ? "VERIFIED" : ven.complianceStatus
    });
    setAuditToast(true);
    setTimeout(() => setAuditToast(false), 3000);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t("nav.group.people")}
        title={t("ven.header.title")}
        
        actions={(
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <SegmentedTabs
              id="suppliers"
              ariaLabel={t("ui.view_switcher")}
              value={activeTab}
              onChange={setActiveTab}
              items={[
                { value: "ledger", label: t("ven.tab.ledger"), icon: <Briefcase className="h-4 w-4" /> },
                { value: "pipeline", label: t("ven.tab.pipeline"), icon: <Landmark className="h-4 w-4" /> },
                { value: "onboard", label: t("ven.tab.onboard"), icon: <PlusCircle className="h-4 w-4" /> }
              ]}
            />
            {activeTab === "ledger" && (
              <>
                <FilterDrawerTrigger
                  label={t("ui.filters")}
                  controls="vendor-ledger-filters"
                  expanded={filterDrawerOpen}
                  activeCount={statusFilter === "ALL" ? 0 : 1}
                  onClick={() => setFilterDrawerOpen(true)}
                  className="md:hidden"
                />
                <div className="hidden items-center gap-2 xl:flex">
                  <select aria-label={t("ven.filter.all_status")} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={`${inlineFormControlClassName} min-w-40 text-dynamic-xs`}>
                    <option value="ALL">{t("ven.filter.all_status")}</option>
                    <option value="VERIFIED">{t("ven.status.VERIFIED")}</option>
                    <option value="EXPIRING_CR">{t("ven.status.EXPIRING_CR")}</option>
                    <option value="AUDIT_HOLD">{t("ven.status.AUDIT_HOLD")}</option>
                  </select>
                  <select aria-label={t("ui.sort_by")} value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className={`${inlineFormControlClassName} min-w-40 text-dynamic-xs`}>
                    <option value="NAME_ASC">{t("ui.sort.name_asc")}</option>
                    <option value="EXPIRY_ASC">{t("ui.sort.expiry_asc")}</option>
                    <option value="VALUE_DESC">{t("ui.sort.amount_desc")}</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}
      />

      <PrototypeNotice label={t("app.badge.demo_data")}>{t("finance.data_notice")}</PrototypeNotice>

      <ResponsiveFilterDrawer
        id="vendor-ledger-filters"
        open={filterDrawerOpen && activeTab === "ledger"}
        onClose={() => setFilterDrawerOpen(false)}
        onClear={() => { setStatusFilter("ALL"); setSortBy("NAME_ASC"); }}
        title={t("ui.filters")}
        closeLabel={t("ui.close")}
        clearLabel={t("ui.clear_filters")}
        doneLabel={t("ui.done")}
      >
        <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
          <span>{t("ven.filter.all_status")}</span>
          <select aria-label={t("ven.filter.all_status")} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={`${formControlClassName} h-11`}>
            <option value="ALL">{t("ven.filter.all_status")}</option>
            <option value="VERIFIED">{t("ven.status.VERIFIED")}</option>
            <option value="EXPIRING_CR">{t("ven.status.EXPIRING_CR")}</option>
            <option value="AUDIT_HOLD">{t("ven.status.AUDIT_HOLD")}</option>
          </select>
        </label>
        <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
          <span>{t("ui.sort_by")}</span>
          <select aria-label={t("ui.sort_by")} value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className={`${formControlClassName} h-11`}>
            <option value="NAME_ASC">{t("ui.sort.name_asc")}</option>
            <option value="EXPIRY_ASC">{t("ui.sort.expiry_asc")}</option>
            <option value="VALUE_DESC">{t("ui.sort.amount_desc")}</option>
          </select>
        </label>
      </ResponsiveFilterDrawer>
      {activeTab === "ledger" && (
        <FilterDrawerEdgeTrigger
          label={t("ui.filters")}
          controls="vendor-ledger-filters"
          expanded={filterDrawerOpen}
          activeCount={statusFilter === "ALL" ? 0 : 1}
          onClick={() => setFilterDrawerOpen(true)}
          placement="end"
          className="hidden md:flex"
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("ven.kpi.active_vendors")} value={vendors.length} icon={<Briefcase className="h-5 w-5" />} tone="primary" />
        <MetricCard label={t("ven.kpi.cr_verified")} value={`${verifiedCount} / ${vendors.length}`} icon={<ShieldCheck className="h-5 w-5" />} tone="success" />
        <MetricCard label={t("ven.kpi.b2b_pipeline")} value={formatCurrencySAR(totalMonthlyPipeline)} icon={<Receipt className="h-5 w-5" />} tone="accent" />
        <MetricCard label={t("ven.kpi.avg_saudization")} value={`${avgSaudization}%`} icon={<Building className="h-5 w-5" />} tone="primary" />
      </div>

      {/* TAB 1: COMPLIANCE & CR LEDGER */}
      <TabPanel hidden={activeTab !== "ledger"} id="suppliers-ledger-panel" labelledBy="suppliers-ledger-tab">
        <div className="space-y-4">
          <DataTableFrame
            title={t("ven.table.title")}
            count={filteredVendors.length}
            countLabel={t("ui.records")}
          >
              <table className="min-w-[960px] w-full border-collapse text-start">
                <thead>
                  <tr className="bg-surface-elevated border-b border-theme text-muted text-dynamic-xs uppercase tracking-wider">
                    <th className="py-3.5 ps-5 pe-3 text-start font-bold">
                      {t("ven.col.vendor")}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t("ven.col.cr_chamber")}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t("ven.col.saudization")}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t("ven.col.sla_contract")}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t("ven.col.b2b_financials")}
                    </th>
                    <th className="py-3.5 ps-3 pe-5 text-end font-bold">
                      {t("ven.col.status")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {filteredVendors.map((ven) => {
                    const meetsSaudization =
                      ven.saudizationActualPercent >=
                      ven.saudizationTargetPercent;
                    return (
                      <tr
                        key={ven.id}
                        className="transition-colors hover:bg-primary-soft/30"
                      >
                        <td className="py-4 ps-5 pe-3 align-top">
                          <div className="font-bold text-dynamic-sm text-foreground">
                            {localize(ven.companyName)}
                          </div>
                          <div className="text-dynamic-xs text-muted">
                            {localize(ven.category)}
                          </div>
                          <div className="text-dynamic-xs font-mono text-primary-text pt-0.5">
                            {ven.id}
                          </div>
                        </td>

                        <td className="py-4 px-3 align-top font-mono">
                          <div className="text-dynamic-sm font-bold text-foreground">
                            {t("ven.cr_short")}: {ven.commercialRegistrationCr}
                          </div>
                          <div className="text-dynamic-xs text-muted">
                            {ven.chamberOfCommerceId} • {t("ven.exp_short")}:{" "}
                            {ven.crExpiryDate}
                          </div>
                          <div className="text-dynamic-xs text-accent-text">
                            {t("ven.vat_short")}: {ven.vatRegistrationNumber}
                          </div>
                        </td>

                        <td className="py-4 px-3 align-top">
                          <div className="flex items-center justify-between text-dynamic-xs pb-1">
                            <span className="font-bold text-foreground">
                              {ven.saudizationActualPercent}%
                            </span>
                            <span className="text-muted">
                              {t("ven.sla_short")}:{" "}
                              {ven.saudizationTargetPercent}%
                            </span>
                          </div>
                          <div className="w-36 h-2 rounded-full bg-surface-muted overflow-hidden">
                            <div
                              className={`h-full ${
                                meetsSaudization ? "bg-success" : "bg-danger"
                              }`}
                              style={{
                                width: `${Math.min(
                                  ven.saudizationActualPercent,
                                  100
                                )}%`
                              }}
                            />
                          </div>
                        </td>

                        <td className="py-4 px-3 align-top">
                          <div className="text-dynamic-sm font-semibold text-foreground">
                            {localize(ven.slaTier)}
                          </div>
                          <div className="text-dynamic-xs text-muted pt-0.5">
                            {t("ven.hc_short")}:{" "}
                            <strong>{ven.suppliedContractorsCount}</strong>
                          </div>
                        </td>

                        <td className="py-4 px-3 align-top">
                          <div className="text-dynamic-sm font-extrabold text-foreground">
                            {formatCurrencySAR(ven.monthlyRetainerSar)}
                          </div>
                          {import.meta.env.DEV && hasPermission("vendor:b2b_zatca_invoicing") && (
                            <button
                              type="button"
                              onClick={() => handleEmitB2BInvoice(ven)}
                              className={`${primaryButtonClass} mt-1.5`}
                            >
                              <Receipt className="h-4 w-4" />
                              <span>{t("ven.btn.generate_invoice")}</span>
                            </button>
                          )}
                        </td>

                        <td className="py-4 ps-3 pe-5 align-top text-end space-y-1.5">
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-dynamic-xs ${
                                ven.complianceStatus === "VERIFIED"
                                  ? "bg-success-soft text-success-text"
                                  : ven.complianceStatus === "EXPIRING_CR"
                                  ? "bg-warning-soft text-warning-text"
                                  : "bg-danger-soft text-danger-text"
                              }`}
                            >
                              {ven.complianceStatus === "VERIFIED" ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : ven.complianceStatus === "EXPIRING_CR" ? (
                                <AlertTriangle className="w-3.5 h-3.5" />
                              ) : (
                                <XOctagon className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {t(`ven.status.${ven.complianceStatus}`)}
                              </span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedAuditVendorId(ven.id)}
                            className={secondaryButtonClass}
                          >
                            <Eye className="h-4 w-4 text-primary-text" />
                            <span>{t("ven.btn.audit_modal")}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredVendors.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-dynamic-sm text-muted">
                        {t("ui.no_results")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
          </DataTableFrame>
        </div>
        </TabPanel>

      {/* TAB 2: B2B FINANCIAL PIPELINE & DOWNSTREAM ACCOUNTING BRIDGE */}
      <TabPanel hidden={activeTab !== "pipeline"} id="suppliers-pipeline-panel" labelledBy="suppliers-pipeline-tab">
        <DataTableFrame
          title={t("ven.pipeline.title")}
          count={vendors.length}
          countLabel={t("ui.records")}
        >
            <table className="min-w-[900px] w-full border-collapse text-start">
              <thead>
                <tr className="bg-surface-elevated border-b border-theme text-muted text-dynamic-xs uppercase tracking-wider">
                  <th className="py-3 ps-4 pe-2 text-start font-bold">
                    {t("ven.col.vendor")}
                  </th>
                  <th className="py-3 px-2 text-start font-bold">
                    {t("ven.pipeline.col_gl")}
                  </th>
                  <th className="py-3 px-2 text-end font-bold">
                    {t("ven.pipeline.col_retainer")}
                  </th>
                  <th className="py-3 px-2 text-end font-bold">
                    {t("ven.pipeline.col_holdback")}
                  </th>
                  <th className="py-3 px-2 text-end font-bold">
                    {t("ven.pipeline.col_net_taxable")}
                  </th>
                  <th className="py-3 px-2 text-end font-bold">
                    {t("ven.pipeline.col_vat")}
                  </th>
                  <th className="py-3 ps-2 pe-4 text-end font-bold">
                    {t("ven.pipeline.col_grand")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {vendors.map((ven, idx) => {
                  const meetsSaudization =
                    ven.saudizationActualPercent >=
                    ven.saudizationTargetPercent;
                  const holdbackSar = meetsSaudization
                    ? 0
                    : Math.round(ven.monthlyRetainerSar * 0.1);
                  const netTaxableSar = ven.monthlyRetainerSar - holdbackSar;
                  const vatSar = Math.round(netTaxableSar * 0.15);
                  const grandSar = netTaxableSar + vatSar;
                  const glCode = `GL-6${idx + 1}00-KSA-B2B`;

                  return (
                    <tr
                      key={ven.id}
                      className="transition-colors hover:bg-primary-soft/30"
                    >
                      <td className="py-3.5 ps-4 pe-2">
                        <div className="text-dynamic-sm font-bold text-foreground">
                          {localize(ven.companyName)}
                        </div>
                        <div className="text-dynamic-xs font-mono text-muted">
                          {t("ven.vat_short")}: {ven.vatRegistrationNumber}
                        </div>
                      </td>
                      <td className="py-3.5 px-2 font-mono text-dynamic-xs font-bold text-primary-text">
                        {glCode}
                      </td>
                      <td className="py-3.5 px-2 text-end font-mono text-dynamic-sm text-foreground">
                        {formatCurrencySAR(ven.monthlyRetainerSar)}
                      </td>
                      <td className="py-3.5 px-2 text-end font-mono text-dynamic-sm text-danger-text">
                        {holdbackSar > 0
                          ? `- ${formatCurrencySAR(holdbackSar)}`
                          : formatCurrencySAR(0)}
                      </td>
                      <td className="py-3.5 px-2 text-end font-mono text-dynamic-sm font-semibold text-foreground">
                        {formatCurrencySAR(netTaxableSar)}
                      </td>
                      <td className="py-3.5 px-2 text-end font-mono text-dynamic-sm text-warning-text">
                        {formatCurrencySAR(vatSar)}
                      </td>
                      <td className="py-3.5 ps-2 pe-4 text-end font-mono text-dynamic-sm font-extrabold text-primary-text">
                        {formatCurrencySAR(grandSar)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </DataTableFrame>
        </TabPanel>

      {/* TAB 3: REGISTER NEW B2B VENDOR / CONTRACTOR */}
      <TabPanel hidden={activeTab !== "onboard"} id="suppliers-onboard-panel" labelledBy="suppliers-onboard-tab">
        <div className={`${surfaceClassName} p-4 space-y-4`}>
          <h2 className="text-dynamic-lg font-bold text-foreground border-b border-theme pb-3">
            {t("ven.onboard.title")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-dynamic-xs font-bold text-muted">
                {t("ven.onboard.name_en")}
              </label>
              <input aria-label={t("ven.onboard.name_en")}
                type="text"
                value={vendorForm.companyNameEn}
                onChange={(e) =>
                  setVendorForm((p) => ({
                    ...p,
                    companyNameEn: e.target.value
                  }))
                }
                className={formControlClassName}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-dynamic-xs font-bold text-muted">
                {t("ven.onboard.name_ar")}
              </label>
              <input aria-label={t("ven.onboard.name_ar")}
                type="text"
                value={vendorForm.companyNameAr}
                onChange={(e) =>
                  setVendorForm((p) => ({
                    ...p,
                    companyNameAr: e.target.value
                  }))
                }
                className={formControlClassName}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-dynamic-xs font-bold text-muted">
                {t("ven.onboard.cr_no")}
              </label>
              <input aria-label={t("ven.onboard.cr_no")}
                type="text"
                maxLength={10}
                value={vendorForm.commercialRegistrationCr}
                onChange={(e) =>
                  setVendorForm((p) => ({
                    ...p,
                    commercialRegistrationCr: e.target.value
                  }))
                }
                className={`w-full px-4 py-2.5 rounded-xl bg-surface-elevated border font-mono text-dynamic-sm text-foreground ${
                  isCrValid ? "border-success" : "border-danger"
                }`}
              />
              <div
                className={`text-dynamic-xs font-semibold ${
                  isCrValid ? "text-success-text" : "text-danger-text"
                }`}
              >
                {isCrValid
                  ? t("ven.validation.cr_valid")
                  : t("ven.validation.cr_invalid")}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-dynamic-xs font-bold text-muted">
                {t("ven.onboard.vat_no")}
              </label>
              <input aria-label={t("ven.onboard.vat_no")}
                type="text"
                maxLength={15}
                value={vendorForm.vatRegistrationNumber}
                onChange={(e) =>
                  setVendorForm((p) => ({
                    ...p,
                    vatRegistrationNumber: e.target.value
                  }))
                }
                className={`w-full px-4 py-2.5 rounded-xl bg-surface-elevated border font-mono text-dynamic-sm text-foreground ${
                  isVatValid ? "border-success" : "border-danger"
                }`}
              />
              <div
                className={`text-dynamic-xs font-semibold ${
                  isVatValid ? "text-success-text" : "text-danger-text"
                }`}
              >
                {isVatValid
                  ? t("ven.validation.vat_valid")
                  : t("ven.validation.vat_invalid")}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-dynamic-xs font-bold text-muted">
                {t("ven.onboard.chamber_id")}
              </label>
              <input aria-label={t("ven.onboard.chamber_id")}
                type="text"
                value={vendorForm.chamberOfCommerceId}
                onChange={(e) =>
                  setVendorForm((p) => ({
                    ...p,
                    chamberOfCommerceId: e.target.value
                  }))
                }
                className={`${formControlClassName} font-mono`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-dynamic-xs font-bold text-muted">
                {t("ven.onboard.cr_expiry")}
              </label>
              <input aria-label={t("ven.onboard.cr_expiry")}
                type="date"
                value={vendorForm.crExpiryDate}
                onChange={(e) =>
                  setVendorForm((p) => ({ ...p, crExpiryDate: e.target.value }))
                }
                className={`${formControlClassName} font-mono`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-dynamic-xs font-bold text-muted">
                {t("ven.onboard.saud_target")}
              </label>
              <input aria-label={t("ven.onboard.saud_target")}
                type="number"
                value={vendorForm.saudizationTargetPercent}
                onChange={(e) =>
                  setVendorForm((p) => ({
                    ...p,
                    saudizationTargetPercent: Number(e.target.value) || 0
                  }))
                }
                className={`${formControlClassName} font-mono`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-dynamic-xs font-bold text-muted">
                {t("ven.onboard.saud_actual")}
              </label>
              <input aria-label={t("ven.onboard.saud_actual")}
                type="number"
                value={vendorForm.saudizationActualPercent}
                onChange={(e) =>
                  setVendorForm((p) => ({
                    ...p,
                    saudizationActualPercent: Number(e.target.value) || 0
                  }))
                }
                className={`${formControlClassName} font-mono`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-dynamic-xs font-bold text-muted">
                {t("ven.onboard.headcount")}
              </label>
              <input aria-label={t("ven.onboard.headcount")}
                type="number"
                value={vendorForm.suppliedContractorsCount}
                onChange={(e) =>
                  setVendorForm((p) => ({
                    ...p,
                    suppliedContractorsCount: Number(e.target.value) || 0
                  }))
                }
                className={`${formControlClassName} font-mono`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-dynamic-xs font-bold text-muted">
                {t("ven.onboard.retainer")}
              </label>
              <input aria-label={t("ven.onboard.retainer")}
                type="number"
                value={vendorForm.monthlyRetainerSar}
                onChange={(e) =>
                  setVendorForm((p) => ({
                    ...p,
                    monthlyRetainerSar: Number(e.target.value) || 0
                  }))
                }
                className={`${formControlClassName} font-mono`}
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-theme">
            <button
              type="button"
              onClick={handleRegisterVendor}
              className={primaryButtonClass}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{t("ven.onboard.commit_btn")}</span>
            </button>
          </div>
        </div>
        </TabPanel>

      {/* 360° VENDOR MOCI CR, CHAMBER & SAUDIZATION SLA AUDIT MODAL */}
      {selectedAuditVendor && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div ref={vendorAuditDialogRef} role="dialog" aria-modal="true" aria-labelledby="vendor-audit-dialog-title" tabIndex={-1} className="bg-surface border-2 border-primary rounded-2xl max-w-2xl w-full p-4 shadow-shell space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-theme pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-primary-soft text-primary-text font-mono font-bold text-dynamic-xs">
                  {selectedAuditVendor.id} •{" "}
                  {selectedAuditVendor.chamberOfCommerceId}
                </span>
                <h2 id="vendor-audit-dialog-title" className="text-dynamic-xl font-extrabold text-foreground pt-1">
                  {t("ven.audit.title")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditVendorId(null)}
                title={t("doc.action.close")}
                aria-label={t("doc.action.close")}
                className={iconButtonClass}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {auditToast && (
              <div className="p-3.5 rounded-xl bg-success-soft border border-success text-success-text font-bold text-dynamic-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{t("ven.audit.Toast")}</span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-surface-elevated border border-theme space-y-2">
              <div className="text-dynamic-base font-bold text-foreground">
                {selectedAuditVendor.companyName.en}
              </div>
              <div
                dir="rtl"
                className="text-dynamic-base font-bold text-foreground"
              >
                {selectedAuditVendor.companyName.ar}
              </div>
              <div className="text-dynamic-xs font-mono text-muted pt-1">
                {t("ven.cr_short")}:{" "}
                {selectedAuditVendor.commercialRegistrationCr} •{" "}
                {t("ven.exp_short")}: {selectedAuditVendor.crExpiryDate} •{" "}
                {t("ven.vat_short")}: {selectedAuditVendor.vatRegistrationNumber}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-surface-elevated border border-theme space-y-2">
                <div className="text-dynamic-xs text-muted">
                  {t("ven.col.saudization")}
                </div>
                <div className="text-dynamic-lg font-extrabold text-foreground font-mono">
                  {selectedAuditVendor.saudizationActualPercent}% /{" "}
                  {selectedAuditVendor.saudizationTargetPercent}%
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleBoostVendorSaudization(selectedAuditVendor)
                  }
                  className="inline-flex min-h-10 items-center justify-center gap-2 bg-primary px-3 py-2 text-on-primary font-bold text-dynamic-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>{t("ven.audit.boost_saud_btn")}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-surface-elevated border border-theme space-y-2">
                <div className="text-dynamic-xs text-muted">
                  {t("ven.onboard.cr_expiry")}
                </div>
                <div className="text-dynamic-lg font-extrabold text-foreground font-mono">
                  {selectedAuditVendor.crExpiryDate}
                </div>
                <button
                  type="button"
                  onClick={() => handleRenewVendorCr(selectedAuditVendor)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 bg-success px-3 py-2 text-on-success font-bold text-dynamic-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t("ven.audit.renew_cr_btn")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
