import { setContext, getContext } from "svelte";
import { EventModel } from "./EventModel.svelte";
import { FilteredEventModel } from "./FilteredEventModel.svelte";
import { deviceInfo } from "$lib/store/DeviceInfo.svelte";
import { type SetTimeoutId } from "$lib/types";
import { RegionModel } from "./RegionModel";
import { RegionLabeler } from "./RegionLabeler.svelte";
import { MapModel } from "./MapModel.svelte";

const EVENTINFO_VISIBILITY_DURATION = 1000; // 1s

// Timing for advancing to next date on autoplay
const QUICK_NAV_TIME = 500; // ms, for < 20 events
const STANDARD_NAV_TIME = 1000; // ms, for >= 20 events
const ZERO_EVENT_NAV_TIME = 50; // ms, for dates with no events

export class PageState {
  readonly eventModel: EventModel;
  readonly filter: FilteredEventModel;
  readonly mapModel: MapModel;
  readonly regionModel: RegionModel;
  readonly regionLabeler: RegionLabeler;

  filterVisible = $state(false);
  helpVisible = $state(false);
  navigationVisible = $state(false);
  updateAvailable = $state(false);

  private _eventInfoVisible = $state(false);
  #hideEventInfoTimer: SetTimeoutId = undefined;

  autoplaying = $state(false);
  #autoplayTimer: SetTimeoutId = undefined;

  toggleFilterVisible() {
    this.filterVisible = !this.filterVisible;
  }

  toggleHelpVisible() {
    this.helpVisible = !this.helpVisible;
  }

  toggleNavigationVisible() {
    this.navigationVisible = !this.navigationVisible;
  }

  toggleAutoplay() {
    this.autoplaying = !this.autoplaying;
  }

  async scheduleNextDateAdvance() {
    clearTimeout(this.#autoplayTimer);
    this.#autoplayTimer = undefined;

    if (!this.autoplaying) return;

    const numEvents = this.filter.currentDateEvents.length;
    let lingerTime;

    if (numEvents === 0 && this.eventModel.allDatesWithEventCounts.length > 1) {
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
          this.eventModel.allDatesWithEventCounts.length;
        // Schedule the next date advance
        this.scheduleNextDateAdvance();
      }
    }, lingerTime);
  }

  readonly eventInfoVisible = $derived.by(() => {
    const isTall = deviceInfo.isTall;
    const eventInfoVisible = this._eventInfoVisible;
    return isTall || eventInfoVisible;
  });

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

  pollForUpdates() {
    setTimeout(
      async () => {
        try {
          this.updateAvailable = await this.eventModel.checkIsUpdateAvailable();
          console.log("Checking for update...");
          if (this.updateAvailable) {
            console.log("Update now available!");
          }
        } catch (err) {
          console.warn("Polling failed", err);
        }

        this.pollForUpdates(); // repeat indefinitely
      },
      1000 * 60 * 60
    );
  }

  private constructor() {
    this.regionModel = RegionModel.getInstance();
    this.eventModel = EventModel.create(this.regionModel); // Create EventModel immediately, it loads db in background
    this.mapModel = new MapModel();
    this.regionLabeler = new RegionLabeler(this.regionModel);
    this.filter = new FilteredEventModel(this.eventModel, this.mapModel);
    this.pollForUpdates();

    $effect(() => {
      if (this.autoplaying) {
        this.scheduleNextDateAdvance();
      }
    });
  }

  static create(): PageState {
    return new PageState();
  }
}

const PAGE_STATE_KEY = Symbol("PAGE_STATE");

export function createPageStateInContext(pageState: PageState) {
  return setContext(PAGE_STATE_KEY, pageState);
}

export function getPageStateFromContext(): PageState {
  const pageState = getContext<PageState>(PAGE_STATE_KEY);
  if (!pageState) {
    throw new Error("Missing Page State");
  }
  return pageState;
}
