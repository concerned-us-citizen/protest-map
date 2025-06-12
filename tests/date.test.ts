import {
  dateToYYYYMMDDInt,
  normalizeToMMDDYYYY,
  normalizeYearTo2025,
} from "$lib/util/date";
import { describe, expect, it } from "vitest";

describe("date", () => {
  it("generates correct integer format date", async () => {
    const date = new Date(2025, 5, 14);
    const result = dateToYYYYMMDDInt(date);
    expect(result).toBe(20250614);
  });

  it("generates integer date from MM/DD/YYYY", async () => {
    const date = new Date("06/14/2025");
    const result = dateToYYYYMMDDInt(date);
    expect(result).toBe(20250614);
  });

  it("generates correct correct date from string", async () => {
    const first = normalizeToMMDDYYYY("6/14/2025");
    const result = normalizeYearTo2025(first);
    expect(result).toBe("06/14/2025");
  });

  it("normalizes early date", async () => {
    const result = normalizeYearTo2025("06/14/2023");
    expect(result).toBe("06/14/2025");
  });

  it("normalizes late date", async () => {
    const result = normalizeYearTo2025("06/14/2026");
    expect(result).toBe("06/14/2025");
  });

  it("normalizes current year", async () => {
    const result = normalizeYearTo2025("06/14/2025");
    expect(result).toBe("06/14/2025");
  });
});
