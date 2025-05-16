// @ts-check
// Enables type checking for this JSDoc-annotated file in VS Code and other TS-aware editors.

/**
 * Parses a date string, prioritizing "M/D/YYYY" and "M/D/YY" (assumes 20YY),
 * and "M/D" (assumes 2025).
 * Returns a Date object or null if parsing fails.
 * @param {string | null | undefined} dateStr The date string to parse.
 * @returns {Date | null} A Date object or null.
 */
export const parseDateString = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return null;

  const parts = dateStr.split("/");
  /** @type {number | undefined} */
  let year;
  /** @type {number | undefined} */
  let month;
  /** @type {number | undefined} */
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

  console.log(`parseDateString failed to parse: "${dateStr}"`);
  return null;
};

/**
 * Formats a date string into "Month D, YYYY" (e.g., "May 11, 2025").
 * Uses parseDateString for reliable parsing.
 * @param {string | null | undefined} dateStr The date string to format.
 * @returns {string} The formatted date string or "Invalid Date".
 */
export const formatDate = (dateStr) => {
  const d = parseDateString(dateStr);
  if (!d) return "Invalid Date";
  const currentYear = new Date().getFullYear();
  /** @type {Intl.DateTimeFormatOptions} */
  const options =
    d.getFullYear() === currentYear
      ? { month: "long", day: "numeric" }
      : { month: "long", day: "numeric", year: "numeric" };
  return d.toLocaleDateString("en-US", options);
};

/**
 * Formats a date string into "M/D/YY" (e.g., "5/11/25").
 * Uses parseDateString for reliable parsing.
 * @param {string | null | undefined} dateStr The date string to format.
 * @returns {string} The formatted date string or "Invalid Date".
 */
export const formatShortDate = (dateStr) => {
  const d = parseDateString(dateStr);
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
};

/**
 * Formats a date string (expected to be ISO or otherwise reliably parsable by new Date())
 * into a human-readable date and time string.
 * @param {string | null | undefined} dateString The date string to format.
 * @returns {string} The formatted date and time string or "Invalid Date Time".
 */
export const formatDateTimeReadable = (dateString) => {
  if (!dateString) return "";
  // For this function, we assume dateString is more likely to be an ISO string or already robust.
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "Invalid Date Time";
  const currentYear = new Date().getFullYear();
  /** @type {Intl.DateTimeFormatOptions} */
  const options =
    d.getFullYear() === currentYear
      ? {
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }
      : {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        };
  return d.toLocaleString("en-US", options);
};

/**
 * Normalizes a date string to YYYY-MM-DD format.
 * Handles M/D/YYYY, M/D/YY (assumes 20YY), and M/D (assumes 2025).
 * Returns null if the date string cannot be reliably parsed.
 * @param {string | null | undefined} dateStr The date string to normalize.
 * @returns {string | null} The date string in YYYY-MM-DD format or null.
 */
export const normalizeToYYYYMMDD = (dateStr) => {
  const d = parseDateString(dateStr);
  if (!d) return null;
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
export const normalizeYearTo2025 = (dateStr) => {
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
 * Checks if a date string represents a date in the future.
 * Uses parseDateString for reliable parsing.
 * @param {string | null | undefined} dateStr The date string to check.
 * @returns {boolean} Returns true if the date is after today, otherwise false.
 */
export const isFutureDate = (dateStr) => {
  const d = parseDateString(dateStr);
  if (!d) return false;

  const today = new Date();
  // Set time to midnight for accurate date comparison
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  return d > today;
};

/**
 * Finds the first and last date strings from an events object.
 * Assumes event keys are date strings parsable by parseDateString.
 * @param {Record<string, any[]> | null | undefined} events The events object.
 * @returns {{ firstDate: string | null, lastDate: string | null }} An object containing the first and last date strings, or null if no valid dates are found.
 */
export const getFirstAndLastDate = (events) => {
  if (!events) return { firstDate: null, lastDate: null };

  const parsedDates = Object.keys(events)
    .map((dateStr) => ({ original: dateStr, parsed: parseDateString(dateStr) }))
    .filter((item) => item.parsed !== null);

  if (parsedDates.length === 0) return { firstDate: null, lastDate: null };

  // Sort parsed Date objects
  parsedDates.sort((a, b) => {
    // Redundant check to satisfy type checker, filter should ensure non-null
    if (!a.parsed || !b.parsed) return 0; // Should not happen due to filter
    return a.parsed.getTime() - b.parsed.getTime();
  });

  return {
    firstDate: parsedDates[0].original,
    lastDate: parsedDates[parsedDates.length - 1].original,
  };
};

/**
 * Formats a date range string from start and end date strings.
 * Format is "Month Day to Month Day" or "Month Day, Year to Month Day, Year" if year is not current (2025).
 * @param {string | null | undefined} startDateStr The start date string.
 * @param {string | null | undefined} endDateStr The end date string.
 * @returns {string} The formatted date range string.
 */
export const formatDateRange = (startDateStr, endDateStr) => {
  const startDate = parseDateString(startDateStr);
  const endDate = parseDateString(endDateStr);

  if (!startDate || !endDate) {
    if (startDateStr || endDateStr) {
      return "Invalid Date Range";
    }
    return ""; // Return empty string if both are null/undefined
  }

  const currentYear = new Date().getFullYear(); // Get current year dynamically
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  /** @type {Intl.DateTimeFormatOptions} */
  const startFormatOptions = { month: "long", day: "numeric" };
  /** @type {Intl.DateTimeFormatOptions} */
  const endFormatOptions = { month: "long", day: "numeric" };

  // Append year if not the current year
  if (startYear !== currentYear) {
    startFormatOptions.year = "numeric";
  }
  if (endYear !== currentYear) {
    endFormatOptions.year = "numeric";
  } else if (startYear !== currentYear) {
    // If end year is current but start year is not, still show end year
    endFormatOptions.year = "numeric";
  }

  const formattedStartDate = startDate.toLocaleDateString(
    "en-US",
    startFormatOptions
  );
  const formattedEndDate = endDate.toLocaleDateString(
    "en-US",
    endFormatOptions
  );

  return `${formattedStartDate} to ${formattedEndDate}`;
};
