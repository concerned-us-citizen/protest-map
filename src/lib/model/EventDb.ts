import type {
  MarkerType,
  Nullable,
  PopulatedMarker,
  PopulatedProtestEventMarker,
  PopulatedTurnoutMarker,
  ProtestEventMarker,
  TurnoutEstimate,
  TurnoutMarker,
  VoterLean,
  VoterLeanCounts,
} from "$lib/types";
import type { FilterOptions } from "./FilterModel.svelte";
import { type Database, type SqlValue } from "sql.js";
import { dateToYYYYMMDDInt, yyyymmddIntToDate } from "$lib/util/date";
import { getSqlJs } from "./sqlJsInstance";
import type { NamedRegion } from "./RegionModel.svelte";

interface LatestDbManifest {
  dbFilename: string;
  lastUpdated: string;
  sha?: string;
}

export class EventDb {
  private db: Database;
  private manifest: LatestDbManifest;

  constructor(db: Database, manifest: LatestDbManifest) {
    this.db = db;
    this.manifest = manifest;
  }

  getMarkers(filter: FilterOptions): (ProtestEventMarker | TurnoutMarker)[] {
    const { markerType, date, eventNames, namedRegion, voterLeans } = filter;

    const selectFields = ["id", "lat", "lon", "pct_dem_lead"];
    if (markerType === "turnout") {
      selectFields.push("low", "high");
    }

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT ${selectFields.join(", ")}
      FROM ${markerType}s
      ${whereClause}`
    );

    builder.addDateSubquery(date);
    builder.addVoterLeanSubquery(voterLeans);
    builder.addSelectedEventNamesSubquery(eventNames);
    builder.addNamedRegionOnlySubquery(namedRegion);

    const stmt = builder.createStatement(this.db);

    const results: (ProtestEventMarker | TurnoutMarker)[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      const [id, lat, lon, pctDemLead, low, high] = row as [
        number,
        number,
        number,
        number | null,
        number | undefined,
        number | undefined,
      ];

      if (markerType === "turnout") {
        results.push({
          type: "turnout",
          id,
          lat,
          lon,
          pctDemLead,
          high: high as number,
          low: low as number,
        } satisfies TurnoutMarker);
      } else {
        results.push({
          type: "event",
          id,
          lat,
          lon,
          pctDemLead,
        } satisfies ProtestEventMarker);
      }
    }

    stmt.free();
    return results;
  }

  private getCountSourceSql(
    markerType: MarkerType,
    TurnoutEstimate: TurnoutEstimate
  ) {
    if (markerType === "event") {
      return "1"; // This will yield the count of rows
    } else if (TurnoutEstimate === "average") {
      return "(low + high) / 2.0";
    } else {
      return TurnoutEstimate; // low or high
    }
  }

  getVoterLeanCounts(filter: FilterOptions): VoterLeanCounts {
    const {
      markerType,
      TurnoutEstimate,
      date,
      eventNames,
      namedRegion,
      voterLeans,
    } = filter;

    const countSource = this.getCountSourceSql(markerType, TurnoutEstimate);

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT
          SUM(CASE WHEN pct_dem_lead <  0 THEN ${countSource} ELSE 0 END) AS trump,
          SUM(CASE WHEN pct_dem_lead >  0 THEN ${countSource} ELSE 0 END) AS harris,
          SUM(CASE WHEN pct_dem_lead IS NULL THEN ${countSource} ELSE 0 END) AS unavailable
        FROM ${markerType}s
        ${whereClause}
`
    );
    builder.addDateSubquery(date);
    builder.addVoterLeanSubquery(voterLeans);
    builder.addSelectedEventNamesSubquery(eventNames);
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

  getCount(filter: FilterOptions): number {
    const {
      date,
      markerType,
      TurnoutEstimate,
      eventNames,
      namedRegion,
      voterLeans,
    } = filter;

    const countSource = this.getCountSourceSql(markerType, TurnoutEstimate);

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT SUM(${countSource}) as count
      FROM ${markerType}s
      ${whereClause}
      LIMIT 1
    `
    );
    builder.addDateSubquery(date);
    builder.addNamedRegionOnlySubquery(namedRegion);
    builder.addSelectedEventNamesSubquery(eventNames);
    builder.addVoterLeanSubquery(voterLeans);

    const stmt = builder.createStatement(this.db);

    stmt.step();
    const row = stmt.get();
    const [count] = row as [number];

    stmt.free();
    return count ?? 0;
  }

  getDatesWithCounts(filter: FilterOptions): { date: Date; count: number }[] {
    const { markerType, TurnoutEstimate, eventNames, namedRegion, voterLeans } =
      filter;

    const countSource = this.getCountSourceSql(markerType, TurnoutEstimate);

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT date, SUM(${countSource}) as count
      FROM ${markerType}s
      ${whereClause}
      GROUP BY date
      ORDER BY date ASC
    `
    );

    builder.addNamedRegionOnlySubquery(namedRegion);
    builder.addSelectedEventNamesSubquery(eventNames);
    builder.addVoterLeanSubquery(voterLeans);

    const stmt = builder.createStatement(this.db);

    const results: { date: Date; count: number }[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      const [date, count] = row as [number, number];
      results.push({ date: yyyymmddIntToDate(date), count });
    }

    stmt.free();
    return results;
  }

  getPopulatedMarker(
    id: number,
    markerType: MarkerType
  ): Nullable<PopulatedMarker> {
    if (!id) {
      return null;
    }

    const selectFields = [
      "lat",
      "lon",
      "pct_dem_lead",
      "date",
      "name",
      "link",
      "city_info_id",
    ];
    if (markerType === "turnout") {
      selectFields.push("low", "high", "coverage_url");
    }

    const stmt = this.db.prepare(`
      SELECT ${selectFields.join(", ")}
      FROM ${markerType}s
      WHERE id = ?
    `);

    stmt.bind([id]);

    if (!stmt.step()) {
      stmt.free();
      throw new Error(`Marker not found for id: ${id}`);
    }

    const row = stmt.get();
    const [
      lat,
      lon,
      pctDemLead,
      date,
      name,
      link,
      cityInfoId,
      low,
      high,
      coverageUrl,
    ] = row as [
      number,
      number,
      number | null,
      number,
      string,
      string | null,
      number,
      number | undefined,
      number | undefined,
      string | undefined,
    ];

    stmt.free();

    const cityInfo = this.getCityInfo(cityInfoId);

    const populatedMarker = {
      id,
      name,
      date: yyyymmddIntToDate(date),
      link,
      lat,
      lon,
      pctDemLead,
      ...cityInfo,
    };

    if (markerType === "turnout") {
      return {
        ...populatedMarker,
        type: "turnout",
        low: low as number,
        high: high as number,
        coverageUrl: coverageUrl as string,
      } satisfies PopulatedTurnoutMarker;
    } else {
      return {
        ...populatedMarker,
        type: "event",
      } satisfies PopulatedProtestEventMarker;
    }
  }

  getCityInfo(cityInfoId: number) {
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
      city,
      state,
      cityThumbnailUrl,
      cityArticleUrl,
    };
  }

  getEventNamesAndCountsForFilter(
    filter: FilterOptions
  ): { name: string; count: number }[] {
    const {
      markerType,
      TurnoutEstimate,
      date,
      namedRegion,
      eventNames,
      voterLeans,
    } = filter;

    const builder = new QueryBuilder(
      (whereClause) => `
      SELECT name, SUM(${this.getCountSourceSql(markerType, TurnoutEstimate)}) as count
      FROM ${markerType}s
      ${whereClause}
      GROUP BY name
      ORDER BY count DESC
      `
    );

    builder.addDateSubquery(date);
    builder.addSelectedEventNamesSubquery(eventNames);
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
    const newManifest = await EventDb.#fetchManifest();
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

  static async create(): Promise<EventDb> {
    const manifest = await EventDb.#fetchManifest();

    const dbRes = await fetch(`/data/${manifest.dbFilename}`);
    if (!dbRes.ok)
      throw new Error(`Failed to fetch database file: ${manifest.dbFilename}`);
    const dbBuffer = await dbRes.arrayBuffer();

    const SQL = await getSqlJs();
    const db = new SQL.Database(new Uint8Array(dbBuffer));

    return new EventDb(db, manifest);
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
