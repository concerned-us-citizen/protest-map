import { EventModel } from "./EventModel.svelte";
import type { Nullable, SetTimeoutId } from "$lib/types";
import { formatDate } from "$lib/util/date";

const INITIAL_REPEAT_DELAY = 400; // ms
const REPEAT_INTERVAL = 80; // ms

export class FilteredEventModel {
  readonly eventModel: EventModel;

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

  readonly currentDateEvents = $derived.by(() =>
    this.currentDate && this.eventModel
      ? (this.eventModel.getMarkerInfos({ date: this.currentDate }) ?? [])
      : []
  );

  readonly currentDateEventNamesWithLocationCounts = $derived.by(() =>
    this.currentDate && this.eventModel
      ? this.eventModel.getEventNamesAndCountsForDate(this.currentDate)
      : []
  );

  readonly currentDateHasEventNames = $derived(
    this.currentDateEventNamesWithLocationCounts.length > 0
  );

  readonly currentDateHasMultipleEventNames = $derived(
    this.currentDateEventNamesWithLocationCounts.length > 1
  );

  readonly selectedEventNames = $state<string[]>([]);

  toggleSelectedEventName(eventName: string) {
    const index = this.selectedEventNames.indexOf(eventName);

    if (index !== -1) {
      this.selectedEventNames.splice(index, 1);
    } else {
      this.selectedEventNames.push(eventName);
    }
  }

  clearSelectedEventNames() {
    this.selectedEventNames.length = 0;
  }

  readonly filteredEvents = $derived.by(() =>
    this.currentDate && this.eventModel
      ? (this.eventModel.getMarkerInfos({
          date: this.currentDate,
          eventNames: this.selectedEventNames,
        }) ?? [])
      : []
  );

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

  constructor(eventModel: EventModel) {
    this.eventModel = eventModel;
  }
}
