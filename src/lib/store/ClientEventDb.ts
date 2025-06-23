import type {
  EventMarkerInfoWithId,
  Nullable,
  PopulatedEvent,
  VoterLean,
  VoterLeanCounts,
} from "$lib/types";
import type { EventFilterOptions } from "./FilteredEventModel.svelte";
import { type Database, type SqlValue } from "sql.js";
import { dateToYYYYMMDDInt, yyyymmddIntToDate } from "$lib/util/date";
import { getSqlJs } from "./sqlJsInstance";
import type { NamedRegion } from "./RegionModel";

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

  getEventMarkerInfos(filter: EventFilterOptions): EventMarkerInfoWithId[] {
    const { date, eventNames, namedRegion, voterLeans } = filter;

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT id, lat, lon, pct_dem_lead
      FROM events
      ${whereClause}`
    );

    builder.addDateSubquery(date);
    builder.addVoterLeanSubquery(voterLeans);
    builder.addSelectedEventNamesSubquery(eventNames);
    builder.addNamedRegionOnlySubquery(namedRegion);

    const stmt = builder.createStatement(this.db);

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

  getVoterLeanCounts(filter: EventFilterOptions): VoterLeanCounts {
    const { date, namedRegion } = filter;
    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT
          SUM(CASE WHEN pct_dem_lead <  0 THEN 1 ELSE 0 END) AS trump,
          SUM(CASE WHEN pct_dem_lead >  0 THEN 1 ELSE 0 END) AS harris,
          SUM(CASE WHEN pct_dem_lead IS NULL THEN 1 ELSE 0 END) AS unavailable
        FROM events
        ${whereClause}
`
    );
    builder.addDateSubquery(date);
    builder.addNamedRegionOnlySubquery(namedRegion);
    const stmt = builder.createStatement(this.db);
    if (!stmt.step()) {
      throw new Error("Nothing returned for voter lean counts");
    }

    const [trump, harris, unavailable] = stmt.get();
    return {
      trump: (trump ?? 0) as number,
      harris: (harris ?? 0) as number,
      unavailable: (unavailable ?? 0) as number,
    };
  }

  getDatesWithEventCounts(
    filter: EventFilterOptions
  ): { date: Date; eventCount: number }[] {
    const { eventNames, namedRegion, voterLeans } = filter;

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT date, COUNT(*) as eventCount
      FROM events
      ${whereClause}
      GROUP BY date
      ORDER BY date ASC
    `
    );

    builder.addNamedRegionOnlySubquery(namedRegion);
    builder.addSelectedEventNamesSubquery(eventNames);
    builder.addVoterLeanSubquery(voterLeans);

    const stmt = builder.createStatement(this.db);

    const results: { date: Date; eventCount: number }[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      const [date, eventCount] = row as [number, number];
      results.push({ date: yyyymmddIntToDate(date), eventCount });
    }

    stmt.free();
    return results;
  }

  getPopulatedEvent(eventId: number): Nullable<PopulatedEvent> {
    if (!eventId) {
      return null;
    }

    const eventStmt = this.db.prepare(`
      SELECT 
        lat, lon, pct_dem_lead, date, name, link, city_info_id
      FROM events
      WHERE id = ?
    `);

    eventStmt.bind([eventId]);

    if (!eventStmt.step()) {
      eventStmt.free();
      throw new Error(`Event not found for id: ${eventId}`);
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

  getEventNamesAndCountsForFilter(
    filter: EventFilterOptions
  ): { name: string; count: number }[] {
    const { date, namedRegion, voterLeans } = filter;

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT name, COUNT(*) as count
      FROM events
      ${whereClause}
      GROUP BY name
      ORDER BY count DESC
      `
    );

    builder.addDateSubquery(date);
    // Note this doesn't include the selectedNames, since that's what this is a source for.
    builder.addNamedRegionOnlySubquery(namedRegion);
    builder.addVoterLeanSubquery(voterLeans);

    const stmt = builder.createStatement(this.db);

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

    const SQL = await getSqlJs();
    const db = new SQL.Database(new Uint8Array(dbBuffer));

    return new ClientEventDb(db, manifest);
  }
}

class QueryBuilder {
  #whereClause = "";
  #params: SqlValue[] = [];
  #templateFunc: (_whereClause: string) => string;

  addDateSubquery(date: Date | undefined) {
    if (date) {
      this.appendSubquery(`date = ?`);
      this.#params.push(dateToYYYYMMDDInt(date));
    }
  }

  addVoterLeanSubquery(voterLeans: VoterLean[] | undefined) {
    if (voterLeans && voterLeans.length > 0) {
      const subquery: string[] = [];
      for (const voterLean of voterLeans) {
        switch (voterLean) {
          case "trump":
            subquery.push("pct_dem_lead < 0");
            break;
          case "harris":
            subquery.push("pct_dem_lead > 0");
            break;
          case "unavailable":
            subquery.push("pct_dem_lead IS NULL");
            break;
        }
      }
      this.appendSubquery(`(${subquery.join(" OR ")})`);
    }
  }

  addNamedRegionOnlySubquery(namedRegion: NamedRegion | undefined) {
    if (namedRegion) {
      this.appendSubquery(`lon BETWEEN ? AND ? AND lat BETWEEN ? AND ?`);
      this.#params.push(
        namedRegion.xmin,
        namedRegion.xmax,
        namedRegion.ymin,
        namedRegion.ymax
      );
    }
  }

  addSelectedEventNamesSubquery(selectedEventNames: string[] | undefined) {
    if (selectedEventNames && selectedEventNames.length > 0) {
      const placeholders = selectedEventNames.map(() => "?").join(", ");
      this.appendSubquery(`name IN (${placeholders})`);
      this.#params.push(...selectedEventNames);
    }
  }

  private appendSubquery(sub: string) {
    if (this.#whereClause.length > 0) {
      this.#whereClause += "\nAND ";
    }
    this.#whereClause += sub;
  }

  get fullWhereClause() {
    return this.#whereClause.length > 0
      ? `
    WHERE\n${this.#whereClause}
    `
      : "";
  }

  get params() {
    return this.#params;
  }

  createStatement(db: Database) {
    const query = this.#templateFunc(this.fullWhereClause);
    try {
      const stmt = db.prepare(query);
      stmt.bind(this.params);
      return stmt;
    } catch (err) {
      console.error(`Failed to build sql statement ${query}`, err);
      throw err;
    }
  }

  constructor(templateFunc: (_whereClause: string) => string) {
    this.#templateFunc = templateFunc;
  }
}
