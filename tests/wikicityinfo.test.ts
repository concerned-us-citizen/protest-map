import { describe, it, expect } from "vitest";
import { fetchWikiCityInfo } from "../../../scripts/eventDb/wikiCityInfo";

describe("wikicity", () => {
  it("finds the wikidata", async () => {
    const result = await fetchWikiCityInfo("Nome", "Alaska");
    expect(result?.articleUrl).toBeDefined();
  });
});
