export type Event = {
  name: string;
  link: string;
  location: string;
};

export type Location = {
  lat: number;
  lon: number;
  title: string;
  image: string;
  pageUrl: string;
  pct_dem_lead?: number;
};

export type EventData = {
  updatedAt: String;
  events: Record<string, Event[]>;
  locations: Record<string, Location>;
};
