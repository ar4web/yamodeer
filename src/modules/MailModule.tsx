import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  FileText,
  FolderOpen,
  Inbox,
  Mail,
  Paperclip,
  Pencil,
  PlusCircle,
  Reply,
  Send,
  Sparkles,
  Star,
  Trash2,
  X
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  MailComposeInput,
  MailFolderKey,
  MailMessage,
  MailProviderKey,
  MailText,
  useMail
} from "@/context/MailContext";
import { iconButtonBaseClass, iconButtonClass, primaryButtonClass, ResponsiveDrawer, secondaryButtonClass } from "@/components/DesignSystem";
import { isMailAiEndpointConfigured, runMailAi } from "@/services/mailAi";

type MailFolderView = MailFolderKey | "STARRED";
type MessageFilter = "ALL" | "UNREAD" | "ATTACHMENTS";

const MAIL_FOLDERS: Array<{ key: MailFolderView; icon: React.ElementType }> = [
  { key: "INBOX", icon: Inbox },
  { key: "STARRED", icon: Star },
  { key: "SENT", icon: Send },
  { key: "DRAFTS", icon: FileText },
  { key: "ARCHIVE", icon: Archive },
  { key: "TRASH", icon: Trash2 }
];

const MAIL_PROVIDERS: MailProviderKey[] = ["GOOGLE", "MICROSOFT", "YAHOO", "ICLOUD", "IMAP"];

const formatMailTime = (value: string, language: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const locale = language === "ar" ? "ar-SA" : "en-SA";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
};

const formatFileSize = (sizeBytes: number, language: string): string => {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const size = sizeBytes / 1024;
  return `${size.toLocaleString(language === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 1 })} KB`;
};

const cleanSubject = (subject: string): string => subject.replace(/^(?:(?:re|fw|fwd)|رد)[:：]\s*/i, "").trim();

export const MailModule: React.FC<{ globalSearchQuery: string }> = ({ globalSearchQuery }) => {
  const { t, localize, language } = useLanguage();
  const displaySubject = (subject: MailText): string => localize(subject).trim() || t("mail.message.no_subject");
  const {
    accounts,
    messages,
    addDemoAccount,
    removeAccount,
    markMessageRead,
    toggleMessageStar,
    moveMessage,
    saveDraft,
    sendDemoMessage
  } = useMail();

  const [selectedAccountId, setSelectedAccountId] = useState("ALL");
  const [activeFolder, setActiveFolder] = useState<MailFolderView>("INBOX");
  const [messageFilter, setMessageFilter] = useState<MessageFilter>("ALL");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [mobileReaderOpen, setMobileReaderOpen] = useState(false);
  const [mobileFoldersOpen, setMobileFoldersOpen] = useState(false);
  const [accountsModalOpen, setAccountsModalOpen] = useState(false);
  const [connectProvider, setConnectProvider] = useState<MailProviderKey>("GOOGLE");
  const [connectNotice, setConnectNotice] = useState("");
  const [demoName, setDemoName] = useState("");
  const [demoEmail, setDemoEmail] = useState("");
  const [toast, setToast] = useState("");

  const [composeOpen, setComposeOpen] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | undefined>();
  const [composeAccountId, setComposeAccountId] = useState("");
  const [composeForm, setComposeForm] = useState<MailComposeInput>({
    to: "",
    cc: "",
    subject: "",
    body: "",
    attachments: []
  });
  const [ccVisible, setCcVisible] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiError, setAiError] = useState("");

  const activeAccount = accounts.find((account) => account.id === selectedAccountId) ?? accounts[0];
  const composeAccount = accounts.find((account) => account.id === composeAccountId) ?? accounts[0];
  const selectedMessage = messages.find((message) => message.id === selectedMessageId);
  const isAiLive = isMailAiEndpointConfigured();

  useEffect(() => {
    if (selectedAccountId !== "ALL" && !accounts.some((account) => account.id === selectedAccountId)) {
      setSelectedAccountId(accounts[0]?.id ?? "ALL");
    }
    if (!composeAccountId || !accounts.some((account) => account.id === composeAccountId)) {
      setComposeAccountId(accounts[0]?.id ?? "");
    }
  }, [accounts, selectedAccountId, composeAccountId]);

  const currentMailboxMessages = useMemo(() => {
    const query = globalSearchQuery.trim().toLocaleLowerCase(language === "ar" ? "ar-SA" : "en-US");
    return messages
      .filter((message) => selectedAccountId === "ALL" || message.accountId === selectedAccountId)
      .filter((message) => activeFolder === "STARRED" ? message.isStarred && message.folder !== "TRASH" : message.folder === activeFolder)
      .filter((message) => messageFilter === "UNREAD" ? message.isUnread : messageFilter === "ATTACHMENTS" ? message.attachments.length > 0 : true)
      .filter((message) => {
        if (!query) return true;
        const account = accounts.find((item) => item.id === message.accountId);
        const haystack = [
          localize(message.senderName), message.senderEmail, displaySubject(message.subject),
          localize(message.preview), localize(message.body), account?.emailAddress ?? ""
        ].join(" ").toLocaleLowerCase(language === "ar" ? "ar-SA" : "en-US");
        return haystack.includes(query);
      })
      .sort((a, b) => new Date(b.sentAtIso).getTime() - new Date(a.sentAtIso).getTime());
  }, [messages, selectedAccountId, activeFolder, messageFilter, globalSearchQuery, language, accounts, localize]);

  const folderCount = (folder: MailFolderView): number => {
    const scoped = messages.filter((message) => selectedAccountId === "ALL" || message.accountId === selectedAccountId);
    if (folder === "STARRED") return scoped.filter((message) => message.isStarred && message.folder !== "TRASH").length;
    if (folder === "INBOX") return scoped.filter((message) => message.folder === "INBOX" && message.isUnread).length;
    if (folder === "DRAFTS") return scoped.filter((message) => message.folder === "DRAFTS").length;
    return scoped.filter((message) => message.folder === folder).length;
  };

  useEffect(() => {
    if (!selectedMessageId || !currentMailboxMessages.some((message) => message.id === selectedMessageId)) {
      setSelectedMessageId(currentMailboxMessages[0]?.id ?? null);
      setAiSummary("");
      setAiError("");
    }
  }, [currentMailboxMessages, selectedMessageId]);

  useEffect(() => {
    setAiSummary("");
    setAiError("");
  }, [selectedMessageId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showFolder = (folder: MailFolderView) => {
    setActiveFolder(folder);
    setMobileReaderOpen(false);
    setMobileFoldersOpen(false);
    setMessageFilter("ALL");
  };

  const selectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
    setMobileFoldersOpen(false);
  };

  const openMessage = (message: MailMessage) => {
    if (message.folder === "DRAFTS") {
      openDraft(message);
      return;
    }
    setSelectedMessageId(message.id);
    if (message.isUnread) markMessageRead(message.id, false);
    setMobileReaderOpen(true);
  };

  const openCompose = (message?: MailMessage) => {
    setMobileFoldersOpen(false);
    setAiError("");
    setAiSummary("");
    setEditingDraftId(undefined);
    setComposeAccountId(message?.accountId ?? activeAccount?.id ?? accounts[0]?.id ?? "");
    setCcVisible(false);
    setComposeForm({
      to: message?.senderEmail ?? "",
      cc: "",
      subject: message ? `${t("mail.compose.reply_prefix")} ${cleanSubject(displaySubject(message.subject))}` : "",
      body: "",
      attachments: []
    });
    setComposeOpen(true);
  };

  const openDraft = (message: MailMessage) => {
    setAiError("");
    setAiSummary("");
    setEditingDraftId(message.id);
    setComposeAccountId(message.accountId);
    setCcVisible(Boolean(message.cc));
    setComposeForm({ to: message.to, cc: message.cc, subject: localize(message.subject), body: localize(message.body), attachments: message.attachments });
    setComposeOpen(true);
  };

  const submitCompose = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!composeAccountId || !composeForm.to.trim() || !composeForm.subject.trim()) return;
    sendDemoMessage(composeAccountId, composeForm, editingDraftId);
    setComposeOpen(false);
    setEditingDraftId(undefined);
    setActiveFolder("SENT");
    setSelectedAccountId(composeAccountId);
    setToast(t("mail.toast.demo_sent"));
  };

  const handleSaveDraft = () => {
    if (!composeAccountId) return;
    const id = saveDraft(composeAccountId, composeForm, editingDraftId);
    setEditingDraftId(id);
    setComposeOpen(false);
    setActiveFolder("DRAFTS");
    setSelectedAccountId(composeAccountId);
    setToast(t("mail.toast.draft_saved"));
  };

  const openAccounts = () => {
    setMobileFoldersOpen(false);
    setConnectNotice("");
    setAccountsModalOpen(true);
  };

  const renderMailboxNavigation = () => (
    <>
      <label className="mb-3 block space-y-2">
        <span className="text-dynamic-xs font-semibold text-muted">{t("mail.account.current")}</span>
        <span className="relative block">
          <select aria-label={t("mail.account.current")} value={selectedAccountId} onChange={(event) => selectAccount(event.target.value)} className="w-full appearance-none border border-theme bg-surface py-2.5 ps-3 pe-8 text-dynamic-xs font-semibold text-foreground">
            <option value="ALL">{t("mail.account.all")}</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.emailAddress}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        </span>
      </label>

      <button type="button" onClick={() => openCompose()} disabled={!accounts.length} className={`${primaryButtonClass} mb-4 w-full`}>
        <Pencil className="h-4 w-4" /><span>{t("mail.button.compose")}</span>
      </button>

      <nav aria-label={t("mail.folder.navigation")} className="space-y-1">
        {MAIL_FOLDERS.map(({ key, icon: FolderIcon }) => {
          const active = activeFolder === key;
          const count = folderCount(key);
          return (
            <button key={key} type="button" aria-current={active ? "page" : undefined} onClick={() => showFolder(key)} className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-start text-dynamic-sm transition ${active ? "bg-primary-soft font-semibold text-primary" : "text-muted hover:bg-surface hover:text-foreground"}`}>
              <FolderIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{t(`mail.folder.${key}`)}</span>
              {count > 0 && <span className={`shrink-0 px-2 py-0.5 text-dynamic-xs tabular-nums ${active ? "bg-primary text-on-primary" : "bg-surface text-muted"}`}>{count}</span>}
            </button>
          );
        })}
      </nav>

      <div className="mt-5 border-t border-theme pt-3">
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <h2 className="text-dynamic-xs font-semibold uppercase tracking-wide text-muted">{t("mail.account.list_title")}</h2>
          <button type="button" onClick={openAccounts} title={t("mail.button.add_account")} aria-label={t("mail.button.add_account")} className={`${iconButtonBaseClass} bg-surface-elevated text-primary hover:bg-primary-soft`}><PlusCircle className="h-4 w-4" /></button>
        </div>
        <div className="space-y-1">
          {accounts.map((account) => (
            <button key={account.id} type="button" aria-pressed={selectedAccountId === account.id} onClick={() => selectAccount(account.id)} className={`flex w-full items-center gap-2.5 p-2 text-start transition ${selectedAccountId === account.id ? "bg-surface text-foreground shadow-card" : "text-muted hover:bg-surface"}`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary-soft text-primary"><Mail className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-dynamic-xs font-semibold">{account.displayName}</span>
                <span className="block truncate text-dynamic-xs text-muted">{account.emailAddress}</span>
              </span>
              <span className="h-2 w-2 shrink-0 bg-warning" title={t(`mail.connection.${account.connection}`)} />
            </button>
          ))}
          {!accounts.length && <p className="px-2 py-3 text-dynamic-xs text-muted">{t("mail.account.none")}</p>}
        </div>
      </div>
    </>
  );

  const handleProviderLogin = (provider: MailProviderKey) => {
    setConnectProvider(provider);
    setConnectNotice("");
    setDemoEmail("");
    setDemoName("");
    const startUrl = import.meta.env.VITE_MAIL_OAUTH_START_URL;
    if (provider !== "IMAP" && startUrl) {
      const target = new URL(startUrl, window.location.origin);
      target.searchParams.set("provider", provider.toLowerCase());
      target.searchParams.set("returnTo", window.location.origin);
      window.location.assign(target.toString());
      return;
    }
    setConnectNotice(t("mail.connect.not_configured"));
  };

  const submitDemoAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!demoEmail.trim()) return;
    addDemoAccount(connectProvider, demoName, demoEmail);
    setAccountsModalOpen(false);
    setSelectedAccountId("ALL");
    setActiveFolder("INBOX");
    setToast(t("mail.toast.account_added"));
  };

  const runAssistant = async (action: "summarize" | "draft_reply" | "polish", target: "reader" | "compose") => {
    const message = selectedMessage;
    const targetSubject = target === "compose" ? composeForm.subject : message ? displaySubject(message.subject) : "";
    const targetBody = target === "compose" ? composeForm.body : message ? localize(message.body) : "";
    if (target === "reader" && !message) return;
    setAiBusy(true);
    setAiError("");
    try {
      const result = await runMailAi({
        action: target === "compose" && action === "draft_reply" ? "draft" : action,
        subject: targetSubject,
        body: targetBody,
        senderName: target === "reader" && message ? localize(message.senderName) : composeForm.to.split("@")[0] || t("mail.ai.recipient_fallback"),
        userName: composeAccount?.displayName ?? activeAccount?.displayName ?? t("mail.ai.user_fallback"),
        language
      });
      if (action === "summarize") {
        setAiSummary(result);
        return;
      }
      if (target === "compose") {
        setComposeForm((current) => ({ ...current, body: result }));
        return;
      }
      if (action === "draft_reply" && message) {
        setEditingDraftId(undefined);
        setComposeAccountId(message.accountId);
        setCcVisible(false);
        setComposeForm({
          to: message.senderEmail,
          cc: "",
          subject: `${t("mail.compose.reply_prefix")} ${cleanSubject(displaySubject(message.subject))}`,
          body: result,
          attachments: []
        });
        setComposeOpen(true);
      }
    } catch {
      setAiError(t("mail.toast.ai_error"));
    } finally {
      setAiBusy(false);
    }
  };

  const handleFileAttach = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const additions = files.map((file) => ({
      id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fileName: file.name,
      sizeBytes: file.size
    }));
    setComposeForm((current) => ({ ...current, attachments: [...current.attachments, ...additions] }));
    event.target.value = "";
  };

  const demoAccountForm = connectNotice !== "";
  const activeMessage = selectedMessage && currentMailboxMessages.some((message) => message.id === selectedMessage.id) ? selectedMessage : currentMailboxMessages[0];

  return (
    <div className="space-y-4">
      <section className="grid min-h-[max(28rem,min(40rem,calc(100dvh_-_18rem)))] grid-cols-1 overflow-hidden rounded-2xl border border-theme bg-surface shadow-card md:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)] xl:grid-cols-[210px_minmax(280px,350px)_minmax(0,1fr)]">
        <header className="col-span-full flex flex-wrap items-center justify-between gap-3 border-b border-theme bg-surface px-3 py-3 sm:px-4">
          <h1 className="min-w-0 break-words text-dynamic-xl font-semibold leading-tight text-foreground">{t("mail.header.title")}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={openAccounts} className={secondaryButtonClass}>
              <Mail className="h-4 w-4" /><span>{t("mail.button.accounts")}</span>
            </button>
            <button type="button" onClick={() => openCompose()} disabled={!accounts.length} className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}>
              <Pencil className="h-4 w-4" /><span>{t("mail.button.compose")}</span>
            </button>
          </div>
        </header>
        <div role="note" className="col-span-full flex flex-wrap items-start gap-2.5 border-b border-theme bg-warning-soft px-3 py-2.5 text-dynamic-xs text-warning sm:px-4">
          <Bell className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("mail.notice.demo_title")}</p>
            <p className="mt-0.5 leading-relaxed">{t("mail.notice.demo_body")}</p>
          </div>
        </div>
        <aside className="hidden min-w-0 border-e border-theme bg-surface-elevated p-3 xl:block" aria-label={t("mail.folder.navigation")}>
          <div className="h-full overflow-y-auto">{renderMailboxNavigation()}</div>
        </aside>

        <ResponsiveDrawer
          id="mail-folder-drawer"
          open={mobileFoldersOpen}
          onClose={() => setMobileFoldersOpen(false)}
          title={t("mail.mobile_navigation")}
          closeLabel={t("ui.close")}
          placement="start"
        >
          <div className="min-h-0 flex-1 overflow-y-auto bg-surface-elevated p-3">{renderMailboxNavigation()}</div>
        </ResponsiveDrawer>

        <section className={`${mobileReaderOpen ? "hidden" : "flex"} min-w-0 flex-col border-b border-theme md:flex md:border-b-0 md:border-e`} aria-label={t("mail.message.list_title")}>
          <div className="space-y-2 border-b border-theme p-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("mail.filter.label")}>
              {([
                ["ALL", "mail.filter.all"],
                ["UNREAD", "mail.filter.unread"],
                ["ATTACHMENTS", "mail.filter.attachments"]
              ] as const).map(([filter, label]) => (
                <button key={filter} type="button" aria-pressed={messageFilter === filter} onClick={() => setMessageFilter(filter)} className={`rounded-lg px-2.5 py-1.5 text-dynamic-xs font-semibold transition ${messageFilter === filter ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-elevated hover:text-foreground"}`}>{t(label)}</button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 text-dynamic-xs text-muted">
              <button
                type="button"
                aria-controls="mail-folder-drawer"
                aria-expanded={mobileFoldersOpen}
                aria-label={`${t("mail.mobile_navigation")}: ${t(`mail.folder.${activeFolder}`)}`}
                onClick={() => setMobileFoldersOpen(true)}
                className={`${secondaryButtonClass} min-w-0 flex-1 justify-start xl:hidden`}
              >
                <FolderOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t(`mail.folder.${activeFolder}`)}</span>
                <ChevronDown className="ms-auto h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
              <span className="hidden min-w-0 flex-1 truncate font-semibold text-foreground xl:block">{t(`mail.folder.${activeFolder}`)}</span>
              <span className="shrink-0 tabular-nums">{currentMailboxMessages.length} {t("mail.message.count")}</span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {currentMailboxMessages.length ? currentMailboxMessages.map((message) => {
              const active = activeMessage?.id === message.id;
              return (
                <article key={message.id} className={`border-b border-theme px-3 py-3 transition ${active ? "bg-primary-soft/50" : "hover:bg-surface-elevated"}`}>
                  <div className="flex items-start gap-2.5">
                    <button type="button" onClick={() => openMessage(message)} className="flex min-w-0 flex-1 items-start gap-2.5 text-start" aria-label={`${localize(message.senderName)}: ${displaySubject(message.subject)}`}>
                      <span aria-hidden="true" className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-dynamic-xs font-bold ${message.isUnread ? "bg-primary-soft text-primary" : "bg-surface-elevated text-muted"}`}>{localize(message.senderName).slice(0, 1)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${message.isUnread ? "bg-primary" : "bg-transparent"}`} />
                          <span className={`min-w-0 flex-1 truncate text-dynamic-xs ${message.isUnread ? "font-bold text-foreground" : "font-medium text-muted"}`}>{localize(message.senderName)}</span>
                          <span className="shrink-0 text-dynamic-xs text-muted">{formatMailTime(message.sentAtIso, language)}</span>
                        </span>
                        <span className={`mt-1 block truncate text-dynamic-xs ${message.isUnread ? "font-semibold text-foreground" : "text-muted"}`}>{displaySubject(message.subject)}</span>
                        <span className="mt-1 block truncate text-dynamic-xs text-muted">{localize(message.preview)}</span>
                        <span className="mt-2 flex items-center gap-2">
                          {message.attachments.length > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-dynamic-xs text-muted"><Paperclip className="h-3 w-3" />{message.attachments.length}</span>}
                          {message.folder === "DRAFTS" && <span className="rounded-md bg-warning-soft px-1.5 py-0.5 text-dynamic-xs font-semibold text-warning">{t("mail.folder.DRAFTS")}</span>}
                        </span>
                      </span>
                    </button>
                    <button type="button" title={t(message.isStarred ? "mail.button.unstar" : "mail.button.star")} aria-label={t(message.isStarred ? "mail.button.unstar" : "mail.button.star")} aria-pressed={message.isStarred} onClick={() => toggleMessageStar(message.id)} className={`${iconButtonBaseClass} bg-surface-elevated text-muted hover:bg-warning-soft hover:text-warning`}>
                      <Star className={`h-4 w-4 ${message.isStarred ? "fill-warning text-warning" : ""}`} />
                    </button>
                  </div>
                </article>
              );
            }) : (
              <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
                <Inbox className="h-8 w-8 text-muted" />
                <p className="mt-3 text-dynamic-sm font-semibold text-foreground">{t("mail.message.empty_title")}</p>
                <p className="mt-1 max-w-xs text-dynamic-xs text-muted">{t("mail.message.empty_description")}</p>
              </div>
            )}
          </div>
        </section>

        <article className={`${mobileReaderOpen ? "block" : "hidden"} min-w-0 bg-surface md:block`} aria-label={t("mail.message.reading_pane")}>
          {activeMessage ? (
            <div className="flex h-full min-h-[max(28rem,min(40rem,calc(100dvh_-_18rem)))] flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-theme px-4 py-3">
                <button type="button" onClick={() => setMobileReaderOpen(false)} className={`${secondaryButtonClass} md:hidden`}>
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" /><span>{t("mail.button.back_to_list")}</span>
                </button>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" title={t("mail.button.archive")} aria-label={t("mail.button.archive")} onClick={() => moveMessage(activeMessage.id, "ARCHIVE")} className={`${iconButtonBaseClass} bg-surface-elevated text-muted hover:bg-surface-muted hover:text-foreground`}><Archive className="h-4 w-4" /></button>
                  <button type="button" title={t("mail.button.delete")} aria-label={t("mail.button.delete")} onClick={() => moveMessage(activeMessage.id, "TRASH")} className={`${iconButtonBaseClass} bg-surface-elevated text-muted hover:bg-danger-soft hover:text-danger`}><Trash2 className="h-4 w-4" /></button>
                  <button type="button" title={t(activeMessage.isUnread ? "mail.button.mark_read" : "mail.button.mark_unread")} aria-label={t(activeMessage.isUnread ? "mail.button.mark_read" : "mail.button.mark_unread")} onClick={() => markMessageRead(activeMessage.id, !activeMessage.isUnread)} className={`${iconButtonBaseClass} bg-surface-elevated text-muted hover:bg-surface-muted hover:text-foreground`}><Mail className="h-4 w-4" /></button>
                  <button type="button" title={t("mail.button.reply")} aria-label={t("mail.button.reply")} onClick={() => openCompose(activeMessage)} className={`${iconButtonBaseClass} bg-surface-elevated text-muted hover:bg-primary-soft hover:text-primary`}><Reply className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-dynamic-xl font-semibold text-foreground">{displaySubject(activeMessage.subject)}</h2>
                    {activeMessage.attachments.length > 0 && <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-surface-elevated px-2.5 py-1 text-dynamic-xs text-muted"><Paperclip className="h-3.5 w-3.5" />{activeMessage.attachments.length} {t("mail.message.attachments")}</span>}
                  </div>
                  <button type="button" title={t(activeMessage.isStarred ? "mail.button.unstar" : "mail.button.star")} aria-label={t(activeMessage.isStarred ? "mail.button.unstar" : "mail.button.star")} aria-pressed={activeMessage.isStarred} onClick={() => toggleMessageStar(activeMessage.id)} className={`${iconButtonBaseClass} bg-surface-elevated text-muted hover:bg-warning-soft hover:text-warning`}><Star className={`h-4 w-4 ${activeMessage.isStarred ? "fill-warning text-warning" : ""}`} /></button>
                </div>

                <div className="mt-5 flex items-start gap-3 border-y border-theme py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary text-dynamic-sm font-bold">{localize(activeMessage.senderName).slice(0, 1)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-dynamic-sm font-semibold text-foreground">{localize(activeMessage.senderName)}</span>
                      <span className="break-all text-dynamic-xs text-muted">&lt;{activeMessage.senderEmail}&gt;</span>
                    </div>
                    <div className="mt-1 break-all text-dynamic-xs text-muted">{t("mail.message.to")} {activeMessage.to || activeAccount?.emailAddress}</div>
                    {activeMessage.cc && <div className="mt-0.5 break-all text-dynamic-xs text-muted">{t("mail.compose.cc")}: {activeMessage.cc}</div>}
                  </div>
                  <time className="shrink-0 text-dynamic-xs text-muted">{formatMailTime(activeMessage.sentAtIso, language)}</time>
                </div>

                <div className="whitespace-pre-wrap py-5 text-dynamic-sm leading-relaxed text-foreground">
                  {localize(activeMessage.body)}
                </div>

                {activeMessage.attachments.length > 0 && (
                  <section className="border-t border-theme py-4">
                    <h3 className="mb-2 text-dynamic-xs font-semibold text-muted">{t("mail.message.attachments")}</h3>
                    <div className="flex flex-wrap gap-2">
                      {activeMessage.attachments.map((attachment) => <span key={attachment.id} className="inline-flex max-w-full items-center gap-2 rounded-xl border border-theme bg-surface-elevated px-3 py-2 text-dynamic-xs text-foreground"><Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" /><span className="truncate">{attachment.fileName}</span><span className="shrink-0 text-muted">{formatFileSize(attachment.sizeBytes, language)}</span></span>)}
                    </div>
                  </section>
                )}

                <section className="mt-2 space-y-3 rounded-2xl border border-primary/20 bg-primary-soft/40 p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary"><Sparkles className="h-4 w-4" /></span>
                      <div>
                        <h3 className="text-dynamic-sm font-semibold text-foreground">{t("mail.ai.title")}</h3>
                      </div>
                    </div>
                    <span className="rounded-full bg-surface px-2.5 py-1 text-dynamic-xs font-semibold text-primary">{t(isAiLive ? "mail.ai.badge_live" : "mail.ai.badge_demo")}</span>
                  </div>
                  <p className="text-dynamic-xs leading-relaxed text-muted">{t("mail.ai.disclaimer")}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={aiBusy} onClick={() => void runAssistant("summarize", "reader")} className={`${secondaryButtonClass} disabled:opacity-50`}>
                      <Sparkles className="h-4 w-4" /><span>{t("mail.ai.button_summary")}</span>
                    </button>
                    <button type="button" disabled={aiBusy} onClick={() => void runAssistant("draft_reply", "reader")} className={`${secondaryButtonClass} disabled:opacity-50`}>
                      <Reply className="h-4 w-4" /><span>{t("mail.ai.button_reply")}</span>
                    </button>
                  </div>
                  {aiBusy && <div className="inline-flex items-center gap-2 text-dynamic-xs text-muted"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />{t("mail.ai.working")}</div>}
                  {aiError && <p role="alert" className="text-dynamic-xs font-semibold text-danger">{aiError}</p>}
                  {aiSummary && <div className="rounded-xl border border-theme bg-surface p-3"><h4 className="text-dynamic-xs font-semibold text-primary">{t("mail.ai.summary_label")}</h4><p className="mt-1 whitespace-pre-wrap text-dynamic-xs leading-relaxed text-foreground">{aiSummary}</p></div>}
                </section>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[max(28rem,min(40rem,calc(100dvh_-_18rem)))] flex-col items-center justify-center p-6 text-center">
              <Mail className="h-10 w-10 text-primary" />
              <h2 className="mt-3 text-dynamic-base font-semibold text-foreground">{t("mail.message.choose_title")}</h2>
              <p className="mt-1 max-w-sm text-dynamic-xs text-muted">{t("mail.message.choose_description")}</p>
              <button type="button" onClick={() => openCompose()} disabled={!accounts.length} className={`${primaryButtonClass} mt-4 disabled:opacity-50`}><Pencil className="h-4 w-4" /><span>{t("mail.button.compose")}</span></button>
            </div>
          )}
        </article>
      </section>

      {toast && <div role="status" className="fixed bottom-5 end-5 z-40 flex items-center gap-2 rounded-xl border border-success bg-success-soft px-4 py-3 text-dynamic-sm font-semibold text-success shadow-shell"><CheckCircle2 className="h-4 w-4" />{toast}</div>}

      {accountsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="mail-accounts-title" className="max-h-[90vh] w-full max-w-3xl space-y-4 overflow-y-auto rounded-2xl border-2 border-primary bg-surface p-4 shadow-shell">
            <div className="flex items-start justify-between gap-3 border-b border-theme pb-3">
              <div><h2 id="mail-accounts-title" className="text-dynamic-lg font-bold text-foreground">{t("mail.connect.title")}</h2><p className="text-dynamic-xs text-muted">{t("mail.connect.description")}</p></div>
              <button type="button" title={t("mail.button.close")} aria-label={t("mail.button.close")} onClick={() => setAccountsModalOpen(false)} className={iconButtonClass}><X className="h-4 w-4" /></button>
            </div>

            {accounts.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-dynamic-xs font-semibold uppercase tracking-wide text-muted">{t("mail.account.connected_title")}</h3>
                {accounts.map((account) => (
                  <div key={account.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-theme bg-surface-elevated p-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary"><Mail className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-dynamic-sm font-semibold text-foreground">{account.displayName}</span><span className="block truncate text-dynamic-xs text-muted">{t(`mail.provider.${account.provider}`)} · {account.emailAddress}</span></span>
                    <span className="rounded-full bg-warning-soft px-2.5 py-1 text-dynamic-xs font-semibold text-warning">{t(`mail.connection.${account.connection}`)}</span>
                    <button type="button" onClick={() => { removeAccount(account.id); setToast(t("mail.toast.account_removed")); }} className="rounded-lg border border-theme px-3 py-2 text-dynamic-xs font-semibold text-muted hover:border-danger hover:text-danger">{t("mail.button.remove_account")}</button>
                  </div>
                ))}
              </section>
            )}

            <section className="space-y-2">
              <div><h3 className="text-dynamic-sm font-semibold text-foreground">{t("mail.connect.providers_title")}</h3><p className="text-dynamic-xs text-muted">{t("mail.connect.providers_description")}</p></div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {MAIL_PROVIDERS.map((provider) => (
                  <button key={provider} type="button" onClick={() => handleProviderLogin(provider)} className="flex items-center justify-between gap-3 rounded-xl border border-theme bg-surface-elevated p-3 text-start transition hover:border-primary hover:bg-primary-soft/40">
                    <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary"><Mail className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-dynamic-sm font-semibold text-foreground">{t(`mail.provider.${provider}`)}</span><span className="block text-dynamic-xs text-muted">{t("mail.connect.provider_button")}</span></span></span>
                    <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-muted rtl:rotate-90" />
                  </button>
                ))}
              </div>
            </section>

            <div className="rounded-xl border border-warning bg-warning-soft p-3 text-dynamic-xs text-warning">
              <p className="font-semibold">{t("mail.connect.security_title")}</p>
              <p className="mt-1 leading-relaxed">{t("mail.connect.security_note")}</p>
            </div>

            {connectNotice && (
              <div role="status" className="space-y-3 rounded-xl border border-primary/30 bg-primary-soft/50 p-3">
                <p className="text-dynamic-xs leading-relaxed text-foreground">{connectNotice}</p>
                {demoAccountForm && (
                  <form onSubmit={submitDemoAccount} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5"><label htmlFor="mail-demo-name" className="text-dynamic-xs font-semibold text-muted">{t("mail.connect.display_name")}</label><input id="mail-demo-name" value={demoName} onChange={(event) => setDemoName(event.target.value)} maxLength={100} className="w-full rounded-xl border border-theme bg-surface px-3 py-2.5 text-dynamic-sm text-foreground" /></div>
                    <div className="space-y-1.5"><label htmlFor="mail-demo-email" className="text-dynamic-xs font-semibold text-muted">{t("mail.connect.email_address")}</label><input id="mail-demo-email" type="email" required value={demoEmail} onChange={(event) => setDemoEmail(event.target.value)} className="w-full rounded-xl border border-theme bg-surface px-3 py-2.5 text-dynamic-sm text-foreground" /></div>
                    <div className="sm:col-span-2 flex flex-wrap justify-end gap-2 border-t border-theme pt-3"><button type="button" onClick={() => setConnectNotice("")} className={secondaryButtonClass}>{t("mail.button.cancel")}</button><button type="submit" className={primaryButtonClass}><PlusCircle className="h-4 w-4" /><span>{t("mail.connect.add_demo")}</span></button></div>
                  </form>
                )}
              </div>
            )}
            <div className="flex justify-end border-t border-theme pt-3"><button type="button" onClick={() => setAccountsModalOpen(false)} className={secondaryButtonClass}>{t("mail.button.close")}</button></div>
          </section>
        </div>
      )}

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="mail-compose-title" className="max-h-[94vh] w-full max-w-3xl overflow-hidden rounded-2xl border-2 border-primary bg-surface shadow-shell">
            <div className="flex items-start justify-between gap-3 border-b border-theme bg-surface-elevated px-4 py-3">
              <div><h2 id="mail-compose-title" className="text-dynamic-lg font-bold text-foreground">{t(editingDraftId ? "mail.compose.edit_title" : "mail.compose.title")}</h2><p className="text-dynamic-xs text-muted">{t("mail.compose.demo_notice")}</p></div>
              <button type="button" title={t("mail.button.close")} aria-label={t("mail.button.close")} onClick={() => setComposeOpen(false)} className={iconButtonClass}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={submitCompose} className="flex max-h-[calc(94vh-72px)] flex-col">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[100px_1fr] sm:items-center"><label htmlFor="mail-compose-from" className="text-dynamic-xs font-semibold text-muted">{t("mail.compose.from")}</label><select id="mail-compose-from" value={composeAccountId} onChange={(event) => setComposeAccountId(event.target.value)} className="w-full rounded-lg border border-theme bg-surface-elevated px-3 py-2 text-dynamic-sm text-foreground">{accounts.map((account) => <option key={account.id} value={account.id}>{account.displayName} &lt;{account.emailAddress}&gt; · {t(`mail.connection.${account.connection}`)}</option>)}</select></div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[100px_1fr] sm:items-center"><label htmlFor="mail-compose-to" className="text-dynamic-xs font-semibold text-muted">{t("mail.compose.to")}</label><input id="mail-compose-to" required type="email" value={composeForm.to} onChange={(event) => setComposeForm((form) => ({ ...form, to: event.target.value }))} className="w-full rounded-lg border border-theme bg-surface-elevated px-3 py-2 text-dynamic-sm text-foreground" /><span className="sm:col-start-2"><button type="button" onClick={() => setCcVisible((visible) => !visible)} className="text-dynamic-xs font-semibold text-primary hover:underline">{t(ccVisible ? "mail.compose.hide_cc" : "mail.compose.show_cc")}</button></span></div>
                {ccVisible && <div className="grid grid-cols-1 gap-2 sm:grid-cols-[100px_1fr] sm:items-center"><label htmlFor="mail-compose-cc" className="text-dynamic-xs font-semibold text-muted">{t("mail.compose.cc")}</label><input id="mail-compose-cc" type="text" value={composeForm.cc} onChange={(event) => setComposeForm((form) => ({ ...form, cc: event.target.value }))} placeholder={t("mail.compose.cc_placeholder")} className="w-full rounded-lg border border-theme bg-surface-elevated px-3 py-2 text-dynamic-sm text-foreground" /></div>}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[100px_1fr] sm:items-center"><label htmlFor="mail-compose-subject" className="text-dynamic-xs font-semibold text-muted">{t("mail.compose.subject")}</label><input id="mail-compose-subject" required maxLength={200} value={composeForm.subject} onChange={(event) => setComposeForm((form) => ({ ...form, subject: event.target.value }))} className="w-full rounded-lg border border-theme bg-surface-elevated px-3 py-2 text-dynamic-sm text-foreground" /></div>
                <div className="min-h-72"><label htmlFor="mail-compose-body" className="sr-only">{t("mail.compose.body")}</label><textarea id="mail-compose-body" value={composeForm.body} onChange={(event) => setComposeForm((form) => ({ ...form, body: event.target.value }))} placeholder={t("mail.compose.body_placeholder")} className="min-h-72 w-full resize-y rounded-xl border border-theme bg-surface-elevated p-3.5 text-dynamic-sm leading-relaxed text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
                {composeForm.attachments.length > 0 && <div className="flex flex-wrap gap-2">{composeForm.attachments.map((attachment) => <span key={attachment.id} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-theme bg-surface-elevated px-2.5 py-1.5 text-dynamic-xs text-foreground"><Paperclip className="h-3.5 w-3.5 text-primary" /><span className="max-w-56 truncate">{attachment.fileName}</span><button type="button" title={`${t("mail.compose.remove_attachment")} ${attachment.fileName}`} aria-label={`${t("mail.compose.remove_attachment")} ${attachment.fileName}`} onClick={() => setComposeForm((form) => ({ ...form, attachments: form.attachments.filter((item) => item.id !== attachment.id) }))} className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X className="h-4 w-4" /></button></span>)}</div>}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-theme bg-surface-elevated px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <label className={`${secondaryButtonClass} cursor-pointer`}>
                    <Paperclip className="h-4 w-4" /><span>{t("mail.compose.attach")}</span>
                    <input type="file" multiple className="sr-only" onChange={handleFileAttach} />
                  </label>
                  <button type="button" disabled={aiBusy} onClick={() => void runAssistant("draft_reply", "compose")} className={`${secondaryButtonClass} disabled:opacity-50`}><Sparkles className="h-4 w-4" /><span>{t("mail.ai.button_draft")}</span></button>
                  <button type="button" disabled={aiBusy} onClick={() => void runAssistant("polish", "compose")} className={`${secondaryButtonClass} disabled:opacity-50`}><Sparkles className="h-4 w-4" /><span>{t("mail.ai.button_polish")}</span></button>
                  {(aiBusy || aiError) && <span aria-live="polite" className={`self-center text-dynamic-xs ${aiError ? "font-semibold text-danger" : "text-muted"}`}>{aiError || t("mail.ai.working")}</span>}
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={aiBusy} onClick={handleSaveDraft} className={`${secondaryButtonClass} disabled:opacity-50`}>{t("mail.button.save_draft")}</button>
                  <button type="submit" disabled={aiBusy || !accounts.length} className={`${primaryButtonClass} disabled:opacity-50`}><Send className="h-4 w-4" /><span>{t("mail.button.send_demo")}</span></button>
                </div>
              </div>
              <p className="px-4 pb-3 text-dynamic-xs text-muted">{t("mail.compose.attachment_notice")}</p>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
