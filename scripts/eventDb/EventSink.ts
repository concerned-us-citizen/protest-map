import fs from "fs/promises";
import { LocationInfo, Nullable } from "../../src/lib/types";
import {
  normalizeYearTo2025,
  normalizeToYYYYMMDD,
} from "../../src/lib/util/date";
import { fileExists } from "../../src/lib/util/file";
import { toTitleCase, isValidZipCode } from "../../src/lib/util/string";
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
  private locationInfoKey(locationInfo: LocationInfo) {
    const parts = ["address", "zip", "city", "state", "country"]
      .map((prop) => (locationInfo[prop] || "").trim().toLowerCase())
      .filter(Boolean);
    return parts.join("_|_");
  }

  getOrCreateLocationInfo(newLocationInfo: LocationInfo): number {
    const db = this.db;
    const locationInfoKey = this.locationInfoKey(newLocationInfo);
    let locationInfoId: number;
    if (db.hasSeenLocationInfoKey(locationInfoKey)) {
      locationInfoId = db.getSeenLocationInfoIdForKey(locationInfoKey);
    } else {
      locationInfoId = db.insertLocationInfo(newLocationInfo);
      db.addSeenLocationInfoKeyAndId(locationInfoKey, locationInfoId);
    }
    return locationInfoId;
  }

  private eventKey(event: LocatedDissenterEvent) {
    return `${event.date}|${event.name}|${event.link}|${event.locationInfoId}`;
  }

  maybeCreateEvent(event: LocatedDissenterEvent): void {
    const db = this.db;
    const eventKey = this.eventKey(event);
    if (!db.hasSeenEventKey(eventKey)) {
      db.insertEvent({
        lat: event.lat,
        lon: event.lon,
        date: event.date,
        name: event.name,
        link: event.link,
        locationInfoId: event.locationInfoId,
      });

      db.addSeenEventKey(eventKey);
    }
  }
}
