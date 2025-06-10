import Database, { Statement } from "better-sqlite3";
import { CityInfo, ProtestEvent } from "../../src/lib/types";

export class EventDb {
  private db: Database.Database;
  private insertEventStatement: Statement<unknown[], unknown>;
  private insertCityInfoStatement: Statement<unknown[], unknown>;

  private hasSeenEventStatement: Statement<
    [string],
    { "1": number } | undefined
  >;
  private addSeenEventStatement: Statement<[string], void>;

  private hasSeenCityInfoStatement: Statement<
    [string],
    { "1": number } | undefined
  >;
  private getSeenCityInfoStatement: Statement<
    [string],
    { city_info_id: number } | undefined
  >;
  private addSeenCityInfoStatement: Statement<[string, number], void>;

  private constructor(db: Database.Database) {
    this.db = db;

    this.insertEventStatement = db.prepare(
      "INSERT INTO events (lat, lon, pct_dem_lead, date, name, link, city_info_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    this.insertCityInfoStatement = db.prepare(
      "INSERT INTO city_infos (city, state, city_thumbnail_url, city_article_url) VALUES (?, ?, ?, ?)"
    );

    this.hasSeenEventStatement = this.db.prepare(
      "SELECT 1 FROM seen_events WHERE event_key = ?"
    );
    this.addSeenEventStatement = this.db.prepare(
      "INSERT OR IGNORE INTO seen_events (event_key) VALUES (?)"
    );

    this.hasSeenCityInfoStatement = this.db.prepare(
      "SELECT 1 FROM seen_city_infos WHERE city_info_key = ?"
    );
    this.getSeenCityInfoStatement = this.db.prepare(
      "SELECT city_info_id FROM seen_city_infos WHERE city_info_key = ?"
    );
    this.addSeenCityInfoStatement = this.db.prepare(
      "INSERT OR IGNORE INTO seen_city_infos (city_info_key, city_info_id) VALUES (?, ?)"
    );
  }

  static create(dbPath: string): EventDb {
    console.log("Creating SQLite database...");
    try {
      const db = new Database(dbPath);

      db.pragma("synchronous = FULL");
      db.pragma("journal_mode = DELETE", { simple: true });

      db.exec(`CREATE TABLE city_infos (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              city TEXT,
              state TEXT,
              city_thumbnail_url TEXT,
              city_article_url TEXT
          );
      `);

      db.exec(`CREATE TABLE events (
              lat REAL NOT NULL,
              lon REAL NOT NULL,
              pct_dem_lead REAL,
              date TEXT NOT NULL,
              name TEXT NOT NULL,
              link TEXT,
              city_info_id INTEGER,
              FOREIGN KEY (city_info_id) REFERENCES city_infos(id)
          );
      `);

      db.exec(`CREATE INDEX idx_events_date ON events(date);`);
      db.exec(`CREATE INDEX idx_events_name ON events(name)`);

      db.exec(`
        CREATE TEMPORARY TABLE seen_events (
          event_key TEXT PRIMARY KEY
        );
      `);

      db.exec(`
        CREATE TEMPORARY TABLE seen_city_infos (
          city_info_key TEXT PRIMARY KEY,
          city_info_id INTEGER
        );
      `);

      db.exec(`CREATE TABLE meta (
              key TEXT PRIMARY KEY,
              value TEXT
            );`);

      const now = new Date().toISOString();
      db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").run(
        "created_at",
        now
      );

      return new EventDb(db);
    } catch (err) {
      console.error("Error creating database:", err);
      throw err;
    }
  }

  insertEvent(event: ProtestEvent) {
    const result = this.insertEventStatement.run(
      event.lat,
      event.lon,
      event.pctDemLead,
      event.date,
      event.name,
      event.link,
      event.cityInfoId
    );
    return Number(result.lastInsertRowid);
  }

  hasSeenEventKey(eventKey: string): boolean {
    const row = this.hasSeenEventStatement.get(eventKey);
    return !!row;
  }

  addSeenEventKey(eventKey: string): number {
    const result = this.addSeenEventStatement.run(eventKey);
    return Number(result.lastInsertRowid);
  }

  hasSeenCityInfoKey(cityInfoKey: string): boolean {
    const row = this.hasSeenCityInfoStatement.get(cityInfoKey);
    return !!row;
  }

  getSeenCityInfoIdForKey(cityInfoKey: string): number {
    const result = this.getSeenCityInfoStatement.get(cityInfoKey);

    if (!result) {
      throw new Error(`City info key not found: ${cityInfoKey}`);
    }
    return result.city_info_id as number;
  }

  addSeenCityInfoKeyAndId(cityInfoKey: string, id: number): number {
    const result = this.addSeenCityInfoStatement.run(cityInfoKey, id);
    return Number(result.lastInsertRowid);
  }

  insertCityInfo(info: CityInfo) {
    const result = this.insertCityInfoStatement.run(
      info.city,
      info.state,
      info.cityThumbnailUrl,
      info.cityArticleUrl
    );
    return Number(result.lastInsertRowid);
  }

  beginTransaction() {
    this.db.exec("BEGIN TRANSACTION;");
  }

  commit() {
    this.db.exec("COMMIT;");
  }

  close() {
    this.db.close();
  }
}
