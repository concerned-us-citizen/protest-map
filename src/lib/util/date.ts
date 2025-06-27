/**
 * Parses a date string, prioritizing "M/D/YYYY" and "M/D/YY" (assumes 20YY),
 * and "M/D" (assumes 2025).
 * Returns a Date object or null if parsing fails.
 * @param {string | undefined} dateStr The date string to parse.
 * @returns {Date | undefined} A Date object or undefined.
 */
export const parseDateString = (dateStr: string): Date | undefined => {
  if (!dateStr || typeof dateStr !== "string") return undefined;

  const parts = dateStr.split("/");
  let year;
  let month;
  let day;

  if (parts.length === 3) {
    // M/D/YYYY or M/D/YY
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);

    if (!isNaN(year) && year < 100) {
      // Handle YY format
      year += 2000;
    }
  } else if (parts.length === 2) {
    // M/D format
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
    year = 2025; // Default year
  }

  if (
    year !== undefined &&
    month !== undefined &&
    day !== undefined &&
    !isNaN(year) &&
    !isNaN(month) &&
    !isNaN(day) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31 &&
    year >= 1900 &&
    year <= 2100
  ) {
    // Added reasonable upper bound for year
    // JavaScript month is 0-indexed.
    // Check if Date constructor creates a valid date matching the input parts.
    const d = new Date(year, month - 1, day);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return d;
    }
  }
  // Attempt to parse "YYYY-MM-DD" format
  const yyyyMmDdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyyMmDdMatch) {
    year = parseInt(yyyyMmDdMatch[1], 10);
    month = parseInt(yyyyMmDdMatch[2], 10); // Month is 1-indexed from regex
    day = parseInt(yyyyMmDdMatch[3], 10);

    if (
      !isNaN(year) &&
      !isNaN(month) &&
      !isNaN(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31 &&
      year >= 1900 &&
      year <= 2100
    ) {
      // JavaScript month is 0-indexed.
      const d = new Date(year, month - 1, day);
      // Check if Date constructor creates a valid date matching the input parts.
      if (
        d.getFullYear() === year &&
        d.getMonth() === month - 1 &&
        d.getDate() === day
      ) {
        return d;
      }
    }
  }

  return undefined;
};

/**
 * Formats a date string into "Month D, YYYY" (e.g., "May 11, 2025").
 */
export const formatDate = (date: Date | undefined): string => {
  if (!date) return "Unspecified";
  const currentYear = new Date().getFullYear();
  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === currentYear
      ? { month: "long", day: "numeric" }
      : { month: "long", day: "numeric", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
};

/**
 * Formats a date string into "M/D/YY" (e.g., "5/11/25").
 */
export const formatShortDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
};

/**
 * Serialises a Date to "MM-DD-YYYY" (U S-friendly, no URL encoding needed).
 */
export function serializeDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0"); // 01-12
  const dd = String(date.getDate()).padStart(2, "0"); // 01-31
  const yyyy = date.getFullYear();

  return `${mm}-${dd}-${yyyy}`;
}

/**
 * Parses "MM-DD-YYYY" back to a Date.
 * Returns undefined for malformed or impossible dates (e.g. 02-30-2025).
 */
export function deserializeDate(text: string): Date | undefined {
  const match = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(text);
  if (!match) return undefined;

  const [, mStr, dStr, yStr] = match;
  const month = Number(mStr) - 1; // JS months are 0-based
  const day = Number(dStr);
  const year = Number(yStr);

  const d = new Date(year, month, day);

  // Guard against  JS date rollover (e.g. 02-31 →  Mar 03)
  return d.getFullYear() === year &&
    d.getMonth() === month &&
    d.getDate() === day
    ? d
    : undefined;
}

/**
 * Formats a date string
 */
export const formatDateTime = (date: Date): string => {
  const currentYear = new Date().getFullYear();
  const isCurrentYear = date.getFullYear() === currentYear;
  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: isCurrentYear ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Normalizes a date string to YYYY-MM-DD format.
 * Handles M/D/YYYY, M/D/YY (assumes 20YY), and M/D (assumes 2025).
 * Returns null if the date string cannot be reliably parsed.
 * @param {string | null | undefined} dateStr The date string to normalize.
 * @returns {string | null} The date string in YYYY-MM-DD format or null.
 */
export const normalizeToYYYYMMDD = (
  dateStr?: string | undefined
): string | undefined => {
  if (!dateStr) return undefined;
  const d = parseDateString(dateStr);
  if (!d) return undefined;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const normalizeToMMDDYYYY = (
  dateStr?: string | undefined
): string | undefined => {
  if (!dateStr) return undefined;
  const d = parseDateString(dateStr);
  if (!d) return undefined;
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
};

/**
 * Normalizes the year of a date string to 2025 based on specific conditions.
 * If the year is less than 2025, it's always changed to 2025.
 * If the year is greater than 2025, it's changed to 2025 only if the current date is before 2025-12-01.
 * Logs a warning to the console if the year is changed.
 * Assumes the input dateStr is already in MM-DD-YYYY format.
 * @param {string | null | undefined} dateStr The date string in MM-DD-YYYY format.
 * @returns {string | null} The date string with the potentially normalized year, or null if input is null/undefined.
 */
export const normalizeYearTo2025 = (
  dateStr?: string | undefined
): string | null => {
  if (!dateStr) return null;

  const [monthStr, dayStr, yearStr] = dateStr.split("/");

  const year = parseInt(yearStr);
  let finalDate = dateStr;
  let yearChanged = false;
  let warningMessage = "";

  // Normalize years less than 2025 regardless of current date
  if (year < 2025) {
    finalDate = `${monthStr}/${dayStr}/2025`;
    yearChanged = true;
    warningMessage = `Date "${dateStr}" (original) normalized year to 2025: "${finalDate}" (year was less than 2025).`;
  }

  // Normalize years greater than 2025 only if current date is before 2025-12-01
  const currentDate = new Date();
  const cutoffDate = new Date("12/01/2025");
  if (year > 2025 && currentDate < cutoffDate) {
    finalDate = `${monthStr}/${dayStr}/2025`;
    yearChanged = true;
    warningMessage = `Date "${dateStr}" (original) normalized year to 2025: "${finalDate}" (year was greater than 2025 and current date is before 2025-12-01).`;
  }

  if (yearChanged) {
    console.warn(`⚠️ ${warningMessage}`);
  }

  return finalDate;
};

/**
 * Checks if a date string represents a date in the future, or
 * if includeToday is true, if it's today.
 */
export const isFutureDate = (
  date: Date | undefined,
  includeToday = false
): boolean => {
  if (!date) return false;

  const today = new Date();
  // Set time to midnight for accurate date comparison
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return includeToday ? date >= today : date > today;
};

export const formatDateIndicatingFuture = (date: Date | undefined) => {
  return `${formatDate(date)}${isFutureDate(date) ? " (future)" : ""}`;
};

export function dateToYYYYMMDDInt(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() is 0-based
  const day = date.getDate();
  return year * 10000 + month * 100 + day;
}

export function yyyymmddIntToDate(yyyymmdd: number): Date {
  const year = Math.floor(yyyymmdd / 10000);
  const month = Math.floor((yyyymmdd % 10000) / 100) - 1; // JS months are 0-based
  const day = yyyymmdd % 100;
  return new Date(year, month, day);
}

export function datesEqual(
  a: Date | null | undefined,
  b: Date | null | undefined
): boolean {
  if (!a || !b) return a === b; // handles null/undefined
  return a.getTime() === b.getTime();
}
