import { LocationInfo, Nullable } from "../../src/lib/types";
import { fetchEventLinkLocationInfo } from "./eventLinkLocationInfo";
import { geocodeFromService } from "./geocode";
import { logInvalidEvent } from "./IssueLog";
import { CachedLocationDataDb } from "./CachedLocationDataDb";
import { getStateInfo as getStateIdInfo } from "./usStateInfo";
import { DissenterEvent } from "./types";
import { fetchVotingInfo } from "./votingInfo";
import { fetchWikiCityInfo } from "./wikiCityInfo";
import { asNormalizedKey } from "../../src/lib/util/string";
import { config } from "./config";

function getCity(dissenterEvent: DissenterEvent) {
  return `${dissenterEvent.city}, ${dissenterEvent.state}`;
}

function getAddress(dissenterEvent: DissenterEvent) {
  return `${dissenterEvent.address} ${dissenterEvent.city}, ${dissenterEvent.state} ${dissenterEvent.zip ?? ""} ${dissenterEvent.country ?? ""}`;
}

export class LocationDataSource {
  private db: CachedLocationDataDb;
  cityInfoFetchCount = 0;
  geocodeFetchCount = 0;

  private constructor(db: CachedLocationDataDb) {
    this.db = db;
  }

  private addressKey(event: DissenterEvent) {
    const keys = ["address", "zip", "city", "state", "country"] as const;
    const parts = keys
      .map((key) => {
        const val = event[key];
        // To shut compiler up
        return typeof val === "string" ? val.trim().toLowerCase() : "";
      })
      .filter(Boolean);
    return parts.join("_|_");
  }

  async getLocationInfo(
    dissenterEvent: DissenterEvent
  ): Promise<Nullable<LocationInfo>> {
    const db = this.db;
    const addressKey = this.addressKey(dissenterEvent);

    let name = "";
    let city = dissenterEvent.city;
    let state = dissenterEvent.state;

    // Failed geocoding before?
    if (db.isBadAddress(addressKey)) {
      logInvalidEvent(
        dissenterEvent,
        `Bad address '${getAddress(dissenterEvent)}' (cached)`
      );
      return null;
    }

    // Have we seen this address before?
    let coordinates = db.getGeocoding(addressKey);

    // See if we can get coordinates (and better location names) from the event link
    // TODO will want to cache this, add a table to CachedLocationDataDb.
    if (!coordinates && config.scrapeEventLinks) {
      // Get most specific info from the event link if possible
      const eventLinkLocationInfo = await fetchEventLinkLocationInfo(
        dissenterEvent.link
      );
      coordinates = eventLinkLocationInfo?.coordinates ?? null;
      name = eventLinkLocationInfo?.name ?? "";
      city = city ?? eventLinkLocationInfo?.city;
      state = state ?? eventLinkLocationInfo?.state;
    }

    // Not available, geocode the address
    if (!coordinates) {
      try {
        coordinates = await geocodeFromService(dissenterEvent);
        this.geocodeFetchCount++;
        this.db.addGeocoding(addressKey, coordinates);
      } catch {
        // Or the failure
        this.db.addBadAddress(addressKey);
        logInvalidEvent(
          dissenterEvent,
          `Bad address '${getAddress(dissenterEvent)}'`
        );
        return null;
      }
    }

    const stateIdInfo = getStateIdInfo(state);
    if (!stateIdInfo) {
      logInvalidEvent(dissenterEvent, `Invalid state name '${state}'`);
    } else {
      state = stateIdInfo.fullName;
    }
    const cityKey = asNormalizedKey(`${city}-${state}`);

    // Failed wiki search for city before?
    if (this.db.isBadCity(cityKey)) {
      logInvalidEvent(
        dissenterEvent,
        `Bad city '${getCity(dissenterEvent)}' (cached)`
      );
      return null;
    }

    // Seen city before?
    let cityInfo = this.db.getCityInfo(cityKey);
    if (!cityInfo) {
      cityInfo = await fetchWikiCityInfo(city, state);
      this.cityInfoFetchCount++;
      if (!cityInfo) {
        logInvalidEvent(
          dissenterEvent,
          `Bad city '${getCity(dissenterEvent)}'`
        );
        this.db.addBadCity(cityKey);
        return null;
      }
      this.db.addCityInfo(cityKey, cityInfo);
    }

    // Get precinct voting stats
    const voting = fetchVotingInfo(coordinates);

    return {
      ...coordinates,
      name,
      city,
      state,
      cityThumbnailUrl: cityInfo.thumbnailUrl,
      cityArticleUrl: cityInfo.articleUrl,
      pctDemLead: voting?.pct_dem_lead,
    };
  }

  static async create(path: string) {
    const db = CachedLocationDataDb.create(path);
    return new LocationDataSource(db);
  }

  async close() {
    this.db.close();
  }
}
