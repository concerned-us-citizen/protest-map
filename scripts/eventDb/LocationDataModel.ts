import { Nullable } from "../../src/lib/types";
import { LocationInfo } from "./types";
import { geocodeFromService } from "./geocode";
import { ScrapeLogger } from "./ScrapeLogger";
import { LocationDataDb } from "./LocationDataDb";
import { getStateInfo as getStateIdInfo } from "./usStateInfo";
import { Address } from "./types";
import { fetchVotingInfo } from "./votingInfo";
import {
  fallBackCityThumbnailUrl,
  fetchWikiCityInfo,
  WikiCityInfo,
} from "./wikiCityInfo";
import { asNormalizedKey } from "../../src/lib/util/string";

function getCity(sheetAddress: Address) {
  return `${sheetAddress.city}, ${sheetAddress.state}`;
}

function getAddress(sheetAddress: Address) {
  return `${sheetAddress.address ?? ""} ${sheetAddress.city}, ${sheetAddress.state} ${sheetAddress.zip ?? ""} ${sheetAddress.country ?? ""}`;
}

export class LocationDataModel {
  private db: LocationDataDb;
  private logger: ScrapeLogger;

  private constructor(db: LocationDataDb, logger: ScrapeLogger) {
    this.db = db;
    this.logger = logger;
  }

  private addressKey(address: Address) {
    const keys = ["address", "zip", "city", "state", "country"] as const;
    const parts = keys
      .map((key) => {
        const val = address[key];
        // To shut compiler up
        return typeof val === "string" ? val.trim().toLowerCase() : "";
      })
      .filter(Boolean);
    return parts.join("_|_");
  }

  async getLocationInfo(
    address: Address,
    sheetName: string
  ): Promise<Nullable<LocationInfo>> {
    const db = this.db;
    const addressKey = this.addressKey(address);

    const city = address.city;
    let state = address.state;

    // Failed geocoding before?
    if (db.isBadAddress(addressKey)) {
      this.logger.logInvalidEntry(
        address,
        sheetName,
        `Bad address - unable to find geolocation for'${getAddress(address)}' (cached)`
      );
      this.logger.current.badAddresses++;
      return null;
    }

    // Have we seen this address before?
    let coordinates = db.getGeocoding(addressKey);

    // Not available, geocode the address
    if (!coordinates) {
      try {
        coordinates = await geocodeFromService(address);
        this.logger.current.geocodings++;
        this.db.addGeocoding(addressKey, coordinates);
      } catch {
        // Or the failure
        this.db.addBadAddress(addressKey);
        this.logger.logInvalidEntry(
          address,
          sheetName,
          `Bad address - unable to find geolocation for '${getAddress(address)}'`
        );
        this.logger.current.badAddresses++;
        return null;
      }
    }

    const stateIdInfo = getStateIdInfo(state);
    if (!stateIdInfo) {
      this.logger.logInvalidEntry(
        address,
        sheetName,
        `Invalid state name '${state}'`
      );
      this.logger.current.badAddresses++;
    } else {
      state = stateIdInfo.fullName;
    }
    const cityKey = asNormalizedKey(`${city}-${state}`);

    let cityInfo: WikiCityInfo | null = {
      articleUrl: "",
      thumbnailUrl: fallBackCityThumbnailUrl,
    };

    const badCityMsg = `Bad city - could not resolve '${getCity(address)}' on Wikipedia, not rejecting, but may be malformed, and will lack thumbnail and article`;

    // Failed wiki search for city before => use the default
    if (this.db.isBadCity(cityKey)) {
      this.logger.logInvalidEntry(address, sheetName, `${badCityMsg} (cached)`);
      this.logger.current.badCities++;
    } else {
      // Seen city before?
      let fetched = this.db.getCityInfo(cityKey);
      if (fetched) {
        cityInfo = fetched;
      } else {
        // If not, fetch it
        fetched = await fetchWikiCityInfo(city, state);
        this.logger.current.wikiFetches++;
        if (fetched) {
          cityInfo = fetched;
          this.db.addCityInfo(cityKey, cityInfo);
        } else {
          this.logger.logInvalidEntry(address, sheetName, badCityMsg);
          this.logger.current.badCities++;
          this.db.addBadCity(cityKey);
        }
      }
    }

    // Get precinct voting stats
    const voting = fetchVotingInfo(coordinates);

    return {
      ...coordinates,
      city,
      state,
      cityThumbnailUrl: cityInfo.thumbnailUrl,
      cityArticleUrl: cityInfo.articleUrl,
      pctDemLead: voting?.pct_dem_lead,
    };
  }

  static async create(path: string, logger: ScrapeLogger) {
    const db = LocationDataDb.create(path);
    return new LocationDataModel(db, logger);
  }

  async close() {
    this.db.close();
  }
}
