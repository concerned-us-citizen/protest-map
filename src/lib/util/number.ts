export function nearlyEqual(a: number, b: number, epsilon = 1e-10): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Turn  numbers into 0-999   → "999"
 *                     1 000+ → "1.2K", "57K", "9.9M", "125M", …
 * Always ≤ 5 visible chars, never scientific notation.
 */
export function formatTerse(n: number): string {
  const sign = n < 0 ? "-" : ""; // use U+2011 for a non-breaking minus if you prefer
  const abs = Math.abs(n);

  if (abs < 1_000) return sign + String(Math.round(abs)); // 0-999

  if (abs < 1_000_000) {
    // 1 000-999 999
    return sign + formatUnit(abs / 1_000, "K");
  }

  return sign + formatUnit(abs / 1_000_000, "M"); // ≥ 1 000 000
}

/* ------------------------------------------------------------------------- */

function formatUnit(value: number, suffix: "K" | "M"): string {
  // Decide whether to keep a single decimal
  let str: string;

  if (value < 10) {
    // 1.0 - 9.9   → always one decimal
    str = (Math.round(value * 10) / 10).toFixed(1);
  } else if (value < 100) {
    // 10 - 99.9   → use one decimal **only if** it still fits 5 chars
    const withDecimal = (Math.round(value * 10) / 10).toFixed(1);
    str = withDecimal.length + 1 <= 5 ? withDecimal : String(Math.round(value));
  } else {
    // 100 - 999   → integer only
    str = String(Math.round(value));
  }

  // Drop “.0” if present (turns "8.0" → "8")
  if (str.endsWith(".0")) str = str.slice(0, -2);

  // If rounding pushed 999.95 K → "1000K", bump up to "1M"
  if (suffix === "K" && str.startsWith("1000")) {
    return formatUnit(value / 1000, "M");
  }

  return str + suffix; // ≤ 5 chars guaranteed
}

export function formatAsInteger(n: number) {
  return Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}
