export const MANILA_TIMEZONE = "Asia/Manila";

const manilaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: MANILA_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const manilaMonthFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: MANILA_TIMEZONE,
  year: "numeric",
  month: "2-digit",
});

/**
 * Returns the local date string in YYYY-MM-DD format for Asia/Manila (UTC+8).
 * Ensures midnight to 8:00 AM Manila transactions are not recorded under yesterday's UTC date.
 */
export function getManilaDateKey(dateInput?: Date | string | number): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return manilaDateFormatter.format(date);
}

/**
 * Returns the local month string in YYYY-MM format for Asia/Manila (UTC+8).
 */
export function getManilaMonthKey(dateInput?: Date | string | number): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return new Date().toISOString().slice(0, 7);
  return manilaMonthFormatter.format(date);
}

/**
 * Returns the 4-digit year string for Asia/Manila (UTC+8).
 */
export function getManilaYearKey(dateInput?: Date | string | number): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return String(new Date().getFullYear());
  return String(date.getFullYear());
}

/**
 * Checks if a given due date string (YYYY-MM-DD) is overdue relative to today in Manila time.
 */
export function isOverdueManila(dueDateStr?: string | null): boolean {
  if (!dueDateStr) return false;
  const todayKey = getManilaDateKey();
  return dueDateStr.slice(0, 10) < todayKey;
}

/**
 * Formats a timestamp into a human-readable date in Asia/Manila time.
 */
export function formatManilaDateTime(
  dateInput: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: MANILA_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(date);
}
