import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { BilingualText } from "@/context/LanguageContext";
import { CorporateRole, useCurrentRole } from "@/context/RBACGeofenceContext";

export type WorkHubText = string | BilingualText;
export type WorkTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type WorkTaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type WorkReminderStatus = "ACTIVE" | "DONE";

export interface WorkTask {
  id: string;
  title: WorkHubText;
  description: WorkHubText;
  dueAt: string | null;
  priority: WorkTaskPriority;
  status: WorkTaskStatus;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface WorkReminder {
  id: string;
  title: WorkHubText;
  details: WorkHubText;
  dueAt: string;
  status: WorkReminderStatus;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface NotebookEntry {
  id: string;
  title: WorkHubText;
  content: WorkHubText;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface WorkNotebook {
  id: string;
  title: WorkHubText;
  entries: NotebookEntry[];
  createdAtIso: string;
  updatedAtIso: string;
}

interface WorkHubData {
  tasks: WorkTask[];
  reminders: WorkReminder[];
  notebooks: WorkNotebook[];
}

type WorkHubDataByRole = Record<CorporateRole, WorkHubData>;

type NewWorkTask = Pick<WorkTask, "title" | "description" | "dueAt" | "priority">;
type WorkTaskUpdates = Partial<Pick<WorkTask, "title" | "description" | "dueAt" | "priority" | "status">>;
type NewWorkReminder = Pick<WorkReminder, "title" | "details" | "dueAt">;
type WorkReminderUpdates = Partial<Pick<WorkReminder, "title" | "details" | "dueAt" | "status">>;
type NotebookEntryUpdates = Partial<Pick<NotebookEntry, "title" | "content">>;
type WorkHubStorageStatus = "BROWSER" | "CONNECTING" | "POSTGRES" | "BROWSER_FALLBACK";

interface WorkHubContextValue extends WorkHubData {
  storageStatus: WorkHubStorageStatus;
  addTask: (task: NewWorkTask) => string;
  updateTask: (id: string, updates: WorkTaskUpdates) => void;
  deleteTask: (id: string) => void;
  addReminder: (reminder: NewWorkReminder) => string;
  updateReminder: (id: string, updates: WorkReminderUpdates) => void;
  snoozeReminder: (id: string, minutes?: number) => void;
  deleteReminder: (id: string) => void;
  addNotebook: (title: WorkHubText) => string;
  updateNotebook: (id: string, title: WorkHubText) => void;
  deleteNotebook: (id: string) => void;
  addNotebookEntry: (notebookId: string, title: WorkHubText) => string;
  updateNotebookEntry: (notebookId: string, entryId: string, updates: NotebookEntryUpdates) => void;
  deleteNotebookEntry: (notebookId: string, entryId: string) => void;
}

const STORAGE_KEY = "ksa_hrms_work_hub_v1";
const LOCAL_API_ENABLED = import.meta.env.VITE_WORKHUB_LOCAL_API === "true";
const ROLE_KEYS: CorporateRole[] = ["SUPER_ADMIN", "ADMIN", "HR_OPS", "MANAGER", "EMPLOYEE"];

const isWorkHubData = (value: unknown): value is WorkHubData => {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<WorkHubData>;
  return Array.isArray(data.tasks) && Array.isArray(data.reminders) && Array.isArray(data.notebooks);
};

const dateTimeInputValue = (date: Date): string => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const offsetDateTime = (minutes: number): string =>
  dateTimeInputValue(new Date(Date.now() + minutes * 60_000));

const createId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const createInitialWorkHubData = (): WorkHubData => {
  const now = new Date().toISOString();
  return {
    tasks: [
      {
        id: "TASK-DEMO-101",
        title: { en: "Map this week's priorities", ar: "تحديد أولويات هذا الأسبوع" },
        description: { en: "Capture the most important team deliverables and owners.", ar: "حصر أهم مخرجات الفريق وتحديد المسؤولين عنها." },
        dueAt: offsetDateTime(24 * 60),
        priority: "HIGH",
        status: "IN_PROGRESS",
        createdAtIso: now,
        updatedAtIso: now
      },
      {
        id: "TASK-DEMO-102",
        title: { en: "Review open follow-ups", ar: "مراجعة المتابعات المفتوحة" },
        description: { en: "Check pending items and decide the next action.", ar: "التحقق من البنود المعلقة وتحديد الإجراء التالي." },
        dueAt: offsetDateTime(3 * 24 * 60),
        priority: "NORMAL",
        status: "TODO",
        createdAtIso: now,
        updatedAtIso: now
      },
      {
        id: "TASK-DEMO-103",
        title: { en: "Organize onboarding materials", ar: "تنظيم مستندات التعيين" },
        description: { en: "Completed sample task.", ar: "مهمة تجريبية مكتملة." },
        dueAt: offsetDateTime(-24 * 60),
        priority: "LOW",
        status: "DONE",
        createdAtIso: now,
        updatedAtIso: now
      }
    ],
    reminders: [
      {
        id: "REM-DEMO-201",
        title: { en: "Check today's priorities", ar: "مراجعة أولويات اليوم" },
        details: { en: "Take a moment to review the task list.", ar: "خصص وقتاً لمراجعة قائمة المهام." },
        dueAt: offsetDateTime(60),
        status: "ACTIVE",
        createdAtIso: now,
        updatedAtIso: now
      },
      {
        id: "REM-DEMO-202",
        title: { en: "Follow up on open requests", ar: "متابعة الطلبات المفتوحة" },
        details: { en: "Review requests that need a response.", ar: "مراجعة الطلبات التي تحتاج إلى رد." },
        dueAt: offsetDateTime(24 * 60),
        status: "ACTIVE",
        createdAtIso: now,
        updatedAtIso: now
      }
    ],
    notebooks: [
      {
        id: "NOTEBOOK-DEMO-301",
        title: { en: "Weekly operations", ar: "العمليات الأسبوعية" },
        entries: [
          {
            id: "NOTE-DEMO-401",
            title: { en: "Key priorities", ar: "الأولويات الرئيسية" },
            content: {
              en: "1. Keep urgent work visible.\n2. Add an owner and due date to each follow-up.\n3. Review completed tasks at the end of the week.",
              ar: "١. إبقاء المهام العاجلة واضحة.\n٢. تحديد مسؤول وتاريخ استحقاق لكل متابعة.\n٣. مراجعة المهام المكتملة في نهاية الأسبوع."
            },
            createdAtIso: now,
            updatedAtIso: now
          },
          {
            id: "NOTE-DEMO-402",
            title: { en: "Meeting notes", ar: "ملاحظات الاجتماع" },
            content: {
              en: "Add discussion points, decisions and next steps here.",
              ar: "أضف هنا نقاط النقاش والقرارات والخطوات التالية."
            },
            createdAtIso: now,
            updatedAtIso: now
          }
        ],
        createdAtIso: now,
        updatedAtIso: now
      }
    ]
  };
};

const createInitialWorkspaces = (): WorkHubDataByRole => ({
  SUPER_ADMIN: createInitialWorkHubData(),
  ADMIN: createInitialWorkHubData(),
  HR_OPS: createInitialWorkHubData(),
  MANAGER: createInitialWorkHubData(),
  EMPLOYEE: createInitialWorkHubData()
});

const loadWorkspaces = (): WorkHubDataByRole => {
  const defaults = createInitialWorkspaces();
  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<WorkHubDataByRole>;
    for (const role of ROLE_KEYS) {
      const entry = saved?.[role];
      if (entry && Array.isArray(entry.tasks) && Array.isArray(entry.reminders) && Array.isArray(entry.notebooks)) {
        defaults[role] = {
          tasks: entry.tasks,
          reminders: entry.reminders,
          notebooks: entry.notebooks
        };
      }
    }
  } catch {
    // Use fresh demo data when browser storage is unavailable or malformed.
  }
  return defaults;
};

const WorkHubContext = createContext<WorkHubContextValue | undefined>(undefined);

export const WorkHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentRole } = useCurrentRole();
  const [workspaces, setWorkspaces] = useState<WorkHubDataByRole>(loadWorkspaces);
  const [storageStatus, setStorageStatus] = useState<WorkHubStorageStatus>(LOCAL_API_ENABLED ? "CONNECTING" : "BROWSER");
  const [apiLoadedRole, setApiLoadedRole] = useState<CorporateRole | null>(null);
  const mutationRevision = useRef<Partial<Record<CorporateRole, number>>>({});
  const currentData = workspaces[currentRole] ?? createInitialWorkHubData();

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
    } catch {
      // The module continues to work in memory if storage is unavailable.
    }
  }, [workspaces]);

  useEffect(() => {
    if (!LOCAL_API_ENABLED) return;
    let cancelled = false;
    const role = currentRole;
    const revisionAtRequest = mutationRevision.current[role] ?? 0;
    setApiLoadedRole(null);
    setStorageStatus("CONNECTING");

    const loadFromLocalApi = async () => {
      try {
        const response = await fetch("/api/workhub", { headers: { "X-Demo-Role": role } });
        if (!response.ok) throw new Error(`Local Work Hub API returned ${response.status}`);
        const payload = await response.json() as { data?: unknown };
        if (payload.data !== null && payload.data !== undefined && !isWorkHubData(payload.data)) {
          throw new Error("Local Work Hub API returned an invalid workspace");
        }
        if (cancelled) return;

        const changedWhileLoading = (mutationRevision.current[role] ?? 0) !== revisionAtRequest;
        if (!changedWhileLoading && isWorkHubData(payload.data)) {
          setWorkspaces((current) => ({ ...current, [role]: payload.data as WorkHubData }));
        }
        setApiLoadedRole(role);
        setStorageStatus("POSTGRES");
      } catch {
        if (cancelled) return;
        setApiLoadedRole(null);
        setStorageStatus("BROWSER_FALLBACK");
      }
    };
    void loadFromLocalApi();
    return () => { cancelled = true; };
  }, [currentRole]);

  useEffect(() => {
    if (!LOCAL_API_ENABLED || apiLoadedRole !== currentRole) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/workhub", {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Demo-Role": currentRole },
          body: JSON.stringify({ data: currentData })
        });
        if (!response.ok) throw new Error(`Local Work Hub API returned ${response.status}`);
        if (!cancelled) setStorageStatus("POSTGRES");
      } catch {
        if (!cancelled) setStorageStatus("BROWSER_FALLBACK");
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentRole, currentData, apiLoadedRole]);

  const updateCurrentData = useCallback(
    (updater: (data: WorkHubData) => WorkHubData) => {
      mutationRevision.current[currentRole] = (mutationRevision.current[currentRole] ?? 0) + 1;
      setWorkspaces((current) => ({
        ...current,
        [currentRole]: updater(current[currentRole] ?? createInitialWorkHubData())
      }));
    },
    [currentRole]
  );

  const addTask = useCallback((input: NewWorkTask) => {
    const now = new Date().toISOString();
    const id = createId("TASK");
    updateCurrentData((data) => ({
      ...data,
      tasks: [{ ...input, id, status: "TODO", createdAtIso: now, updatedAtIso: now }, ...data.tasks]
    }));
    return id;
  }, [updateCurrentData]);

  const updateTask = useCallback((id: string, updates: WorkTaskUpdates) => {
    const updatedAtIso = new Date().toISOString();
    updateCurrentData((data) => ({
      ...data,
      tasks: data.tasks.map((task) => task.id === id ? { ...task, ...updates, updatedAtIso } : task)
    }));
  }, [updateCurrentData]);

  const deleteTask = useCallback((id: string) => {
    updateCurrentData((data) => ({ ...data, tasks: data.tasks.filter((task) => task.id !== id) }));
  }, [updateCurrentData]);

  const addReminder = useCallback((input: NewWorkReminder) => {
    const now = new Date().toISOString();
    const id = createId("REM");
    updateCurrentData((data) => ({
      ...data,
      reminders: [{ ...input, id, status: "ACTIVE", createdAtIso: now, updatedAtIso: now }, ...data.reminders]
    }));
    return id;
  }, [updateCurrentData]);

  const updateReminder = useCallback((id: string, updates: WorkReminderUpdates) => {
    const updatedAtIso = new Date().toISOString();
    updateCurrentData((data) => ({
      ...data,
      reminders: data.reminders.map((reminder) => reminder.id === id ? { ...reminder, ...updates, updatedAtIso } : reminder)
    }));
  }, [updateCurrentData]);

  const snoozeReminder = useCallback((id: string, minutes = 60) => {
    const now = new Date().toISOString();
    const dueAt = offsetDateTime(minutes);
    updateCurrentData((data) => ({
      ...data,
      reminders: data.reminders.map((reminder) => reminder.id === id ? { ...reminder, dueAt, status: "ACTIVE", updatedAtIso: now } : reminder)
    }));
  }, [updateCurrentData]);

  const deleteReminder = useCallback((id: string) => {
    updateCurrentData((data) => ({ ...data, reminders: data.reminders.filter((reminder) => reminder.id !== id) }));
  }, [updateCurrentData]);

  const addNotebook = useCallback((title: WorkHubText) => {
    const now = new Date().toISOString();
    const id = createId("NOTEBOOK");
    updateCurrentData((data) => ({
      ...data,
      notebooks: [{ id, title, entries: [], createdAtIso: now, updatedAtIso: now }, ...data.notebooks]
    }));
    return id;
  }, [updateCurrentData]);

  const updateNotebook = useCallback((id: string, title: WorkHubText) => {
    const updatedAtIso = new Date().toISOString();
    updateCurrentData((data) => ({
      ...data,
      notebooks: data.notebooks.map((notebook) => notebook.id === id ? { ...notebook, title, updatedAtIso } : notebook)
    }));
  }, [updateCurrentData]);

  const deleteNotebook = useCallback((id: string) => {
    updateCurrentData((data) => ({ ...data, notebooks: data.notebooks.filter((notebook) => notebook.id !== id) }));
  }, [updateCurrentData]);

  const addNotebookEntry = useCallback((notebookId: string, title: WorkHubText) => {
    const now = new Date().toISOString();
    const id = createId("NOTE");
    updateCurrentData((data) => ({
      ...data,
      notebooks: data.notebooks.map((notebook) => notebook.id === notebookId
        ? { ...notebook, updatedAtIso: now, entries: [{ id, title, content: "", createdAtIso: now, updatedAtIso: now }, ...notebook.entries] }
        : notebook)
    }));
    return id;
  }, [updateCurrentData]);

  const updateNotebookEntry = useCallback((notebookId: string, entryId: string, updates: NotebookEntryUpdates) => {
    const updatedAtIso = new Date().toISOString();
    updateCurrentData((data) => ({
      ...data,
      notebooks: data.notebooks.map((notebook) => notebook.id === notebookId
        ? {
            ...notebook,
            updatedAtIso,
            entries: notebook.entries.map((entry) => entry.id === entryId ? { ...entry, ...updates, updatedAtIso } : entry)
          }
        : notebook)
    }));
  }, [updateCurrentData]);

  const deleteNotebookEntry = useCallback((notebookId: string, entryId: string) => {
    const updatedAtIso = new Date().toISOString();
    updateCurrentData((data) => ({
      ...data,
      notebooks: data.notebooks.map((notebook) => notebook.id === notebookId
        ? { ...notebook, updatedAtIso, entries: notebook.entries.filter((entry) => entry.id !== entryId) }
        : notebook)
    }));
  }, [updateCurrentData]);

  const value = useMemo<WorkHubContextValue>(() => ({
    ...currentData,
    storageStatus,
    addTask,
    updateTask,
    deleteTask,
    addReminder,
    updateReminder,
    snoozeReminder,
    deleteReminder,
    addNotebook,
    updateNotebook,
    deleteNotebook,
    addNotebookEntry,
    updateNotebookEntry,
    deleteNotebookEntry
  }), [
    currentData,
    storageStatus,
    addTask,
    updateTask,
    deleteTask,
    addReminder,
    updateReminder,
    snoozeReminder,
    deleteReminder,
    addNotebook,
    updateNotebook,
    deleteNotebook,
    addNotebookEntry,
    updateNotebookEntry,
    deleteNotebookEntry
  ]);

  return <WorkHubContext.Provider value={value}>{children}</WorkHubContext.Provider>;
};

export const useWorkHub = (): WorkHubContextValue => {
  const value = useContext(WorkHubContext);
  if (!value) throw new Error("useWorkHub must be used within WorkHubProvider");
  return value;
};
