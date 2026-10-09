export const SIDEBAR_SNAP_WIDTHS = [80, 176, 336] as const;
export const DEFAULT_SIDEBAR_WIDTH = SIDEBAR_SNAP_WIDTHS[1];
export const SIDEBAR_COMPACT_BREAKPOINT = DEFAULT_SIDEBAR_WIDTH;

export type SidebarSnapWidth = (typeof SIDEBAR_SNAP_WIDTHS)[number];

export const isSidebarCompactWidth = (width: number): boolean =>
  width < SIDEBAR_COMPACT_BREAKPOINT;

export const clampSidebarWidth = (width: number): number =>
  Math.round(Math.max(SIDEBAR_SNAP_WIDTHS[0], Math.min(SIDEBAR_SNAP_WIDTHS[2], width)));

export const snapSidebarWidth = (width: number): SidebarSnapWidth =>
  SIDEBAR_SNAP_WIDTHS.reduce<SidebarSnapWidth>(
    (nearest, candidate) =>
      Math.abs(candidate - width) < Math.abs(nearest - width) ? candidate : nearest,
    SIDEBAR_SNAP_WIDTHS[0]
  );

export const restoreSidebarWidth = (storedWidth: number): number => {
  if (!Number.isFinite(storedWidth) || storedWidth < SIDEBAR_SNAP_WIDTHS[0] || storedWidth > SIDEBAR_SNAP_WIDTHS[2]) {
    return DEFAULT_SIDEBAR_WIDTH;
  }
  return clampSidebarWidth(storedWidth);
};
