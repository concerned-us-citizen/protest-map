<script lang="ts">
  import { deviceInfo } from '$lib/store/DeviceInfo.svelte.js';
  import ProtestMapTour from '$lib/ProtestMapTour.svelte';
  import EventInfoPanel from '$lib/EventInfoPanel.svelte';
  import FilterPanel from '$lib/FilterPanel.svelte';
  import { playIconSvg, pauseIconSvg, filterIconSvg, infoIconSvg } from '$lib/icons';
  import { formatDateIndicatingFuture } from '$lib/util/date.js';
  import { createPageStateInContext } from '$lib/store/PageState.svelte';
  import { countAndLabel } from '$lib/util/string';
  import Timeline from '$lib/Timeline.svelte';
  import IconButton from '$lib/IconButton.svelte';
  import EventMap from '$lib/EventMap.svelte';

  const { data } = $props();

  let pageState = createPageStateInContext();

  $effect(() => {

    pageState.helpVisible = !hasShownTourCookieExists();

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('keyup', handleKeyup);
      pageState.cleanup();
    }
  });

  let hasLoaded = $state(false);
  $effect(() => {
    if (hasLoaded === false && data) {
      pageState.eventStore.loadData(data);
      hasLoaded = true;
    }
  });

  // EventInfoPanel becomes visible any time currentDate changes after loading.
  $effect(() => {
    if (hasLoaded === false) return;
    if (pageState.filter.currentDate !== undefined) {
      pageState.showEventInfo();
    }
  });

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
      pageState.filter.selectPreviousDate();
      pageState.filter.startDateRepeat("prev");
      event.preventDefault();
      return;
    }

    // ArrowRight
    if (key === 'arrowright' || code === 'ArrowRight') {
      pageState.filter.selectNextDate();
      pageState.filter.startDateRepeat("next");
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
  
</script>

<svelte:head>
  <title>US Protests Map</title>
  <meta property="og:title" content={`A Map of Protests ${pageState.eventStore.formattedDateRange}`} />
  <meta property="og:description" content={`An interactive map of protests ${pageState.eventStore.formattedDateRange}`} />
</svelte:head>

 <EventMap />

<div class="title-stats-and-filter-container">
  <div class="title-and-stats-container">
    <div class="title-container panel">
      <h1 class="title">
        Map of Protests
      </h1>
      <div class="date-range">
        {pageState.eventStore.formattedDateRange}
      </div>
      {#if deviceInfo.isTall}
      <div class="attribution-link">
        <i>Provided by <a
          href="https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/preview#gid=1269890748"
          target="_blank"
          title={pageState.eventStore.formattedUpdatedAt}
        >We (the People) Dissent</a></i>
      </div>
      {/if}
    </div>

    <div class="current-date-stats panel">
      <b>{formatDateIndicatingFuture(pageState.filter.currentDate)}</b>
      <div class="location-count">{countAndLabel(pageState.filter.currentDateEvents, 'location')}</div>
    </div>
  </div>

  {#if pageState.filterVisible }
      <FilterPanel className="filter panel" onClose={() => pageState.filterVisible = false} />
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
    onClick={() => pageState.toggleFilterVisible() }
    label={!pageState.filter.currentDateHasEventNames ? "No events to filter" : "Toggle Event Filter (F)"}
    disabled={!pageState.filter.currentDateHasMultipleEventNames}
  />

  <IconButton
    icon={infoIconSvg}
    onClick={() => pageState.toggleHelpVisible()} 
    label="Show Information Panel (I)"
  />
</div>

<div class="timeline-and-eventinfo">

  {#if pageState.eventInfoVisible}
    <EventInfoPanel />
  {/if}

  <Timeline />
</div>

{#if pageState.helpVisible}
  <ProtestMapTour onClose={() => {
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
  min-width: 13em;
  max-width: calc(100vw - 2 * (var(--icon-button-size) - 2 * var(--toolbar-margin)));
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: .4em;
}

:global(body.touch-device) .title-stats-and-filter-container  {
  left: var(--toolbar-margin);
  transform: none;
}

.panel {
  border-radius: var(--panel-border-radius);
  padding: var(--panel-padding-v) var(--panel-padding-h);
  background-color: var(--panel-background-color);
  overflow: hidden;
}

.title-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .2em;
}

.title-container .attribution-link {
  font-size: .6em;
}

.title-and-stats-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.2rem;
}

.current-date-stats {
  font-size: .9em;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between; 
  gap: 1em; 
  white-space: nowrap;
}

.title {
  font-size: 1.1em;
  font-weight: 700;
  margin: 0;
  padding: 0;
  text-align: center;
}

.date-range {
  font-size: 0.8em; 
  text-align: center; 
  color: #555;
}
.attribution-link {
  margin-top: .7em;
  font-size: 0.7em;
  color: #555;
}
.attribution-link a:hover {
  text-decoration: underline;
}

.toolbar {
  display: flex;
  flex-direction: column;
  position: fixed;
  top: var(--toolbar-margin);
  right: var(--toolbar-margin);
  border: 2px solid rgba(0,0,0,0.2);
  border-radius: 2px;
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
  bottom: var(--toolbar-margin);
  left: 50%;
  transform: translateX(-50%);
  width: calc(100vw - 2 * var(--toolbar-margin));
  max-width: calc(600px - 2 * var(--toolbar-margin));
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: .4em;
}

</style>