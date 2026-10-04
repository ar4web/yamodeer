import React, { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  ListTodo,
  Pencil,
  PlusCircle,
  Trash2,
  X
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  WorkReminder,
  WorkTask,
  WorkTaskPriority,
  WorkTaskStatus,
  useWorkHub
} from "@/context/WorkHubContext";
import {
  FilterDrawerEdgeTrigger,
  FilterDrawerTrigger,
  iconButtonBaseClass,
  iconButtonClass,
  MetricCard,
  PageHeader,
  ResponsiveFilterDrawer,
  SegmentedTabs,
  TabPanel,
  primaryButtonClass,
  secondaryButtonClass
} from "@/components/DesignSystem";

const TASK_STATUS_CLASSES: Record<WorkTaskStatus, string> = {
  TODO: "bg-surface-elevated text-muted",
  IN_PROGRESS: "bg-primary-soft text-primary",
  DONE: "bg-success-soft text-success"
};

const TASK_PRIORITY_CLASSES: Record<WorkTaskPriority, string> = {
  LOW: "bg-surface-elevated text-muted",
  NORMAL: "bg-accent-soft text-accent",
  HIGH: "bg-warning-soft text-warning",
  URGENT: "bg-danger-soft text-danger"
};

const localDateTimeValue = (date: Date): string => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const localDateKey = (date: Date): string => localDateTimeValue(date).slice(0, 10);

const formatDateTime = (value: string, language: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(language === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

interface ModalShellProps {
  id: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}

const ModalShell: React.FC<ModalShellProps> = ({ id, title, closeLabel, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-4 backdrop-blur-sm">
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border-2 border-primary bg-surface p-4 shadow-shell"
    >
      <div className="flex items-start justify-between gap-3 border-b border-theme pb-3">
        <h2 id={`${id}-title`} className="text-dynamic-lg font-bold text-foreground">{title}</h2>
        <button
          type="button"
          title={closeLabel}
          aria-label={closeLabel}
          onClick={onClose}
          className={iconButtonClass}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </section>
  </div>
);

export const WorkHubModule: React.FC<{ globalSearchQuery: string; embedded?: boolean }> = ({ globalSearchQuery, embedded = false }) => {
  const { t, localize, language } = useLanguage();
  const {
    tasks,
    reminders,
    notebooks,
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
    deleteNotebookEntry,
    storageStatus
  } = useWorkHub();

  const [activeTab, setActiveTab] = useState<"tasks" | "reminders" | "notebooks">("tasks");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [taskFilter, setTaskFilter] = useState<"ALL" | "OPEN" | "TODAY" | "COMPLETED">("ALL");
  const [taskSortBy, setTaskSortBy] = useState<"DUE_ASC" | "TITLE_ASC">("DUE_ASC");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    description: "",
    dueAt: "",
    priority: "NORMAL" as WorkTaskPriority
  });

  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [reminderDraft, setReminderDraft] = useState({
    title: "",
    details: "",
    dueAt: localDateTimeValue(new Date(Date.now() + 60 * 60_000))
  });

  const [notebookDialogOpen, setNotebookDialogOpen] = useState(false);
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);
  const [notebookTitleDraft, setNotebookTitleDraft] = useState("");
  const [activeNotebookId, setActiveNotebookId] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [entryTitleDraft, setEntryTitleDraft] = useState("");
  const [entryContentDraft, setEntryContentDraft] = useState("");
  const [confirmNotebookDelete, setConfirmNotebookDelete] = useState(false);
  const [confirmEntryDelete, setConfirmEntryDelete] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const todayKey = localDateKey(new Date(nowMs));
  const storageStatusKey = {
    BROWSER: "workhub.storage.status_browser",
    CONNECTING: "workhub.storage.status_connecting",
    POSTGRES: "workhub.storage.status_postgres",
    BROWSER_FALLBACK: "workhub.storage.status_fallback"
  }[storageStatus];
  const storageNoticeKey = {
    BROWSER: "workhub.storage_notice",
    CONNECTING: "workhub.storage.notice_connecting",
    POSTGRES: "workhub.storage.notice_postgres",
    BROWSER_FALLBACK: "workhub.storage.notice_fallback"
  }[storageStatus];
  const openTaskCount = tasks.filter((task) => task.status !== "DONE").length;
  const inProgressCount = tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const completedTaskCount = tasks.filter((task) => task.status === "DONE").length;
  const overdueTaskCount = tasks.filter((task) =>
    task.status !== "DONE" && task.dueAt && new Date(task.dueAt).getTime() < nowMs
  ).length;

  const filteredTasks = useMemo(() => {
    const query = globalSearchQuery.trim().toLocaleLowerCase(language === "ar" ? "ar-SA" : "en-US");
    return [...tasks]
      .filter((task) => {
        if (taskFilter === "OPEN" && task.status === "DONE") return false;
        if (taskFilter === "COMPLETED" && task.status !== "DONE") return false;
        if (taskFilter === "TODAY" && (!task.dueAt || task.dueAt.slice(0, 10) !== todayKey)) return false;
        if (!query) return true;
        const haystack = `${localize(task.title)} ${localize(task.description)}`.toLocaleLowerCase(language === "ar" ? "ar-SA" : "en-US");
        return haystack.includes(query);
      })
      .sort((a, b) => {
        if (taskSortBy === "TITLE_ASC") return localize(a.title).localeCompare(localize(b.title));
        if (a.status === "DONE" && b.status !== "DONE") return 1;
        if (b.status === "DONE" && a.status !== "DONE") return -1;
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      });
  }, [tasks, taskFilter, globalSearchQuery, taskSortBy, todayKey, language, localize]);

  const activeReminderCount = reminders.filter((reminder) => reminder.status === "ACTIVE").length;
  const dueReminderCount = reminders.filter((reminder) =>
    reminder.status === "ACTIVE" && new Date(reminder.dueAt).getTime() <= nowMs
  ).length;
  const completedReminderCount = reminders.filter((reminder) => reminder.status === "DONE").length;
  const sortedReminders = useMemo(
    () => [...reminders].sort((a, b) => {
      if (a.status !== b.status) return a.status === "ACTIVE" ? -1 : 1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }),
    [reminders]
  );

  const activeNotebook = notebooks.find((notebook) => notebook.id === activeNotebookId);
  const activeEntry = activeNotebook?.entries.find((entry) => entry.id === selectedEntryId);
  const activeNotebookTitle = activeNotebook ? localize(activeNotebook.title) : "";
  const isEntryDirty = Boolean(activeEntry) && (
    entryTitleDraft !== localize(activeEntry!.title) ||
    entryContentDraft !== localize(activeEntry!.content)
  );

  useEffect(() => {
    if (!notebooks.some((notebook) => notebook.id === activeNotebookId)) {
      setActiveNotebookId(notebooks[0]?.id ?? "");
      setSelectedEntryId(notebooks[0]?.entries[0]?.id ?? "");
      setConfirmNotebookDelete(false);
    }
  }, [notebooks, activeNotebookId]);

  useEffect(() => {
    const entries = activeNotebook?.entries ?? [];
    if (!entries.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(entries[0]?.id ?? "");
      setConfirmEntryDelete(false);
    }
  }, [activeNotebook?.id, activeNotebook?.entries, selectedEntryId]);

  useEffect(() => {
    setEntryTitleDraft(activeEntry ? localize(activeEntry.title) : "");
    setEntryContentDraft(activeEntry ? localize(activeEntry.content) : "");
  }, [activeEntry?.id, activeEntry?.title, activeEntry?.content, localize]);

  const openNewTask = () => {
    setEditingTaskId(null);
    setTaskDraft({ title: "", description: "", dueAt: "", priority: "NORMAL" });
    setTaskDialogOpen(true);
  };

  const openEditTask = (task: WorkTask) => {
    setEditingTaskId(task.id);
    setTaskDraft({
      title: localize(task.title),
      description: localize(task.description),
      dueAt: task.dueAt ?? "",
      priority: task.priority
    });
    setTaskDialogOpen(true);
  };

  const submitTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = {
      title: taskDraft.title.trim(),
      description: taskDraft.description.trim(),
      dueAt: taskDraft.dueAt || null,
      priority: taskDraft.priority
    };
    if (!input.title) return;
    if (editingTaskId) updateTask(editingTaskId, input);
    else addTask(input);
    setTaskDialogOpen(false);
  };

  const openNewReminder = () => {
    setEditingReminderId(null);
    setReminderDraft({
      title: "",
      details: "",
      dueAt: localDateTimeValue(new Date(Date.now() + 60 * 60_000))
    });
    setReminderDialogOpen(true);
  };

  const openEditReminder = (reminder: WorkReminder) => {
    setEditingReminderId(reminder.id);
    setReminderDraft({
      title: localize(reminder.title),
      details: localize(reminder.details),
      dueAt: reminder.dueAt
    });
    setReminderDialogOpen(true);
  };

  const submitReminder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = {
      title: reminderDraft.title.trim(),
      details: reminderDraft.details.trim(),
      dueAt: reminderDraft.dueAt
    };
    if (!input.title || !input.dueAt) return;
    if (editingReminderId) updateReminder(editingReminderId, input);
    else addReminder(input);
    setReminderDialogOpen(false);
  };

  const openNewNotebook = () => {
    setEditingNotebookId(null);
    setNotebookTitleDraft("");
    setNotebookDialogOpen(true);
  };

  const openRenameNotebook = () => {
    if (!activeNotebook) return;
    setEditingNotebookId(activeNotebook.id);
    setNotebookTitleDraft(activeNotebookTitle);
    setNotebookDialogOpen(true);
  };

  const submitNotebook = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = notebookTitleDraft.trim();
    if (!title) return;
    if (editingNotebookId) {
      updateNotebook(editingNotebookId, title);
    } else {
      const id = addNotebook(title);
      setActiveNotebookId(id);
      setSelectedEntryId("");
    }
    setNotebookDialogOpen(false);
  };

  const submitEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeNotebook || !activeEntry) return;
    updateNotebookEntry(activeNotebook.id, activeEntry.id, {
      title: entryTitleDraft.trim() || t("workhub.note.untitled"),
      content: entryContentDraft
    });
  };

  const createEntry = () => {
    if (!activeNotebook) return;
    const id = addNotebookEntry(activeNotebook.id, t("workhub.note.untitled"));
    setSelectedEntryId(id);
    setConfirmEntryDelete(false);
  };

  const removeActiveNotebook = () => {
    if (!activeNotebook) return;
    const nextNotebook = notebooks.find((notebook) => notebook.id !== activeNotebook.id);
    deleteNotebook(activeNotebook.id);
    setActiveNotebookId(nextNotebook?.id ?? "");
    setSelectedEntryId(nextNotebook?.entries[0]?.id ?? "");
    setConfirmNotebookDelete(false);
  };

  const removeActiveEntry = () => {
    if (!activeNotebook || !activeEntry) return;
    const remainingEntries = activeNotebook.entries.filter((entry) => entry.id !== activeEntry.id);
    deleteNotebookEntry(activeNotebook.id, activeEntry.id);
    setSelectedEntryId(remainingEntries[0]?.id ?? "");
    setConfirmEntryDelete(false);
  };

  const activeTaskFilterCount = taskFilter === "ALL" ? 0 : 1;
  const pageAction = (
    <div className={`flex flex-wrap items-center justify-end gap-2 ${embedded ? "max-w-full" : "w-full"}`}>
      {activeTab === "tasks" && (
        <>
          <FilterDrawerTrigger
            label={t("ui.filters")}
            controls="workhub-task-filters"
            expanded={filterDrawerOpen}
            activeCount={activeTaskFilterCount}
            onClick={() => setFilterDrawerOpen(true)}
            className="md:hidden"
          />
          <div className="hidden items-center gap-2 xl:flex">
            <select aria-label={t("workhub.task.filter_label")} value={taskFilter} onChange={(event) => setTaskFilter(event.target.value as typeof taskFilter)} className="h-10 min-w-40 bg-surface-elevated px-3 text-dynamic-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="ALL">{t("workhub.task.filter.all")}</option>
              <option value="OPEN">{t("workhub.task.filter.open")}</option>
              <option value="TODAY">{t("workhub.task.filter.today")}</option>
              <option value="COMPLETED">{t("workhub.task.filter.completed")}</option>
            </select>
            <select aria-label={t("ui.sort_by")} value={taskSortBy} onChange={(event) => setTaskSortBy(event.target.value as typeof taskSortBy)} className="h-10 min-w-40 bg-surface-elevated px-3 text-dynamic-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="DUE_ASC">{t("ui.sort.due_asc")}</option>
              <option value="TITLE_ASC">{t("ui.sort.name_asc")}</option>
            </select>
          </div>
        </>
      )}
      {activeTab === "tasks" ? (
        <button type="button" onClick={openNewTask} className={primaryButtonClass}><PlusCircle className="h-4 w-4" /><span>{t("workhub.button.new_task")}</span></button>
      ) : activeTab === "reminders" ? (
        <button type="button" onClick={openNewReminder} className={primaryButtonClass}><PlusCircle className="h-4 w-4" /><span>{t("workhub.button.new_reminder")}</span></button>
      ) : (
        <button type="button" onClick={openNewNotebook} className={primaryButtonClass}><PlusCircle className="h-4 w-4" /><span>{t("workhub.button.new_notebook")}</span></button>
      )}
    </div>
  );

  const storageStatusBadge = (
    <span className={`rounded-full px-2.5 py-1 text-dynamic-xs font-semibold ${storageStatus === "POSTGRES" ? "bg-success-soft text-success" : storageStatus === "CONNECTING" ? "bg-warning-soft text-warning" : "bg-surface-elevated text-muted"}`}>
      {t(storageStatusKey)}
    </span>
  );
  const pageMeta = (
    <div className="flex flex-wrap gap-1.5">
      {!embedded && <span className="rounded-full bg-surface-elevated px-2.5 py-1 text-dynamic-xs font-semibold text-muted">{t("app.badge.pdpl")}</span>}
      {storageStatusBadge}
    </div>
  );

  return (
    <div className="space-y-4">
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {pageMeta}
          {pageAction}
        </div>
      ) : (
        <PageHeader
          eyebrow={t("nav.group.productivity")}
          title={t("workhub.header.title")}
          meta={pageMeta}
          actions={pageAction}
        />
      )}

      <ResponsiveFilterDrawer
        id="workhub-task-filters"
        open={filterDrawerOpen && activeTab === "tasks"}
        onClose={() => setFilterDrawerOpen(false)}
        onClear={() => { setTaskFilter("ALL"); setTaskSortBy("DUE_ASC"); }}
        title={t("ui.filters")}
        closeLabel={t("ui.close")}
        clearLabel={t("ui.clear_filters")}
        doneLabel={t("ui.done")}
      >
        <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
          <span>{t("workhub.task.filter_label")}</span>
          <select aria-label={t("workhub.task.filter_label")} value={taskFilter} onChange={(event) => setTaskFilter(event.target.value as typeof taskFilter)} className="h-11 w-full border border-theme bg-surface-elevated px-3 text-dynamic-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="ALL">{t("workhub.task.filter.all")}</option>
            <option value="OPEN">{t("workhub.task.filter.open")}</option>
            <option value="TODAY">{t("workhub.task.filter.today")}</option>
            <option value="COMPLETED">{t("workhub.task.filter.completed")}</option>
          </select>
        </label>
        <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
          <span>{t("ui.sort_by")}</span>
          <select aria-label={t("ui.sort_by")} value={taskSortBy} onChange={(event) => setTaskSortBy(event.target.value as typeof taskSortBy)} className="h-11 w-full border border-theme bg-surface-elevated px-3 text-dynamic-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="DUE_ASC">{t("ui.sort.due_asc")}</option>
            <option value="TITLE_ASC">{t("ui.sort.name_asc")}</option>
          </select>
        </label>
      </ResponsiveFilterDrawer>
      {activeTab === "tasks" && (
        <FilterDrawerEdgeTrigger
          label={t("ui.filters")}
          controls="workhub-task-filters"
          expanded={filterDrawerOpen}
          activeCount={activeTaskFilterCount}
          onClick={() => setFilterDrawerOpen(true)}
          placement="end"
          className="hidden md:flex"
        />
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-theme bg-surface p-3 text-dynamic-xs text-muted">
        <BookOpen className="h-4 w-4 shrink-0 text-primary" />
        <span>{t(storageNoticeKey)}</span>
      </div>

      <SegmentedTabs
        id="workhub"
        ariaLabel={t("ui.view_switcher")}
        value={activeTab}
        onChange={setActiveTab}
        layout="scroll"
        items={[
          { value: "tasks", label: t("workhub.tab.tasks"), icon: <ListTodo className="h-4 w-4" /> },
          { value: "reminders", label: t("workhub.tab.reminders"), icon: <Bell className="h-4 w-4" /> },
          { value: "notebooks", label: t("workhub.tab.notebooks"), icon: <BookOpen className="h-4 w-4" /> }
        ]}
      />

      <TabPanel hidden={activeTab !== "tasks"} id="workhub-tasks-panel" labelledBy="workhub-tasks-tab">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={t("workhub.task.metric.open")} value={openTaskCount} icon={<ListTodo className="h-5 w-5" />} tone="primary" />
            <MetricCard label={t("workhub.task.metric.in_progress")} value={inProgressCount} icon={<Clock className="h-5 w-5" />} tone="accent" />
            <MetricCard label={t("workhub.task.metric.completed")} value={completedTaskCount} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
            <MetricCard label={t("workhub.task.metric.overdue")} value={overdueTaskCount} icon={<CalendarClock className="h-5 w-5" />} tone="danger" />
          </div>

          <section className="space-y-3 rounded-2xl border border-theme bg-surface p-4 shadow-card">
            <div>
              <h2 className="text-dynamic-lg font-semibold text-foreground">{t("workhub.task.list_title")}</h2>
            </div>

            {filteredTasks.length ? (
              <div className="space-y-2.5">
                {filteredTasks.map((task) => {
                  const overdue = task.status !== "DONE" && Boolean(task.dueAt) && new Date(task.dueAt!).getTime() < nowMs;
                  return (
                    <article key={task.id} className="rounded-xl border border-theme bg-surface-elevated p-3.5 transition hover:border-primary/50">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <button
                          type="button"
                          title={t(task.status === "DONE" ? "workhub.task.mark_open" : "workhub.task.mark_done")}
                          aria-label={t(task.status === "DONE" ? "workhub.task.mark_open" : "workhub.task.mark_done")}
                          aria-pressed={task.status === "DONE"}
                          onClick={() => updateTask(task.id, { status: task.status === "DONE" ? "TODO" : "DONE" })}
                          className={`${iconButtonBaseClass} mt-0.5 ${task.status === "DONE" ? "bg-success-soft text-success" : "bg-surface text-muted hover:bg-surface-muted hover:text-primary"}`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`text-dynamic-sm font-semibold ${task.status === "DONE" ? "text-muted line-through" : "text-foreground"}`}>{localize(task.title)}</h3>
                            <span className={`rounded-full px-2.5 py-1 text-dynamic-xs font-semibold ${TASK_STATUS_CLASSES[task.status]}`}>{t(`workhub.task.status.${task.status}`)}</span>
                            <span className={`rounded-full px-2.5 py-1 text-dynamic-xs font-semibold ${TASK_PRIORITY_CLASSES[task.priority]}`}>{t(`workhub.task.priority.${task.priority}`)}</span>
                          </div>
                          {localize(task.description) && <p className="whitespace-pre-wrap text-dynamic-xs text-muted">{localize(task.description)}</p>}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-dynamic-xs text-muted">
                            <span className={`inline-flex items-center gap-1.5 ${overdue ? "font-semibold text-danger" : ""}`}>
                              <CalendarClock className="h-3.5 w-3.5" />
                              {task.dueAt ? `${t("workhub.task.due_label")} ${formatDateTime(task.dueAt, language)}` : t("workhub.task.no_due_date")}
                            </span>
                            {overdue && <span className="rounded-full bg-danger-soft px-2 py-0.5 font-semibold text-danger">{t("workhub.task.overdue_badge")}</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <label className="sr-only" htmlFor={`workhub-task-status-${task.id}`}>{t("workhub.task.status_label")}</label>
                          <select
                            id={`workhub-task-status-${task.id}`}
                            value={task.status}
                            onChange={(event) => updateTask(task.id, { status: event.target.value as WorkTaskStatus })}
                            className="max-w-40 rounded-lg border border-theme bg-surface px-2.5 py-2 text-dynamic-xs text-foreground"
                          >
                            <option value="TODO">{t("workhub.task.status.TODO")}</option>
                            <option value="IN_PROGRESS">{t("workhub.task.status.IN_PROGRESS")}</option>
                            <option value="DONE">{t("workhub.task.status.DONE")}</option>
                          </select>
                          <button type="button" title={t("workhub.task.edit")} aria-label={t("workhub.task.edit")} onClick={() => openEditTask(task)} className={`${iconButtonBaseClass} bg-surface text-muted hover:bg-primary-soft hover:text-primary`}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" title={t("workhub.task.delete")} aria-label={t("workhub.task.delete")} onClick={() => deleteTask(task.id)} className={`${iconButtonBaseClass} bg-surface text-muted hover:bg-danger-soft hover:text-danger`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-theme bg-surface-elevated p-8 text-center">
                <ListTodo className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-3 text-dynamic-base font-semibold text-foreground">{t("workhub.task.empty_title")}</h3>
                <p className="mx-auto mt-1 max-w-lg text-dynamic-xs text-muted">{t("workhub.task.empty_description")}</p>
                <button type="button" onClick={openNewTask} className={`${primaryButtonClass} mt-4`}>
                  <PlusCircle className="h-4 w-4" />
                  <span>{t("workhub.button.new_task")}</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </TabPanel>

      <TabPanel hidden={activeTab !== "reminders"} id="workhub-reminders-panel" labelledBy="workhub-reminders-tab">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label={t("workhub.reminder.metric.active")} value={activeReminderCount} icon={<Bell className="h-5 w-5" />} tone="primary" />
            <MetricCard label={t("workhub.reminder.metric.due")} value={dueReminderCount} icon={<CalendarClock className="h-5 w-5" />} tone="warning" />
            <MetricCard label={t("workhub.reminder.metric.completed")} value={completedReminderCount} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
          </div>
          <section className="space-y-3 rounded-2xl border border-theme bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-dynamic-lg font-semibold text-foreground">{t("workhub.reminder.list_title")}</h2>
              </div>
            </div>
            {sortedReminders.length ? (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {sortedReminders.map((reminder) => {
                  const dueTime = new Date(reminder.dueAt).getTime();
                  const isDue = reminder.status === "ACTIVE" && dueTime <= nowMs;
                  const isSoon = reminder.status === "ACTIVE" && dueTime > nowMs && dueTime <= nowMs + 60 * 60_000;
                  const toneClass = reminder.status === "DONE" ? "bg-success-soft text-success" : isDue ? "bg-danger-soft text-danger" : isSoon ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary";
                  const dueLabel = reminder.status === "DONE" ? t("workhub.reminder.badge.completed") : isDue ? t("workhub.reminder.badge.overdue") : isSoon ? t("workhub.reminder.badge.soon") : t("workhub.reminder.badge.upcoming");
                  return (
                    <article key={reminder.id} className="flex flex-col justify-between gap-3 rounded-xl border border-theme bg-surface-elevated p-4">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}><Bell className="h-4 w-4" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-dynamic-sm font-semibold text-foreground">{localize(reminder.title)}</h3>
                            <span className={`rounded-full px-2.5 py-1 text-dynamic-xs font-semibold ${toneClass}`}>{dueLabel}</span>
                          </div>
                          {localize(reminder.details) && <p className="mt-1 whitespace-pre-wrap text-dynamic-xs text-muted">{localize(reminder.details)}</p>}
                          <div className="mt-2 inline-flex items-center gap-1.5 text-dynamic-xs text-muted">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatDateTime(reminder.dueAt, language)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2 border-t border-theme pt-3">
                        {reminder.status === "ACTIVE" ? (
                          <>
                            <button type="button" onClick={() => snoozeReminder(reminder.id, 60)} className={secondaryButtonClass}>
                              <Clock className="h-4 w-4" /><span>{t("workhub.reminder.button.snooze")}</span>
                            </button>
                            <button type="button" onClick={() => updateReminder(reminder.id, { status: "DONE" })} className={primaryButtonClass}>
                              <CheckCircle2 className="h-4 w-4" /><span>{t("workhub.reminder.button.complete")}</span>
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => updateReminder(reminder.id, { status: "ACTIVE" })} className={secondaryButtonClass}>
                            <Clock className="h-4 w-4" /><span>{t("workhub.reminder.button.reopen")}</span>
                          </button>
                        )}
                        <button type="button" onClick={() => openEditReminder(reminder)} className={secondaryButtonClass}>
                          <Pencil className="h-4 w-4" /><span>{t("workhub.reminder.button.edit")}</span>
                        </button>
                        <button type="button" title={t("workhub.reminder.button.delete")} aria-label={t("workhub.reminder.button.delete")} onClick={() => deleteReminder(reminder.id)} className={`${iconButtonBaseClass} bg-surface text-muted hover:bg-danger-soft hover:text-danger`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-theme bg-surface-elevated p-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-3 text-dynamic-base font-semibold text-foreground">{t("workhub.reminder.empty_title")}</h3>
                <p className="mx-auto mt-1 max-w-lg text-dynamic-xs text-muted">{t("workhub.reminder.empty_description")}</p>
                <button type="button" onClick={openNewReminder} className={`${primaryButtonClass} mt-4`}>
                  <PlusCircle className="h-4 w-4" /><span>{t("workhub.button.new_reminder")}</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </TabPanel>

      <TabPanel hidden={activeTab !== "notebooks"} id="workhub-notebooks-panel" labelledBy="workhub-notebooks-tab">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <section className="space-y-3 rounded-2xl border border-theme bg-surface p-4 shadow-card xl:col-span-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-dynamic-base font-semibold text-foreground">{t("workhub.notebook.list_title")}</h2>
              </div>
              <button type="button" title={t("workhub.button.new_notebook")} aria-label={t("workhub.button.new_notebook")} onClick={openNewNotebook} className={`${iconButtonBaseClass} bg-surface-elevated text-primary hover:bg-primary-soft`}>
                <PlusCircle className="h-4 w-4" />
              </button>
            </div>
            {notebooks.length ? (
              <div className="space-y-2">
                {notebooks.map((notebook) => (
                  <button
                    key={notebook.id}
                    type="button"
                    aria-current={activeNotebookId === notebook.id ? "true" : undefined}
                    onClick={() => {
                      setActiveNotebookId(notebook.id);
                      setSelectedEntryId(notebook.entries[0]?.id ?? "");
                      setConfirmNotebookDelete(false);
                      setConfirmEntryDelete(false);
                    }}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-start transition ${activeNotebookId === notebook.id ? "border-primary bg-primary-soft" : "border-theme bg-surface-elevated hover:border-primary/50"}`}
                  >
                    <BookOpen className={`mt-0.5 h-4 w-4 shrink-0 ${activeNotebookId === notebook.id ? "text-primary" : "text-muted"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-dynamic-sm font-semibold text-foreground">{localize(notebook.title)}</span>
                      <span className="block text-dynamic-xs text-muted">{notebook.entries.length} {t("workhub.notebook.note_count")}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-theme p-5 text-center">
                <p className="text-dynamic-xs text-muted">{t("workhub.notebook.empty_title")}</p>
                <button type="button" onClick={openNewNotebook} className={`${secondaryButtonClass} mt-3`}>
                  <PlusCircle className="h-4 w-4" /><span>{t("workhub.button.new_notebook")}</span>
                </button>
              </div>
            )}
          </section>

          <section className="min-w-0 space-y-3 rounded-2xl border border-theme bg-surface p-4 shadow-card xl:col-span-8">
            {activeNotebook ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-theme pb-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-dynamic-lg font-semibold text-foreground">{activeNotebookTitle}</h2>
                    <p className="text-dynamic-xs text-muted">{activeNotebook.entries.length} {t("workhub.notebook.note_count")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={createEntry} className={primaryButtonClass}>
                      <PlusCircle className="h-4 w-4" /><span>{t("workhub.button.new_note")}</span>
                    </button>
                    <button type="button" onClick={openRenameNotebook} className={secondaryButtonClass}>
                      <Pencil className="h-4 w-4" /><span>{t("workhub.notebook.rename")}</span>
                    </button>
                    <button type="button" onClick={() => setConfirmNotebookDelete((current) => !current)} title={t("workhub.notebook.delete")} aria-label={t("workhub.notebook.delete")} className={`${iconButtonBaseClass} bg-surface-elevated text-muted hover:bg-danger-soft hover:text-danger`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {confirmNotebookDelete && (
                  <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger bg-danger-soft p-3">
                    <span className="text-dynamic-xs font-semibold text-danger">{t("workhub.notebook.delete_confirm")}</span>
                    <span className="flex gap-2">
                      <button type="button" onClick={() => setConfirmNotebookDelete(false)} className={secondaryButtonClass}>{t("workhub.button.cancel")}</button>
                      <button type="button" onClick={removeActiveNotebook} className="inline-flex min-h-10 items-center justify-center bg-danger px-4 py-2 text-dynamic-sm font-semibold text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2">{t("workhub.button.confirm_delete")}</button>
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="space-y-2 lg:col-span-4">
                    <h3 className="text-dynamic-xs font-semibold uppercase tracking-wide text-muted">{t("workhub.notebook.notes_heading")}</h3>
                    {activeNotebook.entries.length ? (
                      <div className="space-y-2">
                        {activeNotebook.entries.map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            aria-current={selectedEntryId === entry.id ? "true" : undefined}
                            onClick={() => {
                              setSelectedEntryId(entry.id);
                              setConfirmEntryDelete(false);
                            }}
                            className={`w-full rounded-xl border p-3 text-start transition ${selectedEntryId === entry.id ? "border-primary bg-primary-soft" : "border-theme bg-surface-elevated hover:border-primary/50"}`}
                          >
                            <span className="flex items-center gap-2 text-dynamic-sm font-semibold text-foreground"><FileText className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{localize(entry.title)}</span></span>
                            <span className="mt-1 block line-clamp-2 whitespace-pre-wrap text-dynamic-xs text-muted">{localize(entry.content) || t("workhub.note.empty_preview")}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-theme bg-surface-elevated p-4 text-center">
                        <p className="text-dynamic-xs text-muted">{t("workhub.notebook.empty_notes")}</p>
                        <button type="button" onClick={createEntry} className={`${secondaryButtonClass} mt-3`}><PlusCircle className="h-4 w-4" /><span>{t("workhub.button.new_note")}</span></button>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 lg:col-span-8">
                    {activeEntry ? (
                      <form onSubmit={submitEntry} className="space-y-3 rounded-xl border border-theme bg-surface-elevated p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-dynamic-base font-semibold text-foreground">{t("workhub.notebook.editor_title")}</h3>
                          <span className="text-dynamic-xs text-muted">{t(isEntryDirty ? "workhub.note.unsaved" : "workhub.note.saved")}</span>
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="workhub-note-title" className="text-dynamic-xs font-semibold text-muted">{t("workhub.field.note_title")}</label>
                          <input
                            id="workhub-note-title"
                            value={entryTitleDraft}
                            onChange={(event) => setEntryTitleDraft(event.target.value)}
                            maxLength={120}
                            className="w-full rounded-xl border border-theme bg-surface px-3.5 py-2.5 text-dynamic-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="workhub-note-content" className="text-dynamic-xs font-semibold text-muted">{t("workhub.field.note_content")}</label>
                          <textarea
                            id="workhub-note-content"
                            rows={12}
                            value={entryContentDraft}
                            onChange={(event) => setEntryContentDraft(event.target.value)}
                            placeholder={t("workhub.note.content_placeholder")}
                            className="w-full resize-y rounded-xl border border-theme bg-surface px-3.5 py-3 text-dynamic-sm leading-relaxed text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        {confirmEntryDelete && (
                          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger bg-danger-soft p-3">
                            <span className="text-dynamic-xs font-semibold text-danger">{t("workhub.note.delete_confirm")}</span>
                            <span className="flex gap-2">
                              <button type="button" onClick={() => setConfirmEntryDelete(false)} className={secondaryButtonClass}>{t("workhub.button.cancel")}</button>
                              <button type="button" onClick={removeActiveEntry} className="inline-flex min-h-10 items-center justify-center bg-danger px-4 py-2 text-dynamic-sm font-semibold text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2">{t("workhub.button.confirm_delete")}</button>
                            </span>
                          </div>
                        )}
                        <div className="flex flex-wrap justify-between gap-2 border-t border-theme pt-3">
                          <button type="button" onClick={() => setConfirmEntryDelete((current) => !current)} className="inline-flex items-center gap-2 rounded-xl border border-theme px-3 py-2 text-dynamic-xs font-semibold text-muted hover:border-danger hover:text-danger">
                            <Trash2 className="h-4 w-4" /><span>{t("workhub.note.delete")}</span>
                          </button>
                          <button type="submit" disabled={!isEntryDirty} className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}>
                            <CheckCircle2 className="h-4 w-4" /><span>{t("workhub.note.save")}</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-theme bg-surface-elevated p-8 text-center">
                        <BookOpen className="h-9 w-9 text-primary" />
                        <h3 className="mt-3 text-dynamic-base font-semibold text-foreground">{t("workhub.notebook.empty_notes")}</h3>
                        <p className="mt-1 text-dynamic-xs text-muted">{t("workhub.notebook.empty_notes_description")}</p>
                        <button type="button" onClick={createEntry} className={`${primaryButtonClass} mt-4`}><PlusCircle className="h-4 w-4" /><span>{t("workhub.button.new_note")}</span></button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-theme bg-surface-elevated p-8 text-center">
                <BookOpen className="h-9 w-9 text-primary" />
                <h2 className="mt-3 text-dynamic-base font-semibold text-foreground">{t("workhub.notebook.empty_title")}</h2>
                <p className="mt-1 text-dynamic-xs text-muted">{t("workhub.notebook.empty_description")}</p>
                <button type="button" onClick={openNewNotebook} className={`${primaryButtonClass} mt-4`}><PlusCircle className="h-4 w-4" /><span>{t("workhub.button.new_notebook")}</span></button>
              </div>
            )}
          </section>
        </div>
      </TabPanel>

      {taskDialogOpen && (
        <ModalShell id="workhub-task-dialog" title={t(editingTaskId ? "workhub.task.form.edit_title" : "workhub.task.form.new_title")} closeLabel={t("workhub.button.close")} onClose={() => setTaskDialogOpen(false)}>
          <form onSubmit={submitTask} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="workhub-task-title" className="text-dynamic-xs font-semibold text-muted">{t("workhub.field.title")}</label>
              <input id="workhub-task-title" required autoFocus maxLength={160} value={taskDraft.title} onChange={(event) => setTaskDraft((draft) => ({ ...draft, title: event.target.value }))} className="w-full rounded-xl border border-theme bg-surface-elevated px-3.5 py-2.5 text-dynamic-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="workhub-task-description" className="text-dynamic-xs font-semibold text-muted">{t("workhub.field.description")}</label>
              <textarea id="workhub-task-description" rows={3} maxLength={1000} value={taskDraft.description} onChange={(event) => setTaskDraft((draft) => ({ ...draft, description: event.target.value }))} className="w-full resize-y rounded-xl border border-theme bg-surface-elevated px-3.5 py-2.5 text-dynamic-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="workhub-task-due" className="text-dynamic-xs font-semibold text-muted">{t("workhub.field.due_date")}</label>
                <input id="workhub-task-due" type="datetime-local" value={taskDraft.dueAt} onChange={(event) => setTaskDraft((draft) => ({ ...draft, dueAt: event.target.value }))} className="w-full rounded-xl border border-theme bg-surface-elevated px-3.5 py-2.5 text-dynamic-sm text-foreground" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="workhub-task-priority" className="text-dynamic-xs font-semibold text-muted">{t("workhub.field.priority")}</label>
                <select id="workhub-task-priority" value={taskDraft.priority} onChange={(event) => setTaskDraft((draft) => ({ ...draft, priority: event.target.value as WorkTaskPriority }))} className="w-full rounded-xl border border-theme bg-surface-elevated px-3.5 py-2.5 text-dynamic-sm text-foreground">
                  <option value="LOW">{t("workhub.task.priority.LOW")}</option>
                  <option value="NORMAL">{t("workhub.task.priority.NORMAL")}</option>
                  <option value="HIGH">{t("workhub.task.priority.HIGH")}</option>
                  <option value="URGENT">{t("workhub.task.priority.URGENT")}</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-theme pt-3">
              <button type="button" onClick={() => setTaskDialogOpen(false)} className={secondaryButtonClass}>{t("workhub.button.cancel")}</button>
              <button type="submit" className={primaryButtonClass}><CheckCircle2 className="h-4 w-4" /><span>{t(editingTaskId ? "workhub.button.save" : "workhub.button.create_task")}</span></button>
            </div>
          </form>
        </ModalShell>
      )}

      {reminderDialogOpen && (
        <ModalShell id="workhub-reminder-dialog" title={t(editingReminderId ? "workhub.reminder.form.edit_title" : "workhub.reminder.form.new_title")} closeLabel={t("workhub.button.close")} onClose={() => setReminderDialogOpen(false)}>
          <form onSubmit={submitReminder} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="workhub-reminder-title" className="text-dynamic-xs font-semibold text-muted">{t("workhub.field.title")}</label>
              <input id="workhub-reminder-title" required autoFocus maxLength={160} value={reminderDraft.title} onChange={(event) => setReminderDraft((draft) => ({ ...draft, title: event.target.value }))} className="w-full rounded-xl border border-theme bg-surface-elevated px-3.5 py-2.5 text-dynamic-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="workhub-reminder-details" className="text-dynamic-xs font-semibold text-muted">{t("workhub.field.description")}</label>
              <textarea id="workhub-reminder-details" rows={3} maxLength={1000} value={reminderDraft.details} onChange={(event) => setReminderDraft((draft) => ({ ...draft, details: event.target.value }))} className="w-full resize-y rounded-xl border border-theme bg-surface-elevated px-3.5 py-2.5 text-dynamic-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="workhub-reminder-due" className="text-dynamic-xs font-semibold text-muted">{t("workhub.field.reminder_time")}</label>
              <input id="workhub-reminder-due" required type="datetime-local" value={reminderDraft.dueAt} onChange={(event) => setReminderDraft((draft) => ({ ...draft, dueAt: event.target.value }))} className="w-full rounded-xl border border-theme bg-surface-elevated px-3.5 py-2.5 text-dynamic-sm text-foreground" />
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-theme pt-3">
              <button type="button" onClick={() => setReminderDialogOpen(false)} className={secondaryButtonClass}>{t("workhub.button.cancel")}</button>
              <button type="submit" className={primaryButtonClass}><CheckCircle2 className="h-4 w-4" /><span>{t(editingReminderId ? "workhub.button.save" : "workhub.button.create_reminder")}</span></button>
            </div>
          </form>
        </ModalShell>
      )}

      {notebookDialogOpen && (
        <ModalShell id="workhub-notebook-dialog" title={t(editingNotebookId ? "workhub.notebook.form.rename_title" : "workhub.notebook.form.new_title")} closeLabel={t("workhub.button.close")} onClose={() => setNotebookDialogOpen(false)}>
          <form onSubmit={submitNotebook} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="workhub-notebook-title" className="text-dynamic-xs font-semibold text-muted">{t("workhub.field.notebook_title")}</label>
              <input id="workhub-notebook-title" required autoFocus maxLength={120} value={notebookTitleDraft} onChange={(event) => setNotebookTitleDraft(event.target.value)} className="w-full rounded-xl border border-theme bg-surface-elevated px-3.5 py-2.5 text-dynamic-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-theme pt-3">
              <button type="button" onClick={() => setNotebookDialogOpen(false)} className={secondaryButtonClass}>{t("workhub.button.cancel")}</button>
              <button type="submit" className={primaryButtonClass}><CheckCircle2 className="h-4 w-4" /><span>{t(editingNotebookId ? "workhub.button.save" : "workhub.button.create_notebook")}</span></button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
};
