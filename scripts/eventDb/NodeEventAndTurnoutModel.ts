import fs from "fs/promises";
import { CityInfo } from "../../src/lib/types";
import { fileExists } from "../../src/lib/util/file";
import { asNormalizedKey } from "../../src/lib/util/string";
import { config } from "./config";
import {
  NodeEventAndTurnoutDb,
  RawProtestEvent,
  RawTurnout,
} from "./NodeEventAndTurnoutDb";
import { FetchedDataType } from "./types";

export class NodeEventAndTurnoutModel {
  private db: NodeEventAndTurnoutDb;

  private constructor(db: NodeEventAndTurnoutDb) {
    this.db = db;
  }

  static async create() {
    const dbPath = config.paths.buildEvents;
    if (await fileExists(dbPath)) {
      await fs.unlink(dbPath);
    }
    const db = NodeEventAndTurnoutDb.create(dbPath);
    db.beginTransaction();
    return new NodeEventAndTurnoutModel(db);
  }

  async close() {
    this.db.commit();
    this.db.close();
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

  private eventOrTurnoutKey(
    type: FetchedDataType,
    eventOrTurnout: RawProtestEvent | RawTurnout
  ) {
    return `${type}:${eventOrTurnout.date}|${eventOrTurnout.name}|${eventOrTurnout.link}|${eventOrTurnout.lat}|${eventOrTurnout.lon}`;
  }

  maybeCreateEventOrTurnout(
    eventOrTurnout: RawProtestEvent | RawTurnout
  ): boolean {
    const db = this.db;
    const eventKey = this.eventOrTurnoutKey(
      eventOrTurnout.type,
      eventOrTurnout
    );
    if (!db.hasSeenEventOrTurnoutKey(eventKey)) {
      if (eventOrTurnout.type === "event") {
        db.insertEvent(eventOrTurnout as RawProtestEvent);
      } else {
        db.insertTurnout(eventOrTurnout as RawTurnout);
      }

      db.addSeenEventOrTurnoutKey(eventKey);
      return true;
    } else {
      return false;
    }
  }
}
