import type {
  EventFilter,
  EventMarkerInfoWithId,
  PopulatedEvent,
} from "$lib/types";
import { type BindParams, type Database } from "sql.js";
import initSqlJs from "sql.js";
import { dateToYYYYMMDDInt, yyyymmddIntToDate } from "$lib/util/date";

interface LatestDbManifest {
  dbFilename: string;
  lastUpdated: string;
  sha?: string;
}

export class ClientEventDb {
  private db: Database;
  private manifest: LatestDbManifest;

  constructor(db: Database, manifest: LatestDbManifest) {
    this.db = db;
    this.manifest = manifest;
  }

  getEventMarkerInfos(filter: EventFilter): EventMarkerInfoWithId[] {
    const { date, eventNames } = filter;

    let query = `
      SELECT id, lat, lon, pct_dem_lead
      FROM events
      WHERE date = ?`;
    const params: BindParams = [dateToYYYYMMDDInt(date)];

    if (eventNames && eventNames.length > 0) {
      const placeholders = eventNames.map(() => "?").join(", ");
      query += ` AND name IN (${placeholders})`;
      params.push(...eventNames);
    }

    const stmt = this.db.prepare(query);
    stmt.bind(params);

    const results: EventMarkerInfoWithId[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      const [id, lat, lon, pctDemLead] = row as [
        number,
        number,
        number,
        number | null,
      ];

      results.push({
        eventId: id,
        lat,
        lon,
        pctDemLead,
      });
    }

    stmt.free();
    return results;
  }

  getAllDatesWithEventCounts(): { date: Date; eventCount: number }[] {
    const stmt = this.db.prepare(`
      SELECT date, COUNT(*) as eventCount
      FROM events
      GROUP BY date
      ORDER BY date ASC
    `);

    const results: { date: Date; eventCount: number }[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      const [date, eventCount] = row as [number, number];
      results.push({ date: yyyymmddIntToDate(date), eventCount });
    }

    stmt.free();
    return results;
  }

  getPopulatedEvent(eventMarker: EventMarkerInfoWithId): PopulatedEvent {
    const eventStmt = this.db.prepare(`
      SELECT 
        lat, lon, pct_dem_lead, date, name, link, city_info_id
      FROM events
      WHERE id = ?
    `);

    eventStmt.bind([eventMarker.eventId]);

    if (!eventStmt.step()) {
      eventStmt.free();
      throw new Error(`Event not found for id: ${eventMarker.eventId}`);
    }

    const eventRow = eventStmt.get();
    const [lat, lon, pctDemLead, date, name, link, cityInfoId] = eventRow as [
      number,
      number,
      number | null,
      number,
      string,
      string | null,
      number,
    ];

    eventStmt.free();

    const cityStmt = this.db.prepare(`
      SELECT city, state, city_thumbnail_url, city_article_url
      FROM city_infos
      WHERE id = ?
    `);

    cityStmt.bind([cityInfoId]);

    if (!cityStmt.step()) {
      cityStmt.free();
      throw new Error(`CityInfo not found for id: ${cityInfoId}`);
    }

    const cityRow = cityStmt.get();
    const [city, state, cityThumbnailUrl, cityArticleUrl] = cityRow as [
      string,
      string,
      string,
      string,
    ];

    cityStmt.free();

    return {
      name,
      date: yyyymmddIntToDate(date),
      link,
      lat,
      lon,
      pctDemLead,
      city,
      state,
      cityThumbnailUrl,
      cityArticleUrl,
    };
  }

  getEventNamesAndCountsForDate(date: Date): { name: string; count: number }[] {
    const stmt = this.db.prepare(`
      SELECT name, COUNT(*) as count
      FROM events
      WHERE date = ?
      GROUP BY name
      ORDER BY count DESC
    `);

    stmt.bind([dateToYYYYMMDDInt(date)]);

    const results: { name: string; count: number }[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      const [name, count] = row as [string, number];
      results.push({ name, count });
    }

    stmt.free();
    return results;
  }

  getCreatedAt(): Date {
    const stmt = this.db.prepare(
      `SELECT value FROM meta WHERE key = 'created_at'`
    );
    if (!stmt.step()) {
      stmt.free();
      throw new Error("created_at not found in meta");
    }

    const [createdAt] = stmt.get();
    stmt.free();
    return new Date(createdAt as string);
  }

  async checkIsUpdateAvailable() {
    const newManifest = await ClientEventDb.#fetchManifest();
    return (
      newManifest.dbFilename !== this.manifest.dbFilename ||
      newManifest.sha !== this.manifest.sha
    );
  }

  static async #fetchManifest(): Promise<LatestDbManifest> {
    const manifestRes = await fetch("data/latest.json", { cache: "no-cache" });
    if (!manifestRes.ok) throw new Error(`Failed to load latest.json`);
    return (await manifestRes.json()) as LatestDbManifest;
  }

  static async create(): Promise<ClientEventDb> {
    const manifest = await ClientEventDb.#fetchManifest();

    const dbRes = await fetch(`/data/${manifest.dbFilename}`);
    if (!dbRes.ok)
      throw new Error(`Failed to fetch database file: ${manifest.dbFilename}`);
    const dbBuffer = await dbRes.arrayBuffer();

    const SQL = await initSqlJs({
      locateFile: (file) => `/lib/sqljs/${file}`,
    });
    const db = new SQL.Database(new Uint8Array(dbBuffer));

    return new ClientEventDb(db, manifest);
  }
}
