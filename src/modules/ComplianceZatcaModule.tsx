import React, { useState, useEffect, useRef, useMemo } from "react";
import QRCode from "qrcode";
import {
  Scale,
  QrCode,
  Clock,
  Landmark,
  Calculator,
  FileCheck2,
  Hash,
  KeyRound,
  Moon,
  Code2,
  PlusCircle,
  UserCheck,
  X,
  ShieldCheck
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { iconButtonClass, PageHeader, primaryButtonClass, secondaryButtonClass, SegmentedTabs, TabPanel } from "@/components/DesignSystem";
import { useRBACGeofence } from "@/context/RBACGeofenceContext";
import {
  KSA_LABOR_LAW_CONSTANTS,
  calculateKsaOvertime,
  calculateGosiContributions,
  calculateKsaEOSB,
  calculateVatAmountSar,
  roundSarToHalala,
  TerminationReasonType,
  ZatcaPhase2InvoiceBlueprint,
  EmployeeRecordBlueprint,
  decodeZatcaTlvHexArray,
  tlvHexArrayToBase64,
  buildZatcaTlvHexArray
} from "@/data/mockBlueprints";

/**
 * Invoice QR payload preview. Accepts pre-computed Tag-Length-Value (TLV)
 * hexadecimal segments and renders only a validated byte stream.
 */
export const ZatcaTlvQrCanvas: React.FC<{ tlvHexArray: string[] }> = ({
  tlvHexArray
}) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { base64TlvPayload, invalidTlvPayload } = useMemo(() => {
    try {
      return { base64TlvPayload: tlvHexArrayToBase64(tlvHexArray), invalidTlvPayload: false };
    } catch {
      return { base64TlvPayload: "", invalidTlvPayload: true };
    }
  }, [tlvHexArray]);
  const [qrRenderFailed, setQrRenderFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context?.clearRect(0, 0, canvas.width, canvas.height);
    if (invalidTlvPayload || !base64TlvPayload) {
      setQrRenderFailed(false);
      return;
    }

    let cancelled = false;
    setQrRenderFailed(false);
    QRCode.toCanvas(canvas, base64TlvPayload, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0f172a",
        light: "#ffffff"
      }
    }).then(() => {
      if (!cancelled) setQrRenderFailed(false);
    }).catch(() => {
      context?.clearRect(0, 0, canvas.width, canvas.height);
      if (!cancelled) setQrRenderFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [base64TlvPayload, invalidTlvPayload]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="p-3 rounded-2xl bg-surface border-2 border-primary shadow-card inline-block">
        <canvas
          ref={canvasRef}
          width={200}
          height={200}
          className="rounded-lg block"
        />
      </div>
      <div className="w-full max-w-xs p-2 bg-surface-elevated border border-theme text-center">
        <div className="text-dynamic-xs font-mono text-muted break-all">
          {invalidTlvPayload
            ? t("zatca.qr.invalid_payload")
            : qrRenderFailed
              ? t("zatca.qr.render_error")
              : `${t("zatca.tlv_base64_label")}: ${base64TlvPayload}`}
        </div>
      </div>
    </div>
  );
};

const updateNonNegativeNumberInput = (
  rawValue: string,
  update: (value: number) => void
): void => {
  if (rawValue === "") {
    update(0);
    return;
  }
  const value = Number(rawValue);
  if (Number.isFinite(value) && value >= 0) update(value);
};

interface ComplianceZatcaModuleProps {
  employees?: EmployeeRecordBlueprint[];
  invoices: ZatcaPhase2InvoiceBlueprint[];
  selectedInvoiceNumber?: string;
  onAppendInvoice?: (newInv: ZatcaPhase2InvoiceBlueprint) => void;
}

export const ComplianceZatcaModule: React.FC<ComplianceZatcaModuleProps> = ({
  employees = [],
  invoices,
  selectedInvoiceNumber,
  onAppendInvoice
}) => {
  const { t, localize, formatCurrencySAR } = useLanguage();
  const { moduleToggles, toggleAppModule } = useRBACGeofence();

  const [activeTab, setActiveTab] = useState<"labor_law" | "zatca_phase2">(
    selectedInvoiceNumber ? "zatca_phase2" : "labor_law"
  );
  const visibleTab =
    activeTab === "labor_law" && moduleToggles.laborLawEngineEnabled
      ? "labor_law"
      : activeTab === "zatca_phase2" && moduleToggles.zatcaPhase2Enabled
        ? "zatca_phase2"
        : moduleToggles.laborLawEngineEnabled
          ? "labor_law"
          : "zatca_phase2";

  useEffect(() => {
    if (selectedInvoiceNumber) {
      setActiveTab("zatca_phase2");
    }
  }, [selectedInvoiceNumber]);

  // Employee Auto-Bind State
  const [boundEmployeeId, setBoundEmployeeId] = useState<string>("CUSTOM");

  // 1. Overtime Engine Interactive State
  const [otBasicSalary, setOtBasicSalary] = useState<number>(18000);
  const [otStandardHours, setOtStandardHours] = useState<number>(12);
  const [otHolidayHours, setOtHolidayHours] = useState<number>(8);

  const otResult = useMemo(
    () => calculateKsaOvertime(otBasicSalary, otStandardHours, otHolidayHours),
    [otBasicSalary, otStandardHours, otHolidayHours]
  );

  // 2. Conditional GOSI Interactive State
  const [gosiIsSaudi, setGosiIsSaudi] = useState<boolean>(true);
  const [gosiBasicSalary, setGosiBasicSalary] = useState<number>(20000);
  const [gosiHousingAllowance, setGosiHousingAllowance] = useState<number>(5000);

  const gosiResult = useMemo(
    () =>
      calculateGosiContributions(
        gosiIsSaudi,
        gosiBasicSalary,
        gosiHousingAllowance
      ),
    [gosiIsSaudi, gosiBasicSalary, gosiHousingAllowance]
  );

  // 3. EOSB Calculator Interactive State
  const [eosbGrossWage, setEosbGrossWage] = useState<number>(25000);
  const [eosbYears, setEosbYears] = useState<number>(7.5);
  const [eosbReason, setEosbReason] =
    useState<TerminationReasonType>("RESIGNATION");

  const eosbResult = useMemo(
    () => calculateKsaEOSB(eosbGrossWage, eosbYears, eosbReason),
    [eosbGrossWage, eosbYears, eosbReason]
  );

  const handleBindEmployee = (empId: string) => {
    setBoundEmployeeId(empId);
    if (empId === "CUSTOM") return;
    const found = employees.find((e) => e.id === empId);
    if (!found) return;
    const gross =
      found.basicSalarySar +
      found.housingAllowanceSar +
      found.transportAllowanceSar;
    setOtBasicSalary(found.basicSalarySar);
    setGosiIsSaudi(found.isSaudiNational);
    setGosiBasicSalary(found.basicSalarySar);
    setGosiHousingAllowance(found.housingAllowanceSar);
    setEosbGrossWage(gross);
  };

  // 4. ZATCA Phase 2 Invoice State & Modals
  const [activeInvoiceNo, setActiveInvoiceNo] = useState<string>(
    selectedInvoiceNumber || invoices[0].invoiceNumber
  );
  const [ublXmlModalOpen, setUblXmlModalOpen] = useState<boolean>(false);
  const [tlvBuilderModalOpen, setTlvBuilderModalOpen] = useState<boolean>(false);

  // Live Custom TLV Invoice Studio State
  const [builderForm, setBuilderForm] = useState({
    supplierNameEn: "Diriyah Digital Defense & SecOps Co.",
    supplierNameAr: "شركة الدرعية للدفاع الرقمي والعمليات الأمنية",
    supplierVatNumber: "310772819400003",
    descriptionEn: "ZATCA Phase 2 Cryptographic HSM & Qiwa API Gateway Retainer",
    descriptionAr: "إدارة وحدات التشفير للمرحلة الثانية وبوابة الربط مع منصة قوى",
    taxableSubtotalSar: 240000
  });

  useEffect(() => {
    if (selectedInvoiceNumber) {
      setActiveInvoiceNo(selectedInvoiceNumber);
    }
  }, [selectedInvoiceNumber]);

  const activeInvoice = useMemo(
    () =>
      invoices.find((inv) => inv.invoiceNumber === activeInvoiceNo) || invoices[0],
    [invoices, activeInvoiceNo]
  );

  const decodedTlvFields = useMemo(
    () => decodeZatcaTlvHexArray(activeInvoice.tlvHexArray),
    [activeInvoice]
  );

  // Live Pre-Computed TLV Hex Array for the Studio Builder
  const liveStudioPreview = useMemo(() => {
    const subtotal = roundSarToHalala(Number(builderForm.taxableSubtotalSar) || 0);
    const vat = calculateVatAmountSar(subtotal);
    const grand = roundSarToHalala(subtotal + vat);
    const nextIcv =
      Math.max(...invoices.map((i) => i.invoiceCounterValueIcv)) + 1;
    const prevHash = invoices[0]?.currentCryptographicHash || "NWU0ZTg5YzI3Yjkx";
    const xmlHash = `sha256_icv_${nextIcv}_${builderForm.supplierVatNumber}`;
    const sig = `ECDSA_SIG_ICV_${nextIcv}_${grand}`;
    const stamp = `CSID-PROD-KSA-${builderForm.supplierVatNumber.slice(0, 10)}-V2`;
    const nowIso = "2026-10-02T14:20:00Z";
    let tlvHexArray: string[] = [];
    try {
      tlvHexArray = buildZatcaTlvHexArray({
        sellerName: `${builderForm.supplierNameEn} | ${builderForm.supplierNameAr}`,
        vatRegistrationNumber: builderForm.supplierVatNumber,
        timestampIso: nowIso,
        invoiceTotalWithVat: grand.toFixed(2),
        vatTotal: vat.toFixed(2),
        xmlInvoiceHash: xmlHash,
        ecdsaSignature: sig,
        cryptographicStampPublicKey: stamp
      });
    } catch {
      // Keep the editor usable but fail closed until all required TLV fields fit the format.
    }

    return {
      subtotal,
      vat,
      grand,
      nextIcv,
      prevHash,
      xmlHash,
      sig,
      stamp,
      nowIso,
      tlvHexArray,
      tlvValid: tlvHexArray.length === 8
    };
  }, [builderForm, invoices]);

  const handleEmitCustomTlvInvoice = () => {
    if (!import.meta.env.DEV || !onAppendInvoice) return;
    const {
      subtotal,
      vat,
      grand,
      nextIcv,
      prevHash,
      xmlHash,
      sig,
      stamp,
      nowIso,
      tlvHexArray,
      tlvValid
    } = liveStudioPreview;
    if (!tlvValid) return;

    const newInv: ZatcaPhase2InvoiceBlueprint = {
      invoiceNumber: `INV-ZATCA-2026-00${nextIcv}`,
      uuid: `f2a4b6c8-1d3e-4f5a-8b9c-${nextIcv}0192837465`,
      invoiceCounterValueIcv: nextIcv,
      previousInvoiceHashPih: prevHash,
      currentCryptographicHash: btoa(xmlHash),
      digitalSignatureEcdsa: btoa(sig),
      csidStampId: stamp,
      issueTimestampIso: nowIso,
      supplierNameEn: builderForm.supplierNameEn,
      supplierNameAr: builderForm.supplierNameAr,
      supplierVatNumber: builderForm.supplierVatNumber,
      supplierAddressEn: "King Salman Tech Park, Diriyah Gate, Riyadh, KSA",
      supplierAddressAr: "واحة الملك سلمان للتقنية، بوابة الدرعية، الرياض",
      buyerNameEn: "NOOR Enterprise Holdings KSA (Closed Joint Stock)",
      buyerNameAr: "شركة نور القابضة للمشاريع السعودية (مساهمة مقفلة)",
      buyerVatNumber: "300918273600003",
      buyerAddressEn:
        "Parcel 4.08, King Abdullah Financial District, Riyadh 13519",
      buyerAddressAr: "القطعة 4.08، مركز الملك عبدالله المالي، الرياض 13519",
      lineItems: [
        {
          id: `LI-${nextIcv}`,
          descriptionEn: builderForm.descriptionEn,
          descriptionAr: builderForm.descriptionAr,
          quantity: 1,
          unitPriceSar: subtotal,
          vatRatePercent: 15,
          vatAmountSar: vat,
          lineTotalWithVatSar: grand
        }
      ],
      taxableSubtotalSar: subtotal,
      totalVatSar: vat,
      grandTotalSar: grand,
      tlvHexArray
    };

    onAppendInvoice(newInv);
    setActiveInvoiceNo(newInv.invoiceNumber);
    setTlvBuilderModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t("nav.group.company")}
        title={t("comp.header.title")}
        
        actions={(
          <SegmentedTabs
            id="compliance"
            ariaLabel={t("ui.view_switcher")}
            value={visibleTab}
            onChange={setActiveTab}
            items={[
              ...(moduleToggles.laborLawEngineEnabled
                ? [{ value: "labor_law" as const, label: t("comp.tab.labor_law"), icon: <Scale className="h-4 w-4" /> }]
                : []),
              ...(moduleToggles.zatcaPhase2Enabled
                ? [{ value: "zatca_phase2" as const, label: t("comp.tab.zatca_phase2"), icon: <QrCode className="h-4 w-4" /> }]
                : [])
            ]}
          />
        )}
      />

      {/* TAB 1: KSA LABOR LAW COMPLIANCE FRAMEWORK */}
      <TabPanel hidden={visibleTab !== "labor_law" || !moduleToggles.laborLawEngineEnabled} id="compliance-labor_law-panel" labelledBy={moduleToggles.laborLawEngineEnabled ? "compliance-labor_law-tab" : undefined}>
        <div className="space-y-4">
          {/* Working Hours, Ramadan Schedule & Employee Auto-Bind Bar */}
          <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-dynamic-base font-bold text-foreground">
                  {moduleToggles.ramadanModeEnabled
                    ? t("shell.ramadan_active")
                    : t("shell.standard_hours")}
                </div>
                <div className="text-dynamic-xs text-muted font-mono">
                  {t("comp.max_daily")}:{" "}
                  {moduleToggles.ramadanModeEnabled
                    ? KSA_LABOR_LAW_CONSTANTS.workingHours.ramadanDailyMaxHours
                    : KSA_LABOR_LAW_CONSTANTS.workingHours.standardDailyMaxHours}
                  h | {t("comp.max_weekly")}:{" "}
                  {moduleToggles.ramadanModeEnabled
                    ? KSA_LABOR_LAW_CONSTANTS.workingHours.ramadanWeeklyMaxHours
                    : KSA_LABOR_LAW_CONSTANTS.workingHours.standardWeeklyMaxHours}
                  h
                </div>
              </div>
            </div>

            {/* Active Employee Auto-Bind Dropdown */}
            <div className="lg:col-span-4 space-y-1">
              <label className="flex items-center gap-1.5 text-dynamic-xs font-bold text-muted">
                <UserCheck className="w-3.5 h-3.5 text-primary" />
                <span>{t("comp.autobind.label")}</span>
              </label>
              <select aria-label={t("comp.autobind.label")}
                value={boundEmployeeId}
                onChange={(e) => handleBindEmployee(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-xs font-semibold"
              >
                <option value="CUSTOM">{t("comp.autobind.custom")}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {localize(emp.name)} ({emp.id} •{" "}
                    {emp.isSaudiNational ? "Saudi 10%/10%" : "Expat 2%"})
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3 flex lg:justify-end">
              <button
                type="button"
                onClick={() => toggleAppModule("ramadanModeEnabled")}
                className={`w-full lg:w-auto px-4 py-2.5 rounded-xl font-semibold text-dynamic-xs border transition ${
                  moduleToggles.ramadanModeEnabled
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface-elevated text-foreground border-theme hover:border-primary"
                }`}
              >
                {t("comp.ramadan_toggle")}
              </button>
            </div>
          </div>

          {/* 3 Statutory Engines Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Engine A: Article 107 Overtime Calculator */}
            <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
              <div className="flex items-center gap-2.5 border-b border-theme pb-3">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="text-dynamic-base font-bold text-foreground">
                    {t("comp.ot.title")}
                  </h2>
                  <p className="text-dynamic-xs text-muted">
                    {t("comp.ot.formula_note")}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-dynamic-xs font-bold text-muted pb-1">
                    {t("comp.ot.basic_salary")}
                  </label>
                  <input aria-label={t("comp.ot.basic_salary")}
                    type="number"
                    min="0"
                    step="0.01"
                    value={otBasicSalary}
                    onChange={(e) => updateNonNegativeNumberInput(e.target.value, setOtBasicSalary)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-dynamic-xs font-bold text-muted pb-1">
                      {t("comp.ot.standard_hours")}
                    </label>
                    <input aria-label={t("comp.ot.standard_hours")}
                      type="number"
                      min="0"
                      step="0.25"
                      value={otStandardHours}
                      onChange={(e) => updateNonNegativeNumberInput(e.target.value, setOtStandardHours)}
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-dynamic-xs font-bold text-muted pb-1">
                      {t("comp.ot.holiday_hours")}
                    </label>
                    <input aria-label={t("comp.ot.holiday_hours")}
                      type="number"
                      min="0"
                      step="0.25"
                      value={otHolidayHours}
                      onChange={(e) => updateNonNegativeNumberInput(e.target.value, setOtHolidayHours)}
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-elevated border border-theme space-y-2">
                <div className="flex items-center justify-between text-dynamic-xs">
                  <span className="text-muted">{t("comp.ot.hourly_rate")}</span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrencySAR(otResult.hourlyBasicRate)} / hr
                  </span>
                </div>
                <div className="flex items-center justify-between text-dynamic-xs">
                  <span className="text-muted">{t("comp.ot.std_payout")}</span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrencySAR(otResult.standardOvertimePay)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-dynamic-xs">
                  <span className="text-muted">
                    {t("comp.ot.hol_base_part")}
                  </span>
                  <span className="font-mono text-foreground">
                    {formatCurrencySAR(otResult.holidayBaseOvertimePay)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-dynamic-xs">
                  <span className="text-muted">
                    {t("comp.ot.hol_mod_part")}
                  </span>
                  <span className="font-mono text-warning">
                    +{formatCurrencySAR(otResult.holidayPremiumSupplementPay)}
                  </span>
                </div>
                <div className="border-t border-theme pt-2 flex items-center justify-between">
                  <span className="text-dynamic-sm font-bold text-primary">
                    {t("comp.ot.total_payout")}
                  </span>
                  <span className="text-dynamic-lg font-extrabold text-primary">
                    {formatCurrencySAR(otResult.grandTotalOvertimePay)}
                  </span>
                </div>
              </div>
            </div>

            {/* Engine B: Conditional GOSI Contribution Schema */}
            <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
              <div className="flex items-center gap-2.5 border-b border-theme pb-3">
                <Landmark className="w-5 h-5 text-accent" />
                <div>
                  <h2 className="text-dynamic-base font-bold text-foreground">
                    {t("comp.gosi.title")}
                  </h2>
                  <p className="text-dynamic-xs text-muted">
                    {localize(
                      gosiIsSaudi
                        ? KSA_LABOR_LAW_CONSTANTS.gosiRates.SAUDI.description
                        : KSA_LABOR_LAW_CONSTANTS.gosiRates.EXPAT.description
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-dynamic-xs font-bold text-muted pb-1">
                    {t("comp.gosi.nationality")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGosiIsSaudi(true)}
                      className={`py-2 px-3 rounded-xl font-bold text-dynamic-xs border transition ${
                        gosiIsSaudi
                          ? "bg-primary text-on-primary border-primary"
                          : "bg-surface-elevated text-foreground border-theme"
                      }`}
                    >
                      {t("emp.badge.saudi")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGosiIsSaudi(false)}
                      className={`py-2 px-3 rounded-xl font-bold text-dynamic-xs border transition ${
                        !gosiIsSaudi
                          ? "bg-primary text-on-primary border-primary"
                          : "bg-surface-elevated text-foreground border-theme"
                      }`}
                    >
                      {t("emp.badge.expat")}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-dynamic-xs font-bold text-muted pb-1">
                      {t("wiz.field.basic_salary")}
                    </label>
                    <input aria-label={t("wiz.field.basic_salary")}
                      type="number"
                      min="0"
                      step="0.01"
                      value={gosiBasicSalary}
                      onChange={(e) => updateNonNegativeNumberInput(e.target.value, setGosiBasicSalary)}
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-dynamic-xs font-bold text-muted pb-1">
                      {t("wiz.field.housing")}
                    </label>
                    <input aria-label={t("wiz.field.housing")}
                      type="number"
                      min="0"
                      step="0.01"
                      value={gosiHousingAllowance}
                      onChange={(e) => updateNonNegativeNumberInput(e.target.value, setGosiHousingAllowance)}
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-elevated border border-theme space-y-2">
                <div className="flex items-center justify-between text-dynamic-xs">
                  <span className="text-muted">{t("comp.gosi.wage_base")}</span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrencySAR(gosiResult.contributoryWageBase)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-dynamic-xs">
                  <span className="text-muted">
                    {t("comp.gosi.emp_share")} ({gosiResult.employeeRatePercent}%)
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrencySAR(gosiResult.employeeDeductionSar)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-dynamic-xs">
                  <span className="text-muted">
                    {t("comp.gosi.co_share")} ({gosiResult.employerRatePercent}%)
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrencySAR(gosiResult.employerContributionSar)}
                  </span>
                </div>
                <div className="border-t border-theme pt-2 flex items-center justify-between">
                  <span className="text-dynamic-sm font-bold text-accent">
                    {t("comp.gosi.net_impact")}
                  </span>
                  <span className="text-dynamic-lg font-extrabold text-accent">
                    {formatCurrencySAR(gosiResult.totalGosiRemittanceSar)}
                  </span>
                </div>
              </div>
            </div>

            {/* Engine C: End-of-Service Benefits (EOSB) Calculator */}
            <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
              <div className="flex items-center gap-2.5 border-b border-theme pb-3">
                <Calculator className="w-5 h-5 text-success" />
                <div>
                  <h2 className="text-dynamic-base font-bold text-foreground">
                    {t("comp.eosb.title")}
                  </h2>
                  <p className="text-dynamic-xs text-muted">
                    {t("comp.eosb.formula_note")}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-dynamic-xs font-bold text-muted pb-1">
                      {t("comp.eosb.wage")}
                    </label>
                    <input aria-label={t("comp.eosb.wage")}
                      type="number"
                      min="0"
                      step="0.01"
                      value={eosbGrossWage}
                      onChange={(e) => updateNonNegativeNumberInput(e.target.value, setEosbGrossWage)}
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-dynamic-xs font-bold text-muted pb-1">
                      {t("comp.eosb.years")}
                    </label>
                    <input aria-label={t("comp.eosb.years")}
                      type="number"
                      min="0"
                      step="0.5"
                      value={eosbYears}
                      onChange={(e) => updateNonNegativeNumberInput(e.target.value, setEosbYears)}
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-dynamic-xs font-bold text-muted pb-1">
                    {t("comp.eosb.reason")}
                  </label>
                  <select aria-label={t("comp.eosb.reason")}
                    value={eosbReason}
                    onChange={(e) =>
                      setEosbReason(e.target.value as TerminationReasonType)
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-xs"
                  >
                    <option value="LAYOFF_OR_EXPIRY">
                      {t("comp.eosb.reason.layoff")}
                    </option>
                    <option value="RESIGNATION">
                      {t("comp.eosb.reason.resignation")}
                    </option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-elevated border border-theme space-y-2">
                <div className="flex items-center justify-between text-dynamic-xs">
                  <span className="text-muted">{t("comp.eosb.first_5")}</span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrencySAR(eosbResult.firstFiveYearsAward)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-dynamic-xs">
                  <span className="text-muted">{t("comp.eosb.after_5")}</span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrencySAR(eosbResult.subsequentYearsAward)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-dynamic-xs">
                  <span className="text-muted">{t("comp.eosb.modifier")}</span>
                  <span className="font-mono font-bold text-warning">
                    {eosbResult.statutoryModifierPercent}%
                  </span>
                </div>
                <div className="border-t border-theme pt-2 flex items-center justify-between">
                  <span className="text-dynamic-sm font-bold text-success">
                    {t("comp.eosb.final_award")}
                  </span>
                  <span className="text-dynamic-lg font-extrabold text-success">
                    {formatCurrencySAR(eosbResult.netPayableEosbSar)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Article 84 vs Article 85 EOSB Tiered Entitlement Comparison Matrix */}
          <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
            <h3 className="text-dynamic-base font-bold text-foreground">
              {t("comp.eosb.matrix_title")} ({formatCurrencySAR(eosbGrossWage)})
            </h3>
            <div role="region" aria-label={t("comp.eosb.matrix_title")} tabIndex={0} className="max-w-full overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
              <table className="min-w-[620px] w-full text-start border-collapse">
                <thead>
                  <tr className="bg-surface-elevated border-b border-theme text-muted text-dynamic-xs uppercase">
                    <th className="py-3 ps-4 pe-2 text-start font-bold">
                      {t("comp.eosb.col_tenure")}
                    </th>
                    <th className="py-3 px-2 text-end font-bold">
                      {t("comp.eosb.col_unadjusted")}
                    </th>
                    <th className="py-3 px-2 text-end font-bold">
                      {t("comp.eosb.col_resignation")}
                    </th>
                    <th className="py-3 ps-2 pe-4 text-end font-bold">
                      {t("comp.eosb.col_layoff")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme font-mono text-dynamic-xs">
                  {[1.5, 3.5, 7.5, 11.0].map((tenureYrs) => {
                    const resAward = calculateKsaEOSB(
                      eosbGrossWage,
                      tenureYrs,
                      "RESIGNATION"
                    );
                    const layAward = calculateKsaEOSB(
                      eosbGrossWage,
                      tenureYrs,
                      "LAYOFF_OR_EXPIRY"
                    );
                    return (
                      <tr
                        key={tenureYrs}
                        className="transition-colors hover:bg-primary-soft/30"
                      >
                        <td className="py-3 ps-4 pe-2 font-bold text-foreground">
                          {tenureYrs} Yrs
                        </td>
                        <td className="py-3 px-2 text-end text-muted">
                          {formatCurrencySAR(layAward.grossUnadjustedAward)}
                        </td>
                        <td className="py-3 px-2 text-end font-bold text-warning">
                          {formatCurrencySAR(resAward.netPayableEosbSar)} (
                          {resAward.statutoryModifierPercent}%)
                        </td>
                        <td className="py-3 ps-2 pe-4 text-end font-extrabold text-success">
                          {formatCurrencySAR(layAward.netPayableEosbSar)} (100%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </TabPanel>

      {/* TAB 2: ZATCA E-INVOICING PHASE 2 INTEGRATION MODULE */}
      <TabPanel hidden={visibleTab !== "zatca_phase2" || !moduleToggles.zatcaPhase2Enabled} id="compliance-zatca_phase2-panel" labelledBy={moduleToggles.zatcaPhase2Enabled ? "compliance-zatca_phase2-tab" : undefined}>
        <div className="space-y-4">
          <div role="note" className="border-s-4 border-warning bg-warning-soft px-4 py-3 text-dynamic-sm text-foreground">
            {t("zatca.sample_notice")}
          </div>
          {/* Action Strip: Select Invoice, Inspect Signed UBL 2.1 XML, or Open Live TLV Builder */}
          <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1 sm:min-w-[240px]">
              <select
                aria-label={t("zatca.invoice_selector")}
                value={activeInvoice.invoiceNumber}
                onChange={(e) => setActiveInvoiceNo(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
              >
                {invoices.map((inv) => (
                  <option key={inv.invoiceNumber} value={inv.invoiceNumber}>
                    {inv.invoiceNumber} (ICV #{inv.invoiceCounterValueIcv}) —{" "}
                    {inv.supplierNameEn} ({formatCurrencySAR(inv.grandTotalSar)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setUblXmlModalOpen(true)}
                className={secondaryButtonClass}
              >
                <Code2 className="w-4 h-4 text-accent" />
                <span>{t("zatca.btn.ubl_xml")}</span>
              </button>

              {onAppendInvoice && import.meta.env.DEV && (
                <button
                  type="button"
                  onClick={() => setTlvBuilderModalOpen(true)}
                  className={primaryButtonClass}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t("zatca.btn.new_invoice")}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            {/* Left 5 Cols: Cryptographic Envelope + TLV QR Matrix */}
            <div className="xl:col-span-5 space-y-4">
              <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-4">
                {/* TLV QR Canvas Component */}
                <div className="text-center space-y-2">
                  <div className="text-dynamic-sm font-bold text-foreground">
                    {t("zatca.qr_title")}
                  </div>
                  <p className="text-dynamic-xs text-muted">
                    {t("zatca.qr_subtitle")}
                  </p>
                  <ZatcaTlvQrCanvas tlvHexArray={activeInvoice.tlvHexArray} />
                </div>

                {/* Phase 2 Cryptographic Fields */}
                <div className="space-y-2.5 pt-3 border-t border-theme">
                  <div className="text-dynamic-xs font-bold text-primary uppercase tracking-wider">
                    {t("zatca.phase2_telemetry")}
                  </div>

                  <div className="p-3 rounded-xl bg-surface-elevated border border-theme space-y-1">
                    <div className="flex items-center justify-between text-dynamic-xs text-muted">
                      <span>{t("zatca.uuid")}</span>
                      <span>
                        {t("zatca.icv")}: #{activeInvoice.invoiceCounterValueIcv}
                      </span>
                    </div>
                    <div className="font-mono text-dynamic-xs font-bold text-foreground break-all">
                      {activeInvoice.uuid}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-elevated border border-theme space-y-1">
                    <div className="flex items-center gap-1.5 text-dynamic-xs text-muted">
                      <Hash className="w-3.5 h-3.5 text-primary" />
                      <span>{t("zatca.pih")}</span>
                    </div>
                    <div className="font-mono text-dynamic-xs text-foreground break-all">
                      {activeInvoice.previousInvoiceHashPih}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-elevated border border-theme space-y-1">
                    <div className="flex items-center gap-1.5 text-dynamic-xs text-muted">
                      <FileCheck2 className="w-3.5 h-3.5 text-success" />
                      <span>{t("zatca.hash")}</span>
                    </div>
                    <div className="font-mono text-dynamic-xs text-foreground break-all">
                      {activeInvoice.currentCryptographicHash}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-elevated border border-theme space-y-1">
                    <div className="flex items-center gap-1.5 text-dynamic-xs text-muted">
                      <KeyRound className="w-3.5 h-3.5 text-accent" />
                      <span>{t("zatca.signature")}</span>
                    </div>
                    <div className="font-mono text-dynamic-xs text-foreground break-all">
                      {activeInvoice.digitalSignatureEcdsa}
                    </div>
                  </div>
                </div>
              </div>

              {/* TLV Hexadecimal Array Inspector */}
              <div className="bg-surface border border-theme rounded-2xl p-4 shadow-card space-y-3">
                <h3 className="text-dynamic-sm font-bold text-foreground">
                  {t("zatca.tlv_inspector")}
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto pe-1">
                  {decodedTlvFields.map((field) => (
                    <div
                      key={field.tag}
                      className="p-2.5 rounded-xl bg-surface-elevated border border-theme space-y-1"
                    >
                      <div className="flex items-center justify-between text-dynamic-xs">
                        <span className="font-bold text-primary">
                          {localize(field.tagLabel)}
                        </span>
                        <span className="font-mono text-muted">
                          {t("zatca.len_short")}: {field.byteLength}B
                        </span>
                      </div>
                      <div className="text-dynamic-xs text-foreground font-medium break-all">
                        {field.utf8Value}
                      </div>
                      <div className="text-dynamic-xs font-mono text-muted break-all">
                        {t("zatca.hex_short")}: {field.hexSegment}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 7 Cols: Simultaneous Dual-Language English & Arabic Tax Invoice Blueprint */}
            <div className="xl:col-span-7 bg-surface border-2 border-primary rounded-2xl p-4 shadow-card space-y-4">
              {/* Dual-Language Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-theme pb-5">
                <div className="space-y-1">
                  <div className="inline-block px-3 py-1 rounded-full bg-primary text-on-primary font-bold text-dynamic-xs">
                    {t("zatca.invoice_badge")}
                  </div>
                  <h2 className="text-dynamic-xl font-extrabold text-foreground pt-1">
                    {t("zatca.bilingual_invoice")}
                  </h2>
                  <div className="text-dynamic-xs font-mono text-muted">
                    #{activeInvoice.invoiceNumber} • {t("zatca.timestamp")}:{" "}
                    {activeInvoice.issueTimestampIso}
                  </div>
                </div>

                <div className="text-end font-mono">
                  <div className="text-dynamic-xs text-muted">
                    {t("zatca.csid_label")}
                  </div>
                  <div className="text-dynamic-sm font-bold text-primary">
                    {activeInvoice.csidStampId}
                  </div>
                </div>
              </div>

              {/* Simultaneous Bilingual Supplier & Buyer Blocks (Side-by-Side EN & AR) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supplier Block */}
                <div className="p-4 rounded-xl bg-surface-elevated border border-theme space-y-2">
                  <div className="text-dynamic-xs font-bold text-primary uppercase">
                    {t("zatca.supplier")}
                  </div>
                  <div className="text-dynamic-sm font-bold text-foreground">
                    {activeInvoice.supplierNameEn}
                  </div>
                  <div
                    dir="rtl"
                    className="text-dynamic-sm font-bold text-foreground border-t border-theme pt-1"
                  >
                    {activeInvoice.supplierNameAr}
                  </div>
                  <div className="text-dynamic-xs text-muted">
                    {activeInvoice.supplierAddressEn}
                  </div>
                  <div dir="rtl" className="text-dynamic-xs text-muted">
                    {activeInvoice.supplierAddressAr}
                  </div>
                  <div className="pt-1 font-mono text-dynamic-xs font-bold text-accent">
                    {t("zatca.vat_no")}: {activeInvoice.supplierVatNumber}
                  </div>
                </div>

                {/* Buyer Block */}
                <div className="p-4 rounded-xl bg-surface-elevated border border-theme space-y-2">
                  <div className="text-dynamic-xs font-bold text-primary uppercase">
                    {t("zatca.buyer")}
                  </div>
                  <div className="text-dynamic-sm font-bold text-foreground">
                    {activeInvoice.buyerNameEn}
                  </div>
                  <div
                    dir="rtl"
                    className="text-dynamic-sm font-bold text-foreground border-t border-theme pt-1"
                  >
                    {activeInvoice.buyerNameAr}
                  </div>
                  <div className="text-dynamic-xs text-muted">
                    {activeInvoice.buyerAddressEn}
                  </div>
                  <div dir="rtl" className="text-dynamic-xs text-muted">
                    {activeInvoice.buyerAddressAr}
                  </div>
                  <div className="pt-1 font-mono text-dynamic-xs font-bold text-accent">
                    {t("zatca.vat_no")}: {activeInvoice.buyerVatNumber}
                  </div>
                </div>
              </div>

              {/* Bilingual Line Items Table */}
              <div role="region" aria-label={t("zatca.line_item")} tabIndex={0} className="max-w-full overflow-x-auto overscroll-x-contain border border-theme rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
                <table className="min-w-[640px] w-full text-start border-collapse">
                  <thead>
                    <tr className="bg-surface-elevated border-b border-theme text-muted text-dynamic-xs">
                      <th className="py-3 ps-4 pe-2 text-start font-bold">
                        {t("zatca.line_item")}
                      </th>
                      <th className="py-3 px-2 text-center font-bold">
                        {t("zatca.qty")}
                      </th>
                      <th className="py-3 px-2 text-end font-bold">
                        {t("zatca.unit_price")}
                      </th>
                      <th className="py-3 px-2 text-end font-bold">
                        {t("zatca.vat_15")}
                      </th>
                      <th className="py-3 ps-2 pe-4 text-end font-bold">
                        {t("zatca.line_total")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme">
                    {activeInvoice.lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3.5 ps-4 pe-2">
                          <div className="text-dynamic-sm font-bold text-foreground">
                            {item.descriptionEn}
                          </div>
                          <div
                            dir="rtl"
                            className="text-dynamic-xs font-semibold text-muted pt-0.5"
                          >
                            {item.descriptionAr}
                          </div>
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono text-dynamic-sm text-foreground">
                          {item.quantity}
                        </td>
                        <td className="py-3.5 px-2 text-end font-mono text-dynamic-sm text-foreground">
                          {formatCurrencySAR(item.unitPriceSar)}
                        </td>
                        <td className="py-3.5 px-2 text-end font-mono text-dynamic-sm text-warning">
                          {formatCurrencySAR(item.vatAmountSar)}
                        </td>
                        <td className="py-3.5 ps-2 pe-4 text-end font-mono font-bold text-dynamic-sm text-foreground">
                          {formatCurrencySAR(item.lineTotalWithVatSar)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bilingual Totals Summary Block */}
              <div className="p-4 rounded-2xl bg-primary-soft border border-primary space-y-2.5">
                <div className="flex items-center justify-between text-dynamic-sm">
                  <span className="font-semibold text-foreground">
                    {t("zatca.subtotal")}
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrencySAR(activeInvoice.taxableSubtotalSar)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-dynamic-sm">
                  <span className="font-semibold text-foreground">
                    {t("zatca.total_vat")}
                  </span>
                  <span className="font-mono font-bold text-warning">
                    {formatCurrencySAR(activeInvoice.totalVatSar)}
                  </span>
                </div>

                <div className="border-t border-primary pt-3 flex items-center justify-between">
                  <span className="text-dynamic-lg font-extrabold text-primary">
                    {t("zatca.grand_total")}
                  </span>
                  <span className="text-dynamic-2xl font-extrabold font-mono text-primary">
                    {formatCurrencySAR(activeInvoice.grandTotalSar)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </TabPanel>

      {/* MODAL 1: ZATCA SIGNED OASIS UBL 2.1 XML ENVELOPE INSPECTOR */}
      {ublXmlModalOpen && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-primary rounded-2xl max-w-3xl w-full p-4 shadow-shell space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-theme pb-4">
              <div>
                <h2 className="text-dynamic-xl font-extrabold text-foreground">
                  {t("zatca.xml_modal.title")}
                </h2>
                <p className="text-dynamic-xs text-muted">
                  {t("zatca.xml_modal.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUblXmlModalOpen(false)}
                title={t("doc.action.close")}
                aria-label={t("doc.action.close")}
                className={iconButtonClass}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <pre role="region" aria-label={t("zatca.xml_modal.title")} tabIndex={0} className="max-w-full overflow-x-auto overscroll-x-contain p-4 rounded-xl bg-surface-elevated border border-theme font-mono text-dynamic-xs text-foreground leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
              {`<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${activeInvoice.invoiceNumber}</cbc:ID>
  <cbc:UUID>${activeInvoice.uuid}</cbc:UUID>
  <cbc:IssueDate>${activeInvoice.issueTimestampIso.slice(0, 10)}</cbc:IssueDate>
  <cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${activeInvoice.invoiceCounterValueIcv}</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${activeInvoice.previousInvoiceHashPih}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>QR</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${tlvHexArrayToBase64(activeInvoice.tlvHexArray)}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${activeInvoice.supplierNameEn} | ${activeInvoice.supplierNameAr}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${activeInvoice.supplierVatNumber}</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount currencyID="SAR">${activeInvoice.taxableSubtotalSar.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${activeInvoice.grandTotalSar.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">${activeInvoice.grandTotalSar.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`}
            </pre>
          </div>
        </div>
      )}

      {/* MODAL 2: LIVE ZATCA PHASE 2 INVOICE & TLV HEX ARRAY STUDIO */}
      {tlvBuilderModalOpen && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-primary rounded-2xl max-w-3xl w-full p-4 shadow-shell space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-theme pb-4">
              <div>
                <h2 className="text-dynamic-xl font-extrabold text-foreground">
                  {t("zatca.builder.title")}
                </h2>
                <p className="text-dynamic-xs text-muted">
                  {t("zatca.builder.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTlvBuilderModalOpen(false)}
                title={t("doc.action.close")}
                aria-label={t("doc.action.close")}
                className={iconButtonClass}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("zatca.builder.supplier_en")}
                </label>
                <input aria-label={t("zatca.builder.supplier_en")}
                  type="text"
                  value={builderForm.supplierNameEn}
                  onChange={(e) =>
                    setBuilderForm((p) => ({
                      ...p,
                      supplierNameEn: e.target.value
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("zatca.builder.supplier_ar")}
                </label>
                <input aria-label={t("zatca.builder.supplier_ar")}
                  type="text"
                  value={builderForm.supplierNameAr}
                  onChange={(e) =>
                    setBuilderForm((p) => ({
                      ...p,
                      supplierNameAr: e.target.value
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("zatca.builder.vat_no")}
                </label>
                <input aria-label={t("zatca.builder.vat_no")}
                  type="text"
                  maxLength={15}
                  value={builderForm.supplierVatNumber}
                  onChange={(e) =>
                    setBuilderForm((p) => ({
                      ...p,
                      supplierVatNumber: e.target.value
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("zatca.builder.subtotal")}
                </label>
                <input aria-label={t("zatca.builder.subtotal")}
                  type="number"
                  min="0"
                  step="0.01"
                  value={builderForm.taxableSubtotalSar}
                  onChange={(e) =>
                    updateNonNegativeNumberInput(e.target.value, (value) =>
                      setBuilderForm((p) => ({ ...p, taxableSubtotalSar: value }))
                    )
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("zatca.builder.desc_en")}
                </label>
                <input aria-label={t("zatca.builder.desc_en")}
                  type="text"
                  value={builderForm.descriptionEn}
                  onChange={(e) =>
                    setBuilderForm((p) => ({
                      ...p,
                      descriptionEn: e.target.value
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-dynamic-xs font-bold text-muted">
                  {t("zatca.builder.desc_ar")}
                </label>
                <input aria-label={t("zatca.builder.desc_ar")}
                  type="text"
                  value={builderForm.descriptionAr}
                  onChange={(e) =>
                    setBuilderForm((p) => ({
                      ...p,
                      descriptionAr: e.target.value
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm"
                />
              </div>
            </div>

            {/* Live Pre-Computed TLV Hex Array Preview & QR Canvas */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 rounded-2xl bg-surface-elevated border border-theme">
              <div className="md:col-span-5 flex justify-center">
                <ZatcaTlvQrCanvas
                  tlvHexArray={liveStudioPreview.tlvHexArray}
                />
              </div>
              <div className="md:col-span-7 space-y-2">
                <div className="text-dynamic-xs font-bold text-primary">
                  {t("zatca.builder.live_tlv_preview")}
                </div>
                <div className="space-y-1 font-mono text-dynamic-xs max-h-44 overflow-y-auto">
                  {liveStudioPreview.tlvHexArray.map((seg, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 rounded bg-surface border border-theme text-foreground break-all"
                    >
                      [Tag 0{idx + 1}] {seg}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-theme">
              <button
                type="button"
                onClick={handleEmitCustomTlvInvoice}
                disabled={!liveStudioPreview.tlvValid}
                className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{t("zatca.builder.emit_btn")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
