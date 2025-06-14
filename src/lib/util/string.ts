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
