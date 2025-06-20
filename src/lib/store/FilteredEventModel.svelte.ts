import { EventModel } from "./EventModel.svelte";
import type { Nullable, SetTimeoutId, VoterLean } from "$lib/types";
import { formatDate } from "$lib/util/date";
import { quote } from "$lib/util/string";
import { titleCase } from "title-case";
import type { MapModel } from "./MapModel.svelte";
import type { RegionLabeler } from "./RegionLabeler.svelte";

const INITIAL_REPEAT_DELAY = 400; // ms
const REPEAT_INTERVAL = 80; // ms

export class FilteredEventModel {
  readonly eventModel: EventModel;
  readonly mapModel: MapModel;
  readonly regionLabeler: RegionLabeler;

  visibleBoundsOnly = $state<boolean>(false);
  selectedVoterLeans = $state<VoterLean[]>([]);

  currentDateIndex = $state(-1);

  readonly currentDate = $derived.by(() => {
    const dates = this.eventModel.allDatesWithEventCounts;
    return dates[this.currentDateIndex]?.date ?? null;
  });

  setCurrentDate(date: Nullable<Date>) {
    if (date === null) {
      this.currentDateIndex = -1;
    } else {
      const index = this.eventModel.allDatesWithEventCounts.findIndex(
        (d) => d.date.getTime() === date.getTime()
      );
      if (index !== -1) {
        this.currentDateIndex = index;
      } else {
        console.warn(
          "Setting currentDate to value not found in eventModel.allDatesWithEventCounts:",
          date
        );
        this.currentDateIndex = -1;
      }
    }
  }

  #selectRelativeDateWrapping(increment: number) {
    const dates = this.eventModel.allDatesWithEventCounts;
    const count = dates.length;
    if (count === 0) return;
    const curIndex = Math.max(0, this.currentDateIndex);

    this.currentDateIndex = (curIndex + increment + count) % count;
  }

  selectNextDate() {
    this.#selectRelativeDateWrapping(1);
  }

  selectPreviousDate() {
    this.#selectRelativeDateWrapping(-1);
  }

  readonly formattedCurrentDate = $derived(formatDate(this.currentDate));

  readonly currentDateEvents = $derived.by(() => {
    const date = this.currentDate;
    if (!date) return [];

    return this.eventModel
      ? (this.eventModel.getMarkerInfos({ date }) ?? [])
      : [];
  });

  readonly filteredEventNamesWithLocationCounts = $derived.by(() => {
    const date = this.currentDate;
    const visibleBounds = this.mapModel.visibleBounds;
    if (!date) return [];

    return this.eventModel
      ? this.eventModel.getEventNamesAndCountsForFilter({ date, visibleBounds })
      : [];
  });

  readonly currentDateHasEventNames = $derived(
    this.filteredEventNamesWithLocationCounts.length > 0
  );

  readonly currentDateHasMultipleEventNames = $derived(
    this.filteredEventNamesWithLocationCounts.length > 1
  );

  selectedEventNames = $state<string[]>([]);

  isFiltering = $derived(
    this.selectedEventNames.length > 0 ||
      this.visibleBoundsOnly ||
      this.selectedVoterLeans.length > 0
  );

  filterDescriptions = $derived.by(() => {
    const descriptions: { title: string; clearFunc: () => void }[] = [];
    if (this.mapModel.visibleBounds && this.visibleBoundsOnly) {
      descriptions.push({
        title: `In ${this.regionLabeler.visibleRegionName}`,
        clearFunc: () => this.clearVisibleBoundsOnly(),
      });
    }

    const eventCount = this.selectedEventNames.length;
    if (eventCount > 0) {
      const title =
        eventCount === 1
          ? `From event "${this.selectedEventNames[0]}"`
          : `Associated with ${eventCount} events`;
      descriptions.push({
        title,
        clearFunc: () => this.clearSelectedNames(),
      });
    }

    if (this.selectedVoterLeans.length > 0) {
      const voterLeanNames = this.selectedVoterLeans
        .map((n) => quote(titleCase(n)))
        .join(" or ");
      descriptions.push({
        title: `In precincts with voter lean ${voterLeanNames}`,
        clearFunc: () => this.clearVoterLeans(),
      });
    }

    return descriptions;
  });

  toggleVisibleBoundsOnly() {
    this.visibleBoundsOnly = !this.visibleBoundsOnly;
  }

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

  clearVisibleBoundsOnly() {
    this.visibleBoundsOnly = false;
  }

  clearVoterLeans() {
    this.selectedVoterLeans = [];
  }

  readonly filteredEvents = $derived.by(() => {
    const date = this.currentDate;
    const eventNames = this.selectedEventNames;
    const visibleBoundsOnly = this.visibleBoundsOnly;
    const visibleBounds = visibleBoundsOnly
      ? this.mapModel.visibleBounds
      : undefined;
    const voterLeans = this.selectedVoterLeans;

    if (!date) return [];

    return this.eventModel
      ? (this.eventModel.getMarkerInfos({
          date,
          eventNames,
          visibleBounds,
          voterLeans,
          visibleBoundsOnly,
        }) ?? [])
      : [];
  });

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
    regionLabeler: RegionLabeler
  ) {
    this.eventModel = eventModel;
    this.mapModel = mapModel;
    this.regionLabeler = regionLabeler;
  }
}
