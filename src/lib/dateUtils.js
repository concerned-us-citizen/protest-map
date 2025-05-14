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

  // Fallback for other formats (e.g., ISO strings) or if primary parsing failed
  // This is less reliable for non-standard strings but can catch ISO dates.
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
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
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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
  return d.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
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
export const normalizeToYYYYMMDD = (dateStr) => {
  const d = parseDateString(dateStr);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
