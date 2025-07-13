import { setContext, getContext } from "svelte";
import { EventModel } from "./EventModel.svelte";
import { FilterModel } from "./FilterModel.svelte";
import { type SetTimeoutId } from "$lib/types";
import { RegionModel } from "./RegionModel.svelte";
import { RegionLabeler } from "./RegionLabeler.svelte";
import { MapModel } from "./MapModel.svelte";

const EVENTINFO_VISIBILITY_DURATION = 1000; // 1s

// Timing for advancing to next date on autoplay
const QUICK_NAV_TIME = 500; // ms, for < 20 events
const STANDARD_NAV_TIME = 1000; // ms, for >= 20 events
const ZERO_EVENT_NAV_TIME = 50; // ms, for dates with no events

export class PageState {
  readonly eventModel: EventModel;
  readonly filter: FilterModel;
  readonly mapModel: MapModel;
  readonly regionModel: RegionModel;
  readonly regionLabeler: RegionLabeler;

  updateAvailable = $state(false);
  debug = $state(false);

  filterVisible = $state(false);
  toolbarVisible = $state(true);
  infoPanelsVisible = $state(true);
  eventInfoVisible = $state(false);
  #hideEventInfoTimer: SetTimeoutId = undefined;

  autoplaying = $state(false);
  #autoplayTimer: SetTimeoutId = undefined;

  toggleAutoplay() {
    this.autoplaying = !this.autoplaying;
  }

  toggleFilterVisible() {
    this.filterVisible = !this.filterVisible;
  }

  toggleToolbarVisible() {
    this.toolbarVisible = !this.toolbarVisible;
  }

  toggleInfoPanelsVisible() {
    this.infoPanelsVisible = !this.infoPanelsVisible;
  }

  async scheduleNextDateAdvance() {
    clearTimeout(this.#autoplayTimer);
    this.#autoplayTimer = undefined;

    if (!this.autoplaying) return;

    const numEvents = this.filter.markers.length;
    let lingerTime;

    if (numEvents === 0 && this.filter.dateSummaries.length > 1) {
      lingerTime = ZERO_EVENT_NAV_TIME;
    } else if (numEvents < 20) {
      lingerTime = QUICK_NAV_TIME;
    } else {
      lingerTime = STANDARD_NAV_TIME;
    }

    this.#autoplayTimer = setTimeout(() => {
      if (this.autoplaying) {
        this.filter.selectNextDate();
        this.scheduleNextDateAdvance();
      }
    }, lingerTime);
  }

  showEventInfo() {
    this.eventInfoVisible = true;
    this.#debouncedHideEventInfo();
  }

  #debouncedHideEventInfo() {
    clearTimeout(this.#hideEventInfoTimer);

    this.#hideEventInfoTimer = setTimeout(() => {
      this.eventInfoVisible = false;
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
    this.eventModel = EventModel.create(); // Create EventModel immediately, it loads db in background
    this.mapModel = new MapModel();
    this.regionLabeler = new RegionLabeler(this.regionModel);
    this.filter = new FilterModel(
      this.eventModel,
      this.mapModel,
      this.regionModel
    );
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
