<script lang="ts">
  import { titleCase } from "title-case";
  import { clickOutside } from "./actions/clickOutside";
  import { deviceInfo } from "./store/DeviceInfo.svelte";
  import { getPageStateFromContext } from "./store/PageState.svelte";
  import { countAndLabel } from "./util/string";

  // svelte-ignore custom_element_props_identifier
  let { className = '', ...restProps } = $props();

  const pageState = getPageStateFromContext();
  const eventNamesWithLocationCounts = $derived(pageState.filter.currentDateEventNamesWithLocationCounts);

</script>

<div class={`events-filter-component ${className}`} use:clickOutside={() => pageState.filterVisible=false} {...restProps}>
  {#if pageState.filter.selectedEventNames.length > 0}
  <h4 class="filter-title">From {pageState.filter.selectedEventNames.length} of {countAndLabel(eventNamesWithLocationCounts, "Event")}</h4>
  {:else}
  <h4 class="filter-title">From {countAndLabel(eventNamesWithLocationCounts, "Protest Event")}</h4>
  {/if}
  {#if eventNamesWithLocationCounts.length > 0}
    <div class="events-section-description">
      {#if pageState.filter.selectedEventNames.length > 0}
      <button class="link-button" onclick={() => pageState.filter.clearSelectedEventNames()}>
        Clear Filter
      </button>
      {:else}
      ({titleCase(deviceInfo.tapOrClick)} to filter by one or more)
      {/if}
    </div>
  {/if}
  <div class="event-list-scrollable-area">
    {#if eventNamesWithLocationCounts.length > 0}
      <div>
        {#each eventNamesWithLocationCounts as event (event.name)}
          <div class="filter-item">
            <button
              type="button"
              onclick={(e) => { e.stopPropagation(); pageState.filter.toggleSelectedEventName(event.name)}}
              class:selected-event={pageState.filter.selectedEventNames.includes(event.name)}
            >
              <div class="event-name-in-list">{event.name || 'Unnamed'}</div>
              <div class="event-count-in-list">({event.count})</div>
            </button>
          </div>
        {/each}
        </div>
    {:else}
      <p class="no-events-message">No events scheduled for this date.</p>
    {/if}
  </div>
</div>

<style>
  .events-filter-component {
    display: flex;
    flex-direction: column;
    position: relative; /* allow close button to be relative to this container */
    --event-list-background: #fffe;
    background: var(--event-list-background);
    border-radius: var(--panel-border-radius);
    --panel-padding-h: .8em;
    --highlight-border-h: .3em;
    --highlight-border-v: .25em;
    padding-left: calc(var(--panel-padding-h) - var(--highlight-border-h));
    padding-right: calc(var(--panel-padding-h) - var(--highlight-border-h));
    padding-top: calc(var(--panel-padding-v) - var(--highlight-border-v));
    padding-bottom: calc(var(--panel-padding-v) - var(--highlight-border-v));
  }

  .events-section-description {
    font-style: italic;
    font-size: 0.9em;
    text-align: center;
    margin-top: .3em;
    margin-bottom: .7em;
    margin-left: var(--highlight-border-h);
    margin-right: var(--highlight-border-h);
  }
  .filter-title {
    font-size: 0.9em;
    font-weight: bold;
    margin-top: .5em;
    margin-bottom: 0;
    margin-left: var(--highlight-border-h);
    margin-right: var(--highlight-border-h);
    text-align: center;
  }
  .event-list-scrollable-area {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow-y: auto;
    /* TODO this should take title and slider heights into account */
    max-height: 30vh;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .event-list-scrollable-area::-webkit-scrollbar {
    display: none;
  }

  .event-list-scrollable-area .filter-item {
    display: block;
    padding: 0;
    margin: 0;
  }

  .event-list-scrollable-area .filter-item button {
  appearance: none;
  -webkit-appearance: none;
    background: none;
    font: inherit;
    color: inherit;
    width: 100%;
    min-width: 0;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: start;
    font-size: 0.85em;
    border-radius: 5px;
    margin-top: 1px;
    padding: 0;
    --background-color: var(--event-list-background);
    background-color: var(--background-color);
    border-left: var(--highlight-border-h) solid var(--background-color);
    border-right: var(--highlight-border-h) solid var(--background-color);
    border-top: var(--highlight-border-v) solid var(--background-color);
    border-bottom: var(--highlight-border-v) solid var(--background-color);
    --color-fade: .2s;
    transition: 
      background-color var(--color-fade) ease,
      border-left var(--color-fade) ease,
      border-right var(--color-fade) ease,
      border-top var(--color-fade) ease,
      border-bottom var(--color-fade) ease;
    cursor: pointer;
  }

  .event-list-scrollable-area .filter-item button:hover {
    --background-color: var(--hover-color);
  }
  .event-list-scrollable-area .filter-item button.selected-event {
    font-weight: bold;
    --background-color: var(--selected-color);
  }
  .event-list-scrollable-area .filter-item button.selected-event:hover {
    --background-color: var(--hover-selected-color);
  }
  .no-events-message {
    font-size: 0.8em;
    color: #666;
    text-align: center;
    padding: 10px 0;
  }
  .event-name-in-list {
    overflow-wrap:anywhere;
  }
  .event-count-in-list {
    margin-left: 8px;
    font-size: 0.9em;
    color: #777;
  }
</style>
