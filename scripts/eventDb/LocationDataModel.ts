import { Coordinates, Nullable } from "../../src/lib/types";
import { geocodeFromService } from "./geocode";
import { ScrapeLogger } from "./ScrapeLogger";
import { LocationDataDb } from "./LocationDataDb";
import { LocationInfo, Address } from "../../src/lib/stats/types";
import { fetchVotingInfo } from "./votingInfo";
import { fetchWikiCityInfo, WikiCityInfo } from "./wikiCityInfo";
import { asNormalizedKey } from "../../src/lib/util/string";
import { fallBackCityThumbnailUrl } from "../../src/lib/images";

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
    const state = address.state;

    const cityKey = asNormalizedKey(`${city}-${state}`);

    let cityInfo: WikiCityInfo = {
      title: `${city}, ${state}`,
      articleUrl: "",
      thumbnailUrl: fallBackCityThumbnailUrl,
    };

    // Failed wiki search for city before => use the default
    if (this.db.isBadCity(cityKey)) {
      await this.logger.logIssue(
        "cityOrState",
        address,
        sheetName,
        getCity(address)
      );
    } else {
      // Seen city before?
      let fetched = this.db.getCityInfo(cityKey);
      if (fetched) {
        cityInfo = fetched;
      } else {
        // If not, fetch it
        console.log(`Fetching wiki data for ${city}, ${state}...`);
        fetched = await fetchWikiCityInfo(city, state);
        this.logger.current.wikiFetches++;
        if (fetched) {
          cityInfo = fetched;
          this.db.addCityInfo(cityKey, cityInfo);
        } else {
          await this.logger.logIssue(
            "cityOrState",
            address,
            sheetName,
            getCity(address)
          );
          this.db.addBadCity(cityKey);
        }
      }
    }

    let coordinates: Coordinates | null;

    // If we have a more specific address than just a city and state,
    // or the cityInfo doesn't provide coordinates, geocode.
    if (address.address || address.zip || !cityInfo.lat || !cityInfo.lon) {
      // Failed geocoding before?
      if (db.isBadAddress(addressKey)) {
        await this.logger.logIssue(
          "address",
          address,
          sheetName,
          `${getAddress(address)}`
        );
        return null;
      }

      // Have we seen this address before?
      coordinates = db.getGeocoding(addressKey);

      // Not seen, geocode the address
      if (!coordinates) {
        try {
          coordinates = await geocodeFromService(address);
          this.logger.current.geocodings++;
          this.db.addGeocoding(addressKey, coordinates);
        } catch {
          this.db.addBadAddress(addressKey);
          await this.logger.logIssue(
            "address",
            address,
            sheetName,
            `${getAddress(address)}`
          );
          return null;
        }
      }
    } else {
      coordinates = { lat: cityInfo.lat, lon: cityInfo.lon };
    }

    // Get precinct voting stats
    const voting = fetchVotingInfo(coordinates);

    return {
      ...coordinates,
      cityName: cityInfo.title,
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
