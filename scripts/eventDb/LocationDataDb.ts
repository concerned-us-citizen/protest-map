import Database, { Statement } from "better-sqlite3";
import { Coordinates, Nullable } from "../../src/lib/types";
import { WikiCityInfo } from "./wikiCityInfo";

export class LocationDataDb {
  private db: Database.Database;

  private addGeocodingStatement: Statement<[string, number, number], void>;
  private getGeocodingStatement: Statement<
    [string],
    { lat: number; lon: number } | undefined
  >;

  private addCityInfoStatement: Statement<[string, string, string], void>;
  private getCityInfoStatement: Statement<
    [string],
    { article_url: string; thumbnail_url: string } | undefined
  >;

  private addBadAddressStatement: Statement<[string], void>;
  private getBadAddressStatement: Statement<[string], string | undefined>;

  private addBadCityStatement: Statement<[string], void>;
  private getBadCityStatement: Statement<[string], string | undefined>;

  private constructor(db: Database.Database) {
    this.db = db;

    this.addGeocodingStatement = this.db.prepare(
      `INSERT INTO geocoding (address_key, lat, lon) VALUES (?, ?, ?)`
    );
    this.getGeocodingStatement = this.db.prepare(
      `SELECT * FROM geocoding WHERE address_key = ?`
    );

    this.addCityInfoStatement = this.db.prepare(
      `INSERT INTO city_info (city_key, article_url, thumbnail_url) VALUES (?, ?, ?)`
    );
    this.getCityInfoStatement = this.db.prepare(
      `SELECT * FROM city_info WHERE city_key = ?`
    );

    this.addBadAddressStatement = this.db.prepare(
      `INSERT OR REPLACE INTO bad_address (address_key) VALUES (?)`
    );
    this.getBadAddressStatement = this.db.prepare(
      `SELECT * FROM bad_address WHERE address_key = ?`
    );

    this.addBadCityStatement = this.db.prepare(
      `INSERT OR REPLACE INTO bad_city (city_key) VALUES (?)`
    );
    this.getBadCityStatement = this.db.prepare(
      `SELECT * FROM bad_city WHERE city_key = ?`
    );
  }

  static create(dbPath: string): LocationDataDb {
    const db = new Database(dbPath);

    db.pragma("synchronous = FULL");
    db.pragma("journal_mode = DELETE", { simple: true });

    db.exec(`CREATE TABLE IF NOT EXISTS geocoding (
      address_key TEXT PRIMARY KEY,
      lat REAL,
      lon REAL
    );`);

    db.exec(`CREATE TABLE IF NOT EXISTS city_info (
      city_key TEXT PRIMARY KEY,
      article_url TEXT, 
      thumbnail_url TEXT
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS bad_address (
      address_key TEXT PRIMARY KEY
    );`);

    db.exec(`CREATE TABLE IF NOT EXISTS bad_city (
      city_key TEXT PRIMARY KEY
    );`);

    return new LocationDataDb(db);
  }

  getGeocoding(address_key: string): Nullable<Coordinates> {
    const result = this.getGeocodingStatement.get(address_key);
    return result ? { lat: result.lat, lon: result.lon } : null;
  }

  addGeocoding(addressKey: string, coordinates: Coordinates) {
    this.addGeocodingStatement.run(
      addressKey,
      coordinates.lat,
      coordinates.lon
    );
  }

  isBadAddress(addressKey: string): boolean {
    const result = this.getBadAddressStatement.get(addressKey);
    return result !== undefined;
  }

  addBadAddress(addressKey: string) {
    this.addBadAddressStatement.run(addressKey);
  }

  isBadCity(cityKey: string): boolean {
    const result = this.getBadCityStatement.get(cityKey);
    return result !== undefined;
  }

  addBadCity(cityKey: string) {
    this.addBadCityStatement.run(cityKey);
  }

  getCityInfo(cityKey: string): Nullable<WikiCityInfo> {
    const result = this.getCityInfoStatement.get(cityKey);
    return result
      ? { articleUrl: result.article_url, thumbnailUrl: result.thumbnail_url }
      : null;
  }

  addCityInfo(cityKey: string, cityInfo: WikiCityInfo) {
    this.addCityInfoStatement.run(
      cityKey,
      cityInfo.articleUrl,
      cityInfo.thumbnailUrl
    );
  }

  beginTransaction() {
    this.db.exec("BEGIN TRANSACTION;");
  }

  commit() {
    this.db.exec("COMMIT;");
  }

  close(): void {
    this.db.close();
  }
}
