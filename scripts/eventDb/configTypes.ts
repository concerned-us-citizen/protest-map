export type Dirs = {
  build: string;
  release: string;
};

export type Files = {
  locationCache: string;
  events: string;
  log: string;
};

// Only expose the paths that make sense
export type PathKeys =
  | "buildLocationCache"
  | "buildPrecinctsSpatialIndex"
  | "buildEvents"
  | "buildLog"
  | "releaseEvents";

export type Paths = Record<PathKeys, string>;

export type AppConfig = {
  scrapeEventLinks: boolean;
  userAgent: string;
  dirs: Dirs;
  files: Files;
  paths: Paths;
};
