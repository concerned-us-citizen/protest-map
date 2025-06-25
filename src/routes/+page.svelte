<script lang="ts">
  import {
    createPageStateInContext,
    PageState,
  } from "$lib/model/PageState.svelte";
  import ProtestMapTour from "$lib/component/ProtestMapTour.svelte";
  import EventMap from "$lib/component/map/EventMap.svelte";
  import { fade } from "svelte/transition";
  import UpgradeBanner from "$lib/component/UpgradeBanner.svelte";
  import LoadingSpinner from "$lib/component/LoadingSpinner.svelte";
  import { page } from "$app/stores";
  import { prettifyNamedRegion } from "$lib/model/RegionModel";
  import RegionNavigationDialog from "$lib/component/RegionNavigationDialog.svelte";
  import {
    getSearchParamsFromState,
    setStateFromWindowSearchParams,
  } from "$lib/model/searchParamsToStateSync.svelte";
  import TimelineContainer from "$lib/component/timeline/TimelineContainer.svelte";
  import ShareDialog from "$lib/component/ShareDialog.svelte";
  import { onKeyDown, onKeyUp } from "$lib/keyShortcuts";
  import Toolbar from "../lib/component/Toolbar.svelte";
  import FilterContainer from "$lib/component/filter/FilterContainer.svelte";
  import TitleContainer from "$lib/component/TitleContainer.svelte";
  import ClickOverlay from "$lib/component/ClickOverlay.svelte";
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";

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
  const handleKeyUp = (e: KeyboardEvent): void => {
    onKeyUp(e, pageState);
  };

  $effect(() => {
    pageState.overlayModel.helpVisible = !hasShownTourCookieExists();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      pageState.cleanup();
    };
  });

  // EventInfoPanel becomes visible any time currentDate changes after loading.
  $effect(() => {
    if (pageState.filter.currentDate !== undefined) {
      pageState.showEventInfo();
    }
  });

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

  const title = $derived(
    `Protests in ${
      pageState.filter.namedRegion
        ? prettifyNamedRegion(pageState.filter.namedRegion)
        : "the US"
    }`
  );
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

<div class="layout">
  <EventMap />

  {#if pageState.eventModel.isLoaded}
    <div class="title-and-filter-wrapper">
      <div
        class={[
          "title-and-filter",
          "hide-on-popup",
          { isNarrow: deviceInfo.isNarrow },
        ]}
        transition:fade
      >
        <TitleContainer {title} />

        {#if pageState.overlayModel.filterVisible}
          <FilterContainer />
        {/if}
      </div>
    </div>

    <div class="toolbar hide-on-popup">
      <Toolbar />
    </div>

    <div class="timeline">
      <TimelineContainer />
    </div>
  {/if}
</div>

{#if pageState.overlayModel.showingDialog}
  <ClickOverlay />
{/if}

<div class="overlay-container">
  {#if pageState.eventModel.isLoading}
    <div class="spinner">
      <LoadingSpinner size={32} />
    </div>
  {/if}

  {#if pageState.overlayModel.helpVisible}
    <div class="dialog">
      <ProtestMapTour
        onClose={() => {
          pageState.overlayModel.helpVisible = false;
          saveShownTourToCookie();
        }}
      />
    </div>
  {/if}

  {#if pageState.overlayModel.navigationVisible}
    <div class="dialog">
      <RegionNavigationDialog />
    </div>
  {/if}

  {#if pageState.overlayModel.shareVisible}
    <div class="dialog">
      <ShareDialog />
    </div>
  {/if}

  {#if pageState.updateAvailable}
    <div class="banner">
      <UpgradeBanner />
    </div>
  {/if}
</div>

<style>
  :root {
    --gap: 0.5rem;
  }
  .layout {
    height: 100dvh; /* full viewport minus safe-area */
    box-sizing: border-box;
    padding: var(--gap);
    display: grid;
    gap: var(--gap); /* margin between items */

    grid-template-columns: auto 1fr auto;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
      " title    .     toolbar "
      " title    .     toolbar "
      " timeline timeline timeline ";
    z-index: var(--controls-layer);
  }

  .title-and-filter-wrapper {
    grid-area: title;
    pointer-events: none;
    z-index: var(--overlay-layer);
  }

  .title-and-filter {
    pointer-events: auto;
    width: 20rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .title-and-filter.isNarrow {
    width: 16rem;
  }
  .toolbar {
    grid-area: toolbar;
    justify-self: end;
  }

  .timeline {
    grid-area: timeline;
  }

  .overlay-container {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: var(--dimming-layer);
  }

  /* Common styles for all absolutely positioned children to center horizontally */
  .overlay-container > div {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  .dialog {
    top: 14vh;
  }

  .spinner {
    top: 30vh;
  }

  .banner {
    bottom: 1.75rem;
    width: 80%;
    max-width: 20rem;
  }

  /* 
  Hide all components that might be occluded by a popup when one appears
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
