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
