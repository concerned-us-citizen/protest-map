import { browser } from "$app/environment";
import {
  EmptyVoterLeanCounts,
  type Marker,
  type MarkerType,
  type Nullable,
  type VoterLeanCounts,
} from "$lib/types";
import { formatDateTime } from "$lib/util/date";
import { EventDb } from "./EventDb";
import { booleanPointInPolygon, point } from "@turf/turf";
import type { FilterOptions } from "./FilterModel.svelte";

export class EventModel {
  private db: Nullable<EventDb> = $state(null);

  updatedAt = $state<Nullable<Date>>(null);

  readonly isLoading = $derived(this.db === null);
  readonly isLoaded = $derived(!this.isLoading);

  readonly formattedUpdatedAt = $derived(
    this.updatedAt
      ? `Data last refreshed ${formatDateTime(this.updatedAt)}`
      : "Not yet updated"
  );

  getMarkers(filter: FilterOptions): Marker[] {
    let result = this.db ? this.db.getMarkers(filter) : [];
    const polygon = filter.namedRegionPolygon;
    if (polygon) {
      result = result.filter((marker) =>
        booleanPointInPolygon(point([marker.lon, marker.lat]), polygon)
      );
    }
    return result;
  }

  getDateSummaries() {
    return this.db ? this.db.getDateSummaries() : [];
  }

  getSummaryForDate(date: Date | undefined) {
    return this.db && date ? this.db.getSummaryForDate(date) : null;
  }

  getDates(filter: FilterOptions) {
    return this.db ? this.db.getDates(filter) : [];
  }

  getEventNamesAndCounts(
    filter: FilterOptions
  ): { name: string; count: number }[] {
    return this.db ? this.db.getEventNamesAndCounts(filter) : [];
  }

  getVoterLeanCounts(filter: FilterOptions): VoterLeanCounts {
    return this.db ? this.db.getVoterLeanCounts(filter) : EmptyVoterLeanCounts;
  }

  getCount(filter: FilterOptions): number {
    return this.db ? this.db.getCount(filter) : 0;
  }

  getPopulatedMarker(id: number, markerType: MarkerType) {
    return this.db ? this.db.getPopulatedMarker(id, markerType) : null;
  }

  async checkIsUpdateAvailable(): Promise<boolean> {
    return this.db ? await this.db.checkIsUpdateAvailable() : false;
  }

  private constructor() {}

  private async initialize() {
    try {
      this.db = await EventDb.create();
      this.updatedAt = this.db.getCreatedAt();
    } catch (error) {
      console.error("Failed to load database:", error);
    }
  }

  static create(): EventModel {
    const model = new EventModel();
    // Start async initialization in the background
    if (browser) {
      model.initialize();
    }
    return model;
  }
}
