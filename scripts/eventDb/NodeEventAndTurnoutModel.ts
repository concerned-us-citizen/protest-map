import fs from "fs/promises";
import { CityInfo } from "../../src/lib/types";
import { fileExists } from "../../src/lib/util/file";
import { asNormalizedKey } from "../../src/lib/util/string";
import { config } from "./config";
import { NodeEventAndTurnoutDb } from "./NodeEventAndTurnoutDb";
import type {
  FetchedDataType,
  RawProtestEvent,
  RawTurnout,
} from "../../src/lib/stats/types";
import { NodeRegionModel } from "./NodeRegionModel";

export class NodeEventAndTurnoutModel {
  private db: NodeEventAndTurnoutDb;
  private regionModel: NodeRegionModel;

  private constructor(db: NodeEventAndTurnoutDb, regionModel: NodeRegionModel) {
    this.db = db;
    this.regionModel = regionModel;
  }

  static async create() {
    const dbPath = config.paths.buildEvents;
    if (await fileExists(dbPath)) {
      await fs.unlink(dbPath);
    }
    const db = NodeEventAndTurnoutDb.create(dbPath);
    const regionModel = await NodeRegionModel.create();
    return new NodeEventAndTurnoutModel(db, regionModel);
  }

  async close() {
    this.db.close();
  }

  private cityInfoKey(cityInfo: CityInfo) {
    return asNormalizedKey(cityInfo.cityName);
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
      let id: number;
      if (eventOrTurnout.type === "event") {
        id = db.insertEvent(eventOrTurnout as RawProtestEvent);
      } else {
        id = db.insertTurnout(eventOrTurnout as RawTurnout);
      }

      db.addSeenEventOrTurnoutKey(eventKey);

      const regionIdsForEventOrTurnout =
        this.regionModel.getRegionIdsContaining(
          eventOrTurnout.lat,
          eventOrTurnout.lon
        );
      for (const regionId of regionIdsForEventOrTurnout) {
        if (eventOrTurnout.type === "event") {
          db.insertEventRegion(id, regionId);
        } else {
          db.insertTurnoutRegion(id, regionId);
        }
      }
      return true;
    } else {
      return false;
    }
  }

  createSummaries() {
    this.db.createDateSummaryTable();
  }
}
