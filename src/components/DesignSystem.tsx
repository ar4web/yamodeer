import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export type MetricTone = "primary" | "accent" | "success" | "warning" | "danger";

const metricToneClasses: Record<MetricTone, { icon: string; marker: string }> = {
  primary: { icon: "bg-primary-soft text-primary", marker: "bg-primary" },
  accent: { icon: "bg-accent-soft text-accent", marker: "bg-accent" },
  success: { icon: "bg-success-soft text-success", marker: "bg-success" },
  warning: { icon: "bg-warning-soft text-warning", marker: "bg-warning" },
  danger: { icon: "bg-danger-soft text-danger", marker: "bg-danger" }
};

export interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  title: string;
  titleAccessory?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  titleAccessory,
  meta,
  actions
}) => {
  const { t } = useLanguage();
  const hasToolbar = Boolean(meta || actions);

  return (
    <div className="flex flex-col gap-4 pb-2 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <h1 className="min-w-0 break-words text-dynamic-xl font-semibold leading-tight text-foreground">
          {title}
        </h1>
        {titleAccessory}
      </div>
      {hasToolbar && (
        <div
          role="toolbar"
          aria-label={t("ui.page_tools")}
          className="flex w-full max-w-full flex-wrap items-center gap-2 xl:w-auto xl:max-w-[76%] xl:shrink-0 xl:justify-end"
        >
          {meta}
          {actions}
        </div>
      )}
    </div>
  );
};

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  note?: React.ReactNode;
  tone?: MetricTone;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  note,
  tone = "primary"
}) => {
  const toneClasses = metricToneClasses[tone];

  return (
    <article className="relative isolate overflow-hidden bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-shell">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-dynamic-sm font-semibold text-muted">{label}</p>
          <div className="mt-2 text-dynamic-xl font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </div>
          {note && (
            <div className="mt-2 text-dynamic-xs leading-relaxed text-muted">
              {note}
            </div>
          )}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses.icon}`}>
          {icon}
        </div>
      </div>
      <div className={`absolute inset-y-4 start-0 w-0.5 rounded-e-full ${toneClasses.marker}`} />
    </article>
  );
};

export interface HorizontalBarDatum {
  label: string;
  value: number;
  tone?: MetricTone;
}

export interface HorizontalBarChartProps {
  data: readonly HorizontalBarDatum[];
  valueFormatter?: (value: number) => string;
  maxValue?: number;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  data,
  valueFormatter = (value) => String(value),
  maxValue
}) => {
  const maximum = Math.max(maxValue ?? 0, ...data.map((item) => item.value), 1);

  return (
    <div role="list" className="space-y-3">
      {data.map((item, index) => {
        const toneClasses = metricToneClasses[item.tone ?? "primary"];
        const widthPercent = Math.max(0, Math.min(100, (item.value / maximum) * 100));
        return (
          <div key={`${item.label}-${index}`} role="listitem" className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-dynamic-xs">
              <span className="min-w-0 truncate font-medium text-foreground">{item.label}</span>
              <span className="shrink-0 font-mono font-semibold text-muted tabular-nums">
                {valueFormatter(item.value)}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={item.label}
              aria-valuemin={0}
              aria-valuemax={maximum}
              aria-valuenow={item.value}
              aria-valuetext={valueFormatter(item.value)}
              className="h-2.5 overflow-hidden rounded-full bg-surface-muted"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${toneClasses.marker}`}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export interface DataTableFrameProps {
  title: string;
  count?: number;
  countLabel?: string;
  description?: string;
  actions?: React.ReactNode;
  scrollRegionClassName?: string;
  children: React.ReactNode;
}

export const DataTableFrame: React.FC<DataTableFrameProps> = ({
  title,
  count,
  countLabel,
  description,
  actions,
  scrollRegionClassName,
  children
}) => (
  <section className="overflow-hidden bg-surface shadow-card">
    <div className="flex flex-col gap-3 bg-surface-elevated px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
      <div className="min-w-0">
        <h2 className="text-dynamic-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 text-dynamic-xs text-muted">{description}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {count !== undefined && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-elevated px-2.5 py-1 text-dynamic-xs text-muted">
            <span className="font-semibold tabular-nums text-foreground">{count}</span>
            {countLabel && <span>{countLabel}</span>}
          </span>
        )}
        {actions}
      </div>
    </div>
    <div role="region" aria-label={title} tabIndex={0} className={`max-w-full overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${scrollRegionClassName ?? ""}`}>{children}</div>
  </section>
);

export const iconButtonBaseClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50";

export const iconButtonClass =
  `${iconButtonBaseClass} bg-surface-elevated text-muted hover:bg-surface-muted hover:text-foreground`;

export const primaryButtonClass =
  "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 bg-primary px-4 py-2 text-dynamic-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 bg-surface-elevated px-4 py-2 text-dynamic-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export type ResponsiveDrawerPlacement = "start" | "end";

export interface ResponsiveDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  id?: string;
  placement?: ResponsiveDrawerPlacement;
  children: React.ReactNode;
}

export const ResponsiveDrawer: React.FC<ResponsiveDrawerProps> = ({
  open,
  onClose,
  title,
  closeLabel,
  id,
  placement = "end",
  children
}) => {
  const { direction } = useLanguage();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const titleId = useId();
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!open || !portalRoot) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    const overlayLayer = dialogRef.current?.parentElement;
    const inertSiblings = Array.from(document.body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlayLayer)
      .map((element) => ({ element, wasInert: element.inert }));
    inertSiblings.forEach(({ element }) => { element.inert = true; });
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      inertSiblings.forEach(({ element, wasInert }) => { element.inert = wasInert; });
      document.body.style.overflow = previousOverflow;
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, [open, portalRoot]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      ) ?? []
    ).filter((element) => element.getClientRects().length > 0 && !element.closest("[hidden]"));

    if (!focusable.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (!dialogRef.current?.contains(active)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const handleSwipeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    touchStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSwipeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const startY = touchStartYRef.current;
    touchStartYRef.current = null;
    if (startY !== null && event.clientY - startY > 64) onClose();
  };

  if (!portalRoot) return null;

  const desktopPlacementClass = placement === "start" ? "sm:justify-start" : "sm:justify-end";
  const desktopBorderClass = placement === "start" ? "sm:border-e sm:border-s-0" : "sm:border-s sm:border-e-0";

  return createPortal(
    <div
      aria-hidden={!open}
      className={open ? `fixed inset-0 z-[60] flex flex-col justify-end bg-black/20 sm:flex-row ${desktopPlacementClass}` : "hidden"}
      dir={direction}
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        id={id}
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`flex h-[88dvh] max-h-[88dvh] w-full flex-col border-t border-theme bg-surface pb-[env(safe-area-inset-bottom)] shadow-shell sm:h-[100dvh] sm:max-h-[100dvh] sm:w-[min(88vw,22rem)] sm:border-t-0 ${desktopBorderClass}`}
      >
        <div
          aria-hidden="true"
          onPointerDown={handleSwipeStart}
          onPointerUp={handleSwipeEnd}
          onPointerCancel={() => { touchStartYRef.current = null; }}
          className="flex h-6 shrink-0 cursor-grab touch-none justify-center pt-2 sm:hidden"
        >
          <span className="h-1 w-10 bg-theme" />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-theme px-4 py-3">
          <h2 id={titleId} className="min-w-0 text-dynamic-lg font-semibold text-foreground">{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
            className={iconButtonClass}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    portalRoot
  );
};

export interface FilterDrawerTriggerProps {
  label: string;
  controls: string;
  expanded: boolean;
  activeCount?: number;
  onClick: () => void;
  className?: string;
}

export const FilterDrawerTrigger: React.FC<FilterDrawerTriggerProps> = ({
  label,
  controls,
  expanded,
  activeCount = 0,
  onClick,
  className = ""
}) => {
  const { t } = useLanguage();
  const accessibleLabel = activeCount > 0
    ? t("ui.filters.active_count")
      .replace("{label}", label)
      .replace("{count}", String(activeCount))
    : label;

  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      aria-controls={controls}
      aria-expanded={expanded}
      onClick={onClick}
      className={`${secondaryButtonClass} ${className}`}
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
      {activeCount > 0 && (
        <span aria-hidden="true" className="inline-flex h-5 min-w-5 items-center justify-center bg-primary-soft px-1 text-dynamic-xs font-bold text-primary tabular-nums">
          {activeCount}
        </span>
      )}
    </button>
  );
};

export interface FilterDrawerEdgeTriggerProps {
  label: string;
  controls: string;
  expanded: boolean;
  activeCount?: number;
  onClick: () => void;
  placement?: ResponsiveDrawerPlacement;
  className?: string;
}

export const FilterDrawerEdgeTrigger: React.FC<FilterDrawerEdgeTriggerProps> = ({
  label,
  controls,
  expanded,
  activeCount = 0,
  onClick,
  placement = "end",
  className = ""
}) => {
  const { t, direction } = useLanguage();
  const accessibleLabel = activeCount > 0
    ? t("ui.filters.active_count")
      .replace("{label}", label)
      .replace("{count}", String(activeCount))
    : label;
  const pointsLeftWhenOpening = placement === "end" ? direction === "ltr" : direction === "rtl";
  const ArrowIcon = expanded
    ? pointsLeftWhenOpening ? ChevronRight : ChevronLeft
    : pointsLeftWhenOpening ? ChevronLeft : ChevronRight;
  const edgePositionClass = placement === "start" ? "start-0" : "end-0";
  const edgeBorderClass = placement === "start" ? "border-e" : "border-s";

  return (
    <button
      type="button"
      dir={direction}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      aria-controls={controls}
      aria-expanded={expanded}
      onClick={onClick}
      className={`fixed ${edgePositionClass} top-1/2 z-40 inline-flex h-14 w-9 -translate-y-1/2 flex-col items-center justify-center gap-0.5 border-y border-theme bg-surface-elevated text-muted shadow-card transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${edgeBorderClass} ${className}`}
    >
      <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
      <ArrowIcon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
};

export interface ResponsiveFilterDrawerProps {
  id: string;
  open: boolean;
  onClose: () => void;
  onClear: () => void;
  title: string;
  closeLabel: string;
  clearLabel: string;
  doneLabel: string;
  children: React.ReactNode;
}

export const ResponsiveFilterDrawer: React.FC<ResponsiveFilterDrawerProps> = ({
  id,
  open,
  onClose,
  onClear,
  title,
  closeLabel,
  clearLabel,
  doneLabel,
  children
}) => (
  <ResponsiveDrawer
    id={id}
    open={open}
    onClose={onClose}
    title={title}
    closeLabel={closeLabel}
    placement="end"
  >
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {children}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-theme px-4 py-3 sm:px-5">
        <button type="button" onClick={onClear} className={secondaryButtonClass}>{clearLabel}</button>
        <button type="button" onClick={onClose} className={primaryButtonClass}>{doneLabel}</button>
      </div>
    </div>
  </ResponsiveDrawer>
);

export const tabButtonClass = (active: boolean): string =>
  `inline-flex min-h-10 items-center justify-center gap-2 px-3.5 py-2 text-dynamic-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
    active
      ? "bg-primary text-on-primary"
      : "text-muted hover:bg-surface-elevated hover:text-foreground"
  }`;

export interface SegmentedTabOption<Value extends string> {
  value: Value;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedTabsProps<Value extends string> {
  id: string;
  ariaLabel: string;
  value: Value;
  items: readonly SegmentedTabOption<Value>[];
  onChange: (value: Value) => void;
  layout?: "inline" | "grid" | "scroll";
}

export const SegmentedTabs = <Value extends string,>({
  id,
  ariaLabel,
  value,
  items,
  onChange,
  layout = "inline"
}: SegmentedTabsProps<Value>): React.ReactElement => {
  const { direction } = useLanguage();
  const enabledItems = items.filter((item) => !item.disabled);

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentValue: Value
  ) => {
    if (enabledItems.length === 0) return;
    const currentIndex = enabledItems.findIndex((item) => item.value === currentValue);
    let nextIndex: number | undefined;
    const forwardKey = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    const backwardKey = direction === "rtl" ? "ArrowRight" : "ArrowLeft";

    if (event.key === forwardKey) {
      nextIndex = (currentIndex + 1) % enabledItems.length;
    } else if (event.key === backwardKey) {
      nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = enabledItems.length - 1;
    }

    if (nextIndex === undefined || enabledItems.length === 0) return;
    event.preventDefault();
    const nextItem = enabledItems[nextIndex];
    onChange(nextItem.value);
    window.requestAnimationFrame(() => {
      document.getElementById(`${id}-${nextItem.value}-tab`)?.focus();
    });
  };

  return (
    <div
      id={`${id}-tablist`}
      role="tablist"
      aria-label={ariaLabel}
      className={`${
        layout === "grid"
          ? "grid w-full grid-cols-2"
          : layout === "scroll"
            ? "flex w-full flex-nowrap overflow-x-auto"
            : "inline-flex flex-wrap"
      } max-w-full items-center gap-1 bg-surface-elevated p-1`}
    >
      {items.map((item) => {
        const selected = value === item.value;
        return (
          <button
            key={item.value}
            id={`${id}-${item.value}-tab`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${id}-${item.value}-panel`}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => handleKeyDown(event, item.value)}
            className={`${tabButtonClass(selected)} ${
              layout === "grid"
                ? "w-full min-w-0 text-start"
                : layout === "scroll"
                  ? "shrink-0 whitespace-nowrap"
                  : ""
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export interface TabPanelProps {
  id: string;
  labelledBy?: string;
  hidden?: boolean;
  children?: React.ReactNode;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  id,
  labelledBy,
  hidden = false,
  children
}) => (
  <div
    id={id}
    role="tabpanel"
    aria-labelledby={labelledBy}
    tabIndex={hidden ? -1 : 0}
    hidden={hidden}
    className="min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
  >
    {children}
  </div>
);
