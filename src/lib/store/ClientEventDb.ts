import type {
  EventFilterOptions,
  EventMarkerInfoWithId,
  Nullable,
  PopulatedEvent,
  VoterLean,
} from "$lib/types";
import { type Database } from "sql.js";
import { dateToYYYYMMDDInt, yyyymmddIntToDate } from "$lib/util/date";
import { getSqlJs } from "./sqlJsInstance";
import type { Bounds } from "./RegionModel";

interface LatestDbManifest {
  dbFilename: string;
  lastUpdated: string;
  sha?: string;
}

interface QueryBuilder {
  query: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[];
}

export class ClientEventDb {
  private db: Database;
  private manifest: LatestDbManifest;

  constructor(db: Database, manifest: LatestDbManifest) {
    this.db = db;
    this.manifest = manifest;
  }

  private addDateSubquery(date: Date, qb: QueryBuilder) {
    qb.query += `
    date = ?`;
    qb.params.push(dateToYYYYMMDDInt(date));
  }

  private addVoterLeanSubquery(
    voterLeans: VoterLean[] | undefined,
    qb: QueryBuilder
  ) {
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
      qb.query += `
        AND (${subquery.join(" OR ")})`;
    }
  }

  private addVisibleBoundsOnlySubquery(
    visibleBoundsOnly: boolean | undefined,
    bounds: Bounds | undefined,
    qb: QueryBuilder
  ) {
    if (visibleBoundsOnly && bounds) {
      qb.query += `
        AND lon BETWEEN ? AND ?
        AND lat BETWEEN ? AND ?`;
      qb.params.push(bounds.xmin, bounds.xmax, bounds.ymin, bounds.ymax);
    }
  }

  private addSelectedEventNamesSubquery(
    selectedEventNames: string[] | undefined,
    qb: QueryBuilder
  ) {
    if (selectedEventNames && selectedEventNames.length > 0) {
      const placeholders = selectedEventNames.map(() => "?").join(", ");
      qb.query += `
        AND name IN (${placeholders})`;
      qb.params.push(...selectedEventNames);
    }
  }

  getEventMarkerInfos(filter: EventFilterOptions): EventMarkerInfoWithId[] {
    const { date, eventNames, visibleBounds, visibleBoundsOnly, voterLeans } =
      filter;

    const qb: QueryBuilder = {
      query: `
      SELECT id, lat, lon, pct_dem_lead
      FROM events
      WHERE`,
      params: [],
    };

    this.addDateSubquery(date, qb);
    this.addVisibleBoundsOnlySubquery(visibleBoundsOnly, visibleBounds, qb);
    this.addSelectedEventNamesSubquery(eventNames, qb);
    this.addVoterLeanSubquery(voterLeans, qb);

    const stmt = this.db.prepare(qb.query);
    stmt.bind(qb.params);

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
    const { date, visibleBounds, visibleBoundsOnly, voterLeans } = filter;

    const qb: QueryBuilder = {
      query: `
        SELECT name, COUNT(*) as count
        FROM events
        WHERE
      `,
      params: [],
    };

    this.addDateSubquery(date, qb);
    // Note this does NOT include the selectedNames, since that's what this a source for.
    this.addVisibleBoundsOnlySubquery(visibleBoundsOnly, visibleBounds, qb);
    this.addVoterLeanSubquery(voterLeans, qb);

    qb.query += `
      GROUP BY name
      ORDER BY count DESC
    `;

    const stmt = this.db.prepare(qb.query);

    stmt.bind(qb.params);

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
