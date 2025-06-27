export function clearTimeoutProperty<T, K extends keyof T>(
  obj: T,
  prop: K
): void {
  const id = obj[prop];
  if (
    typeof window !== "undefined" &&
    typeof window.clearTimeout === "function"
  ) {
    if (typeof id === "number") {
      window.clearTimeout(id);
    }
  }

  // Safely assign undefined only if it's allowed
  if ((undefined as T[K]) === undefined) {
    obj[prop] = undefined as T[K];
  }
}

export function omit<T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> {
  const clone = { ...obj };
  for (const key of keys) {
    delete clone[key];
  }
  return clone;
}

export function stripPropsFromValues<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Record<string, Record<string, any>>,
  K extends string,
>(obj: T, propsToRemove: K[]): { [P in keyof T]: Omit<T[P], K> } {
  const result = {} as { [P in keyof T]: Omit<T[P], K> };

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null) {
      const newValue = { ...value };
      for (const prop of propsToRemove) {
        delete newValue[prop];
      }
      // Safe cast because we know newValue is Record<string, any> minus the removed keys
      result[key as keyof T] = newValue as Omit<T[typeof key], K>;
    }
  }

  return result;
}

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function debounce(fn: () => void, delay: number): () => void {
  let timeout: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(fn, delay);
  };
}

/**
 * Runs a synchronous function, logs its elapsed time, and returns the
 * function’s own result.  Works in any browser (uses performance.now()
 * when available, falls back to Date.now()).
 *
 * @param fn     The work to time.  Wrap your statement in an arrow fn.
 * @param label  Optional text to prefix in the console.
 *
 * @example
 *   const answer = withTiming(() => heavyCalc(1_000_000), "heavyCalc");
 *   // ⇒ heavyCalc: 12.8 ms
 */
export function withTiming<T>(fn: () => T, label = "withTiming"): T {
  const now =
    typeof performance !== "undefined" && performance.now
      ? () => performance.now()
      : () => Date.now();

  const t0 = now();
  try {
    return fn();
  } finally {
    const ms = now() - t0;
    console.log(`${label}: ${ms.toFixed(1)} ms`);
  }
}
