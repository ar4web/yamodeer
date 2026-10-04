import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type { BilingualText } from "@/context/LanguageContext";
import { CorporateRole, useCurrentRole } from "@/context/RBACGeofenceContext";

export type MailText = string | BilingualText;
export type MailProviderKey = "GOOGLE" | "MICROSOFT" | "YAHOO" | "ICLOUD" | "IMAP";
export type MailFolderKey = "INBOX" | "SENT" | "DRAFTS" | "ARCHIVE" | "TRASH";
export type MailAttachment = { id: string; fileName: string; sizeBytes: number };

export interface MailAccount {
  id: string;
  provider: MailProviderKey;
  emailAddress: string;
  displayName: string;
  connection: "DEMO" | "CONNECTED";
  createdAtIso: string;
}

export interface MailMessage {
  id: string;
  threadId: string;
  accountId: string;
  folder: MailFolderKey;
  senderName: MailText;
  senderEmail: string;
  to: string;
  cc: string;
  subject: MailText;
  preview: MailText;
  body: MailText;
  sentAtIso: string;
  isUnread: boolean;
  isStarred: boolean;
  attachments: MailAttachment[];
}

export interface MailComposeInput {
  to: string;
  cc: string;
  subject: string;
  body: string;
  attachments: MailAttachment[];
}

interface MailWorkspaceData {
  accounts: MailAccount[];
  messages: MailMessage[];
}

type MailWorkspacesByRole = Record<CorporateRole, MailWorkspaceData>;

interface MailContextValue extends MailWorkspaceData {
  addDemoAccount: (provider: MailProviderKey, displayName: string, emailAddress: string) => string;
  removeAccount: (accountId: string) => void;
  markMessageRead: (messageId: string, isUnread: boolean) => void;
  toggleMessageStar: (messageId: string) => void;
  moveMessage: (messageId: string, folder: MailFolderKey) => void;
  saveDraft: (accountId: string, input: MailComposeInput, draftId?: string) => string;
  sendDemoMessage: (accountId: string, input: MailComposeInput, draftId?: string) => string;
}

const STORAGE_KEY = "ksa_hrms_mail_workspace_v1";
const ROLE_KEYS: CorporateRole[] = ["SUPER_ADMIN", "ADMIN", "HR_OPS", "MANAGER", "EMPLOYEE"];

const hoursAgo = (hours: number): string => new Date(Date.now() - hours * 60 * 60_000).toISOString();
const makeInitialMailbox = (): MailWorkspaceData => {
  const demoAccountId = "MAIL-DEMO-ACCOUNT-01";
  const account: MailAccount = {
    id: demoAccountId,
    provider: "GOOGLE",
    emailAddress: "noura@noor.example",
    displayName: "Noura Al-Dosari",
    connection: "DEMO",
    createdAtIso: new Date().toISOString()
  };
  const messages: MailMessage[] = [
    {
      id: "MAIL-DEMO-1001",
      threadId: "THREAD-1001",
      accountId: demoAccountId,
      folder: "INBOX",
      senderName: { en: "Maya Al-Harbi", ar: "مي الحربي" },
      senderEmail: "maya.alharbi@example.com",
      to: account.emailAddress,
      cc: "",
      subject: { en: "Planning notes and next steps", ar: "ملاحظات التخطيط والخطوات التالية" },
      preview: { en: "Thanks for the discussion. I have captured the owners and dates…", ar: "شكراً على النقاش. أعددت قائمة بالمسؤولين والمواعيد…" },
      body: {
        en: "Hello Noura,\n\nThanks for the planning discussion this morning. I have captured the key actions below:\n\n• Confirm the owners for each workstream by Wednesday.\n• Share the revised timeline with Finance before the weekly review.\n• Flag any dependencies that could affect the October milestones.\n\nPlease send any corrections and I will update the notes.\n\nRegards,\nMaya",
        ar: "مرحباً نورة،\n\nشكراً على اجتماع التخطيط هذا الصباح. أعددت أهم الإجراءات التالية:\n\n• تأكيد المسؤول عن كل مسار عمل قبل يوم الأربعاء.\n• مشاركة الجدول المعدل مع المالية قبل المراجعة الأسبوعية.\n• الإشارة إلى أي عوائق قد تؤثر في مواعيد أكتوبر.\n\nأرسلي أي تعديلات وسأحدّث الملاحظات.\n\nمع التحية،\nمي"
      },
      sentAtIso: hoursAgo(1),
      isUnread: true,
      isStarred: true,
      attachments: []
    },
    {
      id: "MAIL-DEMO-1002",
      threadId: "THREAD-1002",
      accountId: demoAccountId,
      folder: "INBOX",
      senderName: { en: "Omar Rahman", ar: "عمر رحمن" },
      senderEmail: "omar.rahman@example.com",
      to: account.emailAddress,
      cc: "",
      subject: { en: "Updated implementation schedule", ar: "الجدول الزمني المحدث للتنفيذ" },
      preview: { en: "The revised milestones are ready for your review…", ar: "أصبحت المواعيد الرئيسية المعدلة جاهزة للمراجعة…" },
      body: {
        en: "Hi Noura,\n\nThe revised implementation schedule is ready. The main change is a two-day shift to the training milestone so that the department leads can review the updated materials.\n\nCould you confirm whether the new dates work for the team?\n\nBest,\nOmar",
        ar: "مرحباً نورة،\n\nالجدول الزمني المعدل للتنفيذ جاهز. التغيير الأساسي هو تأجيل مرحلة التدريب يومين حتى يتمكن قادة الإدارات من مراجعة المواد المحدثة.\n\nهل يمكنك تأكيد ملاءمة المواعيد الجديدة للفريق؟\n\nمع التحية،\nعمر"
      },
      sentAtIso: hoursAgo(3),
      isUnread: true,
      isStarred: false,
      attachments: [{ id: "ATT-DEMO-01", fileName: "implementation-schedule.xlsx", sizeBytes: 184_320 }]
    },
    {
      id: "MAIL-DEMO-1003",
      threadId: "THREAD-1003",
      accountId: demoAccountId,
      folder: "INBOX",
      senderName: { en: "Sara Al-Qahtani", ar: "سارة القحطاني" },
      senderEmail: "sara.alqahtani@example.com",
      to: account.emailAddress,
      cc: "",
      subject: { en: "Review requested: bilingual employee guide", ar: "مطلوب مراجعة: دليل الموظف ثنائي اللغة" },
      preview: { en: "Could you review the Arabic and English sections before publishing?…", ar: "هل يمكنك مراجعة القسمين العربي والإنجليزي قبل النشر؟…" },
      body: {
        en: "Hello,\n\nThe bilingual employee guide is ready for a final review. Please check the leave, attendance and contact details sections and send any wording changes by Thursday.\n\nThank you,\nSara",
        ar: "مرحباً،\n\nدليل الموظف ثنائي اللغة جاهز للمراجعة النهائية. يرجى مراجعة أقسام الإجازات والحضور وبيانات التواصل وإرسال أي تعديلات قبل يوم الخميس.\n\nشكراً،\nسارة"
      },
      sentAtIso: hoursAgo(7),
      isUnread: false,
      isStarred: false,
      attachments: [{ id: "ATT-DEMO-02", fileName: "employee-guide-review.docx", sizeBytes: 264_000 }]
    },
    {
      id: "MAIL-DEMO-1004",
      threadId: "THREAD-1004",
      accountId: demoAccountId,
      folder: "INBOX",
      senderName: { en: "Finance Operations", ar: "العمليات المالية" },
      senderEmail: "finance.ops@example.com",
      to: account.emailAddress,
      cc: "",
      subject: { en: "October close: supporting documents", ar: "إقفال أكتوبر: المستندات المؤيدة" },
      preview: { en: "Please share the remaining supporting documents for the close…", ar: "يرجى مشاركة المستندات المؤيدة المتبقية للإقفال…" },
      body: {
        en: "Hi Noura,\n\nFor the October close, please share the remaining approved expense receipts and confirm the owner for the supplier statement review. We are aiming to complete the first review by the end of this week.\n\nThank you,\nFinance Operations",
        ar: "مرحباً نورة،\n\nلإقفال أكتوبر، يرجى مشاركة إيصالات المصروفات المعتمدة المتبقية وتأكيد المسؤول عن مراجعة كشف المورد. نهدف إلى إكمال المراجعة الأولى بنهاية هذا الأسبوع.\n\nشكراً،\nالعمليات المالية"
      },
      sentAtIso: hoursAgo(22),
      isUnread: false,
      isStarred: true,
      attachments: []
    },
    {
      id: "MAIL-DEMO-1005",
      threadId: "THREAD-1005",
      accountId: demoAccountId,
      folder: "INBOX",
      senderName: { en: "Aisha Mansour", ar: "عائشة منصور" },
      senderEmail: "aisha.mansour@example.com",
      to: account.emailAddress,
      cc: "",
      subject: { en: "Thank you for the quick response", ar: "شكراً على سرعة الرد" },
      preview: { en: "That answers my question. I will share the updated version…", ar: "هذا يجيب عن استفساري. سأشارك النسخة المحدثة…" },
      body: {
        en: "Hi Noura,\n\nThat answers my question, thank you. I will share the updated version with the project group and keep you posted if anything else comes up.\n\nBest,\nAisha",
        ar: "مرحباً نورة،\n\nشكراً، هذا يجيب عن استفساري. سأشارك النسخة المحدثة مع فريق المشروع وأوافيك بأي مستجدات.\n\nمع التحية،\nعائشة"
      },
      sentAtIso: hoursAgo(29),
      isUnread: false,
      isStarred: false,
      attachments: []
    },
    {
      id: "MAIL-DEMO-SENT-01",
      threadId: "THREAD-SENT-01",
      accountId: demoAccountId,
      folder: "SENT",
      senderName: account.displayName,
      senderEmail: account.emailAddress,
      to: "maya.alharbi@example.com",
      cc: "",
      subject: { en: "Re: Weekly planning", ar: "رد: التخطيط الأسبوعي" },
      preview: { en: "I have reviewed the notes and confirmed the owners…", ar: "راجعت الملاحظات وأكدت المسؤولين…" },
      body: {
        en: "Hi Maya,\n\nI have reviewed the notes and confirmed the owners. Please share the revised timeline with Finance before the weekly review.\n\nRegards,\nNoura",
        ar: "مرحباً مي،\n\nراجعت الملاحظات وأكدت المسؤولين. يرجى مشاركة الجدول المعدل مع المالية قبل المراجعة الأسبوعية.\n\nمع التحية،\nنورة"
      },
      sentAtIso: hoursAgo(30),
      isUnread: false,
      isStarred: false,
      attachments: []
    },
    {
      id: "MAIL-DEMO-DRAFT-01",
      threadId: "THREAD-DRAFT-01",
      accountId: demoAccountId,
      folder: "DRAFTS",
      senderName: account.displayName,
      senderEmail: account.emailAddress,
      to: "",
      cc: "",
      subject: { en: "Follow-up after the review", ar: "متابعة بعد المراجعة" },
      preview: { en: "A draft saved for later…", ar: "مسودة محفوظة للمتابعة لاحقاً…" },
      body: { en: "Hello,\n\nI will send the final review notes shortly.", ar: "مرحباً،\n\nسأرسل ملاحظات المراجعة النهائية قريباً." },
      sentAtIso: hoursAgo(2),
      isUnread: false,
      isStarred: false,
      attachments: []
    }
  ];
  return { accounts: [account], messages };
};

const createInitialWorkspaces = (): MailWorkspacesByRole => ({
  SUPER_ADMIN: makeInitialMailbox(),
  ADMIN: makeInitialMailbox(),
  HR_OPS: makeInitialMailbox(),
  MANAGER: makeInitialMailbox(),
  EMPLOYEE: makeInitialMailbox()
});

const loadWorkspaces = (): MailWorkspacesByRole => {
  const defaults = createInitialWorkspaces();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<MailWorkspacesByRole>;
    for (const role of ROLE_KEYS) {
      const workspace = saved?.[role];
      if (workspace && Array.isArray(workspace.accounts) && Array.isArray(workspace.messages)) {
        defaults[role] = { accounts: workspace.accounts, messages: workspace.messages };
      }
    }
  } catch {
    // Use fresh sample mail when browser storage is unavailable or malformed.
  }
  return defaults;
};

const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const MailContext = createContext<MailContextValue | undefined>(undefined);

export const MailProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentRole } = useCurrentRole();
  const [workspaces, setWorkspaces] = useState<MailWorkspacesByRole>(loadWorkspaces);
  const currentWorkspace = workspaces[currentRole] ?? makeInitialMailbox();

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
    } catch {
      // Mail demo remains usable in memory when browser storage is unavailable.
    }
  }, [workspaces]);

  const updateCurrentWorkspace = useCallback(
    (updater: (workspace: MailWorkspaceData) => MailWorkspaceData) => {
      setWorkspaces((current) => ({
        ...current,
        [currentRole]: updater(current[currentRole] ?? makeInitialMailbox())
      }));
    },
    [currentRole]
  );

  const addDemoAccount = useCallback((provider: MailProviderKey, displayName: string, emailAddress: string) => {
    const account: MailAccount = {
      id: newId("MAIL-ACCOUNT"),
      provider,
      emailAddress: emailAddress.trim(),
      displayName: displayName.trim() || emailAddress.trim(),
      connection: "DEMO",
      createdAtIso: new Date().toISOString()
    };
    updateCurrentWorkspace((workspace) => ({ ...workspace, accounts: [account, ...workspace.accounts] }));
    return account.id;
  }, [updateCurrentWorkspace]);

  const removeAccount = useCallback((accountId: string) => {
    updateCurrentWorkspace((workspace) => ({
      accounts: workspace.accounts.filter((account) => account.id !== accountId),
      messages: workspace.messages.filter((message) => message.accountId !== accountId)
    }));
  }, [updateCurrentWorkspace]);

  const markMessageRead = useCallback((messageId: string, isUnread: boolean) => {
    updateCurrentWorkspace((workspace) => ({
      ...workspace,
      messages: workspace.messages.map((message) => message.id === messageId ? { ...message, isUnread } : message)
    }));
  }, [updateCurrentWorkspace]);

  const toggleMessageStar = useCallback((messageId: string) => {
    updateCurrentWorkspace((workspace) => ({
      ...workspace,
      messages: workspace.messages.map((message) => message.id === messageId ? { ...message, isStarred: !message.isStarred } : message)
    }));
  }, [updateCurrentWorkspace]);

  const moveMessage = useCallback((messageId: string, folder: MailFolderKey) => {
    updateCurrentWorkspace((workspace) => ({
      ...workspace,
      messages: workspace.messages.map((message) => message.id === messageId ? { ...message, folder, isUnread: folder === "TRASH" ? false : message.isUnread } : message)
    }));
  }, [updateCurrentWorkspace]);

  const saveDraft = useCallback((accountId: string, input: MailComposeInput, draftId?: string) => {
    const account = currentWorkspace.accounts.find((entry) => entry.id === accountId);
    const now = new Date().toISOString();
    const id = draftId ?? newId("MAIL-DRAFT");
    const draft: MailMessage = {
      id,
      threadId: draftId ?? id,
      accountId,
      folder: "DRAFTS",
      senderName: account?.displayName ?? "",
      senderEmail: account?.emailAddress ?? "",
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      preview: input.body.slice(0, 160),
      body: input.body,
      sentAtIso: now,
      isUnread: false,
      isStarred: false,
      attachments: input.attachments
    };
    updateCurrentWorkspace((workspace) => ({
      ...workspace,
      messages: [draft, ...workspace.messages.filter((message) => message.id !== id)]
    }));
    return id;
  }, [currentWorkspace.accounts, updateCurrentWorkspace]);

  const sendDemoMessage = useCallback((accountId: string, input: MailComposeInput, draftId?: string) => {
    const account = currentWorkspace.accounts.find((entry) => entry.id === accountId);
    const now = new Date().toISOString();
    const id = newId("MAIL-SENT");
    const sentMessage: MailMessage = {
      id,
      threadId: draftId ?? id,
      accountId,
      folder: "SENT",
      senderName: account?.displayName ?? "",
      senderEmail: account?.emailAddress ?? "",
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      preview: input.body.slice(0, 160),
      body: input.body,
      sentAtIso: now,
      isUnread: false,
      isStarred: false,
      attachments: input.attachments
    };
    updateCurrentWorkspace((workspace) => ({
      ...workspace,
      messages: [sentMessage, ...workspace.messages.filter((message) => message.id !== draftId)]
    }));
    return id;
  }, [currentWorkspace.accounts, updateCurrentWorkspace]);

  const value = useMemo<MailContextValue>(() => ({
    ...currentWorkspace,
    addDemoAccount,
    removeAccount,
    markMessageRead,
    toggleMessageStar,
    moveMessage,
    saveDraft,
    sendDemoMessage
  }), [currentWorkspace, addDemoAccount, removeAccount, markMessageRead, toggleMessageStar, moveMessage, saveDraft, sendDemoMessage]);

  return <MailContext.Provider value={value}>{children}</MailContext.Provider>;
};

export const useMail = (): MailContextValue => {
  const value = useContext(MailContext);
  if (!value) throw new Error("useMail must be used within MailProvider");
  return value;
};
