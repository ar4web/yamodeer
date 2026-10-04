import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { BilingualText } from "@/context/LanguageContext";
import { CorporateRole, useCurrentRole } from "@/context/RBACGeofenceContext";

export type CollaborationText = string | BilingualText;
export type ConversationKind = "DIRECT" | "GROUP" | "TEAM";
export type ProjectTaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE";
export type ProjectTaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETE";
export type MeetingStatus = "SCHEDULED" | "IN_PROGRESS" | "ENDED";

export interface CollaborationMember {
  id: string;
  name: BilingualText;
  email: string;
  jobTitle: BilingualText;
  presence: "ONLINE" | "AWAY" | "OFFLINE";
}

export interface CollaborationWorkspace {
  id: string;
  name: CollaborationText;
  description: CollaborationText;
  createdAtIso: string;
}

export interface CollaborationTeam {
  id: string;
  workspaceId: string;
  name: CollaborationText;
  description: CollaborationText;
  memberIds: string[];
  createdAtIso: string;
}

export interface ProjectTask {
  id: string;
  title: CollaborationText;
  description: CollaborationText;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  assigneeId: string;
  dueAt: string | null;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface CollaborationProject {
  id: string;
  workspaceId: string;
  teamId: string;
  name: CollaborationText;
  description: CollaborationText;
  status: ProjectStatus;
  dueAt: string | null;
  tasks: ProjectTask[];
  createdAtIso: string;
  updatedAtIso: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  body: CollaborationText;
  sentAtIso: string;
  attachmentNames: string[];
}

export interface ChatConversation {
  id: string;
  kind: ConversationKind;
  title: CollaborationText;
  teamId: string | null;
  participantIds: string[];
  isPinned: boolean;
  unreadCount: number;
  messages: ChatMessage[];
  updatedAtIso: string;
}

export interface CollaborationMeeting {
  id: string;
  title: CollaborationText;
  agenda: CollaborationText;
  workspaceId: string;
  teamId: string | null;
  conversationId: string | null;
  participantIds: string[];
  startsAtIso: string;
  durationMinutes: number;
  status: MeetingStatus;
  createdAtIso: string;
}

interface CollaborationData {
  workspaces: CollaborationWorkspace[];
  teams: CollaborationTeam[];
  projects: CollaborationProject[];
  conversations: ChatConversation[];
  meetings: CollaborationMeeting[];
}

type CollaborationByRole = Record<CorporateRole, CollaborationData>;
type NewTeam = Pick<CollaborationTeam, "workspaceId" | "name" | "description" | "memberIds">;
type NewProject = Pick<CollaborationProject, "workspaceId" | "teamId" | "name" | "description" | "dueAt">;
type NewProjectTask = Pick<ProjectTask, "title" | "description" | "priority" | "assigneeId" | "dueAt">;
type NewMeeting = Pick<CollaborationMeeting, "title" | "agenda" | "workspaceId" | "teamId" | "conversationId" | "participantIds" | "startsAtIso" | "durationMinutes">;

interface CollaborationContextValue extends CollaborationData {
  members: CollaborationMember[];
  currentMemberId: string;
  createWorkspace: (name: CollaborationText, description: CollaborationText) => string;
  createTeam: (input: NewTeam) => string;
  addTeamMember: (teamId: string, memberId: string) => void;
  removeTeamMember: (teamId: string, memberId: string) => void;
  createProject: (input: NewProject) => string;
  createProjectTask: (projectId: string, input: NewProjectTask) => string;
  updateProjectTask: (projectId: string, taskId: string, updates: Partial<Pick<ProjectTask, "title" | "description" | "status" | "priority" | "assigneeId" | "dueAt">>) => void;
  updateProjectStatus: (projectId: string, status: ProjectStatus) => void;
  createConversation: (kind: "DIRECT" | "GROUP", title: CollaborationText, participantIds: string[]) => string;
  sendChatMessage: (conversationId: string, body: string, attachmentNames?: string[]) => string;
  markConversationRead: (conversationId: string) => void;
  createMeeting: (input: NewMeeting) => string;
  updateMeetingStatus: (meetingId: string, status: MeetingStatus) => void;
}

const STORAGE_KEY = "ksa_hrms_collaboration_demo_v1";
const ROLE_KEYS: CorporateRole[] = ["SUPER_ADMIN", "ADMIN", "HR_OPS", "MANAGER", "EMPLOYEE"];
export const CURRENT_MEMBER_ID = "MEMBER-CURRENT";

export const COLLABORATION_MEMBERS: CollaborationMember[] = [
  { id: CURRENT_MEMBER_ID, name: { en: "Noura Al-Dosari", ar: "نورة الدوسري" }, email: "noura@noor.example", jobTitle: { en: "Workspace owner", ar: "مسؤولة مساحة العمل" }, presence: "ONLINE" },
  { id: "MEMBER-MAYA", name: { en: "Maya Al-Harbi", ar: "مي الحربي" }, email: "maya.alharbi@example.com", jobTitle: { en: "People Operations", ar: "عمليات الموارد البشرية" }, presence: "ONLINE" },
  { id: "MEMBER-OMAR", name: { en: "Omar Rahman", ar: "عمر رحمن" }, email: "omar.rahman@example.com", jobTitle: { en: "Finance Partner", ar: "شريك مالي" }, presence: "AWAY" },
  { id: "MEMBER-SARA", name: { en: "Sara Al-Qahtani", ar: "سارة القحطاني" }, email: "sara.alqahtani@example.com", jobTitle: { en: "Employee Experience", ar: "تجربة الموظف" }, presence: "ONLINE" },
  { id: "MEMBER-AISHA", name: { en: "Aisha Mansour", ar: "عائشة منصور" }, email: "aisha.mansour@example.com", jobTitle: { en: "Finance Operations", ar: "العمليات المالية" }, presence: "OFFLINE" },
  { id: "MEMBER-KHALID", name: { en: "Khalid Al-Salem", ar: "خالد السالم" }, email: "khalid.alsalem@example.com", jobTitle: { en: "Project Lead", ar: "قائد مشروع" }, presence: "ONLINE" }
];

const idFor = (prefix: string): string => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const inHours = (hours: number): string => new Date(Date.now() + hours * 3_600_000).toISOString();
const agoMinutes = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();

const makeInitialCollaborationData = (): CollaborationData => {
  const now = new Date().toISOString();
  const workspaceId = "WORKSPACE-NOOR";
  const peopleTeamId = "TEAM-PEOPLE-OPS";
  const financeTeamId = "TEAM-FINANCE-OPS";
  const projectTeamId = "TEAM-PROJECTS";
  const peopleMembers = [CURRENT_MEMBER_ID, "MEMBER-MAYA", "MEMBER-SARA"];
  const financeMembers = [CURRENT_MEMBER_ID, "MEMBER-OMAR", "MEMBER-AISHA"];
  const projectMembers = [CURRENT_MEMBER_ID, "MEMBER-KHALID", "MEMBER-MAYA", "MEMBER-SARA"];

  return {
    workspaces: [{
      id: workspaceId,
      name: { en: "Noor Corporate Workspace", ar: "مساحة نور المؤسسية" },
      description: { en: "A shared demo space for cross-team projects and conversations.", ar: "مساحة تجريبية مشتركة للمشاريع والمحادثات بين الفرق." },
      createdAtIso: now
    }],
    teams: [
      { id: peopleTeamId, workspaceId, name: { en: "People Operations", ar: "عمليات الموارد البشرية" }, description: { en: "Employee experience, onboarding and people services.", ar: "تجربة الموظف والتعيين وخدمات الموارد البشرية." }, memberIds: peopleMembers, createdAtIso: now },
      { id: financeTeamId, workspaceId, name: { en: "Finance Operations", ar: "العمليات المالية" }, description: { en: "Expenses, close activities and finance coordination.", ar: "المصروفات والإقفال والتنسيق المالي." }, memberIds: financeMembers, createdAtIso: now },
      { id: projectTeamId, workspaceId, name: { en: "Project Delivery", ar: "تنفيذ المشاريع" }, description: { en: "Cross-functional delivery and shared milestones.", ar: "التنفيذ المشترك والمعالم الرئيسية." }, memberIds: projectMembers, createdAtIso: now }
    ],
    projects: [
      {
        id: "PROJECT-ONBOARDING",
        workspaceId,
        teamId: peopleTeamId,
        name: { en: "Bilingual onboarding refresh", ar: "تحديث برنامج التعيين ثنائي اللغة" },
        description: { en: "Coordinate a clearer first-month experience for new colleagues.", ar: "تنسيق تجربة أوضح للموظفين الجدد خلال الشهر الأول." },
        status: "ACTIVE",
        dueAt: inHours(24 * 14),
        createdAtIso: now,
        updatedAtIso: now,
        tasks: [
          { id: "PROJECT-TASK-101", title: { en: "Review the welcome checklist", ar: "مراجعة قائمة الترحيب" }, description: { en: "Collect feedback from team leads.", ar: "جمع الملاحظات من قادة الفرق." }, status: "IN_PROGRESS", priority: "HIGH", assigneeId: "MEMBER-MAYA", dueAt: inHours(24 * 2), createdAtIso: now, updatedAtIso: now },
          { id: "PROJECT-TASK-102", title: { en: "Confirm bilingual policy links", ar: "تأكيد روابط السياسات ثنائية اللغة" }, description: { en: "Check that the current links open correctly.", ar: "التحقق من عمل الروابط الحالية." }, status: "TODO", priority: "NORMAL", assigneeId: "MEMBER-SARA", dueAt: inHours(24 * 4), createdAtIso: now, updatedAtIso: now },
          { id: "PROJECT-TASK-103", title: { en: "Share manager briefing", ar: "مشاركة إحاطة المديرين" }, description: { en: "Draft a short guide for managers.", ar: "إعداد دليل موجز للمديرين." }, status: "BACKLOG", priority: "LOW", assigneeId: "MEMBER-KHALID", dueAt: null, createdAtIso: now, updatedAtIso: now },
          { id: "PROJECT-TASK-104", title: { en: "Map first-week check-ins", ar: "تحديد اجتماعات المتابعة للأسبوع الأول" }, description: { en: "Completed sample task.", ar: "مهمة تجريبية مكتملة." }, status: "DONE", priority: "NORMAL", assigneeId: CURRENT_MEMBER_ID, dueAt: inHours(-24), createdAtIso: now, updatedAtIso: now }
        ]
      },
      {
        id: "PROJECT-OCT-CLOSE",
        workspaceId,
        teamId: financeTeamId,
        name: { en: "October close readiness", ar: "الاستعداد لإقفال أكتوبر" },
        description: { en: "Track close dependencies and document owners.", ar: "متابعة متطلبات الإقفال وتحديد المسؤولين عن المستندات." },
        status: "ACTIVE",
        dueAt: inHours(24 * 9),
        createdAtIso: now,
        updatedAtIso: now,
        tasks: [
          { id: "PROJECT-TASK-201", title: { en: "Collect approved receipts", ar: "جمع الإيصالات المعتمدة" }, description: { en: "Prepare the final sample expense pack.", ar: "إعداد ملف المصروفات التجريبي النهائي." }, status: "TODO", priority: "HIGH", assigneeId: "MEMBER-AISHA", dueAt: inHours(24 * 3), createdAtIso: now, updatedAtIso: now },
          { id: "PROJECT-TASK-202", title: { en: "Confirm supplier statement owner", ar: "تأكيد مسؤول كشف المورد" }, description: { en: "Align on reviewer and due date.", ar: "الاتفاق على المراجع وتاريخ الاستحقاق." }, status: "IN_PROGRESS", priority: "NORMAL", assigneeId: "MEMBER-OMAR", dueAt: inHours(24 * 2), createdAtIso: now, updatedAtIso: now }
        ]
      }
    ],
    conversations: [
      {
        id: "CHAT-DIRECT-MAYA", kind: "DIRECT", title: { en: "Maya Al-Harbi", ar: "مي الحربي" }, teamId: null,
        participantIds: [CURRENT_MEMBER_ID, "MEMBER-MAYA"], isPinned: true, unreadCount: 1, updatedAtIso: agoMinutes(4),
        messages: [
          { id: "MSG-DM-01", senderId: "MEMBER-MAYA", body: { en: "I shared the revised onboarding checklist. Could you take a look before our sync?", ar: "شاركت قائمة التعيين المحدثة. هل يمكنك مراجعتها قبل اجتماعنا؟" }, sentAtIso: agoMinutes(14), attachmentNames: [] },
          { id: "MSG-DM-02", senderId: CURRENT_MEMBER_ID, body: { en: "Yes, I’ll review the owners and send notes shortly.", ar: "نعم، سأراجع المسؤولين وأرسل الملاحظات قريباً." }, sentAtIso: agoMinutes(9), attachmentNames: [] },
          { id: "MSG-DM-03", senderId: "MEMBER-MAYA", body: { en: "Great, thank you!", ar: "رائع، شكراً لك!" }, sentAtIso: agoMinutes(4), attachmentNames: [] }
        ]
      },
      {
        id: "CHAT-TEAM-PEOPLE", kind: "TEAM", title: { en: "People Operations · general", ar: "عمليات الموارد البشرية · عام" }, teamId: peopleTeamId,
        participantIds: peopleMembers, isPinned: true, unreadCount: 2, updatedAtIso: agoMinutes(12),
        messages: [
          { id: "MSG-TEAM-01", senderId: "MEMBER-SARA", body: { en: "I added the bilingual handbook links to the workspace.", ar: "أضفت روابط الدليل ثنائي اللغة إلى مساحة العمل." }, sentAtIso: agoMinutes(31), attachmentNames: [] },
          { id: "MSG-TEAM-02", senderId: "MEMBER-MAYA", body: { en: "Let’s confirm the first-week check-in owners today.", ar: "لنؤكد اليوم المسؤولين عن اجتماعات متابعة الأسبوع الأول." }, sentAtIso: agoMinutes(12), attachmentNames: [] }
        ]
      },
      {
        id: "CHAT-TEAM-FINANCE", kind: "TEAM", title: { en: "Finance Operations · general", ar: "العمليات المالية · عام" }, teamId: financeTeamId,
        participantIds: financeMembers, isPinned: false, unreadCount: 0, updatedAtIso: agoMinutes(58),
        messages: [
          { id: "MSG-TEAM-03", senderId: "MEMBER-OMAR", body: { en: "The close checklist is ready for a first pass.", ar: "قائمة الإقفال جاهزة للمراجعة الأولية." }, sentAtIso: agoMinutes(58), attachmentNames: [] }
        ]
      }
    ],
    meetings: [
      {
        id: "MEETING-DEMO-101", title: { en: "People Operations weekly sync", ar: "الاجتماع الأسبوعي لعمليات الموارد البشرية" },
        agenda: { en: "Onboarding refresh, open employee requests and next steps.", ar: "تحديث التعيين والطلبات المفتوحة والخطوات التالية." },
        workspaceId, teamId: peopleTeamId, conversationId: "CHAT-TEAM-PEOPLE", participantIds: peopleMembers,
        startsAtIso: inHours(2), durationMinutes: 30, status: "SCHEDULED", createdAtIso: now
      },
      {
        id: "MEETING-DEMO-102", title: { en: "Project delivery checkpoint", ar: "متابعة تنفيذ المشروع" },
        agenda: { en: "Review milestones, blockers and owners.", ar: "مراجعة المعالم والعوائق والمسؤولين." },
        workspaceId, teamId: projectTeamId, conversationId: null, participantIds: projectMembers,
        startsAtIso: inHours(24), durationMinutes: 45, status: "SCHEDULED", createdAtIso: now
      }
    ]
  };
};

const initialDataByRole = (): CollaborationByRole => ({
  SUPER_ADMIN: makeInitialCollaborationData(),
  ADMIN: makeInitialCollaborationData(),
  HR_OPS: makeInitialCollaborationData(),
  MANAGER: makeInitialCollaborationData(),
  EMPLOYEE: makeInitialCollaborationData()
});

const loadData = (): CollaborationByRole => {
  const initial = initialDataByRole();
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<CollaborationByRole>;
    for (const role of ROLE_KEYS) {
      const saved = parsed?.[role];
      if (saved && Array.isArray(saved.workspaces) && Array.isArray(saved.teams) && Array.isArray(saved.projects) && Array.isArray(saved.conversations) && Array.isArray(saved.meetings)) {
        initial[role] = saved;
      }
    }
  } catch {
    // Keep safe synthetic sample records if browser storage is unavailable or malformed.
  }
  return initial;
};

const CollaborationContext = createContext<CollaborationContextValue | undefined>(undefined);

export const CollaborationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentRole } = useCurrentRole();
  const [dataByRole, setDataByRole] = useState<CollaborationByRole>(loadData);
  const currentData = dataByRole[currentRole] ?? makeInitialCollaborationData();

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dataByRole));
    } catch {
      // Local synthetic data remains usable in memory.
    }
  }, [dataByRole]);

  const updateCurrentData = useCallback((updater: (data: CollaborationData) => CollaborationData) => {
    setDataByRole((current) => ({
      ...current,
      [currentRole]: updater(current[currentRole] ?? makeInitialCollaborationData())
    }));
  }, [currentRole]);

  const createWorkspace = useCallback((name: CollaborationText, description: CollaborationText) => {
    const now = new Date().toISOString();
    const id = idFor("WORKSPACE");
    updateCurrentData((data) => ({ ...data, workspaces: [{ id, name, description, createdAtIso: now }, ...data.workspaces] }));
    return id;
  }, [updateCurrentData]);

  const createTeam = useCallback((input: NewTeam) => {
    const now = new Date().toISOString();
    const id = idFor("TEAM");
    const channelId = `CHAT-${id}`;
    const team: CollaborationTeam = { ...input, id, memberIds: Array.from(new Set([CURRENT_MEMBER_ID, ...input.memberIds])), createdAtIso: now };
    const channel: ChatConversation = {
      id: channelId,
      kind: "TEAM",
      title: team.name,
      teamId: id,
      participantIds: team.memberIds,
      isPinned: false,
      unreadCount: 0,
      messages: [],
      updatedAtIso: now
    };
    updateCurrentData((data) => ({ ...data, teams: [team, ...data.teams], conversations: [channel, ...data.conversations] }));
    return id;
  }, [updateCurrentData]);

  const addTeamMember = useCallback((teamId: string, memberId: string) => {
    updateCurrentData((data) => {
      const teams = data.teams.map((team) => team.id === teamId ? { ...team, memberIds: Array.from(new Set([...team.memberIds, memberId])) } : team);
      const team = teams.find((entry) => entry.id === teamId);
      return {
        ...data,
        teams,
        conversations: team ? data.conversations.map((chat) => chat.teamId === teamId ? { ...chat, participantIds: team.memberIds } : chat) : data.conversations
      };
    });
  }, [updateCurrentData]);

  const removeTeamMember = useCallback((teamId: string, memberId: string) => {
    if (memberId === CURRENT_MEMBER_ID) return;
    updateCurrentData((data) => {
      const teams = data.teams.map((team) => team.id === teamId ? { ...team, memberIds: team.memberIds.filter((id) => id !== memberId) } : team);
      const team = teams.find((entry) => entry.id === teamId);
      return {
        ...data,
        teams,
        conversations: team ? data.conversations.map((chat) => chat.teamId === teamId ? { ...chat, participantIds: team.memberIds } : chat) : data.conversations
      };
    });
  }, [updateCurrentData]);

  const createProject = useCallback((input: NewProject) => {
    const now = new Date().toISOString();
    const id = idFor("PROJECT");
    const project: CollaborationProject = { ...input, id, status: "ACTIVE", tasks: [], createdAtIso: now, updatedAtIso: now };
    updateCurrentData((data) => ({ ...data, projects: [project, ...data.projects] }));
    return id;
  }, [updateCurrentData]);

  const createProjectTask = useCallback((projectId: string, input: NewProjectTask) => {
    const now = new Date().toISOString();
    const id = idFor("PROJECT-TASK");
    const task: ProjectTask = { ...input, id, status: "TODO", createdAtIso: now, updatedAtIso: now };
    updateCurrentData((data) => ({ ...data, projects: data.projects.map((project) => project.id === projectId ? { ...project, tasks: [task, ...project.tasks], updatedAtIso: now } : project) }));
    return id;
  }, [updateCurrentData]);

  const updateProjectTask = useCallback((projectId: string, taskId: string, updates: Partial<Pick<ProjectTask, "title" | "description" | "status" | "priority" | "assigneeId" | "dueAt">>) => {
    const now = new Date().toISOString();
    updateCurrentData((data) => ({
      ...data,
      projects: data.projects.map((project) => project.id === projectId
        ? { ...project, updatedAtIso: now, tasks: project.tasks.map((task) => task.id === taskId ? { ...task, ...updates, updatedAtIso: now } : task) }
        : project)
    }));
  }, [updateCurrentData]);

  const updateProjectStatus = useCallback((projectId: string, status: ProjectStatus) => {
    const now = new Date().toISOString();
    updateCurrentData((data) => ({
      ...data,
      projects: data.projects.map((project) => project.id === projectId ? { ...project, status, updatedAtIso: now } : project)
    }));
  }, [updateCurrentData]);

  const createConversation = useCallback((kind: "DIRECT" | "GROUP", title: CollaborationText, participantIds: string[]) => {
    const id = idFor("CHAT");
    const now = new Date().toISOString();
    const conversation: ChatConversation = {
      id,
      kind,
      title,
      teamId: null,
      participantIds: Array.from(new Set([CURRENT_MEMBER_ID, ...participantIds])),
      isPinned: false,
      unreadCount: 0,
      messages: [],
      updatedAtIso: now
    };
    updateCurrentData((data) => ({ ...data, conversations: [conversation, ...data.conversations] }));
    return id;
  }, [updateCurrentData]);

  const sendChatMessage = useCallback((conversationId: string, body: string, attachmentNames: string[] = []) => {
    const id = idFor("MSG");
    const sentAtIso = new Date().toISOString();
    updateCurrentData((data) => ({
      ...data,
      conversations: data.conversations.map((conversation) => conversation.id === conversationId
        ? { ...conversation, messages: [...conversation.messages, { id, senderId: CURRENT_MEMBER_ID, body: body.trim(), sentAtIso, attachmentNames }], updatedAtIso: sentAtIso }
        : conversation)
    }));
    return id;
  }, [updateCurrentData]);

  const markConversationRead = useCallback((conversationId: string) => {
    updateCurrentData((data) => ({
      ...data,
      conversations: data.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation)
    }));
  }, [updateCurrentData]);

  const createMeeting = useCallback((input: NewMeeting) => {
    const id = idFor("MEETING");
    const meeting: CollaborationMeeting = { ...input, id, status: "SCHEDULED", createdAtIso: new Date().toISOString() };
    updateCurrentData((data) => ({ ...data, meetings: [meeting, ...data.meetings] }));
    return id;
  }, [updateCurrentData]);

  const updateMeetingStatus = useCallback((meetingId: string, status: MeetingStatus) => {
    updateCurrentData((data) => ({ ...data, meetings: data.meetings.map((meeting) => meeting.id === meetingId ? { ...meeting, status } : meeting) }));
  }, [updateCurrentData]);

  const value = useMemo<CollaborationContextValue>(() => ({
    ...currentData,
    members: COLLABORATION_MEMBERS,
    currentMemberId: CURRENT_MEMBER_ID,
    createWorkspace,
    createTeam,
    addTeamMember,
    removeTeamMember,
    createProject,
    createProjectTask,
    updateProjectTask,
    updateProjectStatus,
    createConversation,
    sendChatMessage,
    markConversationRead,
    createMeeting,
    updateMeetingStatus
  }), [currentData, createWorkspace, createTeam, addTeamMember, removeTeamMember, createProject, createProjectTask, updateProjectTask, updateProjectStatus, createConversation, sendChatMessage, markConversationRead, createMeeting, updateMeetingStatus]);

  return <CollaborationContext.Provider value={value}>{children}</CollaborationContext.Provider>;
};

export const useCollaboration = (): CollaborationContextValue => {
  const value = useContext(CollaborationContext);
  if (!value) throw new Error("useCollaboration must be used within CollaborationProvider");
  return value;
};
