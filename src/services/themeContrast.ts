type RGB = [number, number, number];

const parseHexColor = (value: string): RGB | null => {
  const hex = value.trim().replace(/^#/, "");
  if (/^[\da-f]{3}$/i.test(hex)) {
    return hex.split("").map((channel) => parseInt(channel + channel, 16)) as RGB;
  }
  if (/^[\da-f]{6}$/i.test(hex)) {
    return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as RGB;
  }
  return null;
};

const toHexColor = (rgb: RGB): string => `#${rgb
  .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
  .join("")}`;

const linearChannel = (channel: number): number => {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = ([red, green, blue]: RGB): number =>
  0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue);

export const getContrastRatio = (foreground: string, background: string): number => {
  const foregroundRgb = parseHexColor(foreground);
  const backgroundRgb = parseHexColor(background);
  if (!foregroundRgb || !backgroundRgb) {
    throw new TypeError("Contrast colors must be three- or six-digit hexadecimal colors.");
  }
  const foregroundLuminance = relativeLuminance(foregroundRgb);
  const backgroundLuminance = relativeLuminance(backgroundRgb);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

export const mixHexColors = (first: string, second: string, secondWeight: number): string => {
  const firstRgb = parseHexColor(first);
  const secondRgb = parseHexColor(second);
  if (!firstRgb || !secondRgb) {
    throw new TypeError("Theme colors must be three- or six-digit hexadecimal colors.");
  }
  const weight = Math.max(0, Math.min(1, secondWeight));
  return toHexColor(firstRgb.map((channel, index) =>
    channel * (1 - weight) + secondRgb[index] * weight
  ) as RGB);
};

const minimumContrast = (foreground: string, backgrounds: string[]): number =>
  Math.min(...backgrounds.map((background) => getContrastRatio(foreground, background)));

/**
 * Returns the closest shade along a black/white blend that satisfies the
 * requested contrast against every supplied background.
 */
export const ensureContrast = (
  preferred: string,
  backgrounds: string[],
  minimumRatio = 4.5
): string => {
  const preferredRgb = parseHexColor(preferred);
  const normalizedBackgrounds = backgrounds.map((background) => {
    if (!parseHexColor(background)) {
      throw new TypeError("Theme backgrounds must be three- or six-digit hexadecimal colors.");
    }
    return background;
  });
  if (!preferredRgb) throw new TypeError("Theme foreground must be a three- or six-digit hexadecimal color.");
  if (!normalizedBackgrounds.length || minimumContrast(preferred, normalizedBackgrounds) >= minimumRatio) {
    return toHexColor(preferredRgb);
  }

  const candidates: Array<{ color: string; distance: number }> = [];
  for (const target of ["#000000", "#ffffff"]) {
    for (let step = 1; step <= 100; step += 1) {
      const candidate = mixHexColors(preferred, target, step / 100);
      if (minimumContrast(candidate, normalizedBackgrounds) >= minimumRatio) {
        candidates.push({ color: candidate, distance: step });
        break;
      }
    }
  }

  if (candidates.length) {
    candidates.sort((first, second) => first.distance - second.distance);
    return candidates[0].color;
  }

  return minimumContrast("#000000", normalizedBackgrounds) >= minimumContrast("#ffffff", normalizedBackgrounds)
    ? "#000000"
    : "#ffffff";
};

/** Chooses a readable black/white foreground for one or more solid fills. */
export const getAccessibleForeground = (
  backgrounds: string[],
  minimumRatio = 4.5
): string => ensureContrast(
  minimumContrast("#000000", backgrounds) >= minimumContrast("#ffffff", backgrounds)
    ? "#000000"
    : "#ffffff",
  backgrounds,
  minimumRatio
);
