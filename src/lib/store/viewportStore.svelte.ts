import { readable, type Readable } from "svelte/store";

export function createMediaQueryStore(query: string): Readable<boolean> {
  function start(set: (_value: boolean) => void): (() => void) | void {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(query);
    set(mql.matches);

    const handler = (event: MediaQueryListEvent): void => set(event.matches);
    mql.addEventListener("change", handler);

    return (): void => mql.removeEventListener("change", handler);
  }

  return readable(false, start);
}

export const wideBreakpoint = "768px";
export const tallBreakpoint = "600px";

export const isWideViewport = createMediaQueryStore(
  `(min-width: ${wideBreakpoint})`
);
export const isTallViewport = createMediaQueryStore(
  `(min-height: ${tallBreakpoint})`
);
