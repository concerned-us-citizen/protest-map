<script lang="ts">
  import {
    createPageStateInContext,
    PageState,
  } from "$lib/model/PageState.svelte";
  import ProtestMapTour from "$lib/component/ProtestMapTour.svelte";
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
  import ShareDialog from "$lib/component/ShareDialog.svelte";
  import { onKeyDown, onKeyUp } from "$lib/keyShortcuts";
  import AppBar from "$lib/component/AppBar.svelte";
  import Drawer from "$lib/component/filter/Drawer.svelte";
  import IconButton from "$lib/component/IconButton.svelte";
  import { cubicInOut } from "svelte/easing";
  import { fade } from "svelte/transition";
  import { Undo2 } from "@lucide/svelte";
  import FilterIndicator from "$lib/component/filter/FilterIndicator.svelte";
  import VoterLeanPanel from "$lib/component/filter/VoterLeanPanel.svelte";
  import EventPanel from "$lib/component/filter/EventPanel.svelte";
  import TitlePanel from "$lib/component/TitlePanel.svelte";

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

  // EventInfoPanel becomes visible any time date changes after loading.
  $effect(() => {
    if (pageState.filter.date !== undefined) {
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

<div class="page">
  <AppBar class="app-bar" />
  <div class="map-area">
    <EventMap class="map" />

    <div class="map-overlays">
      <div class="top-row">
        <TitlePanel class="title-panel" />

        {#if pageState.mapModel.canPopBounds}
          <div
            class="zoom-undo-button-wrapper"
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

      <Drawer class="drawer" open={pageState.overlayModel.drawerVisible}>
        <VoterLeanPanel />
        <EventPanel />

        {#if pageState.filter.isFiltering}
          <FilterIndicator />
        {/if}
      </Drawer>

      {#if pageState.updateAvailable}
        <UpdateBanner class="update-banner" />
      {:else if pageState.eventModel.isLoaded}
        <TimelineContainer class="timeline-container" />
      {/if}
    </div>
  </div>

  {#if pageState.overlayModel.showingDialog}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="overlay-click-background"
      onclick={() => pageState.overlayModel.closeAll()}
    ></div>

    <div class="overlay-container">
      {#if pageState.eventModel.isLoading}
        <LoadingSpinner class="spinner" size={32} />
      {/if}

      {#if pageState.overlayModel.helpVisible}
        <ProtestMapTour
          class="dialog"
          onClose={() => {
            pageState.overlayModel.helpVisible = false;
            saveShownTourToCookie();
          }}
        />
      {/if}

      {#if pageState.overlayModel.shareVisible}
        <ShareDialog class="dialog" />
      {/if}
    </div>
  {/if}
</div>

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

  .map-area {
    flex: 1;
    position: relative;
    display: flex;
  }

  :global(.map),
  .map-overlays {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
  }

  .map-overlays {
    pointer-events: none;
    display: flex;
    flex-direction: column;
  }

  :global(.title-panel) {
    flex: 0 0 auto;
    min-width: 15rem;
    max-width: calc(min(20rem, 90vw));
  }

  .top-row {
    flex: 0 0 auto;
    display: flex;
    flex-direction: row;
    padding: 0.5rem;
    align-items: start;
    justify-content: center;
  }

  .zoom-undo-button-wrapper {
    margin-left: auto;
    background-color: #fff;
    border-radius: 5px;
    overflow: hidden;
    pointer-events: auto;
  }

  :global(.drawer) {
    pointer-events: auto;
  }

  :global(.timeline-container),
  :global(.update-banner) {
    flex: 0 0 1;
    padding: 5px 0 0 0;
    pointer-events: auto;
    margin-top: auto;
    align-self: center;
  }

  .overlay-click-background,
  .overlay-container {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }

  .overlay-click-background {
    z-index: var(--dimming-layer);
  }

  .overlay-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: hsl(0 0% 0% / 0.32);
  }

  .overlay-container > :global(*) {
    z-index: var(--overlay-layer);
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
