import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { BilingualText } from "@/context/LanguageContext";

export type CorporateRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "HR_OPS"
  | "MANAGER"
  | "EMPLOYEE";

export type ModuleRouteKey =
  | "dashboard"
  | "work_hub"
  | "mail"
  | "chat"
  | "workspace"
  | "workflows"
  | "profile"
  | "employees"
  | "vendors"
  | "expenses"
  | "accounts"
  | "files"
  | "doc_maker"
  | "compliance"
  | "invoices"
  | "settings";

export type AtomicPermissionScope =
  | "route:dashboard"
  | "route:work_hub"
  | "route:mail"
  | "route:chat"
  | "route:workspace"
  | "route:workflows"
  | "route:profile"
  | "route:employees"
  | "route:vendors"
  | "route:expenses"
  | "route:accounts"
  | "route:files"
  | "route:doc_maker"
  | "route:compliance"
  | "route:invoices"
  | "invoice:create_draft"
  | "route:settings"
  | "system:multi_tenant_controls"
  | "system:app_store_toggles"
  | "system:raw_audit_logs"
  | "hr:directory_full_manage"
  | "hr:onboard_new_hire"
  | "hr:override_leave_tally"
  | "payroll:configure_constants"
  | "dept:manage_team_leave_ot"
  | "vendor:b2b_zatca_invoicing"
  | "self_service:isolated_dossier"
  | "self_service:geofence_punch";

export interface AtomicScopeMetadata {
  scope: AtomicPermissionScope;
  category: BilingualText;
  label: BilingualText;
}

export const ATOMIC_SCOPE_CATALOG: AtomicScopeMetadata[] = [
  {
    scope: "route:dashboard",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Access Executive / Self-Service Dashboard", ar: "الوصول للوحة القيادة التنفيذية / الذاتية" }
  },
  {
    scope: "route:work_hub",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Access personal tasks, reminders and notebooks", ar: "الوصول إلى المهام والتذكيرات والدفاتر الشخصية" }
  },
  {
    scope: "route:mail",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Access personal mailbox and mail assistant", ar: "الوصول إلى صندوق البريد الشخصي ومساعد البريد" }
  },
  {
    scope: "route:chat",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Access internal direct and team messaging", ar: "الوصول إلى المحادثات الداخلية والفِرق" }
  },
  {
    scope: "route:workspace",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Access shared projects, teams and meetings in Work Hub", ar: "الوصول إلى المشاريع والفرق والاجتماعات المشتركة في مركز العمل" }
  },
  {
    scope: "route:workflows",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Access workflow templates, approvals and local activity", ar: "الوصول إلى قوالب مسارات العمل والموافقات والنشاط المحلي" }
  },
  {
    scope: "route:profile",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Access personal demo profile and accessibility preferences", ar: "الوصول إلى الملف الشخصي التجريبي وتفضيلات إمكانية الوصول" }
  },
  {
    scope: "route:employees",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Mount Master Employee Directory Frame", ar: "فتح السجل الرئيسي للموظفين" }
  },
  {
    scope: "route:vendors",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Mount Vendor & Contractor B2B Portal", ar: "فتح بوابة الموردين والمقاولين" }
  },
  {
    scope: "route:expenses",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Mount Corporate Expense & VAT Claims Portal", ar: "فتح وحدة إدارة المصروفات والعهد المالية" }
  },
  {
    scope: "route:accounts",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Mount SOCPA General Ledger & Accounts Hub", ar: "فتح وحدة المحاسبة العامة وشجرة الحسابات" }
  },
  {
    scope: "route:files",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Mount SDAIA PDPL Encrypted Files Manager", ar: "فتح مدير الملفات والأرشيف المشفر" }
  },
  {
    scope: "route:doc_maker",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Mount Bilingual Enterprise Doc Maker Studio", ar: "فتح استوديو صانع المستندات والعقود ثنائي اللغة" }
  },
  {
    scope: "route:compliance",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Mount KSA Labor Law & ZATCA Phase 2 Hub", ar: "فتح مركز نظام العمل وزاتكا المرحلة 2" }
  },
  {
    scope: "route:invoices",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Access client invoices and draft workspace", ar: "الوصول إلى فواتير العملاء ومسوداتها" }
  },
  {
    scope: "route:settings",
    category: { en: "Module Routing", ar: "توجيه الوحدات" },
    label: { en: "Mount Revolutionary Control Matrix", ar: "فتح مصفوفة التحكم والإعدادات" }
  },
  {
    scope: "invoice:create_draft",
    category: { en: "Finance", ar: "المالية" },
    label: { en: "Create and save invoice drafts", ar: "إنشاء مسودات الفواتير وحفظها" }
  },
  {
    scope: "system:multi_tenant_controls",
    category: { en: "System Governance", ar: "حوكمة النظام" },
    label: { en: "Global Multi-Tenant & Database Controls", ar: "التحكم متعدد المستأجرين وقواعد البيانات" }
  },
  {
    scope: "system:app_store_toggles",
    category: { en: "System Governance", ar: "حوكمة النظام" },
    label: { en: "App Store Modular Component Activation", ar: "تفعيل وإيقاف الوحدات من متجر التطبيقات" }
  },
  {
    scope: "system:raw_audit_logs",
    category: { en: "System Governance", ar: "حوكمة النظام" },
    label: { en: "Inspect Raw Cryptographic & Geofence Audit Logs", ar: "فحص سجلات التدقيق الخام والأمان الجغرافي" }
  },
  {
    scope: "hr:directory_full_manage",
    category: { en: "HR & Directory", ar: "الموارد البشرية" },
    label: { en: "Restructure Departments & Full Directory Governance", ar: "هيكلة الإدارات والإدارة الكاملة للدليل" }
  },
  {
    scope: "hr:onboard_new_hire",
    category: { en: "HR & Directory", ar: "الموارد البشرية" },
    label: { en: "Execute 4-Step KSA Onboarding Wizard", ar: "تنفيذ معالج تعيين الموظفين الرباعي" }
  },
  {
    scope: "hr:override_leave_tally",
    category: { en: "HR & Directory", ar: "الموارد البشرية" },
    label: { en: "Override Statutory Leave Tallies & Balances", ar: "تعديل وتجاوز أرصدة الإجازات النظامية" }
  },
  {
    scope: "payroll:configure_constants",
    category: { en: "Payroll & Law", ar: "الرواتب والامتثال" },
    label: { en: "Modify Corporate Payroll & EOSB Constants", ar: "تعديل ثوابت الرواتب ومكافأة نهاية الخدمة" }
  },
  {
    scope: "dept:manage_team_leave_ot",
    category: { en: "Line Management", ar: "الإدارة المباشرة" },
    label: { en: "Approve Direct Report Leave & Department Overtime", ar: "اعتماد إجازات الفريق والعمل الإضافي للقسم" }
  },
  {
    scope: "vendor:b2b_zatca_invoicing",
    category: { en: "B2B & ZATCA", ar: "الفوترة والموردين" },
    label: { en: "Emit ZATCA Phase 2 B2B Tax Invoices", ar: "إصدار فواتير ضريبية للمرحلة الثانية (زاتكا)" }
  },
  {
    scope: "self_service:isolated_dossier",
    category: { en: "Self-Service", ar: "الخدمة الذاتية" },
    label: { en: "View Personal Dossier & Download WPS Payslips", ar: "عرض الملف الشخصي وتحميل مسيرات الرواتب" }
  },
  {
    scope: "self_service:geofence_punch",
    category: { en: "Self-Service", ar: "الخدمة الذاتية" },
    label: { en: "Execute Geofenced Attendance Clock-In/Out", ar: "تسجيل الحضور والانصراف عبر النطاق الجغرافي" }
  }
];

export const RBAC_ACCESS_MATRIX: Record<CorporateRole, Record<AtomicPermissionScope, boolean>> = {
  SUPER_ADMIN: {
    "route:dashboard": true,
    "route:work_hub": true,
    "route:mail": true,
    "route:chat": true,
    "route:workspace": true,
    "route:workflows": true,
    "route:profile": true,
    "route:employees": true,
    "route:vendors": true,
    "route:expenses": true,
    "route:invoices": true,
    "route:accounts": true,
    "route:files": true,
    "route:doc_maker": true,
    "route:compliance": true,
    "route:settings": true,
    "system:multi_tenant_controls": true,
    "system:app_store_toggles": true,
    "system:raw_audit_logs": true,
    "hr:directory_full_manage": true,
    "hr:onboard_new_hire": true,
    "hr:override_leave_tally": true,
    "payroll:configure_constants": true,
    "dept:manage_team_leave_ot": true,
    "vendor:b2b_zatca_invoicing": true,
    "invoice:create_draft": true,
    "self_service:isolated_dossier": true,
    "self_service:geofence_punch": true
  },
  ADMIN: {
    "route:dashboard": true,
    "route:work_hub": true,
    "route:mail": true,
    "route:chat": true,
    "route:workspace": true,
    "route:workflows": true,
    "route:profile": true,
    "route:employees": true,
    "route:vendors": true,
    "route:expenses": true,
    "route:invoices": true,
    "route:accounts": true,
    "route:files": true,
    "route:doc_maker": true,
    "route:compliance": true,
    "route:settings": true,
    "system:multi_tenant_controls": false,
    "system:app_store_toggles": false,
    "system:raw_audit_logs": true,
    "hr:directory_full_manage": true,
    "hr:onboard_new_hire": true,
    "hr:override_leave_tally": true,
    "payroll:configure_constants": true,
    "dept:manage_team_leave_ot": true,
    "vendor:b2b_zatca_invoicing": true,
    "invoice:create_draft": true,
    "self_service:isolated_dossier": true,
    "self_service:geofence_punch": true
  },
  HR_OPS: {
    "route:dashboard": true,
    "route:work_hub": true,
    "route:mail": true,
    "route:chat": true,
    "route:workspace": true,
    "route:workflows": true,
    "route:profile": true,
    "route:employees": true,
    "route:vendors": true,
    "route:expenses": true,
    "route:invoices": false,
    "route:accounts": false,
    "route:files": true,
    "route:doc_maker": true,
    "route:compliance": true,
    "route:settings": false,
    "system:multi_tenant_controls": false,
    "system:app_store_toggles": false,
    "system:raw_audit_logs": false,
    "hr:directory_full_manage": false,
    "hr:onboard_new_hire": true,
    "hr:override_leave_tally": false,
    "payroll:configure_constants": false,
    "dept:manage_team_leave_ot": true,
    "vendor:b2b_zatca_invoicing": false,
    "invoice:create_draft": false,
    "self_service:isolated_dossier": true,
    "self_service:geofence_punch": true
  },
  MANAGER: {
    "route:dashboard": true,
    "route:work_hub": true,
    "route:mail": true,
    "route:chat": true,
    "route:workspace": true,
    "route:workflows": true,
    "route:profile": true,
    "route:employees": true,
    "route:vendors": false,
    "route:expenses": true,
    "route:invoices": false,
    "route:accounts": false,
    "route:files": false,
    "route:doc_maker": true,
    "route:compliance": true,
    "route:settings": false,
    "system:multi_tenant_controls": false,
    "system:app_store_toggles": false,
    "system:raw_audit_logs": false,
    "hr:directory_full_manage": false,
    "hr:onboard_new_hire": false,
    "hr:override_leave_tally": false,
    "payroll:configure_constants": false,
    "dept:manage_team_leave_ot": true,
    "vendor:b2b_zatca_invoicing": false,
    "invoice:create_draft": false,
    "self_service:isolated_dossier": true,
    "self_service:geofence_punch": true
  },
  EMPLOYEE: {
    "route:dashboard": true,
    "route:work_hub": true,
    "route:mail": true,
    "route:chat": true,
    "route:workspace": true,
    "route:workflows": true,
    "route:profile": true,
    "route:employees": false,
    "route:vendors": false,
    "route:expenses": true,
    "route:invoices": false,
    "route:accounts": false,
    "route:files": false,
    "route:doc_maker": true,
    "route:compliance": false,
    "route:settings": false,
    "system:multi_tenant_controls": false,
    "system:app_store_toggles": false,
    "system:raw_audit_logs": false,
    "hr:directory_full_manage": false,
    "hr:onboard_new_hire": false,
    "hr:override_leave_tally": false,
    "payroll:configure_constants": false,
    "dept:manage_team_leave_ot": false,
    "vendor:b2b_zatca_invoicing": false,
    "invoice:create_draft": false,
    "self_service:isolated_dossier": true,
    "self_service:geofence_punch": true
  }
};

export interface OfficeGeofenceProfile {
  id: string;
  name: BilingualText;
  city: BilingualText;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
  maxAccuracyThresholdMeters: number;
}

export const KSA_OFFICE_PERIMETERS: OfficeGeofenceProfile[] = [
  {
    id: "HQ-RUH-KAFD",
    name: {
      en: "Riyadh KAFD Parcel 4.08 — Corporate HQ",
      ar: "الرياض — مركز الملك عبدالله المالي (كافد) برج 4"
    },
    city: { en: "Riyadh", ar: "الرياض" },
    latitude: 24.7648,
    longitude: 46.6416,
    allowedRadiusMeters: 50,
    maxAccuracyThresholdMeters: 15
  },
  {
    id: "BR-JED-CORN",
    name: {
      en: "Jeddah Red Sea Gate Tower — Western Hub",
      ar: "جدة — برج بوابة البحر الأحمر (القطاع الغربي)"
    },
    city: { en: "Jeddah", ar: "جدة" },
    latitude: 21.5433,
    longitude: 39.1728,
    allowedRadiusMeters: 60,
    maxAccuracyThresholdMeters: 15
  },
  {
    id: "BR-DMM-DTV",
    name: {
      en: "Dhahran Techno Valley — Energy & Industrial Hub",
      ar: "الظهران — وادي الظهران للتقنية (القطاع الشرقي)"
    },
    city: { en: "Dammam / Dhahran", ar: "الدمام / الظهران" },
    latitude: 26.3072,
    longitude: 50.1458,
    allowedRadiusMeters: 75,
    maxAccuracyThresholdMeters: 15
  }
];

export type GeofenceVerificationStatus =
  | "VERIFIED_INSIDE_ZONE"
  | "BLOCKED_GPS_ACCURACY_DRIFT"
  | "BLOCKED_OUTSIDE_RADIUS";

export interface GeofenceExceptionLogPayload {
  id: string;
  timestampIso: string;
  role: CorporateRole;
  officeId: string;
  capturedLatitude: number;
  capturedLongitude: number;
  calculatedDistanceMeters: number;
  gpsAccuracyMeters: number;
  allowedRadiusMeters: number;
  maxAccuracyThresholdMeters: number;
  status: GeofenceVerificationStatus;
  exceptionReason?: string;
}

export interface AppStoreModuleToggles {
  geofencingEnabled: boolean;
  zatcaPhase2Enabled: boolean;
  invoicingModuleEnabled: boolean;
  directInvoicingAllowed: boolean;
  vendorPortalEnabled: boolean;
  expensesModuleEnabled: boolean;
  accountsModuleEnabled: boolean;
  filesManagerEnabled: boolean;
  docMakerEnabled: boolean;
  laborLawEngineEnabled: boolean;
  onboardingWizardEnabled: boolean;
  workHubEnabled: boolean;
  mailModuleEnabled: boolean;
  chatModuleEnabled: boolean;
  workspaceModuleEnabled: boolean;
  ramadanModeEnabled: boolean;
}

export interface RBACGeofenceContextValue {
  currentRole: CorporateRole;
  setCurrentRole: (role: CorporateRole) => void;
  rbacMatrix: Record<CorporateRole, Record<AtomicPermissionScope, boolean>>;
  togglePermissionCell: (role: CorporateRole, scope: AtomicPermissionScope) => void;
  resetRbacMatrix: () => void;
  hasPermission: (scope: AtomicPermissionScope) => boolean;
  canAccessRoute: (route: ModuleRouteKey) => boolean;

  moduleToggles: AppStoreModuleToggles;
  toggleAppModule: (key: keyof AppStoreModuleToggles) => void;
  isRouteModuleEnabled: (route: ModuleRouteKey) => boolean;

  activeOffice: OfficeGeofenceProfile;
  setActiveOfficeId: (id: string) => void;
  updateAllowedRadius: (radiusMeters: number) => void;
  capturedCoords: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
  };
  calculatedDistanceMeters: number;
  verificationStatus: GeofenceVerificationStatus;
  isClockedIn: boolean;
  geofenceModalOpen: boolean;
  setGeofenceModalOpen: (open: boolean) => void;
  simulateCoordinatePreset: (preset: "inside_kafd" | "high_drift" | "outside_zone") => void;
  triggerBrowserHtml5Geolocation: () => void;
  executeAttendancePunch: () => {
    allowed: boolean;
    status: GeofenceVerificationStatus;
    payload: GeofenceExceptionLogPayload;
  };
  submitRemoteExceptionRequest: (reason: string) => void;
  exceptionAuditLogs: GeofenceExceptionLogPayload[];
}

const RBACGeofenceContext = createContext<RBACGeofenceContextValue | undefined>(undefined);

function computeHaversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const GeofencingSafetyProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [currentRole, setCurrentRole] = useState<CorporateRole>("SUPER_ADMIN");
  const [rbacMatrix, setRbacMatrix] =
    useState<Record<CorporateRole, Record<AtomicPermissionScope, boolean>>>(
      RBAC_ACCESS_MATRIX
    );

  const [moduleToggles, setModuleToggles] = useState<AppStoreModuleToggles>({
    geofencingEnabled: true,
    zatcaPhase2Enabled: true,
    invoicingModuleEnabled: true,
    directInvoicingAllowed: true,
    vendorPortalEnabled: true,
    expensesModuleEnabled: true,
    accountsModuleEnabled: true,
    filesManagerEnabled: true,
    docMakerEnabled: true,
    laborLawEngineEnabled: true,
    onboardingWizardEnabled: true,
    workHubEnabled: true,
    mailModuleEnabled: true,
    chatModuleEnabled: true,
    workspaceModuleEnabled: true,
    ramadanModeEnabled: false
  });

  const [offices, setOffices] = useState<OfficeGeofenceProfile[]>(KSA_OFFICE_PERIMETERS);
  const [activeOfficeId, setActiveOfficeId] = useState<string>("HQ-RUH-KAFD");

  const activeOffice = useMemo(
    () => offices.find((o) => o.id === activeOfficeId) || offices[0],
    [offices, activeOfficeId]
  );

  const [capturedCoords, setCapturedCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracyMeters: number;
  }>({
    latitude: 24.76491,
    longitude: 46.64166,
    accuracyMeters: 6
  });

  const [isClockedIn, setIsClockedIn] = useState<boolean>(true);
  const [geofenceModalOpen, setGeofenceModalOpen] = useState<boolean>(false);

  const [exceptionAuditLogs, setExceptionAuditLogs] = useState<GeofenceExceptionLogPayload[]>([
    {
      id: "GEO-LOG-9042",
      timestampIso: "2026-10-02T07:54:12.000Z",
      role: "SUPER_ADMIN",
      officeId: "HQ-RUH-KAFD",
      capturedLatitude: 24.76491,
      capturedLongitude: 46.64166,
      calculatedDistanceMeters: 14,
      gpsAccuracyMeters: 6,
      allowedRadiusMeters: 50,
      maxAccuracyThresholdMeters: 15,
      status: "VERIFIED_INSIDE_ZONE"
    },
    {
      id: "GEO-LOG-9039",
      timestampIso: "2026-10-02T07:41:05.000Z",
      role: "EMPLOYEE",
      officeId: "HQ-RUH-KAFD",
      capturedLatitude: 24.7615,
      capturedLongitude: 46.6442,
      calculatedDistanceMeters: 451,
      gpsAccuracyMeters: 11,
      allowedRadiusMeters: 50,
      maxAccuracyThresholdMeters: 15,
      status: "BLOCKED_OUTSIDE_RADIUS",
      exceptionReason: "Field deployment at ZATCA Fatoora client sandbox site (Olaya Towers)"
    },
    {
      id: "GEO-LOG-9035",
      timestampIso: "2026-10-02T07:29:48.000Z",
      role: "HR_OPS",
      officeId: "HQ-RUH-KAFD",
      capturedLatitude: 24.76495,
      capturedLongitude: 46.6417,
      calculatedDistanceMeters: 19,
      gpsAccuracyMeters: 24,
      allowedRadiusMeters: 50,
      maxAccuracyThresholdMeters: 15,
      status: "BLOCKED_GPS_ACCURACY_DRIFT",
      exceptionReason: "Basement parking GPS signal attenuation (>15m drift rule triggered)"
    }
  ]);

  const calculatedDistanceMeters = useMemo(() => {
    return computeHaversineMeters(
      activeOffice.latitude,
      activeOffice.longitude,
      capturedCoords.latitude,
      capturedCoords.longitude
    );
  }, [activeOffice, capturedCoords]);

  const verificationStatus: GeofenceVerificationStatus = useMemo(() => {
    if (!moduleToggles.geofencingEnabled) {
      return "VERIFIED_INSIDE_ZONE";
    }
    if (capturedCoords.accuracyMeters > activeOffice.maxAccuracyThresholdMeters) {
      return "BLOCKED_GPS_ACCURACY_DRIFT";
    }
    if (calculatedDistanceMeters > activeOffice.allowedRadiusMeters) {
      return "BLOCKED_OUTSIDE_RADIUS";
    }
    return "VERIFIED_INSIDE_ZONE";
  }, [
    moduleToggles.geofencingEnabled,
    capturedCoords.accuracyMeters,
    activeOffice.maxAccuracyThresholdMeters,
    activeOffice.allowedRadiusMeters,
    calculatedDistanceMeters
  ]);

  const togglePermissionCell = useCallback(
    (role: CorporateRole, scope: AtomicPermissionScope) => {
      setRbacMatrix((prev) => ({
        ...prev,
        [role]: {
          ...prev[role],
          [scope]: !prev[role][scope]
        }
      }));
    },
    []
  );

  const resetRbacMatrix = useCallback(() => {
    setRbacMatrix(RBAC_ACCESS_MATRIX);
  }, []);

  const hasPermission = useCallback(
    (scope: AtomicPermissionScope): boolean => {
      return Boolean(rbacMatrix[currentRole]?.[scope]);
    },
    [rbacMatrix, currentRole]
  );

  const canAccessRoute = useCallback(
    (route: ModuleRouteKey): boolean => {
      const scopeMap: Record<ModuleRouteKey, AtomicPermissionScope> = {
        dashboard: "route:dashboard",
        work_hub: "route:work_hub",
        mail: "route:mail",
        chat: "route:chat",
        workspace: "route:workspace",
        workflows: "route:workflows",
        profile: "route:profile",
        employees: "route:employees",
        vendors: "route:vendors",
        expenses: "route:expenses",
        accounts: "route:accounts",
        files: "route:files",
        doc_maker: "route:doc_maker",
        compliance: "route:compliance",
        invoices: "route:invoices",
        settings: "route:settings"
      };
      if (route === "work_hub") {
        return (
          (hasPermission("route:work_hub") && moduleToggles.workHubEnabled) ||
          (hasPermission("route:workspace") && moduleToggles.workspaceModuleEnabled)
        );
      }
      return hasPermission(scopeMap[route]);
    },
    [hasPermission, moduleToggles]
  );

  const toggleAppModule = useCallback((key: keyof AppStoreModuleToggles) => {
    setModuleToggles((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const isRouteModuleEnabled = useCallback(
    (route: ModuleRouteKey): boolean => {
      if (route === "work_hub") return moduleToggles.workHubEnabled || moduleToggles.workspaceModuleEnabled;
      if (route === "workspace") return moduleToggles.workspaceModuleEnabled;
      if (route === "mail") return moduleToggles.mailModuleEnabled;
      if (route === "chat") return moduleToggles.chatModuleEnabled;
      if (route === "invoices") return moduleToggles.invoicingModuleEnabled;
      if (route === "vendors") return moduleToggles.vendorPortalEnabled;
      if (route === "expenses") return moduleToggles.expensesModuleEnabled;
      if (route === "accounts") return moduleToggles.accountsModuleEnabled;
      if (route === "files") return moduleToggles.filesManagerEnabled;
      if (route === "doc_maker") return moduleToggles.docMakerEnabled;
      if (route === "compliance") {
        return moduleToggles.laborLawEngineEnabled || moduleToggles.zatcaPhase2Enabled;
      }
      return true;
    },
    [moduleToggles]
  );

  const updateAllowedRadius = useCallback(
    (radiusMeters: number) => {
      setOffices((prev) =>
        prev.map((o) =>
          o.id === activeOfficeId ? { ...o, allowedRadiusMeters: radiusMeters } : o
        )
      );
    },
    [activeOfficeId]
  );

  const simulateCoordinatePreset = useCallback(
    (preset: "inside_kafd" | "high_drift" | "outside_zone") => {
      if (preset === "inside_kafd") {
        setCapturedCoords({
          latitude: activeOffice.latitude + 0.00011,
          longitude: activeOffice.longitude + 0.00006,
          accuracyMeters: 6
        });
      } else if (preset === "high_drift") {
        setCapturedCoords({
          latitude: activeOffice.latitude + 0.00015,
          longitude: activeOffice.longitude + 0.00008,
          accuracyMeters: 24
        });
      } else {
        setCapturedCoords({
          latitude: activeOffice.latitude + 0.0034,
          longitude: activeOffice.longitude + 0.0019,
          accuracyMeters: 9
        });
      }
    },
    [activeOffice]
  );

  const triggerBrowserHtml5Geolocation = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCapturedCoords({
            latitude: Number(pos.coords.latitude.toFixed(5)),
            longitude: Number(pos.coords.longitude.toFixed(5)),
            accuracyMeters: Math.round(pos.coords.accuracy)
          });
        },
        () => {
          simulateCoordinatePreset("outside_zone");
        },
        { enableHighAccuracy: true, timeout: 4000 }
      );
    }
  }, [simulateCoordinatePreset]);

  const executeAttendancePunch = useCallback(() => {
    const payload: GeofenceExceptionLogPayload = {
      id: `GEO-LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestampIso: new Date().toISOString(),
      role: currentRole,
      officeId: activeOffice.id,
      capturedLatitude: Number(capturedCoords.latitude.toFixed(5)),
      capturedLongitude: Number(capturedCoords.longitude.toFixed(5)),
      calculatedDistanceMeters,
      gpsAccuracyMeters: capturedCoords.accuracyMeters,
      allowedRadiusMeters: activeOffice.allowedRadiusMeters,
      maxAccuracyThresholdMeters: activeOffice.maxAccuracyThresholdMeters,
      status: verificationStatus
    };

    setExceptionAuditLogs((prev) => [payload, ...prev]);

    if (verificationStatus === "VERIFIED_INSIDE_ZONE") {
      setIsClockedIn((prev) => !prev);
      return { allowed: true, status: verificationStatus, payload };
    } else {
      setIsClockedIn(false);
      return { allowed: false, status: verificationStatus, payload };
    }
  }, [
    currentRole,
    activeOffice,
    capturedCoords,
    calculatedDistanceMeters,
    verificationStatus
  ]);

  const submitRemoteExceptionRequest = useCallback(
    (reason: string) => {
      const payload: GeofenceExceptionLogPayload = {
        id: `GEO-EXC-${Math.floor(1000 + Math.random() * 9000)}`,
        timestampIso: new Date().toISOString(),
        role: currentRole,
        officeId: activeOffice.id,
        capturedLatitude: Number(capturedCoords.latitude.toFixed(5)),
        capturedLongitude: Number(capturedCoords.longitude.toFixed(5)),
        calculatedDistanceMeters,
        gpsAccuracyMeters: capturedCoords.accuracyMeters,
        allowedRadiusMeters: activeOffice.allowedRadiusMeters,
        maxAccuracyThresholdMeters: activeOffice.maxAccuracyThresholdMeters,
        status: verificationStatus,
        exceptionReason: reason
      };
      setExceptionAuditLogs((prev) => [payload, ...prev]);
    },
    [
      currentRole,
      activeOffice,
      capturedCoords,
      calculatedDistanceMeters,
      verificationStatus
    ]
  );

  const value = useMemo<RBACGeofenceContextValue>(
    () => ({
      currentRole,
      setCurrentRole,
      rbacMatrix,
      togglePermissionCell,
      resetRbacMatrix,
      hasPermission,
      canAccessRoute,
      moduleToggles,
      toggleAppModule,
      isRouteModuleEnabled,
      activeOffice,
      setActiveOfficeId,
      updateAllowedRadius,
      capturedCoords,
      calculatedDistanceMeters,
      verificationStatus,
      isClockedIn,
      geofenceModalOpen,
      setGeofenceModalOpen,
      simulateCoordinatePreset,
      triggerBrowserHtml5Geolocation,
      executeAttendancePunch,
      submitRemoteExceptionRequest,
      exceptionAuditLogs
    }),
    [
      currentRole,
      rbacMatrix,
      togglePermissionCell,
      resetRbacMatrix,
      hasPermission,
      canAccessRoute,
      moduleToggles,
      toggleAppModule,
      isRouteModuleEnabled,
      activeOffice,
      updateAllowedRadius,
      capturedCoords,
      calculatedDistanceMeters,
      verificationStatus,
      isClockedIn,
      geofenceModalOpen,
      simulateCoordinatePreset,
      triggerBrowserHtml5Geolocation,
      executeAttendancePunch,
      submitRemoteExceptionRequest,
      exceptionAuditLogs
    ]
  );

  return (
    <RBACGeofenceContext.Provider value={value}>{children}</RBACGeofenceContext.Provider>
  );
};

export const useRBACGeofence = (): RBACGeofenceContextValue => {
  const ctx = useContext(RBACGeofenceContext);
  if (!ctx) {
    throw new Error("useRBACGeofence must be used within a GeofencingSafetyProvider");
  }
  return ctx;
};

export const useCurrentRole = () => {
  const {
    currentRole,
    setCurrentRole,
    hasPermission,
    canAccessRoute,
    isRouteModuleEnabled,
    toggleAppModule
  } = useRBACGeofence();

  return {
    currentRole,
    setCurrentRole,
    hasPermission,
    canAccessRoute,
    isRouteModuleEnabled,
    toggleAppModule
  };
};
