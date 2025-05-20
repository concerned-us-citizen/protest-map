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
