import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Receipt,
  Landmark,
  FolderOpen,
  FilePenLine,
  Scale,
  Sliders,
  ShieldAlert,
  MapPin,
  Globe,
  Search,
  Sun,
  Moon,
  Contrast,
  CheckCircle2,
  XCircle,
  Lock,
  Navigation,
  Menu,
  X,
  Send,
  ListTodo,
  Mail,
  MessageCircle,
  Sparkles,
  FileText
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme, ThemeMode } from "@/context/ThemeContext";
import { iconButtonBaseClass, iconButtonClass, primaryButtonClass, secondaryButtonClass } from "@/components/DesignSystem";
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
import { AccountsModule } from "@/modules/AccountsModule";
import { FilesManagerModule, INITIAL_VAULT_FILES, VaultFileItem } from "@/modules/FilesManagerModule";
import { DocMakerModule, DocumentTemplateId } from "@/modules/DocMakerModule";
import { ComplianceZatcaModule } from "@/modules/ComplianceZatcaModule";
import { MasterSettingsModule } from "@/modules/MasterSettingsModule";
import { WorkSuiteModule } from "@/modules/WorkSuiteModule";
import { MailModule } from "@/modules/MailModule";
import { ChatModule } from "@/modules/ChatModule";
import { InvoicingModule } from "@/modules/InvoicingModule";
import type { InvoiceDraftRecord } from "@/services/invoiceWorkspace";

const ROLE_OPTIONS: CorporateRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "HR_OPS",
  "MANAGER",
  "EMPLOYEE"
];

const SIDEBAR_SNAP_WIDTHS = [80, 176, 336] as const;
// Start at the standard width; the widest snap point remains available for long labels.
const DEFAULT_SIDEBAR_WIDTH = SIDEBAR_SNAP_WIDTHS[1];
const SIDEBAR_WIDTH_STORAGE_KEY = "yamodeer-shell-sidebar-width-v1";

type SidebarSnapWidth = (typeof SIDEBAR_SNAP_WIDTHS)[number];

const clampSidebarWidth = (width: number): number =>
  Math.max(SIDEBAR_SNAP_WIDTHS[0], Math.min(SIDEBAR_SNAP_WIDTHS[2], width));

const snapSidebarWidth = (width: number): SidebarSnapWidth =>
  SIDEBAR_SNAP_WIDTHS.reduce<SidebarSnapWidth>(
    (nearest, candidate) =>
      Math.abs(candidate - width) < Math.abs(nearest - width) ? candidate : nearest,
    SIDEBAR_SNAP_WIDTHS[0]
  );

const getInitialSidebarWidth = (): number => {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH;
  try {
    const stored = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    return SIDEBAR_SNAP_WIDTHS.includes(stored as SidebarSnapWidth)
      ? stored
      : DEFAULT_SIDEBAR_WIDTH;
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
      <div className="bg-surface border-2 border-warning rounded-2xl p-4 shadow-card max-w-2xl mx-auto my-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-warning-soft text-warning flex items-center justify-center mx-auto">
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
              if (route === "files") toggleAppModule("filesManagerEnabled");
              if (route === "doc_maker") toggleAppModule("docMakerEnabled");
              if (route === "work_hub") {
                if (hasPermission("route:work_hub")) toggleAppModule("workHubEnabled");
                if (hasPermission("route:workspace")) toggleAppModule("workspaceModuleEnabled");
              }
              if (route === "workspace") toggleAppModule("workspaceModuleEnabled");
              if (route === "mail") toggleAppModule("mailModuleEnabled");
              if (route === "chat") toggleAppModule("chatModuleEnabled");
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
      <div className="bg-surface border-2 border-danger rounded-2xl p-4 shadow-card max-w-2xl mx-auto my-6 space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-danger-soft text-danger flex items-center justify-center shrink-0">
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
            <div className="text-dynamic-sm font-bold text-danger pt-0.5">
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
    isClockedIn,
    geofenceModalOpen,
    setGeofenceModalOpen,
    simulateCoordinatePreset,
    triggerBrowserHtml5Geolocation,
    executeAttendancePunch,
    submitRemoteExceptionRequest,
    exceptionAuditLogs
  } = useRBACGeofence();

  const [activeRoute, setActiveRoute] = useState<ModuleRouteKey>("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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
  const isSidebarCompact =
    snapSidebarWidth(sidebarWidth) === SIDEBAR_SNAP_WIDTHS[0] && !mobileSidebarOpen;

  // Mutable Master State for Employees, Vendors & ZATCA Invoices across child blueprints
  const [employees, setEmployees] = useState<EmployeeRecordBlueprint[]>(
    EMPLOYEE_GRID_BLUEPRINT
  );
  const [vendors, setVendors] = useState(VENDOR_CONTRACTOR_BLUEPRINT);
  const [invoices, setInvoices] = useState<ZatcaPhase2InvoiceBlueprint[]>(
    ZATCA_INVOICE_BLUEPRINTS
  );
  const [invoiceDrafts, setInvoiceDrafts] = useState<InvoiceDraftRecord[]>([]);
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<
    string | undefined
  >(undefined);
  const [vaultFiles, setVaultFiles] = useState<VaultFileItem[]>(INITIAL_VAULT_FILES);
  const [selectedDocTemplateId, setSelectedDocTemplateId] = useState<string | undefined>(undefined);

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
        },
      ]
    },
    {
      labelKey: "nav.group.communication",
      items: [
        {
          key: "mail" as ModuleRouteKey,
          labelKey: "nav.mail",
          icon: Mail,
          enabled: moduleToggles.mailModuleEnabled
        },
        {
          key: "chat" as ModuleRouteKey,
          labelKey: "nav.chat",
          icon: MessageCircle,
          enabled: moduleToggles.chatModuleEnabled
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
      labelKey: "nav.group.documents",
      items: [
        {
          key: "files" as ModuleRouteKey,
          labelKey: "nav.files",
          icon: FolderOpen,
          enabled: moduleToggles.filesManagerEnabled
        },
        {
          key: "doc_maker" as ModuleRouteKey,
          labelKey: "nav.doc_maker",
          icon: FilePenLine,
          enabled: moduleToggles.docMakerEnabled
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
    const nextWidth = snapSidebarWidth(clampSidebarWidth(width));
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

  useEffect(() => {
    if (!sidebarDragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      const drag = sidebarDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const physicalDelta = event.clientX - drag.startX;
      const logicalDelta = drag.direction === "rtl" ? -physicalDelta : physicalDelta;
      const nextWidth = clampSidebarWidth(drag.startWidth + logicalDelta);
      drag.currentWidth = nextWidth;
      setSidebarWidth(nextWidth);
    };

    const finishResize = (event: PointerEvent) => {
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

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishResize);
    window.addEventListener("pointercancel", finishResize);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", finishResize);
    };
  }, [sidebarDragging, saveSidebarWidth]);

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
    snapSidebarWidth(sidebarWidth) === SIDEBAR_SNAP_WIDTHS[0]
      ? t("shell.sidebar_width_compact")
      : snapSidebarWidth(sidebarWidth) === SIDEBAR_SNAP_WIDTHS[2]
        ? t("shell.sidebar_width_wide")
        : t("shell.sidebar_width_default");
  const isGeoVerified = verificationStatus === "VERIFIED_INSIDE_ZONE";

  return (
    <div className="flex min-h-screen bg-canvas text-foreground">
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label={t("shell.close_navigation")}
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Primary workspace navigation */}
      <aside
        style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
        className={`${
          mobileSidebarOpen
            ? "fixed inset-y-0 start-0 z-50 flex w-72 shadow-shell"
            : "hidden"
        } relative flex-col border-e border-shell-nav-border bg-shell-nav text-shell-nav-foreground lg:sticky lg:top-0 lg:z-10 lg:flex lg:h-screen lg:w-[var(--sidebar-width)] lg:shrink-0 lg:shadow-none`}
      >
        <div className={`flex items-center gap-3 py-5 ${isSidebarCompact ? "justify-center px-3" : "px-5"}`}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-shell-nav-border bg-shell-nav-elevated text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className={`min-w-0 flex-1 ${isSidebarCompact ? "hidden" : ""}`}>
            <div className="truncate text-dynamic-lg font-bold tracking-tight text-shell-nav-foreground">
              {t("app.title")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            title={t("shell.close_navigation")}
            aria-label={t("shell.close_navigation")}
            className={`${iconButtonBaseClass} text-shell-nav-muted hover:bg-shell-nav-active hover:text-shell-nav-foreground lg:hidden`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4" aria-label={t("shell.navigation")}>
          {sidebarGroups.map((group) => (
            <div key={group.labelKey}>
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
                      onClick={() => {
                        setActiveRoute(item.key);
                        setMobileSidebarOpen(false);
                      }}
                      className={`group relative flex w-full items-center ${isSidebarCompact ? "justify-center px-2" : "gap-3 px-3 text-start"} rounded-xl py-2 transition-colors ${
                        isActive
                          ? "bg-shell-nav-active font-semibold text-shell-nav-foreground"
                          : "text-shell-nav-muted hover:bg-shell-nav-active hover:text-shell-nav-foreground"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute inset-y-2 start-0 w-0.5 rounded-e-full bg-accent" />
                      )}
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center transition-colors ${
                          isActive
                            ? "bg-shell-nav-elevated text-primary"
                            : "text-shell-nav-muted group-hover:bg-shell-nav-elevated group-hover:text-shell-nav-foreground"
                        }`}
                      >
                        <IconComp className="h-5 w-5" />
                      </span>
                      {!isSidebarCompact && (
                        <span className="min-w-0 flex-1 truncate text-dynamic-sm">
                          {t(item.labelKey)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={`space-y-3 ${isSidebarCompact ? "p-2" : "p-4"}`}>
          <button
            type="button"
            onClick={() => setGeofenceModalOpen(true)}
            title={t(isClockedIn ? "shell.clocked_in_badge" : "shell.clock_in_btn")}
            aria-label={t(isClockedIn ? "shell.clocked_in_badge" : "shell.clock_in_btn")}
            className={`inline-flex h-10 w-full items-center justify-center gap-2 border border-shell-nav-border bg-shell-nav-elevated text-dynamic-sm font-semibold text-shell-nav-foreground transition-colors hover:bg-shell-nav-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isSidebarCompact ? "px-0" : "px-3"
            }`}
          >
            <Navigation className="h-4 w-4 text-primary" />
            {!isSidebarCompact && (
              <span>
                {isClockedIn
                  ? t("shell.clocked_in_badge")
                  : t("shell.clock_in_btn")}
              </span>
            )}
          </button>

          <div className="space-y-1.5">
            {!isSidebarCompact && (
              <label htmlFor="workspace-role" className="block text-dynamic-xs font-semibold text-shell-nav-muted">
                {t("shell.active_role")}
              </label>
            )}
            <select
              id="workspace-role"
              aria-label={t("shell.switch_role")}
              title={t("shell.switch_role")}
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as CorporateRole)}
              className={`h-10 w-full border border-shell-nav-border bg-shell-nav-elevated py-2 text-dynamic-xs font-semibold text-shell-nav-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                isSidebarCompact ? "px-1 text-center" : "px-3"
              }`}
            >
              {ROLE_OPTIONS.map((roleKey) => (
                <option key={roleKey} value={roleKey}>
                  {t(`role.short.${roleKey}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

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
          onKeyDown={handleSidebarResizeKeyDown}
          className={`absolute inset-y-0 end-0 z-20 hidden w-3 cursor-col-resize touch-none items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary lg:flex ${
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
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 bg-surface px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            title={t("shell.navigation")}
            aria-label={t("shell.navigation")}
            aria-expanded={mobileSidebarOpen}
            className={`${iconButtonClass} lg:hidden`}
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="relative min-w-0 max-w-xl flex-1 sm:ms-3">
            <Search className="absolute top-1/2 start-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder={t("shell.search_placeholder")}
              aria-label={t("shell.search_placeholder")}
              className="h-10 w-full bg-surface-elevated py-2 ps-10 pe-4 text-dynamic-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setGeofenceModalOpen(true)}
              title={t(isGeoVerified ? "shell.location_verified" : "shell.location_review")}
              aria-label={t(isGeoVerified ? "shell.location_verified" : "shell.location_review")}
              className={`${iconButtonBaseClass} ${isGeoVerified ? "bg-success-soft text-success hover:bg-success-soft" : "bg-warning-soft text-warning hover:bg-warning-soft"}`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 ${isGeoVerified ? "bg-success" : "bg-warning"}`} />
              <MapPin className="h-4 w-4" />
            </button>

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

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="w-full min-w-0 space-y-6">
            <RBACRouteGuard
              route={activeRoute}
              onReturnSafeRoute={() => setActiveRoute("dashboard")}
            >
              {activeRoute === "dashboard" && (
                <DashboardModule
                  employees={employees}
                  onNavigateModule={(r) => setActiveRoute(r)}
                />
              )}
              {activeRoute === "work_hub" && <WorkSuiteModule globalSearchQuery={globalSearchQuery} />}
              {activeRoute === "workspace" && <WorkSuiteModule globalSearchQuery={globalSearchQuery} initialArea="WORKSPACE" />}
              {activeRoute === "mail" && <MailModule globalSearchQuery={globalSearchQuery} />}
              {activeRoute === "chat" && <ChatModule globalSearchQuery={globalSearchQuery} />}
              {activeRoute === "employees" && (
                <EmployeeModule
                  employees={employees}
                  onAddEmployee={handleAddEmployee}
                  onAddEmployees={handleAddEmployees}
                  onUpdateEmployee={handleUpdateEmployee}
                  globalSearchQuery={globalSearchQuery}
                />
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
              {activeRoute === "files" && (
                <FilesManagerModule
                  files={vaultFiles}
                  onUploadFile={(file) => setVaultFiles((prev) => [file, ...prev])}
                  onOpenInDocMaker={(templateId) => {
                    setSelectedDocTemplateId(templateId);
                    setActiveRoute("doc_maker");
                  }}
                  globalSearchQuery={globalSearchQuery}
                />
              )}
              {activeRoute === "doc_maker" && (
                <DocMakerModule
                  initialTemplateId={selectedDocTemplateId}
                  onSaveToVault={(file) => setVaultFiles((prev) => [file, ...prev])}
                />
              )}
              {activeRoute === "compliance" && (
                <ComplianceZatcaModule
                  employees={employees}
                  invoices={invoices}
                  selectedInvoiceNumber={selectedInvoiceNo}
                  onAppendInvoice={handleEmitZatcaInvoice}
                />
              )}
              {activeRoute === "settings" && <MasterSettingsModule />}
            </RBACRouteGuard>
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 bg-surface px-4 py-3 text-dynamic-xs text-muted sm:px-6 lg:px-8">
          <span>{t("shell.footer_compliance")}</span>
          <span className="rounded-lg bg-surface-elevated px-2.5 py-1 font-medium">
            {t("app.badge.pdpl")}
          </span>
        </footer>
      </div>

      {/* GEOFENCING SAFETY PROVIDER VERIFICATION & EXCEPTION MODAL */}
      {geofenceModalOpen && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-primary rounded-2xl max-w-2xl w-full p-4 shadow-shell space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-theme pb-4">
              <div>
                <h2 className="text-dynamic-xl font-extrabold text-foreground">
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
                  className="p-3 rounded-xl bg-success-soft border border-success text-success font-bold text-dynamic-xs text-start"
                >
                  {t("geo.sim.inside_kafd")}
                </button>
                <button
                  type="button"
                  onClick={() => simulateCoordinatePreset("high_drift")}
                  className="p-3 rounded-xl bg-warning-soft border border-warning text-warning font-bold text-dynamic-xs text-start"
                >
                  {t("geo.sim.high_drift")}
                </button>
                <button
                  type="button"
                  onClick={() => simulateCoordinatePreset("outside_zone")}
                  className="p-3 rounded-xl bg-danger-soft border border-danger text-danger font-bold text-dynamic-xs text-start"
                >
                  {t("geo.sim.outside_zone")}
                </button>
                <button
                  type="button"
                  onClick={triggerBrowserHtml5Geolocation}
                  className="p-3 rounded-xl bg-primary-soft border border-primary text-primary font-bold text-dynamic-xs text-start"
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
                      ? "text-danger"
                      : "text-success"
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
                <div className="flex items-center gap-2.5 text-success font-bold text-dynamic-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{t("geo.status.verified")}</span>
                </div>
                <button
                  type="button"
                  onClick={() => executeAttendancePunch()}
                  className="inline-flex min-h-10 items-center justify-center px-4 py-2 bg-success text-on-primary font-bold text-dynamic-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2"
                >
                  {t("geo.execute_punch")}
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-danger-soft border-2 border-danger space-y-4">
                <div className="flex items-start gap-2.5 text-danger">
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
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 bg-danger px-4 py-2 text-dynamic-xs font-bold text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
                    >
                      <Send className="h-4 w-4" />
                      <span>{t("geo.exception.submit_btn")}</span>
                    </button>
                  </div>
                  {exceptionSubmittedToast && (
                    <div className="text-dynamic-xs font-bold text-success pt-1">
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
  );
};
