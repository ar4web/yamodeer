import React, { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ExternalLink, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useNotificationCenter } from "@/context/NotificationCenterContext";
import type { ModuleRouteKey } from "@/context/RBACGeofenceContext";
import { iconButtonClass, secondaryButtonClass, surfaceClassName } from "@/components/DesignSystem";

interface NotificationCenterButtonProps {
  onNavigate: (route: ModuleRouteKey) => void;
}

const formatNotificationTime = (value: string, language: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
};

export const NotificationCenterButton: React.FC<NotificationCenterButtonProps> = ({ onNavigate }) => {
  const { t, language, localize } = useLanguage();
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    clearReadNotifications
  } = useNotificationCenter();
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const visibleNotifications = notifications.filter((notification) => !unreadOnly || !notification.isRead);
  const openNotification = (id: string, route?: ModuleRouteKey) => {
    markNotificationRead(id);
    setOpen(false);
    if (route) onNavigate(route);
  };
  const unreadAnnouncement = t("notifications.unread_count").replace("{count}", String(unreadCount));

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${t("notifications.button")}. ${unreadAnnouncement}`}
        aria-expanded={open}
        aria-controls={open ? "notification-center-panel" : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`${iconButtonClass} relative`}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && <span aria-hidden="true" className="absolute -end-0.5 -top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[0.625rem] font-bold leading-none text-on-danger">{unreadCount > 9 ? "9+" : unreadCount}</span>}
        <span className="sr-only" aria-live="polite">{unreadAnnouncement}</span>
      </button>

      {open && (
        <section id="notification-center-panel" role="region" aria-label={t("notifications.panel_title")} className={`absolute end-0 top-full z-50 mt-2 w-[min(25rem,calc(100vw-2rem))] overflow-hidden ${surfaceClassName} shadow-shell`}>
          <header className="border-b border-theme p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-dynamic-lg font-bold text-foreground">{t("notifications.panel_title")}</h2>
                <p className="mt-1 text-dynamic-xs leading-relaxed text-muted">{t("notifications.panel_note")}</p>
              </div>
              <button type="button" aria-label={t("notifications.close")} onClick={() => setOpen(false)} className="rounded-md p-2 text-muted hover:bg-surface-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1" role="group" aria-label={t("notifications.filter.label")}>
                <button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)} className={`rounded-full px-3 py-1.5 text-dynamic-xs font-semibold ${!unreadOnly ? "bg-primary text-white" : "bg-surface-elevated text-muted hover:text-foreground"}`}>{t("notifications.filter.all")}</button>
                <button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)} className={`rounded-full px-3 py-1.5 text-dynamic-xs font-semibold ${unreadOnly ? "bg-primary text-white" : "bg-surface-elevated text-muted hover:text-foreground"}`}>{t("notifications.filter.unread")} {unreadCount > 0 && `(${unreadCount})`}</button>
              </div>
              <button type="button" onClick={markAllNotificationsRead} disabled={unreadCount === 0} className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-dynamic-xs font-semibold text-primary-text hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"><CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />{t("notifications.mark_all_read")}</button>
            </div>
          </header>

          <div className="notification-scrollbar max-h-[min(65vh,30rem)] overflow-y-auto" aria-live="polite">
            {visibleNotifications.length === 0 ? (
              <div className="p-7 text-center">
                <Bell className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                <p className="mt-2 text-dynamic-sm font-semibold text-foreground">{t("notifications.empty.title")}</p>
                <p className="mt-1 text-dynamic-xs text-muted">{t("notifications.empty.body")}</p>
              </div>
            ) : (
              <ul className="divide-y divide-theme">
                {visibleNotifications.map((notification) => (
                  <li key={notification.id} className={`p-4 ${notification.isRead ? "bg-surface" : "bg-primary-soft/30"}`}>
                    <div className="flex items-start gap-3">
                      <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${notification.isRead ? "bg-surface-muted" : "bg-primary"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-theme bg-surface-elevated px-2 py-0.5 text-dynamic-xs font-semibold text-muted">{t(`notifications.category.${notification.category.toLowerCase()}`)}</span>
                          {!notification.isRead && <span className="text-dynamic-xs font-bold text-primary-text">{t("notifications.unread")}</span>}
                        </div>
                        <h3 className="mt-1.5 break-words text-dynamic-sm font-bold text-foreground">{localize(notification.title)}</h3>
                        <p className="mt-1 break-words text-dynamic-xs leading-relaxed text-muted">{localize(notification.body)}</p>
                        <time className="mt-1.5 block text-dynamic-xs text-muted" dateTime={notification.createdAt}>{formatNotificationTime(notification.createdAt, language)}</time>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {notification.route ? (
                            <button type="button" className={secondaryButtonClass} onClick={() => openNotification(notification.id, notification.route)}><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />{t("notifications.open")}</button>
                          ) : !notification.isRead ? (
                            <button type="button" className={secondaryButtonClass} onClick={() => markNotificationRead(notification.id)}><CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />{t("notifications.mark_read")}</button>
                          ) : null}
                          <button type="button" aria-label={`${t("notifications.dismiss")} · ${localize(notification.title)}`} onClick={() => dismissNotification(notification.id)} className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-dynamic-xs font-semibold text-muted hover:bg-surface-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X className="h-3.5 w-3.5" aria-hidden="true" />{t("notifications.dismiss")}</button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {notifications.some((item) => item.isRead) && <footer className="border-t border-theme p-2 text-end"><button type="button" onClick={clearReadNotifications} className="min-h-9 rounded-md px-3 text-dynamic-xs font-semibold text-muted hover:bg-surface-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t("notifications.clear_read")}</button></footer>}
        </section>
      )}
    </div>
  );
};
