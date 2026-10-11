import React, { useMemo, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Grid2X2,
  List,
  Lock,
  Upload,
  X
} from "lucide-react";
import { useLanguage, BilingualText } from "@/context/LanguageContext";
import { DataTableFrame, FilterDrawerTrigger, iconButtonClass, inlineFormControlClassName, PageHeader, PrototypeNotice, primaryButtonClass, ResponsiveFilterDrawer, secondaryButtonClass, surfaceClassName } from "@/components/DesignSystem";
import { DocMakerModule } from "@/modules/DocMakerModule";
import { getLocalISODate } from "@/services/dateUtils";

export type VaultFolderKey =
  | "QIWA"
  | "MUQEEM"
  | "ZATCA"
  | "WPS"
  | "VENDORS"
  | "DOCMAKER";

export interface VaultFileItem {
  id: string;
  fileName: string;
  title: BilingualText;
  folder: VaultFolderKey;
  format: string;
  dataUrl?: string;
  sizeLabel: string;
  sha256Short: string;
  pdplTier: "PDPL_RESTRICTED" | "STATUTORY_ARCHIVE" | "B2B_CONFIDENTIAL";
  updatedAt: string;
  linkedTemplateId?: string;
}

export const INITIAL_VAULT_FILES: VaultFileItem[] = [
  {
    id: "FILE-KSA-701",
    fileName: "Qiwa_Unified_Contract_EMP1001_Tariq.docx",
    title: {
      en: "MHRSD Qiwa Unified Employment Contract — Tariq Al-Qahtani",
      ar: "عقد العمل الموحد الموثق في منصة قوى — طارق القحطاني"
    },
    folder: "QIWA",
    format: "DOCX",
    sizeLabel: "248 KB",
    sha256Short: "8f92a1c4...e901b2",
    pdplTier: "PDPL_RESTRICTED",
    updatedAt: "2026-10-02",
    linkedTemplateId: "QIWA"
  },
  {
    id: "FILE-KSA-702",
    fileName: "Commercial_Quotation_Q2026_Sovereign_Cloud.docx",
    title: {
      en: "Bilingual B2B Commercial Price Quotation — Sovereign Cloud SLA",
      ar: "عرض سعر تجاري مزدوج اللغة — اتفاقية السحابة السيادية"
    },
    folder: "DOCMAKER",
    format: "DOCX",
    sizeLabel: "312 KB",
    sha256Short: "4c18d7e2...a039f1",
    pdplTier: "B2B_CONFIDENTIAL",
    updatedAt: "2026-10-02",
    linkedTemplateId: "QUOTATION"
  },
  {
    id: "FILE-KSA-703",
    fileName: "ZATCA_Phase2_Signed_Invoice_00419.xml",
    title: {
      en: "ZATCA Fatoora Phase 2 Signed UBL 2.1 XML Envelope #419",
      ar: "الفاتورة الضريبية الموقعة للمرحلة الثانية زاتكا #419"
    },
    folder: "ZATCA",
    format: "XML",
    sizeLabel: "44 KB",
    sha256Short: "cb9f41e8...1c3b5d",
    pdplTier: "STATUTORY_ARCHIVE",
    updatedAt: "2026-10-02"
  },
  {
    id: "FILE-KSA-704",
    fileName: "SAMA_SARIE_WPS_Payroll_Batch_Oct2026.xlsx",
    title: {
      en: "SAMA SARIE Wage Protection System (WPS) October 2026 Batch",
      ar: "ملف مسير حماية الأجور البنكي لشهر أكتوبر 2026"
    },
    folder: "WPS",
    format: "XLSX",
    sizeLabel: "518 KB",
    sha256Short: "7a11b09c...92d4e8",
    pdplTier: "PDPL_RESTRICTED",
    updatedAt: "2026-10-01"
  },
  {
    id: "FILE-KSA-705",
    fileName: "EOSB_Final_Clearance_Deed_Template.docx",
    title: {
      en: "Article 84/85 End-of-Service Final Settlement & Clearance Deed",
      ar: "إقرار مخالصة نهائية واستلام مستحقات نهاية الخدمة"
    },
    folder: "DOCMAKER",
    format: "DOCX",
    sizeLabel: "194 KB",
    sha256Short: "2e55f8a1...c710d3",
    pdplTier: "STATUTORY_ARCHIVE",
    updatedAt: "2026-10-01",
    linkedTemplateId: "EOSB"
  },
  {
    id: "FILE-KSA-706",
    fileName: "MOCI_CR_1010684921_AlYamamah_SLA.pdf",
    title: {
      en: "MOCI Commercial Registration & Saudization SLA — Al-Yamamah Co.",
      ar: "شهادة السجل التجاري واتفاقية مستوى الخدمة — شركة اليمامة"
    },
    folder: "VENDORS",
    format: "PDF",
    sizeLabel: "1.4 MB",
    sha256Short: "9b30c4d1...f882a0",
    pdplTier: "B2B_CONFIDENTIAL",
    updatedAt: "2026-09-29"
  }
];

interface FilesManagerModuleProps {
  files: VaultFileItem[];
  onUploadFile: (newFile: VaultFileItem) => void;
  canOpenDocMaker: boolean;
  globalSearchQuery: string;
}

type VaultViewMode = "GRID" | "LIST";
type VaultTierFilter = "ALL" | VaultFileItem["pdplTier"];

const VAULT_FOLDERS: Array<"ALL" | VaultFolderKey> = [
  "ALL",
  "QIWA",
  "MUQEEM",
  "ZATCA",
  "WPS",
  "VENDORS",
  "DOCMAKER"
];

const VAULT_TIER_STYLES: Record<VaultFileItem["pdplTier"], string> = {
  PDPL_RESTRICTED: "bg-danger-soft text-danger-text",
  STATUTORY_ARCHIVE: "bg-primary-soft text-primary-text",
  B2B_CONFIDENTIAL: "bg-warning-soft text-warning-text"
};

const FileFormatIcon: React.FC<{ format: string; className?: string }> = ({ format, className = "h-5 w-5" }) => {
  if (format === "XLSX" || format === "CSV") {
    return <FileSpreadsheet aria-hidden="true" className={className} />;
  }
  if (format === "XML") {
    return <FileCode2 aria-hidden="true" className={className} />;
  }
  return <FileText aria-hidden="true" className={className} />;
};

export const FilesManagerModule: React.FC<FilesManagerModuleProps> = ({
  files,
  onUploadFile,
  canOpenDocMaker,
  globalSearchQuery
}) => {
  const { t, localize } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeFolder, setActiveFolder] = useState<"ALL" | VaultFolderKey>("ALL");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(files[0]?.id ?? null);
  const [sortBy, setSortBy] = useState<"UPDATED_DESC" | "NAME_ASC" | "SIZE_DESC">("UPDATED_DESC");
  const [tierFilter, setTierFilter] = useState<VaultTierFilter>("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<VaultViewMode>("GRID");
  const [documentEditorOpen, setDocumentEditorOpen] = useState(false);
  const [documentTemplateId, setDocumentTemplateId] = useState<string>("BLANK");
  const [documentSavedNotice, setDocumentSavedNotice] = useState(false);

  const filteredFiles = useMemo(() => {
    const queries = [globalSearchQuery]
      .map((query) => query.trim().toLowerCase())
      .filter(Boolean);
    const matched = files.filter((file) => {
      if (activeFolder !== "ALL" && file.folder !== activeFolder) return false;
      if (tierFilter !== "ALL" && file.pdplTier !== tierFilter) return false;
      const haystack = `${file.fileName} ${file.title.en} ${file.title.ar} ${file.id} ${file.folder} ${file.format}`.toLowerCase();
      return queries.every((query) => haystack.includes(query));
    });
    const sizeInKb = (label: string) => {
      const value = Number.parseFloat(label) || 0;
      return label.toUpperCase().includes("MB") ? value * 1024 : value;
    };
    return matched.sort((left, right) => {
      if (sortBy === "NAME_ASC") return left.fileName.localeCompare(right.fileName);
      if (sortBy === "SIZE_DESC") return sizeInKb(right.sizeLabel) - sizeInKb(left.sizeLabel);
      return right.updatedAt.localeCompare(left.updatedAt);
    });
  }, [files, activeFolder, globalSearchQuery, sortBy, tierFilter]);

  const selectedItem = filteredFiles.find((file) => file.id === selectedFileId) ?? filteredFiles[0] ?? null;

  const handleNativeFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const extension = file.name.split(".").pop()?.toUpperCase() || "FILE";
    const knownFormats = ["DOCX", "DOC", "PDF", "XLSX", "XLS", "CSV", "XML", "TXT", "PNG", "JPG", "JPEG"];
    const format = knownFormats.includes(extension) ? extension : "FILE";
    const arrayBuffer = await file.arrayBuffer();
    let digest = `${file.size.toString(16).padStart(8, "0")}...${extension.toLowerCase()}`;
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      digest = Array.from(new Uint8Array(hashBuffer))
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("file-read-failed"));
      reader.readAsDataURL(file);
    });

    const uploaded: VaultFileItem = {
      id: `FILE-KSA-${Date.now().toString().slice(-6)}`,
      fileName: file.name,
      title: {
        en: `Uploaded Enterprise Asset — ${file.name}`,
        ar: `وثيقة مؤسسية مرفوعة — ${file.name}`
      },
      folder: activeFolder === "ALL" ? "DOCMAKER" : activeFolder,
      format,
      dataUrl,
      sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      sha256Short: `${digest.slice(0, 12)}...${digest.slice(-8)}`,
      pdplTier: activeFolder === "VENDORS" ? "B2B_CONFIDENTIAL" : activeFolder === "ZATCA" ? "STATUTORY_ARCHIVE" : "PDPL_RESTRICTED",
      updatedAt: getLocalISODate()
    };

    onUploadFile(uploaded);
    setSelectedFileId(uploaded.id);
    setActiveFolder(uploaded.folder);
    event.target.value = "";
  };

  const handleDownloadFile = (item: VaultFileItem) => {
    const anchor = document.createElement("a");
    if (item.dataUrl) {
      anchor.href = item.dataUrl;
      anchor.download = item.fileName;
    } else {
      const manifest = `YaModeer WORKSPACE VAULT ARCHIVE\nDocument ID: ${item.id}\nFile: ${item.fileName}\nTitle (EN): ${item.title.en}\nTitle (AR): ${item.title.ar}\nSHA-256 Integrity: ${item.sha256Short}\nSDAIA PDPL Classification: ${item.pdplTier}\nTimestamp: ${item.updatedAt}`;
      const blob = new Blob([manifest], { type: "text/plain;charset=utf-8" });
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `${item.fileName.replace(/\.[^.]+$/, "")}.vault-manifest.txt`;
    }
    anchor.click();
    if (anchor.href.startsWith("blob:")) URL.revokeObjectURL(anchor.href);
  };

  const openDocumentEditor = (templateId?: string) => {
    if (!canOpenDocMaker) return;
    setDocumentSavedNotice(false);
    setDocumentTemplateId(templateId && templateId !== "IMPORTED" ? templateId : "BLANK");
    setActiveFolder("DOCMAKER");
    setDocumentEditorOpen(true);
  };

  const saveDocumentToVault = (file: VaultFileItem) => {
    onUploadFile(file);
    setSelectedFileId(file.id);
    setActiveFolder(file.folder);
    setDocumentSavedNotice(true);
  };

  const selectFolder = (folder: "ALL" | VaultFolderKey) => {
    setActiveFolder(folder);
    if (folder !== "DOCMAKER") setDocumentEditorOpen(false);
  };

  const moveFolderFocus = (event: React.KeyboardEvent<HTMLButtonElement>, currentFolder: "ALL" | VaultFolderKey) => {
    const currentIndex = VAULT_FOLDERS.indexOf(currentFolder);
    let nextIndex: number | undefined;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = (currentIndex + 1) % VAULT_FOLDERS.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + VAULT_FOLDERS.length) % VAULT_FOLDERS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = VAULT_FOLDERS.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextFolder = VAULT_FOLDERS[nextIndex];
    selectFolder(nextFolder);
    window.requestAnimationFrame(() => document.getElementById(`files-folder-${nextFolder}-tab`)?.focus());
  };

  const selectedImage = selectedItem?.dataUrl && ["PNG", "JPG", "JPEG"].includes(selectedItem.format)
    ? selectedItem.dataUrl
    : null;

  const fileActions = (item: VaultFileItem, compact = false) => (
    <div className={`flex items-center ${compact ? "gap-1" : "flex-wrap gap-2"}`}>
      {canOpenDocMaker && item.linkedTemplateId && item.linkedTemplateId !== "IMPORTED" && (
        <button
          type="button"
          onClick={() => openDocumentEditor(item.linkedTemplateId)}
          aria-label={t("file.btn.open_in_docmaker")}
          title={t("file.btn.open_in_docmaker")}
          className={compact
            ? "inline-flex h-9 w-9 items-center justify-center rounded-md border border-theme bg-surface-elevated text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            : secondaryButtonClass}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {!compact && <span>{t("file.btn.open_in_docmaker")}</span>}
        </button>
      )}
      <button
        type="button"
        onClick={() => handleDownloadFile(item)}
        aria-label={t(item.dataUrl ? "file.btn.download" : "file.btn.download_manifest")}
        title={t(item.dataUrl ? "file.btn.download" : "file.btn.download_manifest")}
        className={compact
          ? "inline-flex h-9 w-9 items-center justify-center rounded-md border border-theme bg-surface-elevated text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          : primaryButtonClass}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {!compact && <span>{t(item.dataUrl ? "file.btn.download" : "file.btn.download_manifest")}</span>}
      </button>
    </div>
  );

  const renderFileCard = (item: VaultFileItem) => {
    const isSelected = selectedItem?.id === item.id;
    const iconTone = item.format === "XLSX" || item.format === "CSV"
      ? "bg-success-soft text-success-text"
      : item.format === "XML"
        ? "bg-accent-soft text-accent-text"
        : "bg-primary-soft text-primary-text";
    return (
      <button
        key={item.id}
        type="button"
        aria-pressed={isSelected}
        onClick={() => setSelectedFileId(item.id)}
        className={`${surfaceClassName} flex min-h-[13rem] min-w-0 flex-col gap-3 p-4 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          isSelected ? "border-primary bg-primary-soft/20" : "hover:border-accent"
        }`}
      >
        <span className="flex w-full items-start justify-between gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconTone}`}>
            <FileFormatIcon format={item.format} className="h-5 w-5" />
          </span>
          <span className="rounded-md border border-theme bg-surface-elevated px-2 py-1 font-mono text-dynamic-xs font-bold text-foreground">
            {item.format}
          </span>
        </span>
        <span className="min-w-0">
          <span className="block line-clamp-2 min-h-10 text-dynamic-sm font-bold leading-snug text-foreground">
            {localize(item.title)}
          </span>
          <span className="mt-1 block truncate font-mono text-dynamic-xs text-muted">{item.fileName}</span>
        </span>
        <span className="mt-auto flex w-full items-center justify-between gap-2 text-dynamic-xs text-muted">
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            <Folder className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{t(`file.folder.${item.folder}`)}</span>
          </span>
          <span className="shrink-0 tabular-nums">{item.updatedAt}</span>
        </span>
        <span className={`inline-flex w-fit max-w-full truncate rounded-md px-2 py-1 text-dynamic-xs font-semibold ${VAULT_TIER_STYLES[item.pdplTier]}`}>
          {t(`file.tier.${item.pdplTier}`)}
        </span>
      </button>
    );
  };

  return (
    <div className="min-w-0 space-y-4">
      {!documentEditorOpen && (
        <>
          <PageHeader
            eyebrow={t("nav.group.documents")}
            title={t("file.header.title")}
            actions={(
              <div className="flex flex-wrap items-center justify-end gap-2">
                {canOpenDocMaker && (
                  <button type="button" onClick={() => openDocumentEditor("BLANK")} className={secondaryButtonClass}>
                    <FileText aria-hidden="true" className="h-4 w-4" />
                    <span>{t("file.btn.new_document")}</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" onChange={handleNativeFileUpload} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={primaryButtonClass}>
                  <Upload aria-hidden="true" className="h-4 w-4" />
                  <span>{t("file.btn.upload")}</span>
                </button>
              </div>
            )}
            helper={(
              <div className="space-y-3">
                <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
                  <span>{t("file.filter.classification")}</span>
                  <select value={tierFilter} onChange={(event) => setTierFilter(event.target.value as VaultTierFilter)} className={`${inlineFormControlClassName} text-dynamic-xs`}>
                    <option value="ALL">{t("file.filter.all")}</option>
                    <option value="PDPL_RESTRICTED">{t("file.tier.PDPL_RESTRICTED")}</option>
                    <option value="STATUTORY_ARCHIVE">{t("file.tier.STATUTORY_ARCHIVE")}</option>
                    <option value="B2B_CONFIDENTIAL">{t("file.tier.B2B_CONFIDENTIAL")}</option>
                  </select>
                </label>
                <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
                  <span>{t("ui.sort_by")}</span>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className={`${inlineFormControlClassName} text-dynamic-xs`}>
                    <option value="UPDATED_DESC">{t("ui.sort.updated_desc")}</option>
                    <option value="NAME_ASC">{t("ui.sort.name_asc")}</option>
                    <option value="SIZE_DESC">{t("ui.sort.size_desc")}</option>
                  </select>
                </label>
              </div>
            )}
          />

          <PrototypeNotice label={t("collab.badge.local_demo")}>{t("file.prototype.notice")}</PrototypeNotice>
          {documentSavedNotice && (
            <div role="status" aria-live="polite" className="flex items-center justify-between gap-3 border border-success bg-success-soft px-3 py-2 text-dynamic-xs font-semibold text-success-text">
              <span className="min-w-0 break-words">{t("doc.status.saved")}</span>
              <button
                type="button"
                onClick={() => setDocumentSavedNotice(false)}
                title={t("doc.action.close")}
                aria-label={t("doc.action.close")}
                className={iconButtonClass}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          )}

          <ResponsiveFilterDrawer
            id="files-filter-controls"
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            onClear={() => {
              setTierFilter("ALL");
              setSortBy("UPDATED_DESC");
              selectFolder("ALL");
            }}
            title={t("file.filter.title")}
            closeLabel={t("ui.close")}
            clearLabel={t("ui.clear_filters")}
            doneLabel={t("ui.done")}
          >
            <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
              <span>{t("file.filter.classification")}</span>
              <select value={tierFilter} onChange={(event) => setTierFilter(event.target.value as VaultTierFilter)} className={`${inlineFormControlClassName} text-dynamic-xs`}>
                <option value="ALL">{t("file.filter.all")}</option>
                <option value="PDPL_RESTRICTED">{t("file.tier.PDPL_RESTRICTED")}</option>
                <option value="STATUTORY_ARCHIVE">{t("file.tier.STATUTORY_ARCHIVE")}</option>
                <option value="B2B_CONFIDENTIAL">{t("file.tier.B2B_CONFIDENTIAL")}</option>
              </select>
            </label>
            <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
              <span>{t("ui.sort_by")}</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className={`${inlineFormControlClassName} text-dynamic-xs`}>
                <option value="UPDATED_DESC">{t("ui.sort.updated_desc")}</option>
                <option value="NAME_ASC">{t("ui.sort.name_asc")}</option>
                <option value="SIZE_DESC">{t("ui.sort.size_desc")}</option>
              </select>
            </label>
          </ResponsiveFilterDrawer>
        </>
      )}

      {documentEditorOpen ? (
        <DocMakerModule
          initialTemplateId={documentTemplateId}
          onSaveToVault={saveDocumentToVault}
          onReturnToFiles={() => setDocumentEditorOpen(false)}
        />
      ) : (
        <div className="min-w-0 space-y-3">
          <div aria-labelledby="files-folders-heading" className="min-w-0">
            <h2 id="files-folders-heading" className="sr-only">{t("file.section.folders")}</h2>
            <p className="sr-only">{t("file.section.folders_note")}</p>
            <div id="files-folder-tablist" role="tablist" aria-label={t("file.section.folders")} aria-orientation="horizontal" className="flex min-w-0 gap-1 overflow-x-auto pb-1">
              {VAULT_FOLDERS.map((folder) => {
                const selected = activeFolder === folder;
                const count = folder === "ALL" ? files.length : files.filter((file) => file.folder === folder).length;
                const FolderIcon = folder === "ALL" ? FolderOpen : folder === "DOCMAKER" ? FileText : Folder;
                return (
                  <button
                    key={folder}
                    id={`files-folder-${folder}-tab`}
                    type="button"
                    role="tab"
                    aria-label={`${t(`file.folder.${folder}`)} (${count} ${t("ui.records")})`}
                    title={t(`file.folder.${folder}`)}
                    aria-selected={selected}
                    aria-controls="files-folder-panel"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => selectFolder(folder)}
                    onKeyDown={(event) => moveFolderFocus(event, folder)}
                    className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-dynamic-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      selected ? "border-primary bg-primary-soft text-primary-text" : "border-theme bg-surface text-muted hover:bg-surface-elevated hover:text-foreground"
                    }`}
                  >
                    <FolderIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    <span>{t(`file.folder.${folder}`)}</span>
                    <span className="font-mono text-dynamic-xs tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div key={`${activeFolder}-files`} id="files-folder-panel" role="tabpanel" aria-labelledby={`files-folder-${activeFolder}-tab`} tabIndex={0} className="app-panel-enter min-w-0">
            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-5">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-theme pb-2">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h2 id="files-library-heading" className="text-dynamic-base font-bold text-foreground">{t("file.section.library")}</h2>
                    <span className="text-dynamic-xs font-semibold tabular-nums text-muted">{filteredFiles.length} {t("ui.records")}</span>
                  </div>
                  <div className="ms-auto flex flex-wrap items-center justify-end gap-2">
                    <div role="group" aria-label={t("file.view.label")} className="inline-flex items-center rounded-md border border-theme bg-surface-elevated p-1">
                      <button
                        type="button"
                        aria-label={t("file.view.grid")}
                        aria-pressed={viewMode === "GRID"}
                        onClick={() => setViewMode("GRID")}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${viewMode === "GRID" ? "bg-primary-soft text-primary-text" : "text-muted hover:bg-surface-muted hover:text-foreground"}`}
                      >
                        <Grid2X2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("file.view.list")}
                        aria-pressed={viewMode === "LIST"}
                        onClick={() => setViewMode("LIST")}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${viewMode === "LIST" ? "bg-primary-soft text-primary-text" : "text-muted hover:bg-surface-muted hover:text-foreground"}`}
                      >
                        <List aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                    <FilterDrawerTrigger
                      label={t("file.filter.button")}
                      controls="files-filter-controls"
                      expanded={filtersOpen}
                      activeCount={tierFilter === "ALL" ? 0 : 1}
                      onClick={() => setFiltersOpen((open) => !open)}
                    />
                  </div>
                </div>
                {viewMode === "GRID" ? (
                  <section aria-labelledby="files-library-heading" className="space-y-3">
                    {filteredFiles.length ? (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                        {filteredFiles.map(renderFileCard)}
                      </div>
                    ) : (
                      <div className={`${surfaceClassName} p-8 text-center text-dynamic-sm text-muted`}>
                        {t("ui.no_results")}
                      </div>
                    )}
                  </section>
                ) : (
                  <DataTableFrame title={t("file.section.library")} count={filteredFiles.length} countLabel={t("ui.records")}>
                    <table className="min-w-[760px] w-full border-collapse text-start">
                      <thead>
                        <tr className="border-b border-theme bg-surface-elevated text-dynamic-xs uppercase text-muted">
                          <th className="py-3.5 ps-5 pe-3 text-start font-bold">{t("file.col.name")}</th>
                          <th className="px-3 py-3.5 text-start font-bold">{t("file.col.format_size")}</th>
                          <th className="px-3 py-3.5 text-start font-bold">{t("file.col.hash")}</th>
                          <th className="py-3.5 ps-3 pe-5 text-end font-bold">{t("file.col.actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme">
                        {filteredFiles.map((item) => {
                          const isSelected = selectedItem?.id === item.id;
                          return (
                            <tr key={item.id} className={`transition-colors ${isSelected ? "bg-primary-soft/20" : "hover:bg-surface-elevated"}`}>
                              <td className="py-3.5 ps-5 pe-3 align-top">
                                <button type="button" aria-pressed={isSelected} onClick={() => setSelectedFileId(item.id)} className="flex min-w-0 items-start gap-2.5 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-text"><FileFormatIcon format={item.format} /></span>
                                  <span className="min-w-0">
                                    <span className="block text-dynamic-sm font-bold text-foreground">{localize(item.title)}</span>
                                    <span className="mt-0.5 block truncate font-mono text-dynamic-xs text-muted">{item.fileName}</span>
                                  </span>
                                </button>
                              </td>
                              <td className="px-3 py-3.5 align-top">
                                <span className="rounded-md border border-theme bg-surface-elevated px-2 py-1 font-mono text-dynamic-xs font-bold text-foreground">{item.format}</span>
                                <span className="mt-2 block text-dynamic-xs text-muted">{item.sizeLabel}</span>
                              </td>
                              <td className="px-3 py-3.5 align-top">
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-elevated px-2 py-1 font-mono text-dynamic-xs text-foreground"><Lock aria-hidden="true" className="h-3 w-3 text-primary-text" />{item.sha256Short}</span>
                                <span className={`mt-2 block w-fit rounded-md px-2 py-1 text-dynamic-xs font-semibold ${VAULT_TIER_STYLES[item.pdplTier]}`}>{t(`file.tier.${item.pdplTier}`)}</span>
                              </td>
                              <td className="py-3.5 ps-3 pe-5 align-top text-end">{fileActions(item, true)}</td>
                            </tr>
                          );
                        })}
                        {filteredFiles.length === 0 && (
                          <tr><td colSpan={4} className="px-5 py-8 text-center text-dynamic-sm text-muted">{t("ui.no_results")}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </DataTableFrame>
                )}
              </div>

              <aside aria-labelledby="files-preview-heading" className={`hidden xl:block ${surfaceClassName} h-fit min-w-0 p-4 xl:sticky xl:top-24 xl:self-start`}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-theme pb-3">
                  <div className="min-w-0 flex-1 basis-24">
                    <h2 id="files-preview-heading" className="text-dynamic-base font-bold text-foreground">{t("file.preview.title")}</h2>
                    {selectedItem && <p className="mt-1 truncate text-dynamic-xs text-muted">{selectedItem.fileName}</p>}
                  </div>
                  {selectedItem && <div className="shrink-0">{fileActions(selectedItem, true)}</div>}
                </div>

                {selectedItem ? (
                  <div className="space-y-4 pt-4">
                    <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-lg border border-theme bg-surface-elevated p-4 text-center">
                      {selectedImage ? (
                        <img src={selectedImage} alt={selectedItem.fileName} className="max-h-40 max-w-full rounded-md object-contain" />
                      ) : (
                        <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
                          <FileFormatIcon format={selectedItem.format} className="h-7 w-7" />
                        </span>
                      )}
                      <span className="font-mono text-dynamic-xs font-bold text-foreground">{selectedItem.format} · {selectedItem.sizeLabel}</span>
                      <span className="max-w-full line-clamp-2 text-dynamic-xs text-muted">{t("file.preview.metadata_only")}</span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-dynamic-xs font-bold uppercase tracking-wide text-muted">{t("file.preview.details")}</h3>
                      <dl className="divide-y divide-theme rounded-lg border border-theme bg-surface">
                        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 px-3 py-2.5">
                          <dt className="min-w-0 break-words text-dynamic-xs text-muted">{t("file.meta.document_id")}</dt>
                          <dd className="min-w-0 max-w-full break-all text-end font-mono text-dynamic-xs font-semibold text-foreground">{selectedItem.id}</dd>
                        </div>
                        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 px-3 py-2.5">
                          <dt className="min-w-0 break-words text-dynamic-xs text-muted">{t("file.meta.folder")}</dt>
                          <dd className="min-w-0 max-w-full break-words text-end text-dynamic-xs font-semibold text-foreground">{t(`file.folder.${selectedItem.folder}`)}</dd>
                        </div>
                        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 px-3 py-2.5">
                          <dt className="min-w-0 break-words text-dynamic-xs text-muted">{t("file.meta.updated")}</dt>
                          <dd className="min-w-0 max-w-full break-words text-end tabular-nums text-dynamic-xs font-semibold text-foreground">{selectedItem.updatedAt}</dd>
                        </div>
                        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 px-3 py-2.5">
                          <dt className="min-w-0 break-words text-dynamic-xs text-muted">{t("file.meta.classification")}</dt>
                          <dd className={`min-w-0 max-w-full break-words rounded-md px-2 py-1 text-end text-dynamic-xs font-semibold ${VAULT_TIER_STYLES[selectedItem.pdplTier]}`}>{t(`file.tier.${selectedItem.pdplTier}`)}</dd>
                        </div>
                        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 px-3 py-2.5">
                          <dt className="min-w-0 break-words text-dynamic-xs text-muted">{t("file.meta.integrity")}</dt>
                          <dd className="min-w-0 max-w-full break-all text-end font-mono text-dynamic-xs text-foreground">{selectedItem.sha256Short}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center text-dynamic-sm text-muted">{t("file.preview.empty")}</div>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
