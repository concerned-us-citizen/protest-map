import type { TurnoutRange } from "$lib/types";
import { formatTerse } from "$lib/util/number";

export function formatRangeTerse(turnout: TurnoutRange, includeSpace = true) {
  const space = includeSpace ? " " : "";
  return turnout.low !== turnout.high
    ? `${formatTerse(turnout.low)}${space}-${space}${formatTerse(turnout.high)}`
    : `${formatTerse(turnout.low)}`;
}
