import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  FileCode2,
  Upload,
  Lock,
  ExternalLink,
  Download
} from "lucide-react";
import { useLanguage, BilingualText } from "@/context/LanguageContext";
import { DataTableFrame, PageHeader, ResponsiveDrawer, primaryButtonClass, secondaryButtonClass } from "@/components/DesignSystem";

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
  onOpenInDocMaker: (templateId?: string) => void;
  globalSearchQuery: string;
}

export const FilesManagerModule: React.FC<FilesManagerModuleProps> = ({
  files,
  onUploadFile,
  onOpenInDocMaker,
  globalSearchQuery
}) => {
  const { t, localize } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeFolder, setActiveFolder] = useState<"ALL" | VaultFolderKey>(
    "ALL"
  );
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);
  const [folderSidebarOpen, setFolderSidebarOpen] = useState(true);
  const [isWideScreen, setIsWideScreen] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches
  );
  const [sortBy, setSortBy] = useState<"UPDATED_DESC" | "NAME_ASC" | "SIZE_DESC">("UPDATED_DESC");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    const syncViewport = () => {
      setIsWideScreen(mediaQuery.matches);
      if (mediaQuery.matches) setFolderDrawerOpen(false);
    };
    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  const filteredFiles = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    const matched = files.filter((f) => {
      if (activeFolder !== "ALL" && f.folder !== activeFolder) return false;
      if (q) {
        const hay = `${f.fileName} ${f.title.en} ${f.title.ar} ${f.id}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
    const sizeInKb = (label: string) => {
      const value = Number.parseFloat(label) || 0;
      return label.toUpperCase().includes("MB") ? value * 1024 : value;
    };
    return matched.sort((a, b) => {
      if (sortBy === "NAME_ASC") return a.fileName.localeCompare(b.fileName);
      if (sortBy === "SIZE_DESC") return sizeInKb(b.sizeLabel) - sizeInKb(a.sizeLabel);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [files, activeFolder, globalSearchQuery, sortBy]);

  const handleNativeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
      updatedAt: new Date().toISOString().slice(0, 10)
    };

    onUploadFile(uploaded);
    e.target.value = "";
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

  const folders: Array<"ALL" | VaultFolderKey> = [
    "ALL",
    "QIWA",
    "MUQEEM",
    "ZATCA",
    "WPS",
    "VENDORS",
    "DOCMAKER"
  ];

  const selectFolder = (folderKey: "ALL" | VaultFolderKey) => {
    setActiveFolder(folderKey);
    setFolderDrawerOpen(false);
  };

  const toggleFolderNavigation = () => {
    if (isWideScreen) {
      setFolderSidebarOpen((open) => !open);
    } else {
      setFolderDrawerOpen(true);
    }
  };

  const renderFolderNavigation = () => (
    <nav className="space-y-0.5" aria-label={t("file.sidebar.folders")}>
      {folders.map((folderKey) => {
        const isActive = activeFolder === folderKey;
        const FolderIcon = isActive ? FolderOpen : Folder;
        const count = folderKey === "ALL" ? files.length : files.filter((file) => file.folder === folderKey).length;
        return (
          <button
            key={folderKey}
            type="button"
            aria-pressed={isActive}
            onClick={() => selectFolder(folderKey)}
            className={`flex w-full items-center justify-between gap-2 px-3 py-3 text-start transition-colors ${isActive ? "bg-surface font-semibold text-primary" : "text-muted hover:bg-surface hover:text-foreground"}`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <FolderIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate text-dynamic-xs font-bold">{t(`file.folder.${folderKey}`)}</span>
            </span>
            <span className={`shrink-0 px-2 py-0.5 font-mono text-dynamic-xs font-bold ${isActive ? "bg-surface text-primary" : "bg-surface-elevated text-muted"}`}>
              {count}
            </span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-w-0 gap-4 xl:gap-6">
      <aside
        id="files-folder-sidebar"
        aria-label={t("file.sidebar.folders")}
        className={`hidden min-w-0 shrink-0 bg-surface-elevated p-3 xl:w-[17rem] ${folderSidebarOpen ? "xl:block" : ""}`}
      >
        <h2 className="mb-3 px-3 text-dynamic-xs font-semibold uppercase tracking-wide text-muted">{t("file.sidebar.folders")}</h2>
        {renderFolderNavigation()}
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <PageHeader
          eyebrow={t("nav.group.documents")}
          title={t("file.header.title")}
          actions={(
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                aria-controls={isWideScreen ? "files-folder-sidebar" : "files-folder-drawer"}
                aria-expanded={isWideScreen ? folderSidebarOpen : folderDrawerOpen}
                aria-label={`${t("file.sidebar.folders")}: ${t(`file.folder.${activeFolder}`)}`}
                title={t("file.sidebar.folders")}
                onClick={toggleFolderNavigation}
                className={secondaryButtonClass}
              >
                <FolderOpen className="h-4 w-4" aria-hidden="true" />
                <span>{t(`file.folder.${activeFolder}`)}</span>
              </button>
              <select aria-label={t("ui.sort_by")} value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="h-10 min-w-40 bg-surface-elevated px-3 text-dynamic-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="UPDATED_DESC">{t("ui.sort.updated_desc")}</option>
                <option value="NAME_ASC">{t("ui.sort.name_asc")}</option>
                <option value="SIZE_DESC">{t("ui.sort.size_desc")}</option>
              </select>
              <input ref={fileInputRef} type="file" onChange={handleNativeFileUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className={primaryButtonClass}>
                <Upload className="h-4 w-4" />
                <span>{t("file.btn.upload")}</span>
              </button>
            </div>
          )}
        />

        <ResponsiveDrawer
          id="files-folder-drawer"
          open={folderDrawerOpen}
          onClose={() => setFolderDrawerOpen(false)}
          title={t("file.sidebar.folders")}
          closeLabel={t("ui.close")}
          placement="start"
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-3">{renderFolderNavigation()}</div>
        </ResponsiveDrawer>

        <DataTableFrame
            title={t("file.table.title")}
            count={filteredFiles.length}
            countLabel={t("ui.records")}
          >
              <table className="min-w-[860px] w-full border-collapse text-start">
                <thead>
                  <tr className="bg-surface-elevated border-b border-theme text-muted text-dynamic-xs uppercase">
                    <th className="py-3.5 ps-5 pe-3 text-start font-bold">
                      {t("file.col.name")}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t("file.col.format_size")}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t("file.col.hash")}
                    </th>
                    <th className="py-3.5 ps-3 pe-5 text-end font-bold">
                      {t("file.col.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {filteredFiles.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-primary-soft/30"
                    >
                      <td className="py-4 ps-5 pe-3 align-top">
                        <div className="flex items-start gap-2.5">
                          {item.format === "XLSX" ? (
                            <FileSpreadsheet className="w-5 h-5 text-success mt-0.5 shrink-0" />
                          ) : item.format === "XML" ? (
                            <FileCode2 className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                          ) : (
                            <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                          )}
                          <div>
                            <div className="font-bold text-dynamic-sm text-foreground">
                              {localize(item.title)}
                            </div>
                            <div className="text-dynamic-xs font-mono text-muted">
                              {item.fileName} • {item.updatedAt}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-3 align-top font-mono">
                        <span className="px-2.5 py-0.5 rounded bg-primary-soft text-primary font-bold text-dynamic-xs">
                          {item.format}
                        </span>
                        <div className="text-dynamic-xs text-muted pt-1">
                          {item.sizeLabel}
                        </div>
                      </td>

                      <td className="py-4 px-3 align-top">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-elevated border border-theme text-dynamic-xs font-mono text-foreground">
                          <Lock className="w-3 h-3 text-primary" />
                          <span>{item.sha256Short}</span>
                        </div>
                        <div className="text-dynamic-xs font-bold text-accent pt-1">
                          {t(`file.tier.${item.pdplTier}`)}
                        </div>
                      </td>

                      <td className="py-4 ps-3 pe-5 align-top text-end">
                        <div className="inline-flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenInDocMaker(item.linkedTemplateId)
                            }
                            className={primaryButtonClass}
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>{t("file.btn.open_in_docmaker")}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(item)}
                            className={secondaryButtonClass}
                          >
                            <Download className="h-4 w-4" />
                            <span>{t(item.dataUrl ? "file.btn.download" : "file.btn.download_manifest")}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredFiles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-dynamic-sm text-muted">
                        {t("ui.no_results")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
          </DataTableFrame>
      </div>
    </div>
  );
};
