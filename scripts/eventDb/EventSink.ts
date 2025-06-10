import fs from "fs/promises";
import { CityInfo, Nullable } from "../../src/lib/types";
import {
  normalizeYearTo2025,
  normalizeToYYYYMMDD,
} from "../../src/lib/util/date";
import { fileExists } from "../../src/lib/util/file";
import {
  toTitleCase,
  isValidZipCode,
  asNormalizedKey,
} from "../../src/lib/util/string";
import { config } from "./config";
import { EventDb } from "./EventDb";
import { logInvalidEvent } from "./issueLog";
import { LocatedDissenterEvent, DissenterEvent } from "./types";

export class EventSink {
  private db: EventDb;

  private constructor(db: EventDb) {
    this.db = db;
  }

  static async create() {
    const dbPath = config.paths.buildEvents;
    if (await fileExists(dbPath)) {
      await fs.unlink(dbPath);
    }
    const db = EventDb.create(dbPath);
    db.beginTransaction();
    return new EventSink(db);
  }

  async close() {
    this.db.commit();
    this.db.close();
  }

  async sanitize(
    dissenterEvent: DissenterEvent
  ): Promise<Nullable<DissenterEvent>> {
    const unnamed = "Unnamed event";
    const badNames = new Set(["None", "No name"]);

    const { name, zip, date, ...rest } = dissenterEvent;

    // 1. Sanitize Name
    let sanitizedName: string;
    if (!name || name === "" || badNames.has(name)) {
      sanitizedName = unnamed;
      logInvalidEvent(dissenterEvent, "Unnamed event");
    } else {
      sanitizedName = toTitleCase(name).trim();
    }

    // 2. Sanitize and Validate Date (critical, skip event if invalid)
    const sanitizedDate = normalizeYearTo2025(normalizeToYYYYMMDD(date));
    if (!sanitizedDate) {
      logInvalidEvent(dissenterEvent, `Bad date '${date}'`);
      return null; // Skip event if date is invalid
    }

    // 3. Sanitize and Validate Zip (warn only)
    let sanitizedZip = zip?.trim();
    if (!isValidZipCode(sanitizedZip)) {
      logInvalidEvent(dissenterEvent, `Bad zipcode '${sanitizedZip}'`);
      sanitizedZip = "";
    }

    // Return the sanitized raw event
    return {
      name: sanitizedName,
      zip: sanitizedZip,
      date: sanitizedDate,
      ...rest,
    };
  }

  private cityInfoKey(cityInfo: CityInfo) {
    return asNormalizedKey(`${cityInfo.city}-${cityInfo.state}`);
  }

  getOrCreateCityInfo(newCityInfo: CityInfo): number {
    const db = this.db;
    const cityInfoKey = this.cityInfoKey(newCityInfo);
    let cityInfoId: number;
    if (db.hasSeenCityInfoKey(cityInfoKey)) {
      cityInfoId = db.getSeenCityInfoIdForKey(cityInfoKey);
    } else {
      cityInfoId = db.insertCityInfo(newCityInfo);
      db.addSeenCityInfoKeyAndId(cityInfoKey, cityInfoId);
    }
    return cityInfoId;
  }

  private eventKey(event: LocatedDissenterEvent) {
    return `${event.date}|${event.name}|${event.link}|${event.lat}|${event.lon}`;
  }

  maybeCreateEvent(event: LocatedDissenterEvent): void {
    const db = this.db;
    const eventKey = this.eventKey(event);
    if (!db.hasSeenEventKey(eventKey)) {
      db.insertEvent(event);
      db.addSeenEventKey(eventKey);
    }
  }
}
