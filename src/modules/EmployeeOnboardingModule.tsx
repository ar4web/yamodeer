import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileBadge,
  Laptop,
  ShieldCheck,
  UserCheck,
  Wallet
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { calculateGosiContributions, EmployeeRecordBlueprint, NitaqatBand } from "@/data/mockBlueprints";
import { formControlClassName, primaryButtonClass, secondaryButtonClass, surfaceClassName } from "@/components/DesignSystem";

const createEmptyOnboardingForm = () => ({
  nameEn: "",
  nameAr: "",
  isSaudiNational: true,
  jobTitleEn: "",
  jobTitleAr: "",
  departmentCode: "FINTECH",
  nationalIdOrIqama: "",
  idExpiryDateGregorian: "",
  qiwaContractId: "",
  gosiNumber: "",
  passportAndMedical: "",
  basicSalarySar: 0,
  housingAllowanceSar: 0,
  transportAllowanceSar: 0,
  ibanNumber: "",
  laptopTag: "",
  smartBadgeId: "",
  corporateSim: "",
  vpnToken: ""
});

const readNonNegativeNumberInput = (rawValue: string): number | null => {
  if (rawValue === "") return 0;
  const value = Number(rawValue);
  return Number.isFinite(value) && value >= 0 ? value : null;
};
const normalizeKsaDigits = (value: string): string => value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
const normalizeEmployeeIdentity = (value: string): string => normalizeKsaDigits(value).replace(/[\s-]/g, "");

export const EmployeeOnboardingModule: React.FC<{
  isActive: boolean;
  employees: EmployeeRecordBlueprint[];
  onAddEmployee: (newEmp: EmployeeRecordBlueprint) => void;
  onNavigateToDirectory: () => void;
}> = ({ isActive, employees, onAddEmployee, onNavigateToDirectory }) => {
  const { t, formatCurrencySAR, direction } = useLanguage();

  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [wizardSuccess, setWizardSuccess] = useState(false);
  const [formState, setFormState] = useState(createEmptyOnboardingForm);

  useEffect(() => {
    if (!isActive) return;
    setFormState(createEmptyOnboardingForm());
    setWizardStep(1);
    setWizardSuccess(false);
  }, [isActive]);

  const isIdValid = useMemo(() => {
    const clean = normalizeKsaDigits(formState.nationalIdOrIqama.trim());
    if (!/^[12]\d{9}$/.test(clean)) return false;
    if (formState.isSaudiNational && !clean.startsWith("1")) return false;
    if (!formState.isSaudiNational && !clean.startsWith("2")) return false;
    return true;
  }, [formState.nationalIdOrIqama, formState.isSaudiNational]);

  const isIbanValid = useMemo(() => {
    const clean = formState.ibanNumber.trim().replace(/\s/g, "").toUpperCase();
    return /^SA\d{22}$/.test(clean);
  }, [formState.ibanNumber]);

  const normalizedOnboardingIdentity = normalizeEmployeeIdentity(formState.nationalIdOrIqama.trim());
  const isIdentityDuplicate = employees.some((employee) => normalizeEmployeeIdentity(employee.nationalIdOrIqama) === normalizedOnboardingIdentity);
  const isQiwaContractDuplicate = !!formState.qiwaContractId.trim() && employees.some((employee) => employee.qiwaContractId.toLocaleLowerCase() === formState.qiwaContractId.trim().toLocaleLowerCase());
  const expiryParts = formState.idExpiryDateGregorian.split("-").map(Number);
  const parsedExpiryDate = new Date(Date.UTC(expiryParts[0] || 0, (expiryParts[1] || 1) - 1, expiryParts[2] || 1));
  const isExpiryDateValid = /^\d{4}-\d{2}-\d{2}$/.test(formState.idExpiryDateGregorian) && parsedExpiryDate.toISOString().slice(0, 10) === formState.idExpiryDateGregorian;
  const housingAllowanceValid = Number.isFinite(Number(formState.housingAllowanceSar)) && Number(formState.housingAllowanceSar) >= 0;
  const transportAllowanceValid = Number.isFinite(Number(formState.transportAllowanceSar)) && Number(formState.transportAllowanceSar) >= 0;
  const missingNewHireFieldKeys = [
    !formState.nameEn.trim() ? "wiz.field.name_en" : null,
    !formState.nameAr.trim() ? "wiz.field.name_ar" : null,
    !formState.jobTitleEn.trim() ? "wiz.field.job_title_en" : null,
    !formState.jobTitleAr.trim() ? "wiz.field.job_title_ar" : null,
    !isIdValid ? "wiz.field.id_number" : null,
    !isExpiryDateValid ? "wiz.field.expiry_date" : null,
    !formState.gosiNumber.trim() ? "wiz.field.gosi_number" : null,
    !formState.qiwaContractId.trim() ? "wiz.field.qiwa_contract" : null,
    !(Number(formState.basicSalarySar) > 0) ? "wiz.field.basic_salary" : null,
    !housingAllowanceValid ? "wiz.field.housing" : null,
    !transportAllowanceValid ? "wiz.field.transport" : null,
    !isIbanValid ? "wiz.field.iban" : null
  ].filter((fieldKey): fieldKey is string => !!fieldKey);
  const canCommitNewHire = missingNewHireFieldKeys.length === 0 && !isIdentityDuplicate && !isQiwaContractDuplicate;

  const wizardGosiPreview = useMemo(
    () =>
      calculateGosiContributions(
        formState.isSaudiNational,
        Number(formState.basicSalarySar) || 0,
        Number(formState.housingAllowanceSar) || 0
      ),
    [formState.isSaudiNational, formState.basicSalarySar, formState.housingAllowanceSar]
  );

  const handleCommitNewHire = () => {
    if (!canCommitNewHire || isIdentityDuplicate || isQiwaContractDuplicate) return;
    const deptNames: Record<string, { en: string; ar: string }> = {
      HR_GOV: { en: "Executive HR & Governance", ar: "الموارد البشرية التنفيذية والحوكمة" },
      FINTECH: { en: "Digital Transformation & FinTech", ar: "التحول الرقمي والتقنية المالية" },
      PAYROLL: { en: "Payroll & Statutory Compliance", ar: "الرواتب والامتثال النظامي" },
      PROCURE: { en: "Procurement & Vendor Governance", ar: "المشتريات وحوكمة الموردين" }
    };
    const usedIds = new Set(employees.map((employee) => employee.id.toLocaleLowerCase()));
    const maxId = employees.reduce((maximum, employee) => {
      const match = /^EMP-KSA-(\d+)$/i.exec(employee.id);
      return match ? Math.max(maximum, Number(match[1])) : maximum;
    }, 1000);
    let sequence = maxId + 1;
    while (usedIds.has(`emp-ksa-${sequence}`)) sequence += 1;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const expiryParts = formState.idExpiryDateGregorian.split("-").map(Number);
    const expiryStart = new Date(expiryParts[0], expiryParts[1] - 1, expiryParts[2]).getTime();
    const diffDays = Math.ceil((expiryStart - todayStart) / 86_400_000);
    const cleanIban = formState.ibanNumber.replace(/\s/g, "").toUpperCase();
    const department = deptNames[formState.departmentCode] || deptNames.FINTECH;

    const newRecord: EmployeeRecordBlueprint = {
      id: `EMP-KSA-${sequence}`,
      name: { en: formState.nameEn.trim(), ar: formState.nameAr.trim() },
      isSaudiNational: formState.isSaudiNational,
      nationalityLabel: formState.isSaudiNational
        ? { en: "Saudi Arabia", ar: "المملكة العربية السعودية" }
        : { en: "Expat Resident (Iqama)", ar: "مقيم (إقامة عمل)" },
      nationalIdOrIqama: normalizedOnboardingIdentity,
      idExpiryDateGregorian: formState.idExpiryDateGregorian,
      idExpiryDateHijri: "",
      daysUntilExpiry: diffDays,
      jobTitle: { en: formState.jobTitleEn.trim(), ar: formState.jobTitleAr.trim() },
      department,
      departmentCode: formState.departmentCode,
      location: { en: "Riyadh KAFD HQ", ar: "الرياض — مقر كافد" },
      nitaqatClass: "PLATINUM" as NitaqatBand,
      gosiNumber: formState.gosiNumber.trim(),
      qiwaContractId: formState.qiwaContractId.trim(),
      basicSalarySar: Number(formState.basicSalarySar),
      housingAllowanceSar: Number(formState.housingAllowanceSar),
      transportAllowanceSar: Number(formState.transportAllowanceSar),
      ibanNumber: cleanIban,
      status: "ACTIVE",
      allocatedAssets: {
        laptopTag: formState.laptopTag.trim(),
        smartBadgeId: formState.smartBadgeId.trim(),
        corporateSim: formState.corporateSim.trim()
      }
    };

    onAddEmployee(newRecord);
    setWizardSuccess(true);
    setTimeout(() => {
      setWizardSuccess(false);
      setWizardStep(1);
      setFormState(createEmptyOnboardingForm());
      onNavigateToDirectory();
    }, 1800);
  };

  return (
    <div className="space-y-4">
      {/* Step Progress Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(
          [
            [1, "wiz.step1.title", "wiz.step1.desc", UserCheck],
            [2, "wiz.step2.title", "wiz.step2.desc", FileBadge],
            [3, "wiz.step3.title", "wiz.step3.desc", Wallet],
            [4, "wiz.step4.title", "wiz.step4.desc", Laptop]
          ] as const
        ).map(([stepNum, titleKey, descKey, StepIcon]) => {
          const isActive = wizardStep === stepNum;
          const isDone = wizardStep > stepNum;
          return (
            <button
              key={stepNum}
              type="button"
              aria-current={isActive ? "step" : undefined}
              onClick={() => setWizardStep(stepNum)}
              className={`p-4 rounded-xl border text-start transition flex items-start gap-3 ${
                isActive
                  ? "bg-primary-soft border-primary text-foreground"
                  : isDone
                  ? "bg-success-soft border-success text-foreground"
                  : "bg-surface-elevated border-theme text-muted"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? "bg-primary text-on-primary"
                    : isDone
                    ? "bg-success text-on-success"
                    : "bg-surface text-muted"
                }`}
              >
                <StepIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-dynamic-sm font-bold">{t(titleKey)}</div>
                <div className="text-dynamic-xs opacity-80">{t(descKey)}</div>
              </div>
            </button>
          );
        })}
      </div>

      {wizardSuccess && (
        <div className="p-4 rounded-xl bg-success-soft border border-success text-success-text font-bold text-dynamic-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{t("wiz.success_banner")}</span>
        </div>
      )}

      {/* Step 1: Personal Profile */}
      {wizardStep === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-dynamic-xs font-bold text-muted">
              {t("wiz.field.name_en")}
            </label>
            <input aria-label={t("wiz.field.name_en")}
              type="text"
              value={formState.nameEn}
              onChange={(e) =>
                setFormState((p) => ({ ...p, nameEn: e.target.value }))
              }
              className={formControlClassName}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-dynamic-xs font-bold text-muted">
              {t("wiz.field.name_ar")}
            </label>
            <input aria-label={t("wiz.field.name_ar")}
              type="text"
              value={formState.nameAr}
              onChange={(e) =>
                setFormState((p) => ({ ...p, nameAr: e.target.value }))
              }
              className={formControlClassName}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-dynamic-xs font-bold text-muted">
              {t("wiz.field.nationality")}
            </label>
            <select aria-label={t("wiz.field.nationality")}
              value={formState.isSaudiNational ? "SAUDI" : "EXPAT"}
              onChange={(e) => {
                const isSaudi = e.target.value === "SAUDI";
                setFormState((p) => ({
                  ...p,
                  isSaudiNational: isSaudi,
                  nationalIdOrIqama: ""
                }));
              }}
              className={formControlClassName}
            >
              <option value="SAUDI">{t("wiz.field.saudi_citizen")}</option>
              <option value="EXPAT">{t("wiz.field.expat_resident")}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-dynamic-xs font-bold text-muted">
              {t("wiz.field.department")}
            </label>
            <select aria-label={t("wiz.field.department")}
              value={formState.departmentCode}
              onChange={(e) =>
                setFormState((p) => ({ ...p, departmentCode: e.target.value }))
              }
              className={formControlClassName}
            >
              <option value="FINTECH">{t("dept.FINTECH")}</option>
              <option value="HR_GOV">{t("dept.HR_GOV")}</option>
              <option value="PAYROLL">{t("dept.PAYROLL")}</option>
              <option value="PROCURE">{t("dept.PROCURE")}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-dynamic-xs font-bold text-muted">
              {t("wiz.field.job_title_en")}
            </label>
            <input aria-label={t("wiz.field.job_title_en")}
              type="text"
              value={formState.jobTitleEn}
              onChange={(e) =>
                setFormState((p) => ({ ...p, jobTitleEn: e.target.value }))
              }
              className={formControlClassName}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-dynamic-xs font-bold text-muted">
              {t("wiz.field.job_title_ar")}
            </label>
            <input aria-label={t("wiz.field.job_title_ar")}
              type="text"
              value={formState.jobTitleAr}
              onChange={(e) =>
                setFormState((p) => ({ ...p, jobTitleAr: e.target.value }))
              }
              className={formControlClassName}
            />
          </div>
        </div>
      )}

      {/* Step 2: KSA Legal Documents with 10-Digit Prefix Validation */}
      {wizardStep === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-dynamic-xs font-bold text-muted">
              {t("wiz.field.id_number")}
            </label>
            <input aria-label={t("wiz.field.id_number")}
              type="text"
              maxLength={10}
              value={formState.nationalIdOrIqama}
              onChange={(e) =>
                setFormState((p) => ({
                  ...p,
                  nationalIdOrIqama: e.target.value
                }))
              }
              className={`w-full px-4 py-2.5 rounded-xl bg-surface-elevated border font-mono text-dynamic-sm text-foreground ${
                isIdValid ? "border-success" : "border-danger"
              }`}
            />
            <div
              className={`text-dynamic-xs font-semibold ${
                isIdValid && !isIdentityDuplicate ? "text-success-text" : "text-danger-text"
              }`}
            >
              {isIdentityDuplicate
                ? t("wiz.validation.identity_exists")
                : isIdValid
                  ? formState.isSaudiNational
                    ? t("wiz.validation.id_valid_saudi")
                    : t("wiz.validation.id_valid_expat")
                  : t("wiz.validation.id_invalid")}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-dynamic-xs font-bold text-muted">
              {t("wiz.field.expiry_date")}
            </label>
            <input aria-label={t("wiz.field.expiry_date")}
              type="date"
              value={formState.idExpiryDateGregorian}
              onChange={(e) =>
                setFormState((p) => ({
                  ...p,
                  idExpiryDateGregorian: e.target.value
                }))
              }
              className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-dynamic-xs font-bold text-muted">
              {t("wiz.field.qiwa_contract")}
            </label>
            <input aria-label={t("wiz.field.qiwa_contract")}
              type="text"
              value={formState.qiwaContractId}
              onChange={(e) =>
                setFormState((p) => ({ ...p, qiwaContractId: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
            />
            {isQiwaContractDuplicate && <div role="alert" className="text-dynamic-xs font-semibold text-danger-text">{t("wiz.validation.qiwa_exists")}</div>}
          </div>

          <div className="space-y-1.5">
            <label className="block text-dynamic-xs font-bold text-muted">
              {t("wiz.field.gosi_number")}
            </label>
            <input aria-label={t("wiz.field.gosi_number")}
              type="text"
              value={formState.gosiNumber}
              onChange={(e) =>
                setFormState((p) => ({ ...p, gosiNumber: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-dynamic-xs font-bold text-muted">
              {t("wiz.field.passport_no")}
            </label>
            <input aria-label={t("wiz.field.passport_no")}
              type="text"
              value={formState.passportAndMedical}
              onChange={(e) =>
                setFormState((p) => ({
                  ...p,
                  passportAndMedical: e.target.value
                }))
              }
              className={formControlClassName}
            />
          </div>
        </div>
      )}

      {/* Step 3: Compensation Structure */}
      {wizardStep === 3 && (
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-dynamic-xs font-bold text-muted">
                {t("wiz.field.basic_salary")}
              </label>
              <input aria-label={t("wiz.field.basic_salary")}
                type="number"
                min="0"
                step="0.01"
                value={formState.basicSalarySar}
                onChange={(e) => {
                  const basic = readNonNegativeNumberInput(e.target.value);
                  if (basic === null) return;
                  setFormState((p) => ({
                    ...p,
                    basicSalarySar: basic,
                    housingAllowanceSar: Math.round(basic * 0.25),
                    transportAllowanceSar: Math.round(basic * 0.1)
                  }));
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-dynamic-xs font-bold text-muted">
                {t("wiz.field.housing")}
              </label>
              <input aria-label={t("wiz.field.housing")}
                type="number"
                min="0"
                step="0.01"
                value={formState.housingAllowanceSar}
                onChange={(e) => {
                  const value = readNonNegativeNumberInput(e.target.value);
                  if (value === null) return;
                  setFormState((p) => ({ ...p, housingAllowanceSar: value }));
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-dynamic-xs font-bold text-muted">
                {t("wiz.field.transport")}
              </label>
              <input aria-label={t("wiz.field.transport")}
                type="number"
                min="0"
                step="0.01"
                value={formState.transportAllowanceSar}
                onChange={(e) => {
                  const value = readNonNegativeNumberInput(e.target.value);
                  if (value === null) return;
                  setFormState((p) => ({ ...p, transportAllowanceSar: value }));
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-dynamic-xs font-bold text-muted">
                {t("wiz.field.iban")}
              </label>
              <input aria-label={t("wiz.field.iban")}
                type="text"
                maxLength={24}
                value={formState.ibanNumber}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, ibanNumber: e.target.value }))
                }
                className={`w-full px-4 py-2.5 rounded-xl bg-surface-elevated border font-mono text-dynamic-sm text-foreground ${
                  isIbanValid ? "border-success" : "border-danger"
                }`}
              />
              <div
                className={`text-dynamic-xs font-semibold ${
                  isIbanValid ? "text-success-text" : "text-danger-text"
                }`}
              >
                {isIbanValid
                  ? t("wiz.validation.iban_valid")
                  : t("wiz.validation.iban_invalid")}
              </div>
            </div>
          </div>

          {/* Conditional GOSI Split Preview Box */}
          <div className="p-4 rounded-2xl bg-primary-soft border border-primary space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-dynamic-sm font-bold text-primary-text">
                {t("wiz.gosi_preview")}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-dynamic-xs font-bold">
                {formState.isSaudiNational
                  ? t("emp.badge.saudi")
                  : t("emp.badge.expat")}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-surface border border-theme">
                <div className="text-dynamic-xs text-muted">
                  {t("comp.gosi.emp_share")} ({wizardGosiPreview.employeeRatePercent}%)
                </div>
                <div className="text-dynamic-base font-extrabold text-foreground">
                  {formatCurrencySAR(wizardGosiPreview.employeeDeductionSar)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-theme">
                <div className="text-dynamic-xs text-muted">
                  {t("comp.gosi.co_share")} ({wizardGosiPreview.employerRatePercent}%)
                </div>
                <div className="text-dynamic-base font-extrabold text-foreground">
                  {formatCurrencySAR(wizardGosiPreview.employerContributionSar)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-theme">
                <div className="text-dynamic-xs text-muted">
                  {t("comp.gosi.net_impact")}
                </div>
                <div className="text-dynamic-base font-extrabold text-primary-text">
                  {formatCurrencySAR(wizardGosiPreview.totalGosiRemittanceSar)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Asset Allocation */}
      {wizardStep === 4 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-dynamic-xs font-bold text-muted">
              {t("wiz.field.laptop_tag")}
            </label>
            <input aria-label={t("wiz.field.laptop_tag")}
              type="text"
              value={formState.laptopTag}
              onChange={(e) =>
                setFormState((p) => ({ ...p, laptopTag: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-dynamic-xs font-bold text-muted">
              {t("wiz.field.badge_id")}
            </label>
            <input aria-label={t("wiz.field.badge_id")}
              type="text"
              value={formState.smartBadgeId}
              onChange={(e) =>
                setFormState((p) => ({ ...p, smartBadgeId: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-dynamic-xs font-bold text-muted">
              {t("wiz.field.sim_card")}
            </label>
            <input aria-label={t("wiz.field.sim_card")}
              type="text"
              value={formState.corporateSim}
              onChange={(e) =>
                setFormState((p) => ({ ...p, corporateSim: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-dynamic-xs font-bold text-muted">
              {t("wiz.field.vpn_token")}
            </label>
            <input aria-label={t("wiz.field.vpn_token")}
              type="text"
              value={formState.vpnToken}
              onChange={(e) =>
                setFormState((p) => ({ ...p, vpnToken: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground font-mono text-dynamic-sm"
            />
          </div>
        </div>
      )}

      {wizardStep === 4 && !canCommitNewHire && (
        <div role="alert" className="rounded-xl border border-warning bg-warning-soft px-4 py-3 text-dynamic-xs text-foreground space-y-1">
          <div className="font-bold">{t("wiz.validation.missing_fields")}</div>
          {!!missingNewHireFieldKeys.length && <div>{missingNewHireFieldKeys.map((fieldKey) => t(fieldKey)).join(" · ")}</div>}
          {isIdentityDuplicate && <div className="font-semibold text-danger-text">{t("wiz.validation.identity_exists")}</div>}
          {isQiwaContractDuplicate && <div className="font-semibold text-danger-text">{t("wiz.validation.qiwa_exists")}</div>}
        </div>
      )}

      {/* Wizard Navigation Footer */}
      <div className="flex items-center justify-between border-t border-theme pt-4">
        <button
          type="button"
          disabled={wizardStep === 1}
          onClick={() =>
            setWizardStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : 1))
          }
          className={secondaryButtonClass}
        >
          {direction === "rtl" ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
          <span>{t("wiz.btn.prev")}</span>
        </button>

        {wizardStep < 4 ? (
          <button
            type="button"
            onClick={() =>
              setWizardStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : 4))
            }
            className={primaryButtonClass}
          >
            <span>{t("wiz.btn.next")}</span>
            {direction === "rtl" ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled={!canCommitNewHire}
            onClick={handleCommitNewHire}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 bg-success px-4 py-2 text-dynamic-sm font-bold text-on-success transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t("wiz.btn.commit")}</span>
          </button>
        )}
      </div>
    </div>
  );
};
