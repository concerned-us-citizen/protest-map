import { describe, expect, it } from "vitest";
import { geocodeFromService } from "./geocode";

// Used for testing city lookups
describe("geocode", () => {
  it("fetches the geocode", async () => {
    const result = await geocodeFromService({
      address: "",
      zip: "22901",
      city: "Charlotteville",
      state: "Virginia",
      country: "",
    });
    console.log(`result ${JSON.stringify(result, null, 2)}`);
    expect(result).toBeDefined();
  });
});
