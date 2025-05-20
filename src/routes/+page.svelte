<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import type { ProtestEventDataJson } from '$lib/types.ts';
  import { isWideViewport } from '$lib/store/viewportStore.svelte';
  import MapDisplay from '$lib/MapDisplay.svelte';
  import ProtestMapTour from '$lib/ProtestMapTour.svelte';
  import EventInfo from '$lib/EventInfo.svelte';
  import EventsFilter from '$lib/EventsFilter.svelte';
  import { playIconSvg, pauseIconSvg, filterIconSvg, infoIconSvg } from '$lib/icons';
  import { formatDateIndicatingFuture } from '$lib/util/dates.js';
  import { createPageStateInContext } from '$lib/store/PageState.svelte';
  import { countAndLabel } from '$lib/util/string';
  import Timeline from '$lib/Timeline.svelte';
  import IconButton from '$lib/IconButton.svelte';

  export let data: ProtestEventDataJson;

  let pageState = createPageStateInContext();

  // EventInfo becomes visible any time currentDate changes after mounting.
  let mounted = false;
  $: if (mounted && pageState.filter.currentDate !== undefined) {
    pageState.showEventInfo();
  }

  let hasLoaded = false;
  $: if (!hasLoaded && data) {
    pageState.eventStore.loadData(data);
    hasLoaded = true;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const key = event.key.toLowerCase();
    const code = event.code;

    // Spacebar always toggles playback
    if (key === ' ' || code === 'Space') {
      pageState.toggleAutoplay();
      event.preventDefault();
      return;
    }

    // All other shortcuts are only active when NOT playing
    if (pageState.autoplaying) return;

    // Events Filter (F)
    if (key === 'f') {
      pageState.toggleFilterVisible();
      event.preventDefault();
      return;
    }

    // Help (I/H)
    if (key === 'i' || key === 'h') {
      pageState.toggleHelpVisible();
      event.preventDefault();
      return;
    }

    // Escape
    if (key === 'escape' || code === 'Escape') {
      pageState.helpVisible = false;
      pageState.filterVisible = false;
      event.preventDefault();
      return;
    }

    // ArrowLeft
    if (key === 'arrowleft' || code === 'ArrowLeft') {
      if (!event.repeat) {
        pageState.filter.selectPreviousDate();
        pageState.filter.startDateRepeat("prev");
      }
      event.preventDefault();
      return;
    }

    // ArrowRight
    if (key === 'arrowright' || code === 'ArrowRight') {
      if (!event.repeat) {
        pageState.filter.selectNextDate();
        pageState.filter.startDateRepeat("next");
      }
      event.preventDefault();
      return;
    }
  }

  function handleKeyup(event: KeyboardEvent) {
    if (pageState.autoplaying) return;
    
    const left = 'ArrowLeft';
    const right = 'ArrowRight';

    if (event.key === left || 
        event.code === left ||
        event.key === right || 
        event.code === right) {
        pageState.filter.stopDateRepeat();
      }
  }

  function saveShownTourToCookie() {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    document.cookie = `hasShownTour=true; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
  }

  function hasShownTourCookieExists() {
    return document.cookie.split('; ').some(row => row.startsWith('hasShownTour='));
  }

  onMount(async () => {
    mounted = true;
    if (browser) {
      pageState.helpVisible = !hasShownTourCookieExists();

      window.addEventListener('keydown', handleKeydown);
      window.addEventListener('keyup', handleKeyup);
    }
  });

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('keyup', handleKeyup);
    }
    pageState.cleanup();
  });
  
</script>

<svelte:head>
  <title>US Protests Map</title>
  <meta property="og:title" content={`A Map of Protests ${pageState.eventStore.formattedDateRange}`} />
  <meta property="og:description" content={`An interactive map of protests ${pageState.eventStore.formattedDateRange}`} />
</svelte:head>

<MapDisplay/>

<div class="title-stats-and-filter-container">
  <div class="title-and-stats-container panel">

    <h1 class="title">
      Map of Protests
    </h1>
    <div class="date-range">
      {pageState.eventStore.formattedDateRange}
    </div>
    <div class="attribution-link">
      <i>Provided by <a
        href="https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/preview#gid=1269890748"
        target="_blank"
        title={pageState.eventStore.formattedUpdatedAt}
      >We (the People) Dissent</a></i>
    </div>

    <div class="current-date-stats panel">
      <b>{formatDateIndicatingFuture(pageState.filter.currentDate)}</b>
      <div class="location-count">{countAndLabel(pageState.filter.currentDateEvents, isWideViewport ? 'location' : 'loc')}</div>
    </div>
  </div>

  {#if pageState.filterVisible && pageState.filter.currentDateHasEventNames }
      <EventsFilter className="filter panel" onClose={() => pageState.filterVisible = false} />
  {/if}
</div>

<div class="toolbar">
  <IconButton
    icon={pageState.autoplaying ? pauseIconSvg : playIconSvg}
    onClick={() => pageState.toggleAutoplay()} 
    label={pageState.autoplaying ? 'Pause Animation (Space)' : 'Play Animation (Space)'}
  />

  <IconButton
    icon={filterIconSvg}
    onClick={() => {
      if (pageState.filter.currentDateEventNamesWithLocationCounts.length > 1) {
        pageState.toggleFilterVisible();
      }
    }}
    label={!pageState.filter.currentDateHasEventNames ? "No events to filter" : "Toggle Event Filter (F)"}
    disabled={!pageState.filter.currentDateHasEventNames}
  />

  <IconButton
    icon={infoIconSvg}
    onClick={() => pageState.toggleHelpVisible()} 
    label="Show Information Panel (I)"
  />
</div>

<div class="timeline-and-eventinfo">

  {#if pageState.eventInfoVisible}
    <EventInfo />
  {/if}

  <Timeline />
</div>

{#if pageState.helpVisible}
  <ProtestMapTour dataLastUpdated={data?.updatedAt} onClose={() => {
    pageState.helpVisible = false;
    saveShownTourToCookie();
  }} />
{/if}

<style>
.title-stats-and-filter-container {  
  position: fixed;
  top: var(--toolbar-margin);
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100vw - 2 * (var(--icon-button-size) + 2 * var(--toolbar-margin)));
  width: fit-content;
  background: transparent;
}

.panel {
  border-radius: var(--panel-border-radius);
  padding: var(--panel-padding);
  background-color: var(--panel-background-color);
}

.title-and-stats-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

h1 {
  font-size: 1.1em;
  font-weight: bold;
  margin: 0px;
}

.date-range {
  font-size: 0.8em; 
  text-align: center; 
  color: #555;
}
.attribution-link {
  font-size: 0.7em;
  color: #555;
}
.attribution-link a:hover {
  text-decoration: underline;
}

.toolbar {
  background-color: var(--panel-background-color);
}

.toolbar > :global(:not(:last-child)) {
  border-bottom: 1px solid #ccc; /* Separator line, slightly darker than #ddd */
}

.toolbar > :global(:last-child) {
  border-bottom: none;
}

.timeline-and-eventinfo {
  position: fixed;
  bottom: var(--toolbar-margin);
  left: 50%;
  transform: translateX(-50%);
  width: calc(100vw - 2 * var(--toolbar-margin));
  width: fit-content;
}

@media (max-width: var(--bp-wide)) {
  .timeline-and-eventinfo {
    max-width: 800px;
  }
}

</style>