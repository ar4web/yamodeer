export type BorderRadiusToken = "sm" | "default" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";

const BASE_RADIUS_PX: Record<Exclude<BorderRadiusToken, "full">, number> = {
  sm: 2,
  default: 3,
  md: 4,
  lg: 6,
  xl: 8,
  "2xl": 10,
  "3xl": 12
};

const MIN_SCALE = 0.75;
const MAX_SCALE = 1.25;

export const normalizeBorderRadiusScale = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
};

export const getBorderRadiusTokens = (value: unknown = 1): Record<BorderRadiusToken, string> => {
  const scale = normalizeBorderRadiusScale(value);
  const tokens = Object.fromEntries(
    Object.entries(BASE_RADIUS_PX).map(([name, pixels]) => [
      name,
      `${Math.round(pixels * scale * 100) / 100}px`
    ])
  ) as Omit<Record<BorderRadiusToken, string>, "full">;
  return { ...tokens, full: "9999px" };
};
