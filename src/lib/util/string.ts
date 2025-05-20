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
  return `${count} ${pluralize(countOrList, name, pluralForm)}`;
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
