const isValidISOCalendarDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

/** Return a date-only value in the browser's local calendar, not UTC. */
export const getLocalISODate = (date: Date = new Date()): string => {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Add calendar days to a date-only value without introducing a timezone shift. */
export const addISOCalendarDays = (value: string, days: number): string => {
  if (!isValidISOCalendarDate(value) || !Number.isInteger(days)) {
    throw new RangeError("A valid ISO calendar date and integer day offset are required");
  }
  const result = new Date(`${value}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
};

/** Add calendar years to a date-only value without relying on the machine timezone. */
export const addISOCalendarYears = (value: string, years: number): string => {
  if (!isValidISOCalendarDate(value) || !Number.isInteger(years)) {
    throw new RangeError("A valid ISO calendar date and integer year offset are required");
  }
  const result = new Date(`${value}T00:00:00.000Z`);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result.toISOString().slice(0, 10);
};
