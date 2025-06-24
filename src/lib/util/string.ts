/**
 * @param {string} str
 */
export function toTitleCase(str: string) {
  const minorWords =
    /^(a|an|and|as|at|but|by|for|if|in|nor|of|on|or|so|the|to|up|yet)$/i;
  return str
    .toLowerCase()
    .split(" ")
    .map((word, i, arr) => {
      if (i === 0 || i === arr.length - 1 || !minorWords.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(" ");
}

export function countAndLabel(
  countOrList: number | unknown[],
  name: string,
  pluralForm?: string
) {
  const count =
    typeof countOrList === "number" ? countOrList : countOrList.length;
  return `${count.toLocaleString()} ${pluralize(countOrList, name, pluralForm)}`;
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
