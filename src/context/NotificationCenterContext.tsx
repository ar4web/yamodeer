import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { BilingualText } from "@/context/LanguageContext";
import type { ModuleRouteKey } from "@/context/RBACGeofenceContext";

export type NotificationCategory = "WORKFLOW" | "SYSTEM" | "PRODUCT";
export type NotificationPreferenceKey = "workflow" | "system" | "product";

export interface NotificationRecord {
  id: string;
  category: NotificationCategory;
  title: BilingualText;
  body: BilingualText;
  createdAt: string;
  isRead: boolean;
  route?: ModuleRouteKey;
}

export interface NotificationPreferences {
  workflow: boolean;
  system: boolean;
  product: boolean;
}

interface NotificationCenterValue {
  notifications: NotificationRecord[];
  unreadCount: number;
  preferences: NotificationPreferences;
  addNotification: (input: Omit<NotificationRecord, "id" | "createdAt" | "isRead">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  clearReadNotifications: () => void;
  setNotificationPreference: (key: NotificationPreferenceKey, enabled: boolean) => void;
}

const NotificationCenter = createContext<NotificationCenterValue | undefined>(undefined);
const SESSION_PREFIX = "yamodeer.notifications.v1";
const DEFAULT_PREFERENCES: NotificationPreferences = { workflow: true, system: true, product: true };

const createSeedNotifications = (): NotificationRecord[] => {
  const now = Date.now();
  return [
    {
      id: "NOTIFICATION-DEMO-001",
      category: "WORKFLOW",
      title: { en: "Workflow inbox ready", ar: "صندوق مسارات العمل جاهز" },
      body: { en: "Illustrative approvals are available in Operations → Workflows. They are not real assignments.", ar: "تتوفر موافقات توضيحية في العمليات ← مسارات العمل. وهي ليست تكليفات فعلية." },
      createdAt: new Date(now - 20 * 60 * 1000).toISOString(),
      isRead: false,
      route: "workflows"
    },
    {
      id: "NOTIFICATION-DEMO-002",
      category: "SYSTEM",
      title: { en: "Local preview notice", ar: "تنبيه المعاينة المحلية" },
      body: { en: "Profile, workflow and notification changes stay in this browser session; no email or SMS is sent.", ar: "تبقى تغييرات الملف ومسارات العمل والإشعارات ضمن جلسة المتصفح؛ ولا يُرسل بريد أو رسالة نصية." },
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      route: "profile"
    }
  ];
};

const readSessionValue = <T,>(slot: string, fallback: () => T): T => {
  if (typeof window === "undefined") return fallback();
  try {
    const raw = window.sessionStorage.getItem(`${SESSION_PREFIX}.${slot}`);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // The local preview still works when browser storage is disabled.
  }
  return fallback();
};

const writeSessionValue = (slot: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${SESSION_PREFIX}.${slot}`, JSON.stringify(value));
  } catch {
    // Keep notifications available in memory if the tab storage is blocked or full.
  }
};

const preferenceKeyForCategory: Record<NotificationCategory, NotificationPreferenceKey> = {
  WORKFLOW: "workflow",
  SYSTEM: "system",
  PRODUCT: "product"
};

export const NotificationCenterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>(() =>
    readSessionValue("items", createSeedNotifications)
  );
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    readSessionValue("preferences", () => DEFAULT_PREFERENCES)
  );

  useEffect(() => writeSessionValue("items", notifications), [notifications]);
  useEffect(() => writeSessionValue("preferences", preferences), [preferences]);

  const addNotification = useCallback((input: Omit<NotificationRecord, "id" | "createdAt" | "isRead">) => {
    if (!preferences[preferenceKeyForCategory[input.category]]) return;
    const record: NotificationRecord = {
      ...input,
      id: `NOTIFICATION-LOCAL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      isRead: false
    };
    setNotifications((current) => [record, ...current].slice(0, 50));
  }, [preferences]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearReadNotifications = useCallback(() => {
    setNotifications((current) => current.filter((item) => !item.isRead));
  }, []);

  const setNotificationPreference = useCallback((key: NotificationPreferenceKey, enabled: boolean) => {
    setPreferences((current) => ({ ...current, [key]: enabled }));
  }, []);

  const unreadCount = notifications.reduce((count, item) => count + Number(!item.isRead), 0);
  const value = useMemo<NotificationCenterValue>(() => ({
    notifications,
    unreadCount,
    preferences,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    clearReadNotifications,
    setNotificationPreference
  }), [notifications, unreadCount, preferences, addNotification, markNotificationRead, markAllNotificationsRead, dismissNotification, clearReadNotifications, setNotificationPreference]);

  return <NotificationCenter.Provider value={value}>{children}</NotificationCenter.Provider>;
};

export const useNotificationCenter = (): NotificationCenterValue => {
  const context = useContext(NotificationCenter);
  if (!context) throw new Error("useNotificationCenter must be used within NotificationCenterProvider");
  return context;
};
