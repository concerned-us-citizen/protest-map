<script lang="ts">
  import { getPageStateFromContext } from "./store/PageState.svelte";
  import { countAndLabel } from "./util/string";

  let { onClose, className = '' } = $props();

  const pageState = getPageStateFromContext();
  const eventNamesWithLocationCounts = $derived(pageState.filter.currentDateEventNamesWithLocationCounts);

</script>

<div class={`events-filter-component ${className}`}>
  <button class="close-button" onclick={onClose} aria-label="Close filter">×</button>
  <h4 class="filter-title">{countAndLabel(eventNamesWithLocationCounts, "Event")}</h4>
  {#if eventNamesWithLocationCounts.length > 0}
    <div class="events-section-description">(Tap to toggle one or more)</div>
  {/if}
  <div class="event-list-scrollable-area">
    {#if eventNamesWithLocationCounts.length > 0}
      <ul>
        {#each eventNamesWithLocationCounts as event (event.name)}
          <li class="filter-item">
            <button
              type="button"
              onclick={(e) => { e.stopPropagation(); pageState.filter.toggleSelectedEventName(event.name)}}
              class:selected-event={pageState.filter.selectedEventNames.includes(event.name)}
            >
              <div class="event-name-in-list">{event.name || 'Unnamed'}</div>
              <div class="event-count-in-list">({event.count})</div>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="no-events-message">No events scheduled for this date.</p>
    {/if}
  </div>
</div>

<style>
  .events-filter-component {
    display: flex;
    flex-direction: column;
    position: relative; 
    background: #fffe;
    max-width: 20em;
    border-radius: var(--panel-border-radius);
    --panel-padding-h: .8em;
    --highlight-border-h: .3em;
    --highlight-border-v: .25em;
    --selected-color: #e8f0fe;
    --hover-color: #f0f0f0;
    --hover-selected-color: #dceafe;
    padding-left: calc(var(--panel-padding-h) - var(--highlight-border-h));
    padding-right: calc(var(--panel-padding-h) - var(--highlight-border-h));
    padding-top: calc(var(--panel-padding-v) - var(--highlight-border-v));
    padding-bottom: calc(var(--panel-padding-v) - var(--highlight-border-v));
  }

  .close-button {
    position: absolute;
    top: .1em;
    right: .2em;
    background: none;
    border: none;
    font-size: 1.5em;
    line-height: 1;
    padding: 0;
    cursor: pointer;
    color: #888;
  }
  .close-button:hover {
    color: #333;
  }
  .events-section-description {
    font-style: italic;
    font-size: 0.75em;
    text-align: center;
    margin-bottom: .7em;
  }
  .filter-title {
    font-size: 0.9em;
    font-weight: bold;
    margin-top: .5em;
    margin-bottom: .1em;
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
  .event-list-scrollable-area ul {
    list-style-type: none !important;
    padding: 0 !important;
    margin: 0;
  }
  .event-list-scrollable-area li.filter-item {
    display: block;
    padding: 0;
    margin: 0;
  }

  .event-list-scrollable-area li.filter-item button {
    background: none;
    font: inherit;
    color: inherit;
    width: 100%;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: start;
    font-size: 0.85em;
    border-radius: 5px;
    margin-top: 1px;
    padding: 0;
    --background-color: transparent;
    border-left: var(--highlight-border-h) solid var(--background-color);
    border-right: var(--highlight-border-h) solid var(--background-color);
    border-top: var(--highlight-border-v) solid var(--background-color);
    border-bottom: var(--highlight-border-v) solid var(--background-color);
    background-color: var(--background-color);
    cursor: pointer;
  }
  .event-list-scrollable-area li.filter-item button:hover {
    --background-color: var(--hover-color);
  }
  .event-list-scrollable-area li.filter-item button.selected-event {
    font-weight: bold;
    --background-color: var(--selected-color);
  }
  .event-list-scrollable-area li.filter-item button.selected-event:hover {
    --background-color: var(--hover-selected-color);
  }
  .no-events-message { /* Style for the "no events" paragraph */
    font-size: 0.8em;
    color: #666;
    text-align: center;
    padding: 10px 0;
  }
  .event-list-scrollable-area li .event-name-in-list {
    flex-grow: 1;
    flex-shrink: 1; /* Allow text to shrink */
    overflow-wrap: break-word; /* Allow long words to break and wrap */
  }
  .event-list-scrollable-area li .event-count-in-list {
    margin-left: 8px;
    font-size: 0.9em;
    color: #777;
  }
</style>
