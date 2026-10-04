export const DASHBOARD_WIDGET_IDS = [
  "workforce_headcount",
  "saudi_workforce_share",
  "attendance_latest_day",
  "needs_attention_total",
  "workforce_by_department",
  "attendance_mix",
  "pending_employee_requests",
  "pending_expenses",
  "document_renewals",
  "financial_workflows"
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];
export type EmptyWidgetBehavior = "HIDE" | "SHOW_EMPTY_STATE";

export interface DashboardWidgetPreference {
  enabled: boolean;
  emptyBehavior: EmptyWidgetBehavior;
}

export type DashboardPreferences = Record<DashboardWidgetId, DashboardWidgetPreference>;

export interface DashboardPreferenceStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export const DASHBOARD_PREFERENCES_STORAGE_KEY = "yamodeer.dashboard-widgets.v1";

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = Object.fromEntries(
  DASHBOARD_WIDGET_IDS.map((id) => [
    id,
    { enabled: id !== "financial_workflows", emptyBehavior: "HIDE" }
  ])
) as DashboardPreferences;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const normalizeDashboardPreferences = (value: unknown): DashboardPreferences => {
  const source = isRecord(value) && isRecord(value.widgets) ? value.widgets : value;

  return Object.fromEntries(
    DASHBOARD_WIDGET_IDS.map((id) => {
      const candidate = isRecord(source) ? source[id] : undefined;
      const fallback = DEFAULT_DASHBOARD_PREFERENCES[id];
      const entry = isRecord(candidate) ? candidate : {};
      return [
        id,
        {
          enabled: typeof entry.enabled === "boolean" ? entry.enabled : fallback.enabled,
          emptyBehavior: entry.emptyBehavior === "SHOW_EMPTY_STATE" || entry.emptyBehavior === "HIDE"
            ? entry.emptyBehavior
            : fallback.emptyBehavior
        }
      ];
    })
  ) as DashboardPreferences;
};

export const parseDashboardPreferences = (raw: string | null | undefined): DashboardPreferences => {
  if (!raw) return normalizeDashboardPreferences(null);
  try {
    return normalizeDashboardPreferences(JSON.parse(raw) as unknown);
  } catch {
    return normalizeDashboardPreferences(null);
  }
};

const getBrowserStorage = (): DashboardPreferenceStorage | undefined => {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
};

export const loadDashboardPreferences = (
  storage: DashboardPreferenceStorage | undefined = getBrowserStorage()
): DashboardPreferences => {
  if (!storage) return normalizeDashboardPreferences(null);
  try {
    return parseDashboardPreferences(storage.getItem(DASHBOARD_PREFERENCES_STORAGE_KEY));
  } catch {
    return normalizeDashboardPreferences(null);
  }
};

export const saveDashboardPreferences = (
  preferences: unknown,
  storage: DashboardPreferenceStorage | undefined = getBrowserStorage()
): DashboardPreferences => {
  const normalized = normalizeDashboardPreferences(preferences);
  if (!storage) return normalized;
  try {
    storage.setItem(DASHBOARD_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Keep the current screen usable if browser storage is blocked or full.
  }
  return normalized;
};

export const shouldShowDashboardWidget = (
  preferences: DashboardPreferences,
  id: DashboardWidgetId,
  hasRecords: boolean
): boolean => {
  const preference = preferences[id] ?? DEFAULT_DASHBOARD_PREFERENCES[id];
  return preference.enabled && (hasRecords || preference.emptyBehavior === "SHOW_EMPTY_STATE");
};
