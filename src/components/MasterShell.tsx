import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Receipt,
  Landmark,
  Scale,
  Sliders,
  ShieldAlert,
  Globe,
  Search,
  Sun,
  Moon,
  Contrast,
  CheckCircle2,
  XCircle,
  Lock,
  Navigation,
  X,
  Send,
  ListTodo,
  Sparkles,
  FileText,
  GitBranch
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme, ThemeMode } from "@/context/ThemeContext";
import { formControlClassName, iconButtonClass, primaryButtonClass, secondaryButtonClass, useModalFocus } from "@/components/DesignSystem";
import { WorkspaceHelperMenu, WorkspaceToolbar, WorkspaceToolbarProvider } from "@/components/WorkspaceToolbar";
import {
  useCurrentRole,
  useRBACGeofence,
  CorporateRole,
  ModuleRouteKey,
  KSA_OFFICE_PERIMETERS
} from "@/context/RBACGeofenceContext";
import {
  EMPLOYEE_GRID_BLUEPRINT,
  VENDOR_CONTRACTOR_BLUEPRINT,
  ZATCA_INVOICE_BLUEPRINTS,
  EmployeeRecordBlueprint,
  ZatcaPhase2InvoiceBlueprint
} from "@/data/mockBlueprints";
import { DashboardModule } from "@/modules/DashboardModule";
import { EmployeeModule } from "@/modules/EmployeeModule";
import { VendorModule } from "@/modules/VendorModule";
import { ExpenseModule } from "@/modules/ExpenseModule";
import { WorkflowEngineModule } from "@/modules/WorkflowEngineModule";
import { NotificationCenterButton } from "@/components/NotificationCenterButton";
import { AccountsModule } from "@/modules/AccountsModule";
import { ComplianceZatcaModule } from "@/modules/ComplianceZatcaModule";
import { MasterSettingsModule } from "@/modules/MasterSettingsModule";
import { WorkSuiteModule } from "@/modules/WorkSuiteModule";
import { InvoicingModule } from "@/modules/InvoicingModule";
import type { InvoiceDraftRecord } from "@/services/invoiceWorkspace";
import {
  DEFAULT_SIDEBAR_WIDTH,
  SIDEBAR_SNAP_WIDTHS,
  clampSidebarWidth,
  isSidebarCompactWidth,
  restoreSidebarWidth,
  snapSidebarWidth
} from "@/services/sidebarSizing";
import type { SidebarSnapWidth } from "@/services/sidebarSizing";
import type { RosterImportBundle, RosterImportSummary } from "@/services/rosterImport";
import { PartialRosterDirectoryModule, PartialRosterImportRequiredModule } from "@/modules/PartialRosterDirectoryModule";

const ROLE_OPTIONS: CorporateRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "HR_OPS",
  "MANAGER",
  "EMPLOYEE"
];

const SIDEBAR_WIDTH_STORAGE_KEY = "yamodeer-shell-sidebar-width-v1";

const getInitialSidebarWidth = (): number => {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH;
  try {
    const stored = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    return stored === null ? DEFAULT_SIDEBAR_WIDTH : restoreSidebarWidth(Number(stored));
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
};

/**
 * Strict RBAC Route Guard Component
 * Explicitly wraps every page route in `useCurrentRole()` per architecture-rules.json:
 * "Every page route must be wrapped in the RBAC validation hook (`useCurrentRole()`).
 * If unauthorized, redirect to the unauthorized fallback shell."
 */
export const RBACRouteGuard: React.FC<{
  route: ModuleRouteKey;
  onReturnSafeRoute: () => void;
  children: React.ReactNode;
}> = ({ route, onReturnSafeRoute, children }) => {
  const { t } = useLanguage();
  const {
    currentRole,
    setCurrentRole,
    canAccessRoute,
    isRouteModuleEnabled,
    toggleAppModule,
    hasPermission
  } = useCurrentRole();

  // Check if the module was deactivated in the App Store Toggle Matrix
  if (!isRouteModuleEnabled(route)) {
    return (
      <div className="bg-surface border border-warning rounded-2xl p-4 shadow-card max-w-2xl mx-auto my-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-warning-soft text-warning-text flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-dynamic-xl font-extrabold text-foreground">
          {t("module.disabled.title")}
        </h2>
        <p className="text-dynamic-sm text-muted">
          {t("module.disabled.subtitle")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (route === "vendors") toggleAppModule("vendorPortalEnabled");
              if (route === "expenses") toggleAppModule("expensesModuleEnabled");
              if (route === "accounts") toggleAppModule("accountsModuleEnabled");
              if (route === "work_hub") {
                if (hasPermission("route:work_hub")) toggleAppModule("workHubEnabled");
                if (hasPermission("route:workspace")) toggleAppModule("workspaceModuleEnabled");
              }
              if (route === "workspace") toggleAppModule("workspaceModuleEnabled");
              if (route === "compliance") {
                toggleAppModule("laborLawEngineEnabled");
                toggleAppModule("zatcaPhase2Enabled");
              }
            }}
            className={primaryButtonClass}
          >
            {t("module.disabled.enable_btn")}
          </button>
          <button
            type="button"
            onClick={onReturnSafeRoute}
            className={secondaryButtonClass}
          >
            {t("rbac.unauthorized.return_btn")}
          </button>
        </div>
      </div>
    );
  }

  // Evaluate strict RBAC permission matrix for the active route
  if (!canAccessRoute(route)) {
    return (
      <div className="bg-surface border border-danger rounded-2xl p-4 shadow-card max-w-2xl mx-auto my-6 space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-danger-soft text-danger-text flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-dynamic-xl font-extrabold text-foreground">
              {t("rbac.unauthorized.title")}
            </h2>
            <p className="text-dynamic-sm text-muted">
              {t("rbac.unauthorized.subtitle")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-surface-elevated border border-theme">
          <div>
            <div className="text-dynamic-xs text-muted">
              {t("rbac.unauthorized.current_role")}
            </div>
            <div className="text-dynamic-sm font-bold text-danger-text pt-0.5">
              {t(`role.${currentRole}`)}
            </div>
          </div>
          <div>
            <div className="text-dynamic-xs text-muted">
              {t("rbac.unauthorized.required_scope")}
            </div>
            <div className="text-dynamic-sm font-bold text-foreground pt-0.5">
              {t(`nav.${route}`)}
            </div>
          </div>
        </div>

        <p className="text-dynamic-xs text-muted">
          {t("rbac.unauthorized.elevate_hint")}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onReturnSafeRoute}
            className={primaryButtonClass}
          >
            {t("rbac.unauthorized.return_btn")}
          </button>
          <button
            type="button"
            onClick={() => setCurrentRole("SUPER_ADMIN")}
            className={secondaryButtonClass}
          >
            {t("role.SUPER_ADMIN")}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const MasterShell: React.FC = () => {
  const { t, localize, toggleLanguage, direction } = useLanguage();
  const { mode, setMode, fontScale } = useTheme();
  const {
    currentRole,
    setCurrentRole,
    hasPermission,
    moduleToggles,
    activeOffice,
    setActiveOfficeId,
    capturedCoords,
    calculatedDistanceMeters,
    verificationStatus,
    geofenceModalOpen,
    setGeofenceModalOpen,
    simulateCoordinatePreset,
    triggerBrowserHtml5Geolocation,
    executeAttendancePunch,
    submitRemoteExceptionRequest,
    exceptionAuditLogs
  } = useRBACGeofence();

  const [activeRoute, setActiveRoute] = useState<ModuleRouteKey>("dashboard");
  const [dashboardDemoMode, setDashboardDemoMode] = useState(import.meta.env.DEV);
  const [settingsInitialTab, setSettingsInitialTab] = useState<"theme_lab" | "app_store" | "dashboard_widgets" | "integrations" | "rbac_matrix">("theme_lab");
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 1023px)").matches
  );
  const geofenceDialogRef = useModalFocus(geofenceModalOpen, () => setGeofenceModalOpen(false));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mobileQuery = window.matchMedia("(max-width: 1023px)");
    const updateMobileViewport = () => setIsMobileViewport(mobileQuery.matches);
    mobileQuery.addEventListener("change", updateMobileViewport);
    return () => mobileQuery.removeEventListener("change", updateMobileViewport);
  }, []);

  useEffect(() => {
    if (activeRoute !== "settings" && settingsInitialTab !== "theme_lab") {
      setSettingsInitialTab("theme_lab");
    }
  }, [activeRoute, settingsInitialTab]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(getInitialSidebarWidth);
  const [sidebarDragging, setSidebarDragging] = useState(false);
  const sidebarDragRef = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
    currentWidth: number;
    direction: "ltr" | "rtl";
  } | null>(null);
  const isSidebarCompact = isMobileViewport || isSidebarCompactWidth(sidebarWidth);

  // Mutable Master State for Employees, Vendors & ZATCA Invoices across child blueprints
  const [employees, setEmployees] = useState<EmployeeRecordBlueprint[]>(
    EMPLOYEE_GRID_BLUEPRINT
  );
  // Manual imports hold raw rows in React memory only. The dev preview may also
  // provide aggregate metrics without sending any employee-level fields to the browser.
  const [rosterData, setRosterData] = useState<RosterImportBundle | null>(null);
  const [devRosterSummary, setDevRosterSummary] = useState<RosterImportSummary | null>(null);
  const rosterSummary = rosterData?.summary ?? devRosterSummary;

  useEffect(() => {
    if (!import.meta.env.DEV || !hasPermission("route:employees")) return;
    let cancelled = false;
    fetch("/__dev/roster-summary", { cache: "no-store" })
      .then((response) => response.status === 204 ? null : response.ok ? response.json() : null)
      .then((payload) => {
        if (cancelled || !payload || typeof payload !== "object") return;
        const candidate = payload as Partial<RosterImportSummary>;
        if (
          typeof candidate.importedAt !== "string" ||
          typeof candidate.sourceRecordCount !== "number" ||
          !Array.isArray(candidate.companies) ||
          !Array.isArray(candidate.departments)
        ) return;
        setDevRosterSummary((existing) => existing ?? candidate as RosterImportSummary);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [hasPermission]);

  const [vendors, setVendors] = useState(VENDOR_CONTRACTOR_BLUEPRINT);
  const [invoices, setInvoices] = useState<ZatcaPhase2InvoiceBlueprint[]>(
    ZATCA_INVOICE_BLUEPRINTS
  );
  const [invoiceDrafts, setInvoiceDrafts] = useState<InvoiceDraftRecord[]>([]);
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<
    string | undefined
  >(undefined);

  // Geofence Exception Workflow Local State
  const [exceptionReasonInput, setExceptionReasonInput] = useState("");
  const [exceptionSubmittedToast, setExceptionSubmittedToast] = useState(false);

  // Compact, grouped navigation keeps routes scannable and adapts to enabled modules.
  const sidebarGroups = [
    {
      labelKey: "nav.group.overview",
      items: [
        {
          key: "dashboard" as ModuleRouteKey,
          labelKey: "nav.dashboard",
          icon: LayoutDashboard,
          enabled: true
        }
      ]
    },
    {
      labelKey: "nav.group.productivity",
      items: [
        {
          key: "work_hub" as ModuleRouteKey,
          labelKey: "nav.work_hub",
          icon: ListTodo,
          enabled: moduleToggles.workHubEnabled || moduleToggles.workspaceModuleEnabled
        }
      ]
    },
    {
      labelKey: "nav.group.people",
      items: [
        {
          key: "employees" as ModuleRouteKey,
          labelKey: "nav.employees",
          icon: Users,
          enabled: true
        },
        {
          key: "vendors" as ModuleRouteKey,
          labelKey: "nav.vendors",
          icon: Briefcase,
          enabled: moduleToggles.vendorPortalEnabled
        }
      ]
    },
    {
      labelKey: "nav.group.operations",
      items: [
        {
          key: "workflows" as ModuleRouteKey,
          labelKey: "nav.workflows",
          icon: GitBranch,
          enabled: true
        }
      ]
    },
    {
      labelKey: "nav.group.finance",
      items: [
        {
          key: "invoices" as ModuleRouteKey,
          labelKey: "nav.invoices",
          icon: FileText,
          enabled: moduleToggles.invoicingModuleEnabled
        },
        {
          key: "expenses" as ModuleRouteKey,
          labelKey: "nav.expenses",
          icon: Receipt,
          enabled: moduleToggles.expensesModuleEnabled
        },
        {
          key: "accounts" as ModuleRouteKey,
          labelKey: "nav.accounts",
          icon: Landmark,
          enabled: moduleToggles.accountsModuleEnabled
        }
      ]
    },
    {
      labelKey: "nav.group.company",
      items: [
        {
          key: "compliance" as ModuleRouteKey,
          labelKey: "nav.compliance",
          icon: Scale,
          enabled:
            moduleToggles.laborLawEngineEnabled || moduleToggles.zatcaPhase2Enabled
        },
        {
          key: "settings" as ModuleRouteKey,
          labelKey: "nav.settings",
          icon: Sliders,
          enabled: true
        }
      ]
    }
  ]
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.enabled)
    }))
    .filter((group) => group.items.length > 0);

  const handleAddEmployee = (newEmp: EmployeeRecordBlueprint) => {
    setEmployees((prev) => [newEmp, ...prev]);
  };

  const handleAddEmployees = (newEmployees: EmployeeRecordBlueprint[]) => {
    setEmployees((prev) => [...newEmployees, ...prev]);
  };

  const handleUpdateEmployee = (updatedEmp: EmployeeRecordBlueprint) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === updatedEmp.id ? updatedEmp : emp))
    );
  };

  const handleEmitZatcaInvoice = (newInv: ZatcaPhase2InvoiceBlueprint) => {
    if (!import.meta.env.DEV) return;
    setInvoices((prev) => [newInv, ...prev]);
    setSelectedInvoiceNo(newInv.invoiceNumber);
    setActiveRoute("compliance");
  };

  const cycleThemeMode = () => {
    const order: ThemeMode[] = ["light", "dark", "high-contrast"];
    const nextIdx = (order.indexOf(mode === "auto" ? "light" : mode) + 1) % order.length;
    setMode(order[nextIdx]);
  };

  const saveSidebarWidth = useCallback((width: number) => {
    const nextWidth = clampSidebarWidth(width);
    setSidebarWidth(nextWidth);
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(nextWidth));
    } catch {
      // Keep resizing available when browser storage is disabled.
    }
  }, []);

  const handleSidebarResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.pointerType === "touch" && !event.isPrimary)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    sidebarDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: sidebarWidth,
      currentWidth: sidebarWidth,
      direction
    };
    setSidebarDragging(true);
  };

  const handleSidebarResizePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = sidebarDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();

    const physicalDelta = event.clientX - drag.startX;
    const logicalDelta = drag.direction === "rtl" ? -physicalDelta : physicalDelta;
    const nextWidth = clampSidebarWidth(drag.startWidth + logicalDelta);
    drag.currentWidth = nextWidth;
    setSidebarWidth(nextWidth);
  };

  const finishSidebarResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = sidebarDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    let finalWidth = drag.currentWidth;
    if (event.type === "pointerup") {
      const physicalDelta = event.clientX - drag.startX;
      const logicalDelta = drag.direction === "rtl" ? -physicalDelta : physicalDelta;
      finalWidth = drag.startWidth + logicalDelta;
    }

    sidebarDragRef.current = null;
    setSidebarDragging(false);
    saveSidebarWidth(finalWidth);
  };

  const handleSidebarResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentWidth = snapSidebarWidth(sidebarWidth);
    const currentIndex = SIDEBAR_SNAP_WIDTHS.indexOf(currentWidth);
    const expandKey = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    const shrinkKey = direction === "rtl" ? "ArrowRight" : "ArrowLeft";
    let nextWidth: SidebarSnapWidth | undefined;

    if (event.key === "Home") {
      nextWidth = SIDEBAR_SNAP_WIDTHS[0];
    } else if (event.key === "End") {
      nextWidth = SIDEBAR_SNAP_WIDTHS[2];
    } else if (event.key === expandKey) {
      nextWidth = SIDEBAR_SNAP_WIDTHS[Math.min(currentIndex + 1, SIDEBAR_SNAP_WIDTHS.length - 1)];
    } else if (event.key === shrinkKey) {
      nextWidth = SIDEBAR_SNAP_WIDTHS[Math.max(currentIndex - 1, 0)];
    } else if (event.key === "Enter" || event.key === " ") {
      nextWidth = SIDEBAR_SNAP_WIDTHS[(currentIndex + 1) % SIDEBAR_SNAP_WIDTHS.length];
    }

    if (nextWidth !== undefined) {
      event.preventDefault();
      saveSidebarWidth(nextWidth);
    }
  };

  const sidebarWidthDescription =
    isSidebarCompactWidth(sidebarWidth)
      ? t("shell.sidebar_width_compact")
      : snapSidebarWidth(sidebarWidth) === SIDEBAR_SNAP_WIDTHS[2]
        ? t("shell.sidebar_width_wide")
        : t("shell.sidebar_width_default");
  const isGeoVerified = verificationStatus === "VERIFIED_INSIDE_ZONE";
  const fallbackTitleKey =
    activeRoute === "workspace"
      ? "nav.work_hub"
      : sidebarGroups.flatMap((group) => group.items).find((item) => item.key === activeRoute)?.labelKey
        ?? "nav.dashboard";

  return (
    <WorkspaceToolbarProvider>
    <div className="flex min-h-screen overflow-x-clip bg-canvas text-foreground">
      <a href="#workspace-main" className="skip-link">{t("accessibility.skip_main")}</a>
      {/* Primary workspace navigation */}
      <aside
        id="primary-navigation"
        aria-label={t("shell.navigation")}
        style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
        className="sticky top-0 z-10 flex h-screen w-20 shrink-0 flex-col border-e border-shell-nav-border bg-shell-nav text-shell-nav-foreground lg:w-[var(--sidebar-width)]"
      >
        <div className={`mx-2 flex min-h-16 items-center gap-3 border-b border-shell-nav-border py-3 ${isSidebarCompact ? "justify-center px-1" : "px-3"}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-shell-nav-border bg-shell-nav-elevated text-shell-nav-foreground">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
          </div>
          <div className={`min-w-0 flex-1 ${isSidebarCompact ? "hidden" : ""}`}>
            <div className="truncate text-dynamic-sm font-semibold leading-tight tracking-tight text-shell-nav-foreground">
              {t("app.title")}
            </div>
          </div>
        </div>

        <nav className={`min-h-0 flex-1 space-y-1.5 overflow-y-auto ${isMobileViewport ? "px-1.5" : "px-3"} py-3`} aria-label={t("shell.navigation")}>
          {sidebarGroups.map((group, groupIndex) => (
            <div
              key={group.labelKey}
              role="group"
              aria-label={t(group.labelKey)}
              className={`space-y-1 ${groupIndex < sidebarGroups.length - 1 ? "border-b border-shell-nav-border pb-2" : ""}`}
            >
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const IconComp = item.icon;
                  const isActive = activeRoute === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-label={t(item.labelKey)}
                      aria-current={isActive ? "page" : undefined}
                      title={isSidebarCompact ? t(item.labelKey) : undefined}
                      onClick={() => setActiveRoute(item.key)}
                      className={`group relative flex min-w-0 w-full items-center ${
                        isMobileViewport
                          ? "min-h-[3.75rem] flex-col justify-center gap-1 px-1.5 py-1.5"
                          : `${isSidebarCompact ? "justify-center px-2" : "gap-2.5 px-3 text-start"} py-1.5`
                      } rounded-lg border transition-colors duration-150 ${
                        isActive
                          ? "border-shell-nav-border bg-shell-nav-active font-semibold text-shell-nav-foreground"
                          : "border-transparent text-shell-nav-muted hover:bg-shell-nav-active hover:text-shell-nav-foreground"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center transition-colors ${
                          isActive
                            ? "text-shell-nav-foreground"
                            : "text-shell-nav-muted group-hover:text-shell-nav-foreground"
                        }`}
                      >
                        <IconComp aria-hidden="true" className="h-4 w-4" />
                      </span>
                      {isMobileViewport ? (
                        <span className="max-w-full min-w-0 break-words text-center text-dynamic-xs leading-tight">
                          {t(item.labelKey)}
                        </span>
                      ) : !isSidebarCompact ? (
                        <span className="min-w-0 flex-1 truncate text-dynamic-sm">
                          {t(item.labelKey)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t("shell.resize_sidebar")}
          aria-valuemin={SIDEBAR_SNAP_WIDTHS[0]}
          aria-valuemax={SIDEBAR_SNAP_WIDTHS[2]}
          aria-valuenow={sidebarWidth}
          aria-valuetext={sidebarWidthDescription}
          title={t("shell.resize_sidebar")}
          tabIndex={0}
          onPointerDown={handleSidebarResizePointerDown}
          onPointerMove={handleSidebarResizePointerMove}
          onPointerUp={finishSidebarResize}
          onPointerCancel={finishSidebarResize}
          onLostPointerCapture={finishSidebarResize}
          onKeyDown={handleSidebarResizeKeyDown}
          className={`absolute inset-y-0 end-0 z-20 hidden w-4 cursor-col-resize touch-none items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary lg:flex ${
            sidebarDragging ? "bg-shell-nav-active" : "hover:bg-shell-nav-active/60"
          }`}
        >
          <span
            className={`h-12 w-0.5 transition-colors ${
              sidebarDragging ? "bg-shell-nav-foreground" : "bg-shell-nav-muted"
            }`}
          />
        </div>
      </aside>

      {/* Active workspace */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 border-b border-theme bg-surface">
        <header className="flex min-h-16 flex-col items-stretch gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
          <div className="relative min-w-0 w-full max-w-none flex-1 sm:ms-3 sm:max-w-xl lg:w-1/4 lg:min-w-[12rem] lg:flex-none">
            <Search aria-hidden="true" className="absolute top-1/2 start-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder={t("shell.search_placeholder")}
              aria-label={t("shell.search_placeholder")}
              className={`${formControlClassName} h-10 ps-10 pe-4`}
            />
          </div>

          <div className="shell-topbar-controls ms-auto flex w-full min-w-0 flex-wrap items-center justify-end gap-1 sm:w-auto sm:shrink-0 sm:gap-2">
            <NotificationCenterButton onNavigate={setActiveRoute} />

            <label className="sr-only" htmlFor="workspace-role">{t("shell.switch_role")}</label>
            <select
              id="workspace-role"
              aria-label={t("shell.switch_role")}
              title={t("shell.switch_role")}
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as CorporateRole)}
              className={`${formControlClassName} h-10 w-[min(100%,9.5rem)] py-1 text-dynamic-xs font-semibold`}
            >
              {ROLE_OPTIONS.map((roleKey) => (
                <option key={roleKey} value={roleKey}>
                  {t(`role.short.${roleKey}`)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={cycleThemeMode}
              title={t("shell.quick_theme")}
              aria-label={t("shell.quick_theme")}
              className={iconButtonClass}
            >
              {mode === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : mode === "high-contrast" ? (
                <Contrast className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleLanguage}
              title={t("shell.language_toggle")}
              aria-label={t("shell.language_toggle")}
              className={iconButtonClass}
            >
              <Globe className="h-4 w-4" />
            </button>
          </div>
        </header>
        <WorkspaceToolbar fallbackTitle={t(fallbackTitleKey)} />
        </div>
        <WorkspaceHelperMenu
          fallbackTitle={t(fallbackTitleKey)}
          onFocusSearch={() => {
            const search = document.querySelector<HTMLInputElement>("header input[type='search']");
            search?.focus();
            search?.select();
          }}
        />

        <main id="workspace-main" data-modal-focus-fallback tabIndex={-1} aria-label={t("accessibility.main_content")} className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
          <div key={activeRoute} className="w-full min-w-0 space-y-4 app-page-enter">
            <RBACRouteGuard
              route={activeRoute}
              onReturnSafeRoute={() => setActiveRoute("dashboard")}
            >
              {activeRoute === "dashboard" && (
                <DashboardModule
                  employees={employees}
                  rosterSummary={rosterSummary ?? null}
                  rosterRecordsLoaded={Boolean(rosterData)}
                  demoMode={dashboardDemoMode}
                  onToggleDemoMode={() => setDashboardDemoMode((enabled) => !enabled)}
                  onNavigateModule={(r) => {
                    if (r === "settings") setSettingsInitialTab("dashboard_widgets");
                    setActiveRoute(r);
                  }}
                />
              )}
              {activeRoute === "work_hub" && <WorkSuiteModule globalSearchQuery={globalSearchQuery} />}
              {activeRoute === "workspace" && <WorkSuiteModule globalSearchQuery={globalSearchQuery} initialArea="WORKSPACE" />}
              {activeRoute === "employees" && (rosterData ? (
                <PartialRosterDirectoryModule
                  records={rosterData.records}
                  globalSearchQuery={globalSearchQuery}
                />
              ) : devRosterSummary ? (
                <PartialRosterImportRequiredModule onNavigateSettings={() => {
                  setSettingsInitialTab("dashboard_widgets");
                  setActiveRoute("settings");
                }} />
              ) : (
                <EmployeeModule
                  employees={employees}
                  onAddEmployee={handleAddEmployee}
                  onAddEmployees={handleAddEmployees}
                  onUpdateEmployee={handleUpdateEmployee}
                  globalSearchQuery={globalSearchQuery}
                />
              ))}
              {activeRoute === "workflows" && (
                <WorkflowEngineModule employees={employees} globalSearchQuery={globalSearchQuery} />
              )}
              {activeRoute === "invoices" && (
                <InvoicingModule
                  drafts={invoiceDrafts}
                  onSaveDraft={(draft) => setInvoiceDrafts((prev) => {
                    const index = prev.findIndex((item) => item.id === draft.id);
                    if (index < 0) return [draft, ...prev];
                    return prev.map((item, itemIndex) => itemIndex === index ? draft : item);
                  })}
                  canCreateDraft={hasPermission("invoice:create_draft")}
                  directInvoicingAllowed={moduleToggles.directInvoicingAllowed}
                  globalSearchQuery={globalSearchQuery}
                />
              )}
              {activeRoute === "vendors" && (
                <VendorModule
                  vendors={vendors}
                  onAddVendor={(newVen) => setVendors((prev) => [newVen, ...prev])}
                  onUpdateVendor={(updVen) =>
                    setVendors((prev) =>
                      prev.map((v) => (v.id === updVen.id ? updVen : v))
                    )
                  }
                  onEmitZatcaInvoice={handleEmitZatcaInvoice}
                  globalSearchQuery={globalSearchQuery}
                />
              )}
              {activeRoute === "expenses" && <ExpenseModule employees={employees} globalSearchQuery={globalSearchQuery} />}
              {activeRoute === "accounts" && <AccountsModule />}
              {activeRoute === "compliance" && (
                <ComplianceZatcaModule
                  employees={employees}
                  invoices={invoices}
                  selectedInvoiceNumber={selectedInvoiceNo}
                  onAppendInvoice={handleEmitZatcaInvoice}
                />
              )}
              {activeRoute === "settings" && (
                <MasterSettingsModule
                  rosterSummary={rosterSummary ?? null}
                  rosterRecordsLoaded={Boolean(rosterData)}
                  initialTab={settingsInitialTab}
                  onImportRoster={setRosterData}
                  onClearRoster={() => {
                    setRosterData(null);
                    setDevRosterSummary(null);
                  }}
                />
              )}
            </RBACRouteGuard>
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-theme bg-surface px-4 py-3 text-dynamic-xs text-muted sm:px-6 lg:px-8">
          <span>{t("shell.footer_compliance")}</span>
          <span className="rounded-lg bg-surface-elevated px-2.5 py-1 font-medium">
            {t("app.badge.pdpl")}
          </span>
        </footer>
      </div>

      {/* GEOFENCING SAFETY PROVIDER VERIFICATION & EXCEPTION MODAL */}
      {geofenceModalOpen && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div ref={geofenceDialogRef} role="dialog" aria-modal="true" aria-labelledby="geofence-modal-title" tabIndex={-1} className="bg-surface border-2 border-primary rounded-2xl max-w-2xl w-full p-4 shadow-shell space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-theme pb-4">
              <div>
                <h2 id="geofence-modal-title" className="text-dynamic-xl font-extrabold text-foreground">
                  {t("geo.modal.title")}
                </h2>
                <p className="text-dynamic-xs text-muted">
                  {t("geo.modal.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGeofenceModalOpen(false)}
                title={t("doc.action.close")}
                aria-label={t("doc.action.close")}
                className={iconButtonClass}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Office Selector */}
            <div className="space-y-1.5">
              <label className="block text-dynamic-xs font-bold text-muted">
                {t("geo.office_hub")}
              </label>
              <select aria-label={t("geo.office_hub")}
                value={activeOffice.id}
                onChange={(e) => setActiveOfficeId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-theme text-foreground text-dynamic-sm font-semibold"
              >
                {KSA_OFFICE_PERIMETERS.map((off) => (
                  <option key={off.id} value={off.id}>
                    {localize(off.name)} ({off.latitude}, {off.longitude}) — Radius:{" "}
                    {off.allowedRadiusMeters}m
                  </option>
                ))}
              </select>
            </div>

            {/* Spatial Coordinate Simulator Buttons */}
            <div className="space-y-2">
              <div className="text-dynamic-xs font-bold text-muted">
                {t("geo.sim.preset_label")}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => simulateCoordinatePreset("inside_kafd")}
                  className="p-3 rounded-xl bg-success-soft border border-success text-success-text font-bold text-dynamic-xs text-start"
                >
                  {t("geo.sim.inside_kafd")}
                </button>
                <button
                  type="button"
                  onClick={() => simulateCoordinatePreset("high_drift")}
                  className="p-3 rounded-xl bg-warning-soft border border-warning text-warning-text font-bold text-dynamic-xs text-start"
                >
                  {t("geo.sim.high_drift")}
                </button>
                <button
                  type="button"
                  onClick={() => simulateCoordinatePreset("outside_zone")}
                  className="p-3 rounded-xl bg-danger-soft border border-danger text-danger-text font-bold text-dynamic-xs text-start"
                >
                  {t("geo.sim.outside_zone")}
                </button>
                <button
                  type="button"
                  onClick={triggerBrowserHtml5Geolocation}
                  className="p-3 rounded-xl bg-primary-soft border border-primary text-primary-text font-bold text-dynamic-xs text-start"
                >
                  {t("geo.sim.live_gps")}
                </button>
              </div>
            </div>

            {/* Telemetry Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-surface-elevated border border-theme">
                <div className="text-dynamic-xs text-muted">
                  {t("geo.distance")}
                </div>
                <div className="text-dynamic-base font-extrabold text-foreground font-mono pt-1">
                  {calculatedDistanceMeters}m
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-elevated border border-theme">
                <div className="text-dynamic-xs text-muted">
                  {t("geo.allowed_radius")}
                </div>
                <div className="text-dynamic-base font-extrabold text-foreground font-mono pt-1">
                  {activeOffice.allowedRadiusMeters}m
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-elevated border border-theme">
                <div className="text-dynamic-xs text-muted">
                  {t("geo.accuracy")}
                </div>
                <div
                  className={`text-dynamic-base font-extrabold font-mono pt-1 ${
                    capturedCoords.accuracyMeters > 15
                      ? "text-danger-text"
                      : "text-success-text"
                  }`}
                >
                  ±{capturedCoords.accuracyMeters}m
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-elevated border border-theme">
                <div className="text-dynamic-xs text-muted">
                  {t("geo.max_accuracy_threshold")}
                </div>
                <div className="text-dynamic-base font-extrabold text-foreground font-mono pt-1">
                  ≤15m
                </div>
              </div>
            </div>

            {/* Verification Banner & Action */}
            {isGeoVerified ? (
              <div className="p-4 rounded-2xl bg-success-soft border border-success flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5 text-success-text font-bold text-dynamic-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{t("geo.status.verified")}</span>
                </div>
                <button
                  type="button"
                  onClick={() => executeAttendancePunch()}
                  className="inline-flex min-h-10 items-center justify-center px-4 py-2 bg-success text-on-success font-bold text-dynamic-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2"
                >
                  {t("geo.execute_punch")}
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-danger-soft border-2 border-danger space-y-4">
                <div className="flex items-start gap-2.5 text-danger-text">
                  <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-extrabold text-dynamic-sm">
                      {verificationStatus === "BLOCKED_GPS_ACCURACY_DRIFT"
                        ? t("geo.status.blocked_accuracy")
                        : t("geo.status.blocked_radius")}
                    </div>
                    <p className="text-dynamic-xs text-foreground pt-1">
                      {t("geo.exception.desc")}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-dynamic-xs font-bold text-foreground">
                    {t("geo.exception.reason_label")}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      aria-label={t("geo.exception.reason_label")}
                      value={exceptionReasonInput}
                      onChange={(e) => setExceptionReasonInput(e.target.value)}
                      placeholder={t("geo.exception.reason_placeholder")}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-surface border border-theme text-foreground text-dynamic-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        submitRemoteExceptionRequest(
                          exceptionReasonInput ||
                            "Remote client audit exception logged via GeofencingSafetyProvider"
                        );
                        setExceptionReasonInput("");
                        setExceptionSubmittedToast(true);
                        setTimeout(() => setExceptionSubmittedToast(false), 3000);
                      }}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 bg-danger px-4 py-2 text-dynamic-xs font-bold text-on-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
                    >
                      <Send className="h-4 w-4" />
                      <span>{t("geo.exception.submit_btn")}</span>
                    </button>
                  </div>
                  {exceptionSubmittedToast && (
                    <div className="text-dynamic-xs font-bold text-success-text pt-1">
                      {t("geo.exception.submitted")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Exception Log Tail */}
            <div className="space-y-2 pt-2 border-t border-theme">
              <div className="text-dynamic-xs font-bold text-muted uppercase">
                {t("geo.audit_log.title")} ({exceptionAuditLogs.length})
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {exceptionAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-surface-elevated border border-theme flex items-center justify-between text-dynamic-xs font-mono"
                  >
                    <span className="text-foreground font-bold">
                      {log.id} • {log.status}
                    </span>
                    <span className="text-muted">
                      {log.calculatedDistanceMeters}m / ±{log.gpsAccuracyMeters}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </WorkspaceToolbarProvider>
  );
};
