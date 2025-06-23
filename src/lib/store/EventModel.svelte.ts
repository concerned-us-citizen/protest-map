import { browser } from "$app/environment";
import {
  EmptyVoterLeanCounts,
  type EventMarkerInfoWithId,
  type Nullable,
  type PopulatedEvent,
  type VoterLeanCounts,
} from "$lib/types";
import { formatDateTime } from "$lib/util/date";
import { ClientEventDb } from "./ClientEventDb";
import { booleanPointInPolygon, point } from "@turf/turf";
import type { RegionModel } from "./RegionModel";
import type { EventFilterOptions } from "./FilteredEventModel.svelte";

export class EventModel {
  private db: Nullable<ClientEventDb> = $state(null);
  private regionModel: RegionModel;

  updatedAt = $state<Nullable<Date>>(null);

  readonly isLoading = $derived(this.db === null);

  readonly formattedUpdatedAt = $derived(
    this.updatedAt
      ? `Data last refreshed ${formatDateTime(this.updatedAt)}`
      : "Not yet updated"
  );

  async getMarkerInfos(
    filter: EventFilterOptions
  ): Promise<EventMarkerInfoWithId[]> {
    let result = this.db ? this.db.getEventMarkerInfos(filter) : [];
    if (filter.namedRegion) {
      const polygon = await this.regionModel.getPolygonForNamedRegion(
        filter.namedRegion
      );
      if (!polygon) return [];
      result = result.filter((marker) =>
        booleanPointInPolygon(point([marker.lon, marker.lat]), polygon)
      );
    }
    return result;
  }

  getDatesWithEventCounts(filter: EventFilterOptions) {
    return this.db ? this.db.getDatesWithEventCounts(filter) : [];
  }

  getEventNamesAndCountsForFilter(
    filter: EventFilterOptions
  ): { name: string; count: number }[] {
    return this.db ? this.db.getEventNamesAndCountsForFilter(filter) : [];
  }

  getVoterLeanCounts(filter: EventFilterOptions): VoterLeanCounts {
    return this.db ? this.db.getVoterLeanCounts(filter) : EmptyVoterLeanCounts;
  }

  getPopulatedEvent(eventId: number): Nullable<PopulatedEvent> {
    return this.db ? this.db.getPopulatedEvent(eventId) : null;
  }

  async checkIsUpdateAvailable(): Promise<boolean> {
    return this.db ? await this.db.checkIsUpdateAvailable() : false;
  }

  private constructor(regionModel: RegionModel) {
    this.regionModel = regionModel;
  }

  private async initialize() {
    try {
      this.db = await ClientEventDb.create();
      this.updatedAt = this.db.getCreatedAt();
    } catch (error) {
      console.error("Failed to load database:", error);
    }
  }

  static create(regionModel: RegionModel): EventModel {
    const model = new EventModel(regionModel);
    // Start async initialization in the background
    if (browser) {
      model.initialize();
    }
    return model;
  }
}
