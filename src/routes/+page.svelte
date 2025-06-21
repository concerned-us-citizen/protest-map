<script lang="ts">
  import {
    createPageStateInContext,
    PageState,
  } from "$lib/store/PageState.svelte";
  import { deviceInfo } from "$lib/store/DeviceInfo.svelte.js";
  import ProtestMapTour from "$lib/ProtestMapTour.svelte";
  import EventInfoPanel from "$lib/EventInfoPanel.svelte";
  import FilterPanel from "$lib/FilterPanel.svelte";
  import {
    playIconSvg,
    pauseIconSvg,
    infoIconSvg,
    backArrowSvg,
  } from "$lib/icons";
  import { formatDateIndicatingFuture } from "$lib/util/date.js";
  import { countAndLabel } from "$lib/util/string";
  import Timeline from "$lib/Timeline.svelte";
  import IconButton from "$lib/IconButton.svelte";
  import EventMap from "$lib/map/EventMap.svelte";
  import { cubicInOut } from "svelte/easing";
  import { fade, slide } from "svelte/transition";
  import PrecinctStatsPanel from "$lib/PrecinctStatsPanel.svelte";
  import UpgradeBanner from "$lib/UpgradeBanner.svelte";
  import LoadingSpinner from "$lib/LoadingSpinner.svelte";
  import { page } from "$app/stores";
  import FilterIndicator from "$lib/FilterIndicator.svelte";
  import { prettifyNamedRegion } from "$lib/store/RegionModel";

  const pageState = PageState.create();
  createPageStateInContext(pageState);

  $effect(() => {
    const searchParams = $page.url.searchParams;
    (async () => {
      await pageState.updateFromUrlParams(searchParams);
    })();
  });

  $effect(() => {
    pageState.helpVisible = !hasShownTourCookieExists();

    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("keyup", handleKeyup);
      pageState.cleanup();
    };
  });

  // EventInfoPanel becomes visible any time currentDate changes after loading.
  $effect(() => {
    if (pageState.filter.currentDate !== undefined) {
      pageState.showEventInfo();
    }
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const key = event.key.toLowerCase();
    const code = event.code;

    // Spacebar always toggles playback
    if (key === " " || code === "Space") {
      pageState.toggleAutoplay();
      event.preventDefault();
      return;
    }

    // All other shortcuts are only active when NOT playing
    if (pageState.autoplaying) return;

    // Events Filter (F)
    if (key === "f") {
      pageState.toggleFilterVisible();
      event.preventDefault();
      return;
    }

    // Help (I/H)
    if (key === "i" || key === "h") {
      pageState.toggleHelpVisible();
      event.preventDefault();
      return;
    }

    // Escape
    if (key === "escape" || code === "Escape") {
      pageState.helpVisible = false;
      pageState.filterVisible = false;
      event.preventDefault();
      return;
    }

    // ArrowLeft
    if (key === "arrowleft" || code === "ArrowLeft") {
      pageState.filter.selectPreviousDate();
      pageState.filter.startDateRepeat("prev");
      event.preventDefault();
      return;
    }

    // ArrowRight
    if (key === "arrowright" || code === "ArrowRight") {
      pageState.filter.selectNextDate();
      pageState.filter.startDateRepeat("next");
      event.preventDefault();
      return;
    }

    if (key === "+" || event.key === "z") {
      event.preventDefault();
      pageState.mapModel.zoomIn();
      return;
    }

    if (key === "-" || event.key == "Z") {
      event.preventDefault();
      pageState.mapModel.zoomOut();
      return;
    }

    // Unzoom to initial level (U, R, B)
    if (key === "u" || key === "r" || key === "b") {
      event.preventDefault();
      if (pageState.mapModel.canPopBounds) {
        pageState.mapModel.popBounds();
      }
      return;
    }
  }

  function handleKeyup(event: KeyboardEvent) {
    if (pageState.autoplaying) return;

    const left = "ArrowLeft";
    const right = "ArrowRight";

    if (
      event.key === left ||
      event.code === left ||
      event.key === right ||
      event.code === right
    ) {
      pageState.filter.stopDateRepeat();
    }
  }

  function saveShownTourToCookie() {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    document.cookie = `hasShownTour=true; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
  }

  function hasShownTourCookieExists() {
    return document.cookie
      .split("; ")
      .some((row) => row.startsWith("hasShownTour="));
  }

  const mapTitle = $derived(
    `Map of ${
      pageState.filter.namedRegion
        ? prettifyNamedRegion(pageState.filter.namedRegion)
        : "US"
    } Protests`
  );
</script>

<svelte:head>
  <title>{mapTitle}</title>
  <meta
    property="og:title"
    content={`An Interactive Map of US Protests by Date`}
  />
  <meta
    property="og:description"
    content={`An interactive map of US protests, browsable by date.`}
  />
</svelte:head>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div onclick={() => (pageState.filterVisible = false)}>
  <EventMap />
</div>

{#if !pageState.eventModel.isLoading}
  <div class="title-stats-and-filter-container hide-on-popup" transition:fade>
    <div class="title-and-stats-container">
      {#if !deviceInfo.isShort}
        <div class="title-container panel">
          <h1 class="title">{mapTitle}</h1>
        </div>
      {/if}

      <div class="current-date-stats highlight-adjusted-panel">
        <b>{formatDateIndicatingFuture(pageState.filter.currentDate)}</b>
        {#if deviceInfo.isShort}
          protests
        {/if}
        <div class="location-count">
          <button
            class={`link-button`}
            data-suppress-click-outside
            onclick={() => pageState.toggleFilterVisible()}
          >
            {countAndLabel(pageState.filter.filteredEvents, "location")} >
          </button>
        </div>
      </div>
    </div>

    {#if pageState.filter.isFiltering}
      <div transition:slide>
        <FilterIndicator />
      </div>
    {/if}

    {#if !deviceInfo.isShort && pageState.filterVisible}
      <div class="precinct-stats highlight-adjusted-panel" transition:slide>
        <PrecinctStatsPanel />
      </div>

      <div transition:slide>
        <FilterPanel
          className="filter panel"
          onClose={() => (pageState.filterVisible = false)}
        />
      </div>
    {/if}
  </div>

  <div class="toolbar-container hide-on-popup">
    <div class="toolbar">
      <IconButton
        icon={pageState.autoplaying ? pauseIconSvg : playIconSvg}
        onClick={() => pageState.toggleAutoplay()}
        label={pageState.autoplaying
          ? "Pause Animation (Space)"
          : "Play Animation (Space)"}
      />
      <IconButton
        icon={infoIconSvg}
        onClick={() => pageState.toggleHelpVisible()}
        label="Show Help (H)"
      />
    </div>

    {#if pageState.mapModel.canPopBounds}
      <div
        class="toolbar"
        transition:fade={{ duration: 300, easing: cubicInOut }}
      >
        <IconButton
          icon={backArrowSvg}
          onClick={() => pageState.mapModel.popBounds()}
          label="Zoom Back Out (R, U, or B)"
        />
      </div>
    {/if}
  </div>

  <div class="timeline-and-eventinfo">
    {#if pageState.eventInfoVisible}
      <EventInfoPanel />
    {/if}
    <Timeline />
    <div class="date-range">
      <div>{pageState.eventModel.formattedDateRangeStart}</div>
      <div class="attribution-link">
        <i
          >Data provided by <a
            href="https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/preview#gid=1269890748"
            target="_blank"
            title={pageState.eventModel.formattedUpdatedAt}
            >We (the People) Dissent</a
          ></i
        >
      </div>
      <div>{pageState.eventModel.formattedDateRangeEnd}</div>
    </div>
  </div>
{:else}
  <LoadingSpinner size={32} />
{/if}

{#if pageState.helpVisible}
  <ProtestMapTour
    onClose={() => {
      pageState.helpVisible = false;
      saveShownTourToCookie();
    }}
  />
{/if}

<UpgradeBanner />

<style>
  .title-stats-and-filter-container {
    position: fixed;
    top: var(--toolbar-margin);
    left: var(--toolbar-margin);
    width: var(--title-panel-width);
    background: transparent;
    display: flex;
    flex-direction: column;
    gap: 0.4em;
  }

  :global(body.touch-device) .title-stats-and-filter-container {
    left: var(--toolbar-margin);
    transform: none;
  }

  .panel {
    border-radius: var(--panel-border-radius);
    padding: var(--panel-padding-v) var(--panel-padding-h);
    background-color: var(--panel-background-color);
    overflow: hidden;
  }

  .highlight-adjusted-panel {
    /* TODO make this more DRY - it needs to be kept in sync with FilterPanel and FilterIndicator */
    --highlight-border-h: 0.3em;
    border-radius: var(--panel-border-radius);
    padding: var(--panel-padding-v)
      calc(var(--panel-padding-h) - var(--highlight-border-h));
    background-color: var(--panel-background-color);
    overflow: hidden;
  }

  .title-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2em;
  }

  .title-and-stats-container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.2rem;
  }

  .current-date-stats {
    font-size: 0.9em;
    display: flex;
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.05em;
    white-space: nowrap;
  }

  /* Compact view on phones in landscape (same is isShort above)*/
  /* 
* Note we have to hardwire the max-width here, can't use css variables,
* and can't dynamically set the width from a TS variable unless
* we want to use svelte:head. Keep this BREAKPOINT in sync with DeviceInfo.svelte.
*/
  @media (max-height: 400px) {
    .current-date-stats {
      justify-content: start;
      gap: 0.25em;
    }

    .title-stats-and-filter-container {
      left: var(--toolbar-margin);
      transform: none;
      width: auto !important;
    }

    .location-count {
      margin-left: 1em;
    }
  }

  .is-filtering-indicator {
    color: var(--filtered-color);
  }

  .title {
    font-size: 1.1em;
    font-weight: 700;
    margin: 0;
    padding: 0;
    text-align: center;
  }

  .named-region-title-container {
    position: absolute;
    top: var(--toolbar-margin);
    left: 50%;
    transform: translateX(-50%);

    font-weight: bold;
    padding: 0.4em 1em;
    border-radius: 999px;
    z-index: 1000;
  }

  .date-range {
    display: flex;
    justify-content: space-between;
    font-size: 0.8em;
    text-align: center;
    color: #555;
    margin-bottom: 0.4em;
    margin-left: 1em;
    margin-right: 1em;
  }
  .attribution-link {
    font-size: 0.8em;
    color: #555;
  }
  .attribution-link a:hover {
    text-decoration: underline;
  }

  .toolbar-container {
    display: flex;
    flex-direction: column;
    position: fixed;
    gap: 0.3em;
    top: var(--toolbar-margin);
    right: var(--toolbar-margin);
  }

  .toolbar {
    display: flex;
    flex-direction: column;
    border: 2px solid rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    overflow: hidden;
    z-index: 800;
  }

  .toolbar > :global(:not(:last-child)) {
    border-bottom: 1px solid #ccc;
  }

  .toolbar > :global(:last-child) {
    border-bottom: none;
  }

  .timeline-and-eventinfo {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100vw - 2 * var(--toolbar-margin));
    max-width: calc(600px - 2 * var(--toolbar-margin));
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.4em;
  }

  /* 
Hide all overlays that might be occluded by a popup when one appears
(those with .hide-on-popup, plus the built in maplibre zoom controls).
Since maplibre lacks the ability to have popups on top.
*/
  .hide-on-popup {
    transition: opacity 0.5s;
  }
  :global(body:has(.maplibregl-popup-tip)) .hide-on-popup {
    pointer-events: none;
    opacity: 0;
  }
  :global(.maplibregl-ctrl-top-left) {
    transition: opacity 0.5s;
  }

  :global(body:has(.maplibregl-popup-tip))
    :global(:is(.maplibregl-ctrl-top-left, .maplibregl-ctrl-top-left *)) {
    pointer-events: none;
    opacity: 0;
  }
</style>
