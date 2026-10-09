import React, { FormEvent, useEffect, useState } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Layers3,
  Plus,
  PlusCircle,
  Users,
  UserPlus,
  Video,
  X
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  CollaborationMeeting,
  CollaborationProject,
  CollaborationTeam,
  MeetingStatus,
  ProjectTask,
  ProjectTaskPriority,
  ProjectTaskStatus,
  useCollaboration
} from "@/context/CollaborationContext";
import { formControlClassName, iconButtonBaseClass, iconButtonClass, MetricCard, PageHeader, primaryButtonClass, PrototypeNotice, ResponsiveDrawer, secondaryButtonClass, useModalFocus } from "@/components/DesignSystem";
import { CallRoomModal } from "@/modules/CallRoomModal";

type WorkspaceTab = "OVERVIEW" | "PROJECTS" | "TEAMS" | "MEETINGS";
type ModalKind = "WORKSPACE" | "TEAM" | "PROJECT" | "TASK" | "MEETING" | null;

const taskStatusKeys: Record<ProjectTaskStatus, string> = {
  BACKLOG: "collab.project.status_backlog",
  TODO: "collab.project.status_todo",
  IN_PROGRESS: "collab.project.status_in_progress",
  DONE: "collab.project.status_done"
};
const priorityKeys: Record<ProjectTaskPriority, string> = {
  LOW: "collab.project.priority_low",
  NORMAL: "collab.project.priority_normal",
  HIGH: "collab.project.priority_high",
  URGENT: "collab.project.priority_urgent"
};

const formatWorkspaceDate = (value: string | null, language: string): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(language === "ar" ? "ar-SA" : "en-SA", { month: "short", day: "numeric", year: "numeric" });
};

const formatMeetingDate = (value: string, language: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(language === "ar" ? "ar-SA" : "en-SA", { dateStyle: "medium", timeStyle: "short" });
};

const projectStatusClass: Record<CollaborationProject["status"], string> = {
  ACTIVE: "bg-success-soft text-success-text",
  ON_HOLD: "bg-warning-soft text-warning-text",
  COMPLETE: "bg-surface-elevated text-muted"
};

const priorityClass: Record<ProjectTaskPriority, string> = {
  LOW: "bg-surface-elevated text-muted",
  NORMAL: "bg-primary-soft text-primary-text",
  HIGH: "bg-warning-soft text-warning-text",
  URGENT: "bg-danger-soft text-danger-text"
};

const workspaceRailIconButtonBaseClass = iconButtonBaseClass;
const workspaceRailIconButtonClass = `${workspaceRailIconButtonBaseClass} bg-surface text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50`;

export const WorkspaceModule: React.FC<{ globalSearchQuery: string; embedded?: boolean }> = ({ globalSearchQuery, embedded = false }) => {
  const { t, localize, language } = useLanguage();
  const {
    members, currentMemberId, workspaces, teams, projects, meetings,
    createWorkspace, createTeam, addTeamMember, removeTeamMember,
    createProject, createProjectTask, updateProjectTask, updateProjectStatus, createMeeting, updateMeetingStatus, conversations
  } = useCollaboration();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("OVERVIEW");
  const [modal, setModal] = useState<ModalKind>(null);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [projectStatusFilter, setProjectStatusFilter] = useState<"ALL" | CollaborationProject["status"]>("ALL");
  const [projectSortBy, setProjectSortBy] = useState<"NAME_ASC" | "DUE_ASC" | "OPEN_TASKS_DESC">("DUE_ASC");
  const [projectDrawerOpen, setProjectDrawerOpen] = useState(false);

  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectTeamId, setProjectTeamId] = useState("");
  const [projectDueAt, setProjectDueAt] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState(currentMemberId);
  const [taskPriority, setTaskPriority] = useState<ProjectTaskPriority>("NORMAL");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingAgenda, setMeetingAgenda] = useState("");
  const [meetingTeamId, setMeetingTeamId] = useState("");
  const [meetingStartsAt, setMeetingStartsAt] = useState("");
  const [meetingDuration, setMeetingDuration] = useState(30);

  const activeWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? workspaces[0];
  const workspaceTeams = teams.filter((team) => team.workspaceId === activeWorkspace?.id);
  const workspaceProjects = projects.filter((project) => project.workspaceId === activeWorkspace?.id);
  const visibleProjects = workspaceProjects
    .filter((project) => {
      if (projectStatusFilter !== "ALL" && project.status !== projectStatusFilter) return false;
      const query = globalSearchQuery.trim().toLocaleLowerCase(language === "ar" ? "ar-SA" : "en-US");
      return !query || `${localize(project.name)} ${localize(project.description)}`.toLocaleLowerCase(language === "ar" ? "ar-SA" : "en-US").includes(query);
    })
    .sort((a, b) => {
      if (projectSortBy === "OPEN_TASKS_DESC") {
        const openA = a.tasks.filter((task) => task.status !== "DONE").length;
        const openB = b.tasks.filter((task) => task.status !== "DONE").length;
        return openB - openA;
      }
      if (projectSortBy === "DUE_ASC") return (a.dueAt ?? "9999-12-31").localeCompare(b.dueAt ?? "9999-12-31");
      return localize(a.name).localeCompare(localize(b.name));
    });
  const activeProject = visibleProjects.find((project) => project.id === selectedProjectId) ?? visibleProjects[0];
  const workspaceMeetings = meetings.filter((meeting) => meeting.workspaceId === activeWorkspace?.id).sort((a, b) => new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime());
  const openTasks = workspaceProjects.flatMap((project) => project.tasks).filter((task) => task.status !== "DONE");
  const activeMeetings = workspaceMeetings.filter((meeting) => meeting.status !== "ENDED");
  const activeMeeting = meetings.find((meeting) => meeting.id === activeMeetingId);

  useEffect(() => {
    if (!workspaces.some((workspace) => workspace.id === selectedWorkspaceId)) setSelectedWorkspaceId(workspaces[0]?.id ?? "");
  }, [workspaces, selectedWorkspaceId]);

  useEffect(() => {
    if (!workspaceProjects.some((project) => project.id === selectedProjectId)) setSelectedProjectId(workspaceProjects[0]?.id ?? "");
  }, [workspaceProjects, selectedProjectId]);

  useEffect(() => {
    if (!workspaceTeams.some((team) => team.id === selectedTeamId)) setSelectedTeamId(workspaceTeams[0]?.id ?? "");
  }, [workspaceTeams, selectedTeamId]);

  const resetModalFields = () => {
    setWorkspaceName(""); setWorkspaceDescription("");
    setTeamName(""); setTeamDescription(""); setTeamMemberIds([]);
    setProjectName(""); setProjectDescription(""); setProjectTeamId(workspaceTeams[0]?.id ?? ""); setProjectDueAt("");
    setTaskTitle(""); setTaskDescription(""); setTaskAssigneeId(currentMemberId); setTaskPriority("NORMAL"); setTaskDueAt("");
    setMeetingTitle(""); setMeetingAgenda(""); setMeetingTeamId(workspaceTeams[0]?.id ?? ""); setMeetingStartsAt(""); setMeetingDuration(30);
  };

  const closeModal = () => { setModal(null); resetModalFields(); };
  const modalDialogRef = useModalFocus(modal !== null, closeModal);

  const openModal = (kind: Exclude<ModalKind, null>) => {
    resetModalFields();
    setModal(kind);
  };

  const saveWorkspace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspaceName.trim()) return;
    const id = createWorkspace(workspaceName.trim(), workspaceDescription.trim());
    setSelectedWorkspaceId(id);
    setActiveTab("OVERVIEW");
    closeModal();
  };

  const saveTeam = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!teamName.trim() || !activeWorkspace) return;
    const id = createTeam({ workspaceId: activeWorkspace.id, name: teamName.trim(), description: teamDescription.trim(), memberIds: teamMemberIds });
    setSelectedTeamId(id);
    setActiveTab("TEAMS");
    closeModal();
  };

  const saveProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectName.trim() || !activeWorkspace || !projectTeamId) return;
    const id = createProject({ workspaceId: activeWorkspace.id, teamId: projectTeamId, name: projectName.trim(), description: projectDescription.trim(), dueAt: projectDueAt || null });
    setProjectStatusFilter("ALL");
    setSelectedProjectId(id);
    setProjectDrawerOpen(false);
    setActiveTab("PROJECTS");
    closeModal();
  };

  const saveTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeProject || !taskTitle.trim()) return;
    createProjectTask(activeProject.id, { title: taskTitle.trim(), description: taskDescription.trim(), assigneeId: taskAssigneeId, priority: taskPriority, dueAt: taskDueAt || null });
    closeModal();
  };

  const saveMeeting = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeWorkspace || !meetingTitle.trim() || !meetingStartsAt) return;
    const team = workspaceTeams.find((entry) => entry.id === meetingTeamId);
    const channel = team ? conversations.find((conversation) => conversation.teamId === team.id) : undefined;
    createMeeting({
      title: meetingTitle.trim(),
      agenda: meetingAgenda.trim(),
      workspaceId: activeWorkspace.id,
      teamId: team?.id ?? null,
      conversationId: channel?.id ?? null,
      participantIds: team?.memberIds ?? [currentMemberId],
      startsAtIso: new Date(meetingStartsAt).toISOString(),
      durationMinutes: meetingDuration
    });
    closeModal();
  };

  const launchMeeting = (meeting: CollaborationMeeting) => {
    updateMeetingStatus(meeting.id, "IN_PROGRESS");
    setActiveMeetingId(meeting.id);
  };

  const launchTeamMeeting = (team: CollaborationTeam) => {
    const now = new Date().toISOString();
    const teamConversation = conversations.find((conversation) => conversation.teamId === team.id);
    const id = createMeeting({
      title: `${localize(team.name)} · ${t("collab.meeting.quick_title")}`,
      agenda: localize(team.description),
      workspaceId: team.workspaceId,
      teamId: team.id,
      conversationId: teamConversation?.id ?? null,
      participantIds: team.memberIds,
      startsAtIso: now,
      durationMinutes: 45
    });
    updateMeetingStatus(id, "IN_PROGRESS");
    setActiveMeetingId(id);
  };

  const leaveMeeting = () => {
    if (activeMeetingId) updateMeetingStatus(activeMeetingId, "ENDED");
    setActiveMeetingId(null);
  };

  const toggleTeamMember = (memberId: string) => setTeamMemberIds((current) => current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]);

  const tabs: Array<{ value: WorkspaceTab; label: string; icon: React.ReactNode }> = [
    { value: "OVERVIEW", label: t("collab.workspace.tab_overview"), icon: <Layers3 className="h-4 w-4" /> },
    { value: "PROJECTS", label: t("collab.workspace.tab_projects"), icon: <FolderKanban className="h-4 w-4" /> },
    { value: "TEAMS", label: t("collab.workspace.tab_teams"), icon: <Users className="h-4 w-4" /> },
    { value: "MEETINGS", label: t("collab.workspace.tab_meetings"), icon: <CalendarClock className="h-4 w-4" /> }
  ];

  const renderTask = (project: CollaborationProject, task: ProjectTask) => {
    const assignee = members.find((member) => member.id === task.assigneeId);
    return (
      <article key={task.id} className="space-y-2 rounded-xl border border-theme bg-surface p-3 shadow-card">
        <div className="flex items-start justify-between gap-2"><h4 className="min-w-0 break-words text-dynamic-sm font-semibold text-foreground">{localize(task.title)}</h4><span className={`shrink-0 rounded-full px-2 py-0.5 text-dynamic-xs font-bold ${priorityClass[task.priority]}`}>{t(priorityKeys[task.priority])}</span></div>
        {localize(task.description) && <p className="line-clamp-2 text-dynamic-xs leading-relaxed text-muted">{localize(task.description)}</p>}
        <div className="flex items-center justify-between gap-2 border-t border-theme pt-2"><span className="flex min-w-0 items-center gap-1.5 truncate text-dynamic-xs text-muted"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-dynamic-xs font-bold text-accent-text">{assignee ? localize(assignee.name).slice(0, 1) : "?"}</span><span className="truncate">{assignee ? localize(assignee.name) : t("collab.project.unassigned")}</span></span>{task.dueAt && <time className="shrink-0 text-dynamic-xs text-muted">{formatWorkspaceDate(task.dueAt, language)}</time>}</div>
        <label className="flex items-center justify-between gap-2 text-dynamic-xs text-muted"><span>{t("collab.project.move_to")}</span><select aria-label={`${t("collab.project.move_to")} ${localize(task.title)}`} value={task.status} onChange={(event) => updateProjectTask(project.id, task.id, { status: event.target.value as ProjectTaskStatus })} className="max-w-40 rounded-lg border border-theme bg-surface-elevated px-2 py-1.5 text-dynamic-xs text-foreground">{(Object.keys(taskStatusKeys) as ProjectTaskStatus[]).map((status) => <option key={status} value={status}>{t(taskStatusKeys[status])}</option>)}</select></label>
      </article>
    );
  };

  const selectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setProjectDrawerOpen(false);
  };

  const renderProjectNavigation = () => (
    <nav className="space-y-1" aria-label={t("collab.workspace.projects_title")}>
      {visibleProjects.length ? visibleProjects.map((project) => {
        const selected = activeProject?.id === project.id;
        const openTaskCount = project.tasks.filter((task) => task.status !== "DONE").length;
        return (
          <button
            key={project.id}
            type="button"
            aria-pressed={selected}
            onClick={() => selectProject(project.id)}
            className={`w-full border-s-2 px-3 py-3 text-start transition-colors ${selected ? "border-primary bg-surface text-foreground" : "border-transparent text-muted hover:bg-surface hover:text-foreground"}`}
          >
            <span className="flex min-w-0 items-start justify-between gap-2">
              <span className="min-w-0 truncate text-dynamic-sm font-semibold">{localize(project.name)}</span>
              <span className={`shrink-0 px-1.5 py-0.5 text-dynamic-xs font-semibold ${projectStatusClass[project.status]}`}>{t(`collab.project.status_${project.status.toLowerCase()}`)}</span>
            </span>
            <span className="mt-1.5 block text-dynamic-xs text-muted">{openTaskCount} {t("collab.project.open_tasks")}</span>
            {project.dueAt && <span className="mt-1 block text-dynamic-xs text-muted">{formatWorkspaceDate(project.dueAt, language)}</span>}
          </button>
        );
      }) : (
        <p className="px-3 py-4 text-dynamic-xs text-muted">{workspaceProjects.length ? t("collab.workspace.no_project_matches") : t("collab.workspace.no_projects")}</p>
      )}
    </nav>
  );

  const renderProjectFilters = () => (
    <div className="space-y-3 border-b border-theme pb-4">
      <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
        <span>{t("collab.project.filter.all_status")}</span>
        <select aria-label={t("collab.project.filter.all_status")} value={projectStatusFilter} onChange={(event) => setProjectStatusFilter(event.target.value as typeof projectStatusFilter)} className="h-10 w-full border border-theme bg-surface px-3 text-dynamic-sm text-foreground">
          <option value="ALL">{t("collab.project.filter.all_status")}</option>
          <option value="ACTIVE">{t("collab.project.status_active")}</option>
          <option value="ON_HOLD">{t("collab.project.status_on_hold")}</option>
          <option value="COMPLETE">{t("collab.project.status_complete")}</option>
        </select>
      </label>
      <label className="block space-y-1.5 text-dynamic-xs font-semibold text-muted">
        <span>{t("ui.sort_by")}</span>
        <select aria-label={t("ui.sort_by")} value={projectSortBy} onChange={(event) => setProjectSortBy(event.target.value as typeof projectSortBy)} className="h-10 w-full border border-theme bg-surface px-3 text-dynamic-sm text-foreground">
          <option value="DUE_ASC">{t("ui.sort.due_asc")}</option>
          <option value="NAME_ASC">{t("ui.sort.name_asc")}</option>
          <option value="OPEN_TASKS_DESC">{t("ui.sort.open_tasks_desc")}</option>
        </select>
      </label>
    </div>
  );

  const renderProjects = () => (
    <div className="space-y-4">
      {workspaceProjects.length > 0 && (
        <ResponsiveDrawer
          id="workspace-project-drawer"
          open={projectDrawerOpen}
          onClose={() => setProjectDrawerOpen(false)}
          title={t("collab.workspace.projects_title")}
          closeLabel={t("ui.close")}
          placement="start"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
            {renderProjectFilters()}
            {renderProjectNavigation()}
          </div>
        </ResponsiveDrawer>
      )}

      <div className={`grid min-w-0 grid-cols-1 gap-4 ${workspaceProjects.length ? "xl:grid-cols-[15rem_minmax(0,1fr)]" : ""}`}>
        {workspaceProjects.length > 0 && (
          <aside className="hidden min-w-0 border-e border-theme bg-surface-elevated p-3 xl:block" aria-label={t("collab.workspace.projects_title")}>
            <h2 className="mb-3 px-3 text-dynamic-sm font-semibold text-foreground">{t("collab.workspace.projects_title")}</h2>
            {renderProjectNavigation()}
          </aside>
        )}

        <div className="min-w-0 space-y-4">
          <div className="flex justify-end xl:hidden">
            {workspaceProjects.length > 0 ? (
              <button
                type="button"
                aria-controls="workspace-project-drawer"
                aria-expanded={projectDrawerOpen}
                aria-label={`${t("collab.workspace.projects_title")}: ${activeProject ? localize(activeProject.name) : t("collab.workspace.select_project")}`}
                onClick={() => setProjectDrawerOpen(true)}
                className={`${secondaryButtonClass} min-w-0 max-w-full justify-start`}
              >
                <FolderKanban className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{activeProject ? localize(activeProject.name) : t("collab.workspace.select_project")}</span>
              </button>
            ) : (
              <h2 className="text-dynamic-lg font-bold text-foreground">{t("collab.workspace.projects_title")}</h2>
            )}
          </div>

          {activeProject ? (
            <div className="space-y-3 bg-surface-elevated p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-dynamic-base font-bold text-foreground">{localize(activeProject.name)}</h3>
                  <p className="mt-1 max-w-2xl text-dynamic-xs text-muted">{localize(activeProject.description)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select aria-label={t("collab.project.project_status")} value={activeProject.status} onChange={(event) => updateProjectStatus(activeProject.id, event.target.value as CollaborationProject["status"])} className="h-10 border border-theme bg-surface px-3 text-dynamic-xs text-foreground">
                    <option value="ACTIVE">{t("collab.project.status_active")}</option>
                    <option value="ON_HOLD">{t("collab.project.status_on_hold")}</option>
                    <option value="COMPLETE">{t("collab.project.status_complete")}</option>
                  </select>
                  <button type="button" onClick={() => openModal("TASK")} className={primaryButtonClass}><Plus className="h-4 w-4" /><span>{t("collab.workspace.new_task")}</span></button>
                </div>
              </div>
              <div role="region" aria-label={`${t("collab.project.project_status")} — ${localize(activeProject.name)}`} tabIndex={0} className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-3 pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:-mx-4 sm:px-4 2xl:mx-0 2xl:grid 2xl:grid-cols-4 2xl:overflow-visible 2xl:px-0 2xl:pb-0">
                {(Object.keys(taskStatusKeys) as ProjectTaskStatus[]).map((status) => {
                  const tasks = activeProject.tasks.filter((task) => task.status === status);
                  return (
                    <section key={status} className="w-[85vw] min-w-[15rem] max-w-[22rem] shrink-0 snap-start space-y-2 bg-surface/70 p-2.5 2xl:w-auto 2xl:min-w-0 2xl:max-w-none">
                      <h4 className="flex items-center justify-between text-dynamic-xs font-bold text-foreground"><span>{t(taskStatusKeys[status])}</span><span className="flex h-5 min-w-5 items-center justify-center bg-surface-elevated px-1 text-dynamic-xs text-muted">{tasks.length}</span></h4>
                      {tasks.length ? tasks.map((task) => renderTask(activeProject, task)) : <p className="border border-theme p-3 text-center text-dynamic-xs text-muted">{t("collab.workspace.no_tasks")}</p>}
                    </section>
                  );
                })}
              </div>
            </div>
          ) : workspaceProjects.length > 0 ? (
            <div className="p-8 text-center">
              <p className="text-dynamic-sm font-semibold text-foreground">{t("collab.workspace.no_project_matches")}</p>
            </div>
          ) : (
            <div className="p-8 text-center">
              <FolderKanban className="mx-auto h-8 w-8 text-primary-text" />
              <p className="mt-2 text-dynamic-sm font-semibold text-foreground">{t("collab.workspace.no_projects")}</p>
              <p className="mt-1 text-dynamic-xs text-muted">{t(workspaceTeams.length ? "collab.workspace.no_projects_help" : "collab.workspace.create_team_first")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTeams = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-dynamic-lg font-bold text-foreground">{t("collab.workspace.teams_title")}</h2>
        
      </div>
      {workspaceTeams.length ? <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{workspaceTeams.map((team) => <article key={team.id} className={`space-y-3 rounded-2xl border bg-surface p-4 shadow-card ${selectedTeamId === team.id ? "border-primary ring-2 ring-primary/20" : "border-theme"}`}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-text"><Users className="h-5 w-5" /></span><div className="min-w-0"><h3 className="truncate text-dynamic-base font-bold text-foreground">{localize(team.name)}</h3><p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{localize(team.description)}</p></div></div><button type="button" onClick={() => launchTeamMeeting(team)} title={`${t("collab.chat.start_call")} ${localize(team.name)}`} aria-label={`${t("collab.chat.start_call")} ${localize(team.name)}`} className={`${iconButtonBaseClass} bg-surface-elevated text-primary-text hover:bg-primary-soft`}><Video className="h-4 w-4" /></button></div>
        <div className="flex items-center justify-between gap-2 border-t border-theme pt-3"><h4 className="text-dynamic-xs font-semibold text-muted">{t("collab.workspace.members")} · {team.memberIds.length}</h4><div className="flex items-center gap-1"><select aria-label={`${t("collab.workspace.add_member")} ${localize(team.name)}`} id={`add-team-member-${team.id}`} className="max-w-44 rounded-lg border border-theme bg-surface-elevated px-2 py-1.5 text-dynamic-xs text-foreground"><option value="">{t("collab.workspace.select_member")}</option>{members.filter((member) => !team.memberIds.includes(member.id)).map((member) => <option key={member.id} value={member.id}>{localize(member.name)}</option>)}</select><button type="button" onClick={() => { const select = document.getElementById(`add-team-member-${team.id}`) as HTMLSelectElement | null; if (select?.value) { addTeamMember(team.id, select.value); select.value = ""; } }} title={t("collab.workspace.add_member")} aria-label={t("collab.workspace.add_member")} className={`${iconButtonBaseClass} bg-primary-soft text-primary-text hover:bg-primary-soft`}><Plus className="h-4 w-4" /></button></div></div>
        <div className="flex flex-wrap gap-2">{team.memberIds.map((id) => { const member = members.find((entry) => entry.id === id); if (!member) return null; return <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-theme bg-surface-elevated py-1 ps-2 pe-1 text-dynamic-xs text-foreground"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-dynamic-xs font-bold text-primary-text">{localize(member.name).slice(0, 1)}</span><span>{localize(member.name)}</span>{id !== currentMemberId && <button type="button" title={`${t("collab.workspace.remove_member")} ${localize(member.name)}`} aria-label={`${t("collab.workspace.remove_member")} ${localize(member.name)}`} onClick={() => removeTeamMember(team.id, id)} className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-muted hover:bg-danger-soft hover:text-danger-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X className="h-4 w-4" /></button>}</span>; })}</div>
        <div className="flex items-center justify-between gap-2 border-t border-theme pt-2 text-dynamic-xs text-muted"><span>{projects.filter((project) => project.teamId === team.id).length} {t("collab.workspace.linked_projects")}</span><button type="button" onClick={() => { const linkedProject = projects.find((project) => project.teamId === team.id); if (linkedProject) setSelectedProjectId(linkedProject.id); setActiveTab("PROJECTS"); }} className="inline-flex items-center gap-1 font-semibold text-primary-text hover:underline">{t("collab.workspace.view_projects")}<ArrowUpRight className="h-3.5 w-3.5" /></button></div>
      </article>)}</div> : <div className="rounded-2xl border border-dashed border-theme bg-surface p-8 text-center"><Users className="mx-auto h-8 w-8 text-primary-text" /><p className="mt-2 text-dynamic-sm font-semibold text-foreground">{t("collab.workspace.no_teams")}</p><button type="button" onClick={() => openModal("TEAM")} className={`${primaryButtonClass} mt-4`}><Plus className="h-4 w-4" /><span>{t("collab.workspace.new_team")}</span></button></div>}
    </div>
  );

  const meetingStatusText = (status: MeetingStatus): string => t(`collab.meeting.status_${status.toLowerCase()}`);

  const renderMeetings = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-dynamic-lg font-bold text-foreground">{t("collab.workspace.meetings_title")}</h2>
        
      </div>
      {workspaceMeetings.length ? <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{workspaceMeetings.map((meeting) => { const team = workspaceTeams.find((entry) => entry.id === meeting.teamId); return <article key={meeting.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-theme bg-surface p-4 shadow-card sm:flex-row sm:items-center"><div className="flex min-w-0 items-start gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meeting.status === "IN_PROGRESS" ? "bg-success-soft text-success-text" : "bg-primary-soft text-primary-text"}`}>{meeting.status === "IN_PROGRESS" ? <Video className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}</span><div className="min-w-0"><h3 className="truncate text-dynamic-sm font-bold text-foreground">{localize(meeting.title)}</h3><p className="mt-1 text-dynamic-xs text-muted">{team ? localize(team.name) : localize(activeWorkspace?.name ?? "")} · {formatMeetingDate(meeting.startsAtIso, language)} · {meeting.durationMinutes} {t("collab.meeting.minutes")}</p>{localize(meeting.agenda) && <p className="mt-1 line-clamp-2 text-dynamic-xs text-muted">{localize(meeting.agenda)}</p>}<span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-dynamic-xs font-semibold ${meeting.status === "IN_PROGRESS" ? "bg-success-soft text-success-text" : meeting.status === "ENDED" ? "bg-surface-elevated text-muted" : "bg-primary-soft text-primary-text"}`}>{meetingStatusText(meeting.status)}</span></div></div>{meeting.status !== "ENDED" && <button type="button" onClick={() => launchMeeting(meeting)} className={meeting.status === "IN_PROGRESS" ? secondaryButtonClass : primaryButtonClass}><Video className="h-4 w-4" /><span>{t(meeting.status === "IN_PROGRESS" ? "collab.meeting.join" : "collab.meeting.start")}</span></button>}</article>; })}</div> : <div className="rounded-2xl border border-dashed border-theme bg-surface p-8 text-center"><CalendarClock className="mx-auto h-8 w-8 text-primary-text" /><p className="mt-2 text-dynamic-sm font-semibold text-foreground">{t("collab.meeting.none_workspace")}</p><button type="button" onClick={() => openModal("MEETING")} className={`${primaryButtonClass} mt-4`}><Plus className="h-4 w-4" /><span>{t("collab.workspace.schedule_meeting")}</span></button></div>}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label={t("collab.workspace.metric_projects")} value={workspaceProjects.length} icon={<FolderKanban className="h-5 w-5" />} tone="primary" note={t("collab.workspace.metric_projects_note")} />
        <MetricCard label={t("collab.workspace.metric_open_tasks")} value={openTasks.length} icon={<ClipboardList className="h-5 w-5" />} tone="warning" note={t("collab.workspace.metric_tasks_note")} />
        <MetricCard label={t("collab.workspace.metric_teams")} value={workspaceTeams.length} icon={<Users className="h-5 w-5" />} tone="accent" note={t("collab.workspace.metric_teams_note")} />
        <MetricCard label={t("collab.workspace.metric_meetings")} value={activeMeetings.length} icon={<CalendarClock className="h-5 w-5" />} tone="success" note={t("collab.workspace.metric_meetings_note")} />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <section className="space-y-3 rounded-2xl border border-theme bg-surface p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="text-dynamic-base font-bold text-foreground">{t("collab.workspace.projects_title")}</h2></div><button type="button" onClick={() => setActiveTab("PROJECTS")} className="text-dynamic-xs font-semibold text-primary-text hover:underline">{t("collab.workspace.view_all")}</button></div>
          {workspaceProjects.slice(0, 4).map((project) => { const team = workspaceTeams.find((entry) => entry.id === project.teamId); const total = project.tasks.length; const done = project.tasks.filter((task) => task.status === "DONE").length; const percent = total ? Math.round(done / total * 100) : 0; return <button key={project.id} type="button" onClick={() => { setSelectedProjectId(project.id); setActiveTab("PROJECTS"); }} className="w-full rounded-xl border border-theme p-3 text-start hover:border-primary"><div className="flex items-start justify-between gap-2"><span className="min-w-0 truncate text-dynamic-sm font-semibold text-foreground">{localize(project.name)}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-dynamic-xs font-semibold ${projectStatusClass[project.status]}`}>{t(`collab.project.status_${project.status.toLowerCase()}`)}</span></div><div className="mt-2 flex items-center justify-between gap-2 text-dynamic-xs text-muted"><span>{team ? localize(team.name) : t("collab.project.unassigned_team")}</span><span>{done}/{total} {t("collab.project.tasks_done")}</span></div><progress aria-label={t("collab.project.progress")} max={100} value={percent} className="mt-2 h-2 w-full accent-primary" /></button>; })}
          {!workspaceProjects.length && <p className="rounded-xl border border-dashed border-theme p-5 text-center text-dynamic-xs text-muted">{t("collab.workspace.no_projects")}</p>}
        </section>
        <div className="space-y-4">
          <section className="space-y-3 rounded-2xl border border-theme bg-surface p-4"><div className="flex items-center justify-between gap-2"><div><h2 className="text-dynamic-base font-bold text-foreground">{t("collab.workspace.teams_title")}</h2></div><button type="button" onClick={() => setActiveTab("TEAMS")} className="text-dynamic-xs font-semibold text-primary-text hover:underline">{t("collab.workspace.view_all")}</button></div>{workspaceTeams.slice(0, 3).map((team) => <button key={team.id} type="button" onClick={() => { setSelectedTeamId(team.id); setActiveTab("TEAMS"); }} className="flex w-full items-center gap-3 rounded-xl border border-theme p-2.5 text-start hover:border-primary"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent-text"><Users className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-dynamic-xs font-semibold text-foreground">{localize(team.name)}</span><span className="text-dynamic-xs text-muted">{team.memberIds.length} {t("collab.workspace.members")}</span></span><ArrowUpRight className="h-4 w-4 text-muted" /></button>)}{!workspaceTeams.length && <p className="text-dynamic-xs text-muted">{t("collab.workspace.no_teams")}</p>}</section>
          <section className="space-y-3 rounded-2xl border border-theme bg-surface p-4"><div className="flex items-center justify-between gap-2"><div><h2 className="text-dynamic-base font-bold text-foreground">{t("collab.meeting.upcoming")}</h2></div><button type="button" onClick={() => setActiveTab("MEETINGS")} className="text-dynamic-xs font-semibold text-primary-text hover:underline">{t("collab.workspace.view_all")}</button></div>{activeMeetings.slice(0, 3).map((meeting) => <button key={meeting.id} type="button" onClick={() => meeting.status === "ENDED" ? undefined : launchMeeting(meeting)} className="flex w-full items-center gap-3 rounded-xl border border-theme p-2.5 text-start hover:border-primary"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary-text"><CalendarClock className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-dynamic-xs font-semibold text-foreground">{localize(meeting.title)}</span><span className="text-dynamic-xs text-muted">{formatMeetingDate(meeting.startsAtIso, language)}</span></span><ArrowUpRight className="h-4 w-4 text-muted" /></button>)}{!activeMeetings.length && <p className="text-dynamic-xs text-muted">{t("collab.meeting.none_upcoming")}</p>}</section>
        </div>
      </div>
    </div>
  );

  const renderModal = () => {
    if (!modal) return null;
    const modalTitle: Record<Exclude<ModalKind, null>, string> = {
      WORKSPACE: t("collab.workspace.new_workspace"), TEAM: t("collab.workspace.new_team"), PROJECT: t("collab.workspace.new_project"), TASK: t("collab.workspace.new_task"), MEETING: t("collab.workspace.schedule_meeting")
    };
    const submitHandlers: Record<Exclude<ModalKind, null>, (event: FormEvent<HTMLFormElement>) => void> = { WORKSPACE: saveWorkspace, TEAM: saveTeam, PROJECT: saveProject, TASK: saveTask, MEETING: saveMeeting };
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-4 backdrop-blur-sm"><section ref={modalDialogRef} role="dialog" aria-modal="true" aria-labelledby="workspace-modal-title" tabIndex={-1} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border-2 border-primary bg-surface shadow-shell"><div className="flex items-start justify-between gap-3 border-b border-theme p-4"><div><h2 id="workspace-modal-title" className="text-dynamic-lg font-bold text-foreground">{modalTitle[modal]}</h2><p className="text-dynamic-xs text-muted">{t("collab.workspace.modal_demo_hint")}</p></div><button type="button" title={t("collab.button.close")} aria-label={t("collab.button.close")} onClick={closeModal} className={iconButtonClass}><X className="h-4 w-4" /></button></div>
      <form onSubmit={submitHandlers[modal]} className="space-y-4 p-4">
        {modal === "WORKSPACE" && <><Field label={t("collab.workspace.name")} value={workspaceName} onChange={setWorkspaceName} required /><Field label={t("collab.workspace.description")} value={workspaceDescription} onChange={setWorkspaceDescription} multiline /></>}
        {modal === "TEAM" && <><Field label={t("collab.workspace.name")} value={teamName} onChange={setTeamName} required /><Field label={t("collab.workspace.description")} value={teamDescription} onChange={setTeamDescription} multiline /><div className="space-y-2"><p className="text-dynamic-xs font-semibold text-muted">{t("collab.workspace.select_members")}</p><div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-theme p-2">{members.filter((member) => member.id !== currentMemberId).map((member) => <label key={member.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-surface-elevated"><input type="checkbox" checked={teamMemberIds.includes(member.id)} onChange={() => toggleTeamMember(member.id)} className="accent-primary" /><span className="text-dynamic-xs text-foreground">{localize(member.name)} · {localize(member.jobTitle)}</span></label>)}</div></div></>}
        {modal === "PROJECT" && <><Field label={t("collab.workspace.name")} value={projectName} onChange={setProjectName} required /><Field label={t("collab.workspace.description")} value={projectDescription} onChange={setProjectDescription} multiline /><SelectField label={t("collab.workspace.team")} value={projectTeamId} onChange={setProjectTeamId} required options={workspaceTeams.map((team) => ({ value: team.id, label: localize(team.name) }))} emptyLabel={t("collab.workspace.select_team")} /><Field label={t("collab.workspace.due_date")} type="date" value={projectDueAt} onChange={setProjectDueAt} /></>}
        {modal === "TASK" && <><Field label={t("collab.workspace.name")} value={taskTitle} onChange={setTaskTitle} required /><Field label={t("collab.workspace.description")} value={taskDescription} onChange={setTaskDescription} multiline /><SelectField label={t("collab.project.assignee")} value={taskAssigneeId} onChange={setTaskAssigneeId} options={members.map((member) => ({ value: member.id, label: localize(member.name) }))} /><SelectField label={t("collab.project.priority")} value={taskPriority} onChange={(value) => setTaskPriority(value as ProjectTaskPriority)} options={(Object.keys(priorityKeys) as ProjectTaskPriority[]).map((priority) => ({ value: priority, label: t(priorityKeys[priority]) }))} /><Field label={t("collab.workspace.due_date")} type="date" value={taskDueAt} onChange={setTaskDueAt} /></>}
        {modal === "MEETING" && <><Field label={t("collab.meeting.title")} value={meetingTitle} onChange={setMeetingTitle} required /><Field label={t("collab.meeting.agenda")} value={meetingAgenda} onChange={setMeetingAgenda} multiline /><SelectField label={t("collab.workspace.team_optional")} value={meetingTeamId} onChange={setMeetingTeamId} options={workspaceTeams.map((team) => ({ value: team.id, label: localize(team.name) }))} emptyLabel={t("collab.workspace.no_team")} includeEmpty /><Field label={t("collab.meeting.starts_at")} type="datetime-local" value={meetingStartsAt} onChange={setMeetingStartsAt} required /><Field label={t("collab.meeting.duration")} type="number" min="15" max="240" value={String(meetingDuration)} onChange={(value) => setMeetingDuration(Number(value) || 30)} required /></>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-theme pt-3"><button type="button" onClick={closeModal} className={secondaryButtonClass}>{t("collab.button.cancel")}</button><button type="submit" className={primaryButtonClass}><CheckCircle2 className="h-4 w-4" /><span>{t("collab.button.save_create")}</span></button></div>
      </form>
    </section></div>;
  };

  const workspacePicker = (
    <>
      <label htmlFor="workspace-picker" className="sr-only">{t("collab.workspace.select_workspace")}</label>
      <select id="workspace-picker" title={t("collab.workspace.select_workspace")} aria-label={t("collab.workspace.select_workspace")} value={activeWorkspace?.id ?? ""} onChange={(event) => setSelectedWorkspaceId(event.target.value)} className="h-10 min-w-48 max-w-full bg-surface px-3 text-dynamic-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
        {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{localize(workspace.name)}</option>)}
      </select>
    </>
  );

  const workspaceActions = (
    <div className={`flex flex-wrap items-center justify-end gap-2 ${embedded ? "max-w-full" : "w-full"}`}>
      <nav className="flex max-w-full shrink-0 items-center gap-0.5 overflow-x-auto" aria-label={t("collab.workspace.tabs")}>
        {tabs.map((tab) => <button key={tab.value} type="button" title={tab.label} aria-label={tab.label} aria-current={activeTab === tab.value ? "page" : undefined} onClick={() => setActiveTab(tab.value)} className={`${workspaceRailIconButtonBaseClass} ${activeTab === tab.value ? "bg-primary text-on-primary" : "text-muted hover:bg-surface-muted hover:text-foreground"}`}>{tab.icon}</button>)}
      </nav>
      {activeTab === "PROJECTS" && (
        <>
          <div className="hidden items-center gap-2 xl:flex">
            <select title={t("collab.project.filter.all_status")} aria-label={t("collab.project.filter.all_status")} value={projectStatusFilter} onChange={(event) => setProjectStatusFilter(event.target.value as typeof projectStatusFilter)} className="h-10 min-w-40 bg-surface px-3 text-dynamic-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="ALL">{t("collab.project.filter.all_status")}</option>
              <option value="ACTIVE">{t("collab.project.status_active")}</option>
              <option value="ON_HOLD">{t("collab.project.status_on_hold")}</option>
              <option value="COMPLETE">{t("collab.project.status_complete")}</option>
            </select>
            <select title={t("ui.sort_by")} aria-label={t("ui.sort_by")} value={projectSortBy} onChange={(event) => setProjectSortBy(event.target.value as typeof projectSortBy)} className="h-10 min-w-40 bg-surface px-3 text-dynamic-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="DUE_ASC">{t("ui.sort.due_asc")}</option>
              <option value="NAME_ASC">{t("ui.sort.name_asc")}</option>
              <option value="OPEN_TASKS_DESC">{t("ui.sort.open_tasks_desc")}</option>
            </select>
          </div>
          <button type="button" title={t("collab.workspace.new_project")} aria-label={t("collab.workspace.new_project")} onClick={() => openModal("PROJECT")} disabled={!workspaceTeams.length} className={workspaceRailIconButtonClass}><Plus className="h-4 w-4" /></button>
        </>
      )}
      {activeTab === "TEAMS" && <button type="button" title={t("collab.workspace.new_team")} aria-label={t("collab.workspace.new_team")} onClick={() => openModal("TEAM")} className={workspaceRailIconButtonClass}><UserPlus className="h-4 w-4" /></button>}
      <button type="button" title={t("collab.workspace.new_workspace")} aria-label={t("collab.workspace.new_workspace")} onClick={() => openModal("WORKSPACE")} className={workspaceRailIconButtonClass}><PlusCircle className="h-4 w-4" /></button>
      <button type="button" title={t("collab.workspace.schedule_meeting")} aria-label={t("collab.workspace.schedule_meeting")} onClick={() => openModal("MEETING")} className={workspaceRailIconButtonClass}><Video className="h-4 w-4" /></button>
    </div>
  );

  return (
    <div className="space-y-4">
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-elevated px-3 py-2">
          {workspacePicker}
          {workspaceActions}
        </div>
      ) : (
        <div className="bg-surface-elevated px-3 py-2">
          <PageHeader
            title={t("collab.workspace.title")}
            titleAccessory={workspacePicker}
            actions={workspaceActions}
          />
        </div>
      )}
      <PrototypeNotice label={t("collab.badge.local_demo")}>{t("collab.workspace.modal_demo_hint")}</PrototypeNotice>
      {!activeWorkspace ? <div className="rounded-2xl border border-dashed border-theme p-8 text-center"><Layers3 className="mx-auto h-8 w-8 text-primary-text" /><p className="mt-2 text-dynamic-sm font-semibold text-foreground">{t("collab.workspace.no_workspaces")}</p><button type="button" onClick={() => openModal("WORKSPACE")} className={`${primaryButtonClass} mt-4`}><Plus className="h-4 w-4" /><span>{t("collab.workspace.new_workspace")}</span></button></div> : activeTab === "OVERVIEW" ? renderOverview() : activeTab === "PROJECTS" ? renderProjects() : activeTab === "TEAMS" ? renderTeams() : renderMeetings()}
      {renderModal()}
      {activeMeeting && <CallRoomModal meeting={activeMeeting} onLeave={leaveMeeting} />}
    </div>
  );
};

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
  multiline?: boolean;
}
const Field: React.FC<FieldProps> = ({ label, value, onChange, type = "text", required, min, max, multiline }) => {
  const inputClass = `${formControlClassName} h-11`;
  return <label className="block space-y-1.5"><span className="text-dynamic-xs font-semibold text-muted">{label}</span>{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} required={required} className={`${inputClass} resize-y`} /> : <input type={type} min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} required={required} className={inputClass} />}</label>;
};

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  emptyLabel?: string;
  includeEmpty?: boolean;
  required?: boolean;
}
const SelectField: React.FC<SelectFieldProps> = ({ label, value, onChange, options, emptyLabel, includeEmpty, required }) => <label className="block space-y-1.5"><span className="text-dynamic-xs font-semibold text-muted">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} required={required} className={`${formControlClassName} h-11`}><>{(includeEmpty || !required) && <option value="">{emptyLabel}</option>}{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</></select></label>;
