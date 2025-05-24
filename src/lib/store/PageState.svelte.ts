import { setContext, getContext } from "svelte";
import { EventStore } from "./EventStore.svelte";
import { EventFilter } from "./EventFilter.svelte";
import { deviceInfo } from "$lib/store/DeviceInfo.svelte";
import type { SetTimeoutId } from "$lib/types";

const EVENTINFO_VISIBILITY_DURATION = 1000; // 1s

// Timing for advancing to next date on autoplay
const QUICK_NAV_TIME = 500; // ms, for < 20 events
const STANDARD_NAV_TIME = 1000; // ms, for >= 20 events
const ZERO_EVENT_NAV_TIME = 50; // ms, for dates with no events

export class PageState {
  readonly eventStore: EventStore;
  readonly filter: EventFilter;

  filterVisible = $state(false);
  helpVisible = $state(false);

  private _eventInfoVisible = $state(false);
  #hideEventInfoTimer: SetTimeoutId = undefined;

  autoplaying = $state(false);
  #autoplayTimer: SetTimeoutId = undefined;

  toggleFilterVisible() {
    if (!this.filterVisible && !this.filter.currentDateHasMultipleEventNames)
      return;
    this.filterVisible = !this.filterVisible;
    this.helpVisible = false;
  }

  toggleHelpVisible() {
    this.helpVisible = !this.helpVisible;
    this.filterVisible = false;
  }

  toggleAutoplay() {
    this.autoplaying = !this.autoplaying;
    this.scheduleNextDateAdvance();
  }

  scheduleNextDateAdvance() {
    clearTimeout(this.#autoplayTimer);
    this.#autoplayTimer = undefined;

    if (!this.autoplaying) return;

    const numEvents = this.filter.currentDateEvents.length;
    let lingerTime;

    if (numEvents === 0 && this.eventStore.allDatesWithEventCounts.length > 1) {
      lingerTime = ZERO_EVENT_NAV_TIME;
    } else if (numEvents < 20) {
      lingerTime = QUICK_NAV_TIME;
    } else {
      lingerTime = STANDARD_NAV_TIME;
    }

    this.#autoplayTimer = setTimeout(() => {
      if (this.autoplaying) {
        this.filter.currentDateIndex =
          (this.filter.currentDateIndex + 1) %
          this.eventStore.allDatesWithEventCounts.length;
        // Schedule the next date advance
        this.scheduleNextDateAdvance();
      }
    }, lingerTime);
  }

  readonly eventInfoVisible = $derived(
    deviceInfo.isTall || this._eventInfoVisible
  );

  showEventInfo() {
    if (!deviceInfo.isTall) {
      this._eventInfoVisible = true;
      this.#debouncedHideEventInfo();
    }
  }

  #debouncedHideEventInfo() {
    clearTimeout(this.#hideEventInfoTimer);

    this.#hideEventInfoTimer = setTimeout(() => {
      this._eventInfoVisible = false;
    }, EVENTINFO_VISIBILITY_DURATION);
  }

  cleanup() {
    clearTimeout(this.#hideEventInfoTimer);
    this.#hideEventInfoTimer = undefined;
    clearTimeout(this.#autoplayTimer);
    this.#autoplayTimer = undefined;
  }

  constructor() {
    this.eventStore = new EventStore();
    this.filter = new EventFilter(this.eventStore);
  }
}

const PAGE_STATE_KEY = Symbol("PAGE_STATE");

export function createPageStateInContext() {
  return setContext(PAGE_STATE_KEY, new PageState());
}
export function getPageStateFromContext() {
  return getContext<ReturnType<typeof createPageStateInContext>>(
    PAGE_STATE_KEY
  );
}
