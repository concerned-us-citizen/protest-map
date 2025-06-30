import { describe, expect, it } from "vitest";
import { processTurnoutDataProps } from "./processTurnoutDataProps";
import { fetchData } from "./fetchAndProcessData";
import { processEventDataProps } from "./processEventDataProps";

// Used for debugging turnout scraping
describe("retrieve turnout csv", () => {
  it("should get more than one turnout", async () => {
    const props = processTurnoutDataProps;
    const { sheets, rowCount } = await fetchData(props);
    expect(sheets.length > 0);
    expect(rowCount > 0);
  });
});

// Used for debugging event scraping
describe("retrieve event csv", () => {
  it("should get more than one event", async () => {
    const props = processEventDataProps;
    const { sheets, rowCount } = await fetchData(props);
    expect(sheets.length > 0);
    expect(rowCount > 0);
  });
});
