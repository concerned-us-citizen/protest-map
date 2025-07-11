import { formatAsInteger } from "./number";

/**
 * @param {string} str
 */
export function toTitleCase(str: string): string {
  const minor =
    /^(a|an|and|as|at|but|by|for|if|in|nor|of|on|or|so|the|to|up|yet)$/i;

  return (
    str
      .toLowerCase()
      // keep every space or hyphen as its own token
      .split(/([ -])/)
      .map((token, i, arr) => {
        // 1️⃣ delimiter → return unchanged
        if (token === " " || token === "-") return token;

        // 2️⃣ always capitalise the first word, the last word,
        //    any word after a hyphen, or any non-“minor” word
        const prevIsDash = i > 0 && arr[i - 1] === "-";
        if (
          i === 0 ||
          prevIsDash ||
          i === arr.length - 1 ||
          !minor.test(token)
        ) {
          return token.charAt(0).toUpperCase() + token.slice(1);
        }
        return token;
      })
      // tokens already contain the delimiters, so just glue them back together
      .join("")
  );
}

export function countAndLabel(
  countOrList: number | unknown[],
  name: string,
  pluralForm?: string
) {
  const count =
    typeof countOrList === "number" ? countOrList : countOrList.length;
  return `${formatAsInteger(count)} ${pluralize(countOrList, name, pluralForm)}`;
}

export function pluralize(
  countOrList: number | unknown[],
  name: string,
  pluralForm?: string
): string {
  const count =
    typeof countOrList === "number" ? countOrList : countOrList.length;
  return count === 1 ? name : (pluralForm ?? `${name}s`);
}

export function isValidZipCode(
  zipcodeString: string | undefined | null
): boolean {
  if (
    zipcodeString === undefined ||
    zipcodeString === null ||
    zipcodeString === ""
  ) {
    return true;
  }

  // The regex pattern for a valid US ZIP code (5 digits or 5+4 digits with a hyphen)
  const pattern: RegExp = /^\d{5}(-\d{4})?$/;

  // Test the string against the pattern
  return pattern.test(zipcodeString);
}

export function isLikelyMalformedUrl(input: string): boolean {
  const trimmed = input.trim();

  const maybeUrl =
    trimmed.includes(":/") ||
    trimmed.includes("http") ||
    /\.[a-zA-Z]{3}$/.test(trimmed);

  if (!maybeUrl) return false;

  // Some bad links have '.'s stripped out
  if (!trimmed.includes(".")) return true;

  try {
    new URL(trimmed);
    return false; // It's a valid URL
  } catch {
    return true; // Looks like a URL, but is malformed
  }
}

export function asNormalizedKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\\-]/g, "");
}

export function quote(s: string): string {
  return `"${s}"`;
}

export function singleQuote(s: string): string {
  return `'${s}'`;
}

const PLACEHOLDER_DOUBLE_ASTERISK = "__LITERAL_DOUBLE_ASTERISK__";
const PLACEHOLDER_SINGLE_ASTERISK = "__LITERAL_SINGLE_ASTERISK__";

export function encodeMarkdownChars(str: string): string {
  str = str.replace(/\*\*/g, PLACEHOLDER_DOUBLE_ASTERISK);
  str = str.replace(/\*/g, PLACEHOLDER_SINGLE_ASTERISK);
  return str;
}

export function decodeMarkdownChars(str: string): string {
  str = str.replace(new RegExp(PLACEHOLDER_DOUBLE_ASTERISK, "g"), "&#42;&#42;");
  str = str.replace(new RegExp(PLACEHOLDER_SINGLE_ASTERISK, "g"), "&#42;");

  return str;
}

export function mdItalics(s: string): string {
  return `*${encodeMarkdownChars(s)}*`;
}
export function mdBold(s: string): string {
  return `**${encodeMarkdownChars(s)}**`;
}

export function joinWithAnd(items: string[]): string {
  if (!items || items.length === 0) {
    return "";
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  // For 3 or more items, apply the Oxford comma rule
  const lastItem = items[items.length - 1];
  const allButLast = items.slice(0, items.length - 1);

  return `${allButLast.join(", ")}, and ${lastItem}`;
}

/**
 * Left-pads `str` with `ch` until it reaches `length` characters.
 * If `str` is already long enough it is returned unchanged.
 *
 * @example
 * pad("42", 5, "0")    // → "00042"
 * pad("abc", 8, "-=")  // → "-=-=-abc"
 */
export function padStart(str: string, length: number, ch = " "): string {
  if (ch.length === 0) {
    throw new Error("pad(): padding character must be at least one char long");
  }

  const deficit = length - str.length;
  if (deficit <= 0) return str; // already long enough

  // build just enough padding, even if `ch` is multi-char
  const padding = ch.repeat(Math.ceil(deficit / ch.length)).slice(0, deficit);
  return padding + str;
}
