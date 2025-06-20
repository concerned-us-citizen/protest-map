export function nearlyEqual(a: number, b: number, epsilon = 1e-10): boolean {
  return Math.abs(a - b) < epsilon;
}
