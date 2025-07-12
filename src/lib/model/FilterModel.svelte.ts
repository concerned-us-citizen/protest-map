import { EventModel } from "./EventModel.svelte";
import {
  EmptyTurnoutRange,
  EmptyVoterLeanCounts,
  EmptyVoterLeanTurnoutRange,
  type Marker,
  type MarkerType,
  type SetTimeoutId,
  type TurnoutEstimate,
  type TurnoutMarker,
  type TurnoutRange,
  type VoterLean,
} from "$lib/types";
import { formatDate, isFutureDate } from "$lib/util/date";
import { joinWithAnd, mdBold, pluralize } from "$lib/util/string";
import { titleCase } from "title-case";
import type { MapModel } from "./MapModel.svelte";
import {
  prettifyNamedRegion,
  RegionModel,
  type NamedRegion,
} from "./RegionModel.svelte";
import type { Polygon, MultiPolygon } from "geojson";
import { deviceInfo } from "./DeviceInfo.svelte";
import { type DateSummary } from "./EventDb";

const INITIAL_REPEAT_DELAY = 400; // ms
const REPEAT_INTERVAL = 80; // ms

export interface FilterOptions {
  markerType: MarkerType;
  turnoutEstimate: TurnoutEstimate;
  date?: Date;
  eventNames?: string[]; // empty or missing means match all events
  namedRegion?: NamedRegion; // If not null, only match events within the region
  namedRegionPolygon?: Polygon | MultiPolygon;
  voterLeans?: VoterLean[]; // empty or missing means match all voter leans
}

export class FilterModel {
  readonly eventModel: EventModel;
  readonly mapModel: MapModel;
  readonly regionModel: RegionModel;

  readonly filter = $derived.by(() => ({
    markerType: this.markerType,
    turnoutEstimate: this.turnoutEstimate,
    date: this.date,
    eventNames: this.selectedEventNames,
    namedRegion: this.namedRegion,
    namedRegionPolygon: this.namedRegionPolygon,
    voterLeans: this.selectedVoterLeans,
  }));

  // The marker type a user has picked as their default.
  // Will be used if that marker type is available
  desiredMarkerType: MarkerType = $state("turnout");
  turnoutEstimate: TurnoutEstimate = $state("low");

  // The actual marker type to use
  readonly markerType: MarkerType = $derived.by(() => {
    void this.date;
    return this.dateHasTurnout ? this.desiredMarkerType : "event";
  });

  readonly dateHasTurnout = $derived.by(
    () => this.eventModel.getSummaryForDate(this.date)?.hasTurnout ?? false
  );

  markers = $state<Marker[]>([]);
  eventCount = $state<number>(0);
  turnoutRange = $state<TurnoutRange>(EmptyTurnoutRange);

  dateSummaries = $state<DateSummary[]>([]);

  #datesInFilterAsIntSet = $derived.by(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    const { date, ...rest } = this.filter;
    const filterOverEventsWithNoDate = {
      ...rest,
      markerType: "event" as MarkerType,
    };
    const dates = this.eventModel.getDates(filterOverEventsWithNoDate);
    return new Set(dates.map((d) => d.getTime()));
  });
  inCurrentFilter(date: Date) {
    return this.#datesInFilterAsIntSet.has(date.getTime());
  }
  readonly filteredDateCount = $derived(this.#datesInFilterAsIntSet.size);

  namedRegion = $state<NamedRegion | undefined>();
  namedRegionPolygon: Polygon | MultiPolygon | undefined = $state();

  selectedVoterLeans = $state<VoterLean[]>([]);

  // We don't derive one from the other here, because
  // we don't want to establish a dependency on getDates(),
  // since it may change with filters, causing the two to misalign.
  // Instead, we explicitly set both of them when setting either one.

  // Worth noting - dateIndex is relative to
  // dateStatistics, not datesInFilter.
  #dateIndex: number = $state(-1);
  get dateIndex() {
    return this.#dateIndex;
  }
  #date = $state<Date | undefined>();
  get date() {
    return this.#date;
  }

  setDateIndex(index: number) {
    this.#dateIndex = index;
    if (index < 0 || index >= this.dateSummaries.length) {
      this.#date = undefined;
    } else {
      this.#date = this.dateSummaries[index].date;
    }
  }

  setDate(date: Date | undefined) {
    this.#date = date;
    if (!date) {
      this.#dateIndex = -1;
    } else {
      const index = this.dateSummaries.findIndex(
        (d) => d.date.getTime() === date.getTime()
      );
      if (index !== -1) {
        this.#dateIndex = index;
      } else {
        console.warn(
          "Setting date to value not found in eventModel.dateSummaries:",
          date
        );
        this.#dateIndex = -1;
      }
    }
  }

  countForMarker(marker: Marker) {
    if (this.markerType === "event") {
      return 1;
    } else {
      const turnoutMarker = marker as TurnoutMarker;
      switch (this.turnoutEstimate) {
        case "low":
          return turnoutMarker.low;
        case "average":
          return Math.round((turnoutMarker.low + turnoutMarker.high) / 2);
        case "high":
          return turnoutMarker.high;
      }
    }
  }

  isValidDate(date: Date | undefined) {
    if (!date) return false;
    return (
      this.dateRange &&
      date >= this.dateRange.start &&
      date <= this.dateRange?.end
    );
  }

  readonly formattedDateRangeStart = $derived.by(() => {
    if (!this.dateRange) return "";
    return formatDate(
      this.dateRange.start,
      deviceInfo.isNarrow ? "medium" : "long"
    );
  });

  readonly formattedDateRangeEnd = $derived.by(() => {
    if (!this.dateRange) return "";
    return formatDate(
      this.dateRange.end,
      deviceInfo.isNarrow ? "medium" : "long"
    );
  });

  readonly dateRange = $derived.by(() => {
    const dates = this.dateSummaries;
    if (dates.length === 0) return null;
    return { start: dates[0].date, end: dates[dates.length - 1].date };
  });

  #selectRelativeDateWrapping(direction: "forward" | "backward") {
    const allDates = this.dateSummaries;
    const currentDate = this.date;
    if (!currentDate || this.filteredDateCount < 2) return;

    const currentIndex = allDates.findIndex(
      (d) => d.date.getTime() === currentDate.getTime()
    );

    const step = direction === "forward" ? 1 : -1;
    const total = allDates.length;

    let index = currentIndex;

    for (let i = 1; i < total; i++) {
      index = (index + step + total) % total;
      const dateSummary = allDates[index];
      if (this.inCurrentFilter(dateSummary.date)) {
        this.setDateIndex(index);
        return;
      }
    }
  }

  selectNextDate() {
    this.#selectRelativeDateWrapping("forward");
  }

  selectPreviousDate() {
    this.#selectRelativeDateWrapping("backward");
  }

  readonly formattedDate = $derived(formatDate(this.date));

  readonly filteredEventNamesWithLocationCounts = $derived.by(() => {
    const filter = this.filter;

    if (!filter?.date) return [];

    // We want to see all the event names for the current date's filter,
    // excluding other filters, but with counts that reflect the
    // full current filter (i.e. many will be 0). This gives users the ability to select
    // names that would otherwise be filtered out, but see accurate counts.
    const allFullyFilteredEventNamesAndCounts = this.eventModel
      ? this.eventModel.getEventNamesAndCounts(filter)
      : [];

    const fullCountsMap = new Map(
      allFullyFilteredEventNamesAndCounts.map(({ name, count }) => [
        name,
        count,
      ])
    );

    const allDateEventNamesAndCounts = this.eventModel
      ? this.eventModel.getEventNamesAndCounts({
          markerType: filter.markerType,
          turnoutEstimate: filter.turnoutEstimate,
          date: filter.date,
        })
      : [];

    return allDateEventNamesAndCounts.map(({ name }) => ({
      name,
      count: fullCountsMap.get(name) ?? 0,
    }));
  });

  readonly filteredEventNamesWithTurnoutRange = $derived.by(() => {
    const filter = this.filter;

    if (!filter?.date) return [];

    // We want to see all the event names for the current date's filter,
    // excluding other filters, but with ranges that reflect the
    // full current filter (i.e. many will be 0). This gives users the ability to select
    // names that would otherwise be filtered out, but see accurate ranges.
    const allFullyFilteredEventNamesAndTurnoutRanges = this.eventModel
      ? this.eventModel.getEventNamesAndTurnoutRanges(filter)
      : [];

    const fullTurnoutRangesMap = new Map(
      allFullyFilteredEventNamesAndTurnoutRanges.map(
        ({ name, turnoutRange }) => [name, turnoutRange]
      )
    );

    const allDateEventNamesAndTurnoutRanges = this.eventModel
      ? this.eventModel.getEventNamesAndTurnoutRanges({
          markerType: filter.markerType,
          turnoutEstimate: filter.turnoutEstimate,
          date: filter.date,
        })
      : [];

    return allDateEventNamesAndTurnoutRanges.map(({ name }) => ({
      name,
      turnoutRange: fullTurnoutRangesMap.get(name) ?? EmptyTurnoutRange,
    }));
  });

  readonly filteredEventCount = $derived.by(() => {
    return this.filteredEventNamesWithLocationCounts.filter(
      (nc) => nc.count > 0
    ).length;
  });

  readonly filteredVoterLeanCounts = $derived.by(() => {
    const filter = this.filter;
    if (!filter?.date) return EmptyVoterLeanCounts;

    return this.eventModel
      ? this.eventModel.getVoterLeanCounts(filter)
      : EmptyVoterLeanCounts;
  });

  readonly filteredVoterLeanTurnoutRange = $derived.by(() => {
    const filter = this.filter;
    if (!filter?.date) return EmptyVoterLeanTurnoutRange;

    return this.eventModel
      ? this.eventModel.getVoterLeanTurnoutRange(filter)
      : EmptyVoterLeanTurnoutRange;
  });

  selectedEventNames = $state<string[]>([]);

  readonly isFiltering = $derived(
    this.selectedEventNames.length > 0 ||
      this.namedRegion !== undefined ||
      this.selectedVoterLeans.length > 0
  );

  readonly filterDescriptions = $derived.by(() => {
    const descriptions: { title: string; clearFunc: () => void }[] = [];
    const namedRegion = this.namedRegion;
    if (namedRegion) {
      const regionDisplayName = prettifyNamedRegion(namedRegion);
      descriptions.push({
        title: `In ${mdBold(regionDisplayName)}`,
        clearFunc: () => this.clearNamedRegionFilter(),
      });
    }

    const selectedEventCount = this.selectedEventNames.length;
    if (selectedEventCount > 0) {
      const title =
        selectedEventCount < 5
          ? `From ${pluralize(this.selectedEventNames, "event")} ${joinWithAnd(this.selectedEventNames.map(mdBold))}`
          : `From ${selectedEventCount} events`;
      descriptions.push({
        title,
        clearFunc: () => this.clearSelectedNames(),
      });
    }

    if (this.selectedVoterLeans.length > 0) {
      const voterLeanNames = this.selectedVoterLeans
        .map((n) => mdBold(titleCase(n)))
        .join(" or ");
      descriptions.push({
        title: `In precincts with voter lean ${voterLeanNames}`,
        clearFunc: () => this.clearVoterLeans(),
      });
    }

    return descriptions;
  });

  toggleSelectedEventName(name: string) {
    const cur = this.selectedEventNames;
    this.selectedEventNames = cur.includes(name)
      ? cur.filter((n) => n !== name)
      : [...cur, name];
  }

  toggleVoterLean(voterLean: VoterLean) {
    const cur = this.selectedVoterLeans;
    this.selectedVoterLeans = cur.includes(voterLean)
      ? cur.filter((n) => n !== voterLean)
      : [...cur, voterLean];
    if (this.selectedVoterLeans.length === 3) {
      this.selectedVoterLeans = [];
    }
  }

  clearSelectedNames() {
    this.selectedEventNames = [];
  }

  clearNamedRegionFilter() {
    this.namedRegion = undefined;
  }

  clearVoterLeans() {
    this.selectedVoterLeans = [];
  }

  clearAllFilters() {
    this.clearSelectedNames();
    this.clearNamedRegionFilter();
    this.clearVoterLeans();
  }

  #isRepeatingChange = false;
  #currentRepeatDirection: "next" | "prev" | null = null;
  #repeatTimer: SetTimeoutId;

  startDateRepeat(direction: "next" | "prev") {
    // If already repeating in the same direction, do nothing.
    if (this.#isRepeatingChange && this.#currentRepeatDirection === direction)
      return;

    // Stop any existing repeat action.
    this.stopDateRepeat();

    this.#isRepeatingChange = true;
    this.#currentRepeatDirection = direction;

    // Schedule the first continuous change after INITIAL_REPEAT_DELAY.
    // The immediate first change will be handled by the on:click event.
    this.#repeatTimer = setTimeout(() => {
      // Ensure we are still supposed to be repeating before the first programmatic change
      if (
        this.#isRepeatingChange &&
        this.#currentRepeatDirection === direction
      ) {
        this.#continuousDateChange();
      }
    }, INITIAL_REPEAT_DELAY);
  }

  stopDateRepeat() {
    if (this.#repeatTimer) {
      clearTimeout(this.#repeatTimer);
      this.#repeatTimer = undefined;
    }
    this.#isRepeatingChange = false;
    this.#currentRepeatDirection = null;
  }

  #continuousDateChange() {
    if (!this.#isRepeatingChange || !this.#currentRepeatDirection) {
      this.stopDateRepeat();
      return;
    }
    if (this.#currentRepeatDirection === "next") {
      this.selectNextDate();
    } else if (this.#currentRepeatDirection === "prev") {
      this.selectPreviousDate();
    }
    this.#repeatTimer = setTimeout(
      () => this.#continuousDateChange,
      REPEAT_INTERVAL
    );
  }

  constructor(
    eventModel: EventModel,
    mapModel: MapModel,
    regionModel: RegionModel
  ) {
    this.eventModel = eventModel;
    this.mapModel = mapModel;
    this.regionModel = regionModel;

    // Update all the dates
    $effect(() => {
      if (!this.eventModel.isLoading) {
        this.dateSummaries = this.eventModel.getDateSummaries();
      }
    });

    $effect(() => {
      const currentFilter = this.filter;
      const update = async () => {
        if (this.eventModel) {
          this.markers = this.eventModel.getMarkers(currentFilter);
          this.eventCount = this.eventModel.getCount(currentFilter);
          this.turnoutRange = this.eventModel.getTurnoutRange(currentFilter);
        }
      };
      update();
    });

    $effect(() => {
      const date = this.date;
      const dateSummaries = this.dateSummaries;
      if (!this.isValidDate(date)) {
        // If no longer a valid date, set dateIndex to
        // be the date at or after the current system date
        // (or - 1 if no match) any time the eventModel's items change
        let newIndex = dateSummaries.findIndex((dc) =>
          isFutureDate(dc.date, true)
        );
        // Handle case where there are no dates beyond today.
        if (newIndex < 0) {
          newIndex = dateSummaries.length - 1;
        }
        this.setDateIndex(newIndex);
      }
    });

    $effect(() => {
      const namedRegion = this.namedRegion;
      void this.regionModel.allPolygonsLoaded; // Polygon updates when the full db is loaded.
      const update = async () => {
        this.namedRegionPolygon = namedRegion
          ? await this.regionModel.getPolygonForNamedRegion(namedRegion)
          : undefined;
      };
      update();
    });
  }
}
