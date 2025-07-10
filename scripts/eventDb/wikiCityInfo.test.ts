import { describe, expect, it } from "vitest";
import { fetchWikiCityInfo } from "./wikiCityInfo";

// Used for testing city lookups
describe("wikiCityInfo", () => {
  it("fetches the url and image", async () => {
    const city = "Greenboro";
    const state = "NC";
    const result = await fetchWikiCityInfo(city, state);
    console.log(`result ${JSON.stringify(result, null, 2)}`);
    expect(result).toBeDefined();
  });
});
