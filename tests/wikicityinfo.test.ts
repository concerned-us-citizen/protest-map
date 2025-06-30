import { describe, it, expect } from "vitest";
import { fetchWikiCityInfo } from "../scripts/eventDb/wikiCityInfo";
import { TestScrapeLogger } from "../scripts/eventDb/ScrapeLogger";

describe("wikicity", () => {
  it("finds the wikidata", async () => {
    const result = await fetchWikiCityInfo(
      "Nome",
      "Alaska",
      new TestScrapeLogger()
    );
    expect(result?.articleUrl).toBeDefined();
  });
});
