<script lang="ts">
  import RegionNavigationDialog from "$lib/component/dialog/RegionNavigationDialog.svelte";
  import { getShortcutPrefix } from "$lib/util/os";

  import {
    createPageStateInContext,
    PageState,
  } from "$lib/model/PageState.svelte";
  import ProtestMapTour, {
    protestMapTourId,
  } from "$lib/component/dialog/ProtestMapTour.svelte";
  import EventMap from "$lib/component/map/EventMap.svelte";
  import UpdateBanner from "$lib/component/UpdateBanner.svelte";
  import LoadingSpinner from "$lib/component/LoadingSpinner.svelte";
  import { page } from "$app/stores";
  import { prettifyNamedRegion } from "$lib/model/RegionModel.svelte";
  import {
    getSearchParamsFromState,
    setStateFromWindowSearchParams,
  } from "$lib/model/searchParamsToStateSync.svelte";
  import TimelineContainer from "$lib/component/timeline/TimelineContainer.svelte";
  import { onKeyDown } from "$lib/keyShortcuts";
  import { cubicInOut } from "svelte/easing";
  import { fade } from "svelte/transition";
  import { Undo2 } from "@lucide/svelte";
  import TitlePanel from "$lib/component/TitlePanel.svelte";
  import FilterPanel from "$lib/component/filter/FilterPanel.svelte";
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";
  import PillButton from "$lib/component/PillButton.svelte";
  import ShareDialog from "$lib/component/dialog/ShareDialog.svelte";
  import { showPopover } from "$lib/component/popover";
  import PopupToolbar from "$lib/component/PopupToolbar.svelte";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";

  const pageState = PageState.create();
  createPageStateInContext(pageState);

  let initializedStateFromSearchParams = false;

  // Update the search params in the window
  $effect(() => {
    const searchParams = getSearchParamsFromState(pageState);
    if (!initializedStateFromSearchParams) return;

    const url = new URL(window.location.href);
    url.search = searchParams.toString();
    history.replaceState(null, "", url);
  });

  // (at startup, once the db is loaded) update the state from search params
  $effect(() => {
    if (!pageState.eventModel.isLoading && !initializedStateFromSearchParams) {
      (async () => {
        await setStateFromWindowSearchParams($page.url.searchParams, pageState);
        initializedStateFromSearchParams = true;
      })();
    }
  });

  const handleKeyDown = (e: KeyboardEvent): void => {
    onKeyDown(e, pageState);
  };

  $effect(() => {
    if (!hasShownTourCookieExists) {
      showPopover(protestMapTourId);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      pageState.cleanup();
    };
  });

  // EventInfoPanel becomes visible any time date changes after loading.
  $effect(() => {
    if (pageState.filter.date !== undefined) {
      pageState.showEventInfo();
    }
  });

  function hasShownTourCookieExists() {
    return document.cookie
      .split("; ")
      .some((row) => row.startsWith("hasShownTour="));
  }

  const title = $derived.by(() => {
    const type =
      pageState.filter.markerType === "event"
        ? "Protests"
        : "Protests and Turnout";
    return `${type} in ${
      pageState.filter.namedRegion
        ? prettifyNamedRegion(pageState.filter.namedRegion)
        : "the US"
    }`;
  });

  onMount(() => {
    if (browser) {
      document.addEventListener(
        "dblclick",
        (event) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.closest("button")
          ) {
            event.preventDefault();
          }
        },
        { capture: true }
      ); // Use capture to catch the event early

      if (deviceInfo.isTouchDevice) {
        document.body.classList.add("touch-device");
      }
    }
  });
</script>

<svelte:head>
  <title>{title}</title>
  <meta
    property="og:title"
    content="An Interactive Map of US Protests by Date"
  />
  <meta
    property="og:description"
    content="An interactive map of US protests, browsable by date."
  />
</svelte:head>

<div class="page">
  <EventMap class="map" />

  {#if !pageState.eventModel.isLoading}
    <div class="map-overlay">
      <div class="top-area">
        <div class="left-column">
          {#if pageState.infoPanelsVisible}
            <div class="title-and-filter-panel" transition:fade>
              <TitlePanel {title} class="title-container" />
              <div class="filter-or-show-all-container">
                {#if pageState.filterVisible}
                  <div class="filter-container" transition:fade>
                    <FilterPanel />
                  </div>
                {:else if pageState.filter.isFiltering && !pageState.filterVisible}
                  <div class="show-all-button-container" transition:fade>
                    <PillButton
                      white
                      class="show-all-button"
                      large
                      title={`Clear all filters and view entire US (${getShortcutPrefix()}C)`}
                      onClick={() => {
                        pageState.filter.clearAllFilters();
                        pageState.mapModel.navigateToUS();
                        pageState.mapModel.clearBoundsStack();
                      }}
                    >
                      View All US Protests
                    </PillButton>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        </div>
        <div class="buttons-container">
          <PopupToolbar
            class="toolbar"
            cookieId="toolbar-popped-up"
            orientation={deviceInfo.isNarrow ? "vertical" : "horizontal"}
          />
          {#if pageState.mapModel.canPopBounds}
            <div
              class="zoom-undo-button-wrapper"
              transition:fade={{ duration: 300, easing: cubicInOut }}
            >
              <PillButton
                white
                onClick={() => pageState.mapModel.popBounds()}
                title={`Zoom Back Out (${getShortcutPrefix()}R, +U, or +B)`}
              >
                <Undo2 />
              </PillButton>
            </div>
          {/if}
        </div>
      </div>
      <div class="bottom-bar">
        {#if pageState.updateAvailable}
          <UpdateBanner />
        {:else if pageState.eventModel.isLoaded}
          {#if pageState.infoPanelsVisible}
            <div transition:fade>
              <TimelineContainer class="timeline-container" />
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</div>

{#if pageState.eventModel.isLoading}
  <LoadingSpinner class="loading-spinner" size={32} />
{/if}

<RegionNavigationDialog />
<ProtestMapTour />
<ShareDialog />

<style>
  .page {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  :global(.map),
  .map-overlay {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
  }

  .map-overlay {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    pointer-events: none;
  }

  :global(.title-container),
  .filter-container,
  :global(.show-all-button),
  .zoom-undo-button-wrapper,
  :global(.toolbar) {
    pointer-events: auto;
  }

  .top-area {
    display: flex;
    flex-direction: row;
    align-items: start;
    justify-content: space-between;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .left-column {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    width: 25rem;
    min-height: 0;
    max-height: 100%;
    box-sizing: border-box;
  }
  .title-and-filter-panel {
    min-height: 0;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  :global(.title-container) {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-or-show-all-container {
    position: relative;
  }

  .show-all-button-container {
    position: absolute;
    inset: 0;
  }

  :global(.show-all-button) {
    width: 100%;
  }

  .filter-container {
    flex: 1;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .filter-container::-webkit-scrollbar {
    display: none;
  }

  .buttons-container {
    display: flex;
    flex-direction: column;
    align-items: start;
  }

  .buttons-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0.5rem;
  }

  .zoom-undo-button-wrapper {
    margin-left: auto;
    background-color: #fff;
    border-radius: 5px;
    overflow: hidden;
  }

  .bottom-bar {
    align-self: center;
    flex: 0 0 auto;
  }

  :global(.loading-spinner) {
    position: absolute;
    inset: 0;
  }

  :global(.timeline-container),
  :global(.update-banner) {
    flex: 0 0 1;
    pointer-events: auto;
    margin-top: auto;
    align-self: center;
  }
  :global(.maplibregl-ctrl-top-left) {
    transition: opacity 0.5s;
  }

  :global(body:has(.maplibregl-popup-tip))
    :global(:is(.maplibregl-ctrl-top-left, .maplibregl-ctrl-top-left *)) {
    opacity: 0;
  }

  :global(html),
  :global(body) {
    overflow: hidden; /* Hide scrollbars */
    touch-action: none; /* Prevent bounce */
    overscroll-behavior: none; /* Prevent pull-to-refresh on iOS */

    /* Suppress default OS long press actions on mobile */
    user-select: none;
    -webkit-user-select: none; /* Safari */
    -ms-user-select: none; /* IE 10+ */
    touch-action: manipulation; /* Prevent default touch behaviors like context menu */

    margin: 0; /* Remove default body margin */
    padding: 0; /* Remove default body padding */
    width: 100%; /* Ensure full width */
    height: 100%; /* Ensure full height */
  }
</style>
