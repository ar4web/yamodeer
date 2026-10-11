import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

type WorkspaceToolbarContextValue = {
  headingNode: HTMLElement | null;
  toolsNode: HTMLElement | null;
  helperNode: HTMLElement | null;
  headingOccupied: boolean;
  helperOccupied: boolean;
  setHeadingNode: (node: HTMLDivElement | null) => void;
  setToolsNode: (node: HTMLDivElement | null) => void;
  setHelperNode: (node: HTMLDivElement | null) => void;
  claimHeading: () => void;
  releaseHeading: () => void;
  claimHelper: () => void;
  releaseHelper: () => void;
};

const WorkspaceToolbarContext = createContext<WorkspaceToolbarContextValue | null>(null);

export const useWorkspaceToolbarTargets = (): WorkspaceToolbarContextValue | null =>
  useContext(WorkspaceToolbarContext);

export const WorkspaceToolbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [headingNode, setHeadingNode] = useState<HTMLElement | null>(null);
  const [toolsNode, setToolsNode] = useState<HTMLElement | null>(null);
  const [helperNode, setHelperNode] = useState<HTMLElement | null>(null);
  const [headingOccupied, setHeadingOccupied] = useState(false);
  const [helperOccupied, setHelperOccupied] = useState(false);
  const headingClaimsRef = useRef(0);
  const helperClaimsRef = useRef(0);

  const claimHeading = useCallback(() => {
    headingClaimsRef.current += 1;
    setHeadingOccupied(true);
  }, []);

  const releaseHeading = useCallback(() => {
    headingClaimsRef.current = Math.max(0, headingClaimsRef.current - 1);
    setHeadingOccupied(headingClaimsRef.current > 0);
  }, []);

  const claimHelper = useCallback(() => {
    helperClaimsRef.current += 1;
    setHelperOccupied(true);
  }, []);

  const releaseHelper = useCallback(() => {
    helperClaimsRef.current = Math.max(0, helperClaimsRef.current - 1);
    setHelperOccupied(helperClaimsRef.current > 0);
  }, []);

  const value = useMemo(
    () => ({
      headingNode,
      toolsNode,
      helperNode,
      headingOccupied,
      helperOccupied,
      setHeadingNode,
      setToolsNode,
      setHelperNode,
      claimHeading,
      releaseHeading,
      claimHelper,
      releaseHelper
    }),
    [claimHeading, claimHelper, headingNode, headingOccupied, helperNode, helperOccupied, releaseHeading, releaseHelper, toolsNode]
  );

  return <WorkspaceToolbarContext.Provider value={value}>{children}</WorkspaceToolbarContext.Provider>;
};

export const WorkspaceToolbar: React.FC<{ fallbackTitle: string }> = ({ fallbackTitle }) => {
  const { t } = useLanguage();
  const ctx = useWorkspaceToolbarTargets();

  return (
    <div
      data-workspace-toolbar="true"
      role="region"
      aria-label={t("shell.workspace_toolbar")}
      className="flex min-h-12 items-center gap-3 border-t border-theme px-3 py-2 sm:px-6 lg:px-8"
    >
      <div className="min-w-0 flex-1">
        {!ctx?.headingOccupied && (
          <h1 className="min-w-0 break-words border-s-2 border-accent ps-3 text-dynamic-lg font-semibold leading-tight text-foreground">
            {fallbackTitle}
          </h1>
        )}
        <div ref={ctx?.setHeadingNode} className="min-w-0 empty:hidden" />
      </div>
      <div
        ref={ctx?.setToolsNode}
        role="toolbar"
        aria-label={t("ui.page_tools")}
        className="ms-auto flex min-w-0 max-w-[72%] flex-wrap items-center justify-end gap-2"
      />
    </div>
  );
};

export const WorkspaceHelperMenu: React.FC<{ fallbackTitle: string; onFocusSearch: () => void }> = ({
  fallbackTitle,
  onFocusSearch
}) => {
  const { t } = useLanguage();
  const ctx = useWorkspaceToolbarTargets();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  return (
    <div data-workspace-helper="true" className="pointer-events-none">
      <button
        type="button"
        aria-label={t("shell.helper.button")}
        title={t("shell.helper.button")}
        aria-expanded={open}
        aria-controls="workspace-helper-window"
        onClick={() => setOpen((current) => !current)}
        className="pointer-events-auto fixed end-3 top-[min(52%,calc(100dvh-8rem))] z-40 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-theme bg-surface text-foreground shadow-card transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      <div
        id="workspace-helper-window"
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="workspace-helper-title"
        aria-hidden={!open}
        tabIndex={-1}
        inert={!open}
        className={`fixed end-16 top-[min(52%,calc(100dvh-8rem))] z-40 w-[min(20rem,calc(100vw-5rem))] -translate-y-1/2 rounded-xl border border-theme bg-surface shadow-card ${
          open ? "pointer-events-auto" : "pointer-events-none invisible"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-theme px-3 py-2.5">
          <div className="min-w-0">
            <p id="workspace-helper-title" className="text-dynamic-sm font-semibold text-foreground">
              {t("shell.helper.title")}
            </p>
            <p className="mt-0.5 truncate text-dynamic-xs text-muted">{fallbackTitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            title={t("ui.close")}
            aria-label={t("ui.close")}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-theme bg-surface text-muted hover:bg-surface-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[min(28rem,calc(100dvh-12rem))] space-y-3 overflow-y-auto p-3">
          <div ref={ctx?.setHelperNode} className="space-y-3 empty:hidden" />
          {!ctx?.helperOccupied && (
            <p className="text-dynamic-xs leading-relaxed text-muted">{t("shell.helper.empty")}</p>
          )}
          <button
            type="button"
            onClick={() => {
              onFocusSearch();
              setOpen(false);
            }}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-theme bg-surface-elevated px-3 py-2 text-dynamic-sm font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {t("shell.helper.search")}
          </button>
        </div>
      </div>
    </div>
  );
};
