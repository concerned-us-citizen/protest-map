import type { DateRange, Nullable, ProtestEvent } from "../types";

/**
 * Parses a date string, prioritizing "M/D/YYYY" and "M/D/YY" (assumes 20YY),
 * and "M/D" (assumes 2025).
 * Returns a Date object or null if parsing fails.
 * @param {string | null | undefined} dateStr The date string to parse.
 * @returns {Date | null} A Date object or null.
 */
export const parseDateString = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== "string") return null;

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

  return null;
};

/**
 * Formats a date string into "Month D, YYYY" (e.g., "May 11, 2025").
 */
export const formatDate = (date: Date | null): string => {
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
 * Formats a date range string from start and end dates.
 * Format is "Month Day to Month Day" or "Month Day, Year to Month Day, Year" if year is not current.
 */
export const formatDateRange = (
  dateRange: {
    start: Date;
    end: Date;
  } | null
): string => {
  if (!dateRange) {
    return "Unspecified date range";
  }
  const { start, end } = dateRange;
  const currentYear = new Date().getFullYear();

  const formattedStartDate = start.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: start.getFullYear() !== currentYear ? "numeric" : undefined,
  });

  const formattedEndDate = end.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: end.getFullYear() !== currentYear ? "numeric" : undefined,
  });

  return `${formattedStartDate} to ${formattedEndDate}`;
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

/**
 * Normalizes the year of a date string to 2025 based on specific conditions.
 * If the year is less than 2025, it's always changed to 2025.
 * If the year is greater than 2025, it's changed to 2025 only if the current date is before 2025-12-01.
 * Logs a warning to the console if the year is changed.
 * Assumes the input dateStr is already in YYYY-MM-DD format.
 * @param {string | null | undefined} dateStr The date string in YYYY-MM-DD format.
 * @returns {string | null} The date string with the potentially normalized year, or null if input is null/undefined.
 */
export const normalizeYearTo2025 = (
  dateStr?: string | undefined
): string | null => {
  if (!dateStr) return null;

  const year = parseInt(dateStr.substring(0, 4), 10);
  let finalDate = dateStr;
  let yearChanged = false;
  let warningMessage = "";

  // Normalize years less than 2025 regardless of current date
  if (year < 2025) {
    finalDate = `2025${dateStr.substring(4)}`;
    yearChanged = true;
    warningMessage = `Date "${dateStr}" (original) normalized year to 2025: "${finalDate}" (year was less than 2025).`;
  }

  // Normalize years greater than 2025 only if current date is before 2025-12-01
  const currentDate = new Date();
  const cutoffDate = new Date("2025-12-01");
  if (year > 2025 && currentDate < cutoffDate) {
    finalDate = `2025${dateStr.substring(4)}`;
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
  date: Date | null,
  includeToday = false
): boolean => {
  if (!date) return false;

  const today = new Date();
  // Set time to midnight for accurate date comparison
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return includeToday ? date >= today : date > today;
};

export const formatDateIndicatingFuture = (date: Date | null) => {
  return `${formatDate(date)}${isFutureDate(date) ? " (future)" : ""}`;
};

/**
 * Finds the first and last dates from an events object.
 * @param {Record<string, any[]> | null | undefined} events The events object.
 * @returns {{ first: string | null, last: string | null }} An object containing the first and last date strings, or null if no valid dates are found.
 */
export const getFirstAndLastDate = (
  events: Map<Date, ProtestEvent[]>
): Nullable<DateRange> => {
  if (!events) return null;

  const sortedDates = [...events.keys()].sort(
    (a, b) => a.getTime() - b.getTime()
  );

  if (sortedDates.length === 0) return null;

  return {
    start: sortedDates[0],
    end: sortedDates.at(-1) ?? sortedDates[0], // shut the compiler up
  };
};
