import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCheck,
  MessageCircle,
  Paperclip,
  Phone,
  PlusCircle,
  Send,
  Smile,
  Users,
  Video,
  X
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useCollaboration, ChatConversation, CollaborationMeeting } from "@/context/CollaborationContext";
import { iconButtonBaseClass, iconButtonClass, PageHeader, primaryButtonClass, secondaryButtonClass } from "@/components/DesignSystem";
import { CallRoomModal } from "@/modules/CallRoomModal";

type ChatFilter = "ALL" | "DIRECT" | "GROUP" | "TEAM";

const formatChatTime = (value: string, language: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString(language === "ar" ? "ar-SA" : "en-SA", { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString(language === "ar" ? "ar-SA" : "en-SA", { month: "short", day: "numeric" });
};

const formatMeeting = (value: string, language: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(language === "ar" ? "ar-SA" : "en-SA", { dateStyle: "medium", timeStyle: "short" });
};

export const ChatModule: React.FC<{ globalSearchQuery: string }> = ({ globalSearchQuery }) => {
  const { t, localize, language } = useLanguage();
  const {
    members, currentMemberId, conversations, teams, workspaces, meetings,
    createConversation, sendChatMessage, markConversationRead, createMeeting, updateMeetingStatus
  } = useCollaboration();

  const [selectedConversationId, setSelectedConversationId] = useState(conversations[0]?.id ?? "");
  const [chatFilter, setChatFilter] = useState<ChatFilter>("ALL");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatKind, setNewChatKind] = useState<"DIRECT" | "GROUP">("DIRECT");
  const [newChatTitle, setNewChatTitle] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);

  const activeConversation = conversations.find((conversation) => conversation.id === selectedConversationId);
  const activeTeam = activeConversation?.teamId ? teams.find((team) => team.id === activeConversation.teamId) : undefined;
  const partnerNames = activeConversation?.participantIds
    .filter((id) => id !== currentMemberId)
    .map((id) => members.find((member) => member.id === id))
    .filter((member) => Boolean(member))
    .map((member) => localize(member!.name));
  const activeMeeting = meetings.find((meeting) => meeting.id === activeMeetingId);

  const visibleConversations = useMemo(() => {
    const query = globalSearchQuery.trim().toLocaleLowerCase(language === "ar" ? "ar-SA" : "en-US");
    return conversations
      .filter((conversation) => chatFilter === "ALL" || conversation.kind === chatFilter)
      .filter((conversation) => {
        if (!query) return true;
        const lastMessage = conversation.messages.at(-1);
        const searchable = [localize(conversation.title), ...conversation.participantIds.map((id) => {
          const member = members.find((entry) => entry.id === id);
          return member ? localize(member.name) : "";
        }), lastMessage ? localize(lastMessage.body) : ""].join(" ").toLocaleLowerCase(language === "ar" ? "ar-SA" : "en-US");
        return searchable.includes(query);
      })
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime());
  }, [conversations, chatFilter, globalSearchQuery, language, localize, members]);

  useEffect(() => {
    if (!conversations.some((conversation) => conversation.id === selectedConversationId)) {
      setSelectedConversationId(visibleConversations[0]?.id ?? conversations[0]?.id ?? "");
    }
  }, [conversations, selectedConversationId, visibleConversations]);

  useEffect(() => {
    if (activeConversation) markConversationRead(activeConversation.id);
  }, [activeConversation?.id, markConversationRead]);

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeConversation || (!messageDraft.trim() && attachmentNames.length === 0)) return;
    sendChatMessage(activeConversation.id, messageDraft, attachmentNames);
    setMessageDraft("");
    setAttachmentNames([]);
  };

  const handleAttach = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setAttachmentNames((current) => [...current, ...files.map((file) => file.name)]);
    event.target.value = "";
  };

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((current) => current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]);
  };

  const handleCreateConversation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newChatKind === "DIRECT") {
      const member = members.find((entry) => entry.id === selectedMemberIds[0]);
      if (!member) return;
      const id = createConversation("DIRECT", member.name, [member.id]);
      setSelectedConversationId(id);
    } else {
      if (!newChatTitle.trim() || !selectedMemberIds.length) return;
      const id = createConversation("GROUP", newChatTitle.trim(), selectedMemberIds);
      setSelectedConversationId(id);
    }
    setMobileChatOpen(true);
    setNewChatOpen(false);
    setSelectedMemberIds([]);
    setNewChatTitle("");
  };

  const startMeeting = (conversation: ChatConversation) => {
    const now = new Date().toISOString();
    const team = conversation.teamId ? teams.find((entry) => entry.id === conversation.teamId) : undefined;
    const id = createMeeting({
      title: localize(conversation.title),
      agenda: t("collab.meeting.quick_agenda"),
      workspaceId: team?.workspaceId ?? workspaces[0]?.id ?? "",
      teamId: conversation.teamId,
      conversationId: conversation.id,
      participantIds: conversation.participantIds,
      startsAtIso: now,
      durationMinutes: 45
    });
    updateMeetingStatus(id, "IN_PROGRESS");
    setActiveMeetingId(id);
  };

  const joinMeeting = (meeting: CollaborationMeeting) => {
    updateMeetingStatus(meeting.id, "IN_PROGRESS");
    setActiveMeetingId(meeting.id);
  };

  const closeCall = () => {
    if (activeMeetingId) updateMeetingStatus(activeMeetingId, "ENDED");
    setActiveMeetingId(null);
  };

  const filterOptions: Array<{ key: ChatFilter; labelKey: string }> = [
    { key: "ALL", labelKey: "collab.chat.filter_all" },
    { key: "DIRECT", labelKey: "collab.chat.filter_direct" },
    { key: "GROUP", labelKey: "collab.chat.filter_groups" },
    { key: "TEAM", labelKey: "collab.chat.filter_teams" }
  ];

  const upcomingMeetings = meetings.filter((meeting) => meeting.status === "SCHEDULED").sort((a, b) => new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime()).slice(0, 2);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t("nav.group.communication")}
        title={t("collab.chat.title")}
        
        actions={<button type="button" onClick={() => setNewChatOpen(true)} className={primaryButtonClass}><PlusCircle className="h-4 w-4" /><span>{t("collab.chat.new_chat")}</span></button>}
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-warning bg-warning-soft p-3 text-dynamic-xs text-warning">
        <Video className="mt-0.5 h-4 w-4 shrink-0" /><p className="leading-relaxed">{t("collab.chat.demo_notice")}</p>
      </div>

      <section className="grid min-h-[max(28rem,min(40rem,calc(100dvh_-_18rem)))] grid-cols-1 overflow-hidden rounded-2xl border border-theme bg-surface shadow-card md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={`${mobileChatOpen ? "hidden" : "flex"} min-h-[max(28rem,min(40rem,calc(100dvh_-_18rem)))] flex-col border-b border-theme bg-surface-elevated md:flex md:border-b-0 md:border-e`}>
          <div className="space-y-3 border-b border-theme p-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-dynamic-sm font-bold text-foreground">{t("collab.chat.inbox")}</h2>
              <button type="button" title={t("collab.chat.new_chat")} aria-label={t("collab.chat.new_chat")} onClick={() => setNewChatOpen(true)} className={`${iconButtonBaseClass} bg-surface-elevated text-primary hover:bg-primary-soft`}><PlusCircle className="h-4 w-4" /></button>
            </div>
            <div className="flex gap-1 overflow-x-auto" role="group" aria-label={t("collab.chat.filters")}>
              {filterOptions.map((item) => <button key={item.key} type="button" aria-pressed={chatFilter === item.key} onClick={() => setChatFilter(item.key)} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-dynamic-xs font-semibold ${chatFilter === item.key ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface"}`}>{t(item.labelKey)}</button>)}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {visibleConversations.map((conversation) => {
              const lastMessage = conversation.messages.at(-1);
              const selected = selectedConversationId === conversation.id;
              const isTeam = conversation.kind === "TEAM";
              const initials = localize(conversation.title).slice(0, 1);
              return (
                <button key={conversation.id} type="button" aria-current={selected ? "page" : undefined} onClick={() => { setSelectedConversationId(conversation.id); setMobileChatOpen(true); }} className={`flex w-full items-start gap-3 border-b border-theme px-3 py-3.5 text-start transition ${selected ? "bg-primary-soft/70" : "hover:bg-surface"}`}>
                  <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-dynamic-sm font-bold ${isTeam ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary"}`}>{isTeam ? <Users className="h-5 w-5" /> : initials}<span className="absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="truncate text-dynamic-xs font-bold text-foreground">{localize(conversation.title)}</span><span className="shrink-0 text-dynamic-xs text-muted">{formatChatTime(conversation.updatedAtIso, language)}</span></span>
                    <span className="mt-1 flex items-center justify-between gap-2"><span className="min-w-0 flex-1 truncate text-dynamic-xs text-muted">{lastMessage ? localize(lastMessage.body) : t("collab.chat.start_conversation")}</span>{conversation.unreadCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-dynamic-xs font-bold text-on-primary">{conversation.unreadCount}</span>}</span>
                  </span>
                </button>
              );
            })}
            {!visibleConversations.length && <div className="p-6 text-center text-dynamic-xs text-muted">{t("collab.chat.no_chats")}</div>}
          </div>

          <div className="space-y-2 border-t border-theme p-3">
            <div className="flex items-center justify-between gap-2"><h3 className="text-dynamic-xs font-bold text-foreground">{t("collab.meeting.upcoming")}</h3><CalendarClock className="h-4 w-4 text-primary" /></div>
            {upcomingMeetings.map((meeting) => <button key={meeting.id} type="button" onClick={() => joinMeeting(meeting)} className="w-full rounded-xl border border-theme bg-surface p-2.5 text-start hover:border-primary"><span className="block truncate text-dynamic-xs font-semibold text-foreground">{localize(meeting.title)}</span><span className="mt-1 block text-dynamic-xs text-muted">{formatChatTime(meeting.startsAtIso, language)} · {meeting.durationMinutes} {t("collab.meeting.minutes")}</span></button>)}
            {!upcomingMeetings.length && <p className="text-dynamic-xs text-muted">{t("collab.meeting.none_upcoming")}</p>}
          </div>
        </aside>

        <main className={`${mobileChatOpen ? "flex" : "hidden"} min-h-[max(28rem,min(40rem,calc(100dvh_-_18rem)))] min-w-0 flex-col md:flex`}>
          {activeConversation ? (
            <>
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-theme px-3 py-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button type="button" onClick={() => setMobileChatOpen(false)} title={t("collab.chat.back_to_chats")} aria-label={t("collab.chat.back_to_chats")} className={`${iconButtonClass} md:hidden`}><ArrowLeft className="h-4 w-4 rtl:rotate-180" /></button>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">{activeConversation.kind === "TEAM" ? <Users className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}</span>
                  <div className="min-w-0"><h2 className="truncate text-dynamic-sm font-bold text-foreground">{localize(activeConversation.title)}</h2><p className="truncate text-dynamic-xs text-muted">{activeTeam ? localize(activeTeam.name) : (partnerNames ?? []).join(", ") || `${t("collab.chat.group_members")} · ${activeConversation.participantIds.length}`}</p></div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => startMeeting(activeConversation)} title={t("collab.chat.start_call")} aria-label={t("collab.chat.start_call")} className={`${iconButtonBaseClass} bg-surface-elevated text-primary hover:bg-primary-soft`}><Video className="h-4 w-4" /></button>
                  <button type="button" onClick={() => startMeeting(activeConversation)} title={t("collab.chat.voice_call")} aria-label={t("collab.chat.voice_call")} className={`${iconButtonBaseClass} bg-surface-elevated text-primary hover:bg-primary-soft`}><Phone className="h-4 w-4" /></button>

                </div>
              </header>

              <div className="flex items-center gap-2 border-b border-theme bg-surface-elevated px-4 py-2 text-dynamic-xs text-muted"><span className="h-2 w-2 rounded-full bg-success" />{activeConversation.kind === "TEAM" ? t("collab.chat.team_channel") : `${t("collab.chat.members_count")} · ${activeConversation.participantIds.length}`}{activeTeam && <span className="truncate">· {activeTeam.memberIds.length} {t("collab.workspace.members")}</span>}</div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-canvas/40 p-3 sm:p-5">
                {activeConversation.messages.map((message) => {
                  const isOwn = message.senderId === currentMemberId;
                  const sender = members.find((member) => member.id === message.senderId);
                  return (
                    <div key={message.id} className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
                      {!isOwn && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-dynamic-xs font-bold text-accent">{sender ? localize(sender.name).slice(0, 1) : "?"}</span>}
                      <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-card sm:max-w-[75%] ${isOwn ? "rounded-ee-md bg-primary text-on-primary" : "rounded-es-md border border-theme bg-surface text-foreground"}`}>
                        {!isOwn && <p className="mb-1 text-dynamic-xs font-bold text-primary">{sender ? localize(sender.name) : t("collab.chat.unknown_sender")}</p>}
                        {localize(message.body) && <p className="whitespace-pre-wrap break-words text-dynamic-sm leading-relaxed">{localize(message.body)}</p>}
                        {message.attachmentNames.length > 0 && <div className="mt-2 space-y-1">{message.attachmentNames.map((name) => <div key={name} className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-dynamic-xs ${isOwn ? "bg-on-primary/10" : "bg-surface-elevated"}`}><Paperclip className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{name}</span></div>)}</div>}
                        <div className={`mt-1 flex items-center justify-end gap-1 text-dynamic-xs ${isOwn ? "text-on-primary/70" : "text-muted"}`}><time>{new Date(message.sentAtIso).toLocaleTimeString(language === "ar" ? "ar-SA" : "en-SA", { hour: "numeric", minute: "2-digit" })}</time>{isOwn && <CheckCheck className="h-3.5 w-3.5" />}</div>
                      </div>
                    </div>
                  );
                })}
                {!activeConversation.messages.length && <div className="flex h-full min-h-40 flex-col items-center justify-center text-center"><MessageCircle className="h-8 w-8 text-primary" /><p className="mt-2 text-dynamic-sm font-semibold text-foreground">{t("collab.chat.empty_title")}</p><p className="mt-1 max-w-sm text-dynamic-xs text-muted">{t("collab.chat.empty_description")}</p></div>}
              </div>

              {attachmentNames.length > 0 && <div className="flex flex-wrap gap-2 border-t border-theme bg-surface px-3 pt-2">{attachmentNames.map((name, index) => <span key={`${name}-${index}`} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-surface-elevated px-2 py-1 text-dynamic-xs text-foreground"><Paperclip className="h-3 w-3" /><span className="max-w-48 truncate">{name}</span><button type="button" title={`${t("collab.chat.remove_attachment")} ${name}`} aria-label={`${t("collab.chat.remove_attachment")} ${name}`} onClick={() => setAttachmentNames((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X className="h-4 w-4" /></button></span>)}</div>}
              <form onSubmit={submitMessage} className="flex items-end gap-2 border-t border-theme bg-surface p-3 sm:p-4">
                <label title={t("collab.chat.attach_file")} className={`${iconButtonClass} cursor-pointer focus-within:ring-2 focus-within:ring-primary`} aria-label={t("collab.chat.attach_file")}><Paperclip className="h-4 w-4" /><input type="file" multiple className="sr-only" onChange={handleAttach} /></label>
                <button type="button" onClick={() => setMessageDraft((value) => `${value}${value ? " " : ""}😊`)} title={t("collab.chat.add_emoji")} aria-label={t("collab.chat.add_emoji")} className={iconButtonClass}><Smile className="h-4 w-4" /></button>
                <textarea value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (messageDraft.trim() || attachmentNames.length) sendChatMessage(activeConversation.id, messageDraft, attachmentNames); setMessageDraft(""); setAttachmentNames([]); } }} rows={1} placeholder={t("collab.chat.message_placeholder")} aria-label={t("collab.chat.message_placeholder")} className="max-h-32 min-h-10 flex-1 resize-y rounded-xl border border-theme bg-surface-elevated px-3 py-2.5 text-dynamic-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <button type="submit" disabled={!messageDraft.trim() && !attachmentNames.length} title={t("collab.chat.send")} aria-label={t("collab.chat.send")} className={`${iconButtonBaseClass} bg-primary text-on-primary hover:bg-primary-hover`}><Send className="h-4 w-4" /></button>
              </form>
            </>
          ) : (
            <div className="flex min-h-[max(28rem,min(40rem,calc(100dvh_-_18rem)))] flex-col items-center justify-center p-6 text-center"><MessageCircle className="h-10 w-10 text-primary" /><h2 className="mt-3 text-dynamic-base font-semibold text-foreground">{t("collab.chat.no_selection_title")}</h2><p className="mt-1 max-w-sm text-dynamic-xs text-muted">{t("collab.chat.no_selection_description")}</p><button type="button" onClick={() => setNewChatOpen(true)} className={`${primaryButtonClass} mt-4`}><PlusCircle className="h-4 w-4" /><span>{t("collab.chat.new_chat")}</span></button></div>
          )}
        </main>
      </section>

      {newChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="new-chat-title" className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border-2 border-primary bg-surface p-4 shadow-shell">
            <div className="flex items-start justify-between gap-3 border-b border-theme pb-3"><div><h2 id="new-chat-title" className="text-dynamic-lg font-bold text-foreground">{t("collab.chat.new_chat")}</h2><p className="text-dynamic-xs text-muted">{t("collab.chat.new_chat_help")}</p></div><button type="button" title={t("collab.button.close")} aria-label={t("collab.button.close")} onClick={() => setNewChatOpen(false)} className={iconButtonClass}><X className="h-4 w-4" /></button></div>
            <form onSubmit={handleCreateConversation} className="space-y-4">
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("collab.chat.conversation_type")}>
                {(["DIRECT", "GROUP"] as const).map((kind) => <button key={kind} type="button" aria-pressed={newChatKind === kind} onClick={() => { setNewChatKind(kind); setSelectedMemberIds([]); }} className={`rounded-xl border px-3 py-2 text-dynamic-xs font-semibold ${newChatKind === kind ? "border-primary bg-primary-soft text-primary" : "border-theme bg-surface-elevated text-muted"}`}>{t(kind === "DIRECT" ? "collab.chat.direct" : "collab.chat.group")}</button>)}
              </div>
              {newChatKind === "GROUP" && <div className="space-y-1.5"><label htmlFor="new-group-title" className="text-dynamic-xs font-semibold text-muted">{t("collab.chat.group_name")}</label><input id="new-group-title" required maxLength={80} value={newChatTitle} onChange={(event) => setNewChatTitle(event.target.value)} className="w-full rounded-xl border border-theme bg-surface-elevated px-3 py-2.5 text-dynamic-sm text-foreground" /></div>}
              <fieldset className="space-y-2"><legend className="text-dynamic-xs font-semibold text-muted">{t(newChatKind === "DIRECT" ? "collab.chat.choose_person" : "collab.chat.choose_people")}</legend><div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-theme p-2">{members.filter((member) => member.id !== currentMemberId).map((member) => {
                const checked = selectedMemberIds.includes(member.id);
                return <label key={member.id} className={`flex cursor-pointer items-center gap-3 rounded-xl p-2.5 transition ${checked ? "bg-primary-soft" : "hover:bg-surface-elevated"}`}><input type={newChatKind === "DIRECT" ? "radio" : "checkbox"} name="chat-member" checked={checked} onChange={() => newChatKind === "DIRECT" ? setSelectedMemberIds([member.id]) : toggleMember(member.id)} className="accent-primary" /><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-dynamic-xs font-bold text-accent">{localize(member.name).slice(0, 1)}</span><span className="min-w-0 flex-1"><span className="block truncate text-dynamic-sm font-semibold text-foreground">{localize(member.name)}</span><span className="block truncate text-dynamic-xs text-muted">{localize(member.jobTitle)} · {member.email}</span></span><span className={`h-2 w-2 rounded-full ${member.presence === "ONLINE" ? "bg-success" : member.presence === "AWAY" ? "bg-warning" : "bg-muted"}`} /></label>;
              })}</div></fieldset>
              <div className="flex justify-end gap-2 border-t border-theme pt-3"><button type="button" onClick={() => setNewChatOpen(false)} className={secondaryButtonClass}>{t("collab.button.cancel")}</button><button type="submit" disabled={!selectedMemberIds.length} className={`${primaryButtonClass} disabled:opacity-50`}><MessageCircle className="h-4 w-4" /><span>{t("collab.chat.create_chat")}</span></button></div>
            </form>
          </section>
        </div>
      )}

      {activeMeeting && <CallRoomModal meeting={activeMeeting} onLeave={closeCall} />}
    </div>
  );
};
