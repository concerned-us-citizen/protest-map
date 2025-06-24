<script lang="ts">
  import {
    createPageStateInContext,
    PageState,
  } from "$lib/model/PageState.svelte";
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte.js";
  import ProtestMapTour from "$lib/ProtestMapTour.svelte";
  import EventInfoPanel from "$lib/EventInfoPanel.svelte";
  import EventNamePanel from "$lib/EventFilterPanel.svelte";
  import { formatDateIndicatingFuture } from "$lib/util/date.js";
  import { countAndLabel } from "$lib/util/string";
  import Timeline from "$lib/Timeline.svelte";
  import IconButton from "$lib/IconButton.svelte";
  import EventMap from "$lib/map/EventMap.svelte";
  import { cubicInOut } from "svelte/easing";
  import { fade, slide } from "svelte/transition";
  import VoterLeanPanel from "$lib/VoterLeanPanel.svelte";
  import UpgradeBanner from "$lib/UpgradeBanner.svelte";
  import LoadingSpinner from "$lib/LoadingSpinner.svelte";
  import { page } from "$app/stores";
  import FilterIndicator from "$lib/FilterIndicator.svelte";
  import { prettifyNamedRegion } from "$lib/model/RegionModel";
  import {
    CirclePlay,
    CirclePause,
    Info,
    Undo2,
    Search,
    Share,
    Menu,
    ChevronRight,
  } from "@lucide/svelte";
  import RegionNavigationDialog from "$lib/RegionNavigationDialog.svelte";
  import {
    getSearchParamsFromState,
    setStateFromWindowSearchParams,
  } from "$lib/model/searchParamsToStateSync.svelte";
  import { getShortcutPrefix } from "$lib/util/os";
  import ShareDialog from "$lib/ShareDialog.svelte";

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
    // Ignore modifiers by themselves
    const modifierKeys = ["Control", "Shift", "Alt", "Meta"];
    if (modifierKeys.includes(event.key)) return;

    // All shortcuts begin with ctrl-option-cmd
    if (!(event.ctrlKey && event.altKey && event.metaKey)) return;

    const key = event.key.toLowerCase();
    const code = event.code;

    console.log(`Key: ${key} code: ${code}`);

    // Spacebar always toggles playback
    if (code === "Space") {
      pageState.toggleAutoplay();
      event.preventDefault();
      return;
    }

    // Events Filter (F)
    if (code === "KeyF") {
      pageState.toggleFilterVisible();
      event.preventDefault();
      return;
    }

    // Help (I/H)
    if (code === "KeyI" || code === "KeyH") {
      pageState.toggleHelpVisible();
      event.preventDefault();
      return;
    }

    // Jump to Region (J)
    if (code === "KeyJ") {
      pageState.navigationVisible = true;
      event.preventDefault();
      return;
    }

    // Escape
    if (code === "Escape") {
      pageState.helpVisible = false;
      pageState.filterVisible = false;
      event.preventDefault();
      return;
    }

    // Toggle Menu
    if (code === "KeyM") {
      if (deviceInfo.isSmall) {
        pageState.toggleMenuVisible();
      }
    }

    // ArrowLeft
    if (code === "ArrowLeft") {
      pageState.filter.selectPreviousDate();
      pageState.filter.startDateRepeat("prev");
      event.preventDefault();
      return;
    }

    // ArrowRight
    if (code === "ArrowRight") {
      pageState.filter.selectNextDate();
      pageState.filter.startDateRepeat("next");
      event.preventDefault();
      return;
    }

    if (code === "Equal" || code === "KeyZ") {
      event.preventDefault();
      pageState.mapModel.zoomIn();
      return;
    }

    if (code === "Minus" || (code == "KeyZ" && event.shiftKey)) {
      event.preventDefault();
      pageState.mapModel.zoomOut();
      return;
    }

    // Unzoom to last level (U, R, B)
    if (code === "KeyU" || code === "KeyR" || code === "KeyB") {
      event.preventDefault();
      if (pageState.mapModel.canPopBounds) {
        pageState.mapModel.popBounds();
      }
      return;
    }
  }

  function handleKeyup(event: KeyboardEvent) {
    // All shortcuts begin with shift-option-cmd
    if (!(event.shiftKey && event.altKey && event.metaKey && !event.ctrlKey))
      return;

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
    `${
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
<div
  onclick={() => {
    pageState.filterVisible = false;
    pageState.menuVisible = false;
  }}
>
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
        <div
          class={{
            "location-count": true,
            "is-filtering-indicator": pageState.filter.isFiltering,
          }}
        >
          <button
            class={`pill-button`}
            data-suppress-click-outside
            title={`${pageState.filterVisible ? "Hide" : "Show"} Filter (${getShortcutPrefix()}F)`}
            onclick={() => pageState.toggleFilterVisible()}
          >
            {countAndLabel(
              pageState.filter.currentDateFilteredEvents,
              "location"
            )}
            {pageState.filter.isFiltering ? "(Filtered)" : ""}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>

    {#if !deviceInfo.isShort && pageState.filterVisible}
      <div class="filter-container" transition:slide>
        <div class="precinct-stats highlight-adjusted-panel">
          <VoterLeanPanel />
        </div>

        <div>
          <EventNamePanel
            className="filter panel"
            onClose={() => (pageState.filterVisible = false)}
          />
        </div>

        {#if pageState.filter.isFiltering}
          <div transition:slide>
            <FilterIndicator />
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="toolbar-container hide-on-popup">
    <div class="toolbar">
      {#if deviceInfo.isSmall}
        <IconButton
          onClick={() => pageState.toggleMenuVisible()}
          label={`Show Toolbar (${getShortcutPrefix()}M)`}
        >
          <Menu />
        </IconButton>
      {/if}
      {#if !deviceInfo.isSmall || pageState.menuVisible}
        <IconButton
          onClick={() => pageState.toggleNavigationVisible()}
          label={`Find a city, state, or ZIP code (${getShortcutPrefix()}F)`}
        >
          <Search />
        </IconButton>
        <IconButton
          onClick={() => pageState.toggleShareVisible()}
          label={`Share a link to this page (${getShortcutPrefix()}S)`}
        >
          <Share />
        </IconButton>
        <IconButton
          onClick={() => pageState.toggleAutoplay()}
          label={pageState.autoplaying
            ? `Pause Animation (${getShortcutPrefix()}Space)`
            : `Play Animation (${getShortcutPrefix()}Space)`}
        >
          {#if pageState.autoplaying}
            <CirclePause />
          {:else}
            <CirclePlay />
          {/if}
        </IconButton>
        <IconButton
          onClick={() => pageState.toggleHelpVisible()}
          label={`Show Help (${getShortcutPrefix()}H)`}
        >
          <Info />
        </IconButton>
      {/if}
    </div>

    {#if pageState.mapModel.canPopBounds}
      <div
        class="toolbar"
        transition:fade={{ duration: 300, easing: cubicInOut }}
      >
        <IconButton
          onClick={() => pageState.mapModel.popBounds()}
          label={"Zoom Back Out (${getShortcutPrefix()}R, +U, or +B)"}
        >
          <Undo2 />
        </IconButton>
      </div>
    {/if}
  </div>

  <div class="timeline-and-eventinfo">
    {#if pageState.eventInfoVisible}
      <EventInfoPanel />
    {/if}
    <Timeline />
    <div class="date-range">
      <div>{pageState.filter.formattedDateRangeStart}</div>
      <div class="attribution-link">
        <i
          >{deviceInfo.isSmall ? "Data:" : "Data provided by"}
          <a
            href="https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/preview#gid=1269890748"
            target="_blank"
            title={pageState.eventModel.formattedUpdatedAt}
            >We (the People) Dissent</a
          ></i
        >
      </div>
      <div>{pageState.filter.formattedDateRangeEnd}</div>
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

{#if pageState.navigationVisible}
  <RegionNavigationDialog />
{/if}

{#if pageState.shareVisible}
  <ShareDialog />
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
    /* TODO make this more DRY - it needs to be kept in sync with EventNameFilterPanel and FilterIndicator */
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

  .location-count {
    padding-right: 0; /* chevron icon provides 5 to the right */
    margin-right: -5px;
  }

  .location-count button {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .is-filtering-indicator button {
    background: var(--filtered-color);
  }

  .filter-container {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
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
    text-align: baseline;
    color: #555;
    margin-bottom: 0.4em;
    margin-left: 1em;
    margin-right: 1em;
  }
  .attribution-link {
    font-size: 0.7rem;
    color: #555;
  }
  .attribution-link a {
    text-decoration: none !important;
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
