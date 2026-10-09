import React, { useState } from "react";
import { Clock3, Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { dangerButtonClass, iconButtonBaseClass, iconButtonClass, useModalFocus } from "@/components/DesignSystem";
import { CollaborationMeeting, useCollaboration } from "@/context/CollaborationContext";

interface CallRoomModalProps {
  meeting: CollaborationMeeting;
  onLeave: () => void;
}

const formatMeetingTime = (value: string, language: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(language === "ar" ? "ar-SA" : "en-SA", { hour: "numeric", minute: "2-digit" });
};

export const CallRoomModal: React.FC<CallRoomModalProps> = ({ meeting, onLeave }) => {
  const { t, localize, language } = useLanguage();
  const { members, currentMemberId } = useCollaboration();
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [sharing, setSharing] = useState(false);
  const dialogRef = useModalFocus(true, onLeave);
  const participants = Array.from(new Set([currentMemberId, ...meeting.participantIds]))
    .map((id) => members.find((member) => member.id === id))
    .filter((member) => Boolean(member));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-canvas/90 p-3 backdrop-blur-md sm:p-6">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="call-room-title" tabIndex={-1} className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-theme bg-surface shadow-shell">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-theme px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-dynamic-xs font-semibold text-primary-text"><span className="h-2 w-2 rounded-full bg-primary" />{t("collab.meeting.preview_live")}</div>
            <h2 id="call-room-title" className="truncate text-dynamic-lg font-bold text-foreground">{localize(meeting.title)}</h2>
          </div>
          <div className="flex items-center gap-2 text-dynamic-xs text-muted"><Clock3 className="h-4 w-4" />{formatMeetingTime(meeting.startsAtIso, language)} · {meeting.durationMinutes} {t("collab.meeting.minutes")}</div>
          <button type="button" title={t("collab.button.close_call")} aria-label={t("collab.button.close_call")} onClick={onLeave} className={iconButtonClass}><X className="h-4 w-4" /></button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_230px]">
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-theme bg-surface-elevated p-4 text-center">
            <div className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
              {participants.map((participant, index) => (
                <div key={participant!.id} className="relative flex aspect-video min-h-28 flex-col items-center justify-center overflow-hidden rounded-2xl border border-theme bg-surface p-3">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-dynamic-base font-bold ${index % 2 ? "bg-accent-soft text-accent-text" : "bg-primary-soft text-primary-text"}`}>{localize(participant!.name).slice(0, 1)}</span>
                  <span className="mt-2 max-w-full truncate text-dynamic-xs font-semibold text-foreground">{localize(participant!.name)}{participant!.id === currentMemberId ? ` · ${t("collab.meeting.you")}` : ""}</span>
                  {participant!.id === currentMemberId && cameraOn && <span className="absolute end-2 top-2 rounded-full bg-success-soft p-1 text-success-text"><Video className="h-3.5 w-3.5" /></span>}
                </div>
              ))}
              {!participants.length && <div className="col-span-full rounded-2xl border border-dashed border-theme p-8 text-dynamic-sm text-muted">{t("collab.meeting.no_participants")}</div>}
            </div>
            {sharing && <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-dynamic-xs font-semibold text-primary-text"><MonitorUp className="h-4 w-4" />{t("collab.meeting.sharing_preview")}</div>}
          </div>

          <aside className="space-y-3 rounded-2xl border border-theme bg-surface p-3">
            <h3 className="text-dynamic-sm font-bold text-foreground">{t("collab.meeting.participants")} · {participants.length}</h3>
            <div className="space-y-2">
              {participants.map((participant) => <div key={participant!.id} className="flex items-center gap-2 rounded-xl bg-surface-elevated p-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-dynamic-xs font-bold text-primary-text">{localize(participant!.name).slice(0, 1)}</span><span className="min-w-0 flex-1 truncate text-dynamic-xs font-semibold text-foreground">{localize(participant!.name)}{participant!.id === currentMemberId ? ` · ${t("collab.meeting.you")}` : ""}</span><span className="h-2 w-2 rounded-full bg-success" /></div>)}
            </div>
            <div role="note" className="rounded-lg border border-warning bg-warning-soft p-3 text-dynamic-xs leading-relaxed text-warning-text">{t("collab.meeting.demo_notice")}</div>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-theme bg-surface p-3 sm:p-4">
          <button type="button" aria-pressed={muted} title={t(muted ? "collab.button.unmute" : "collab.button.mute")} aria-label={t(muted ? "collab.button.unmute" : "collab.button.mute")} onClick={() => setMuted((value) => !value)} className={`${iconButtonBaseClass} ${muted ? "bg-danger-soft text-danger-text hover:bg-danger-soft" : "bg-surface-elevated text-foreground hover:bg-surface-muted"}`}>{muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
          <button type="button" aria-pressed={cameraOn} title={t(cameraOn ? "collab.button.camera_off" : "collab.button.camera_on")} aria-label={t(cameraOn ? "collab.button.camera_off" : "collab.button.camera_on")} onClick={() => setCameraOn((value) => !value)} className={`${iconButtonBaseClass} ${cameraOn ? "bg-primary-soft text-primary-text hover:bg-primary-soft" : "bg-surface-elevated text-foreground hover:bg-surface-muted"}`}>{cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}</button>
          <button type="button" aria-pressed={sharing} title={t(sharing ? "collab.button.stop_sharing" : "collab.button.share_screen")} aria-label={t(sharing ? "collab.button.stop_sharing" : "collab.button.share_screen")} onClick={() => setSharing((value) => !value)} className={`${iconButtonBaseClass} ${sharing ? "bg-primary-soft text-primary-text hover:bg-primary-soft" : "bg-surface-elevated text-foreground hover:bg-surface-muted"}`}><MonitorUp className="h-4 w-4" /></button>
          <button type="button" onClick={onLeave} className={dangerButtonClass}><PhoneOff className="h-4 w-4" /><span>{t("collab.button.leave_call")}</span></button>
        </footer>
      </section>
    </div>
  );
};
