<script lang="ts">
  import { getPageStateFromContext } from "./store/PageState.svelte";
  import { countAndLabel } from "./util/string";

  export let onClose: () => void;
  export let className = '';

  const pageState = getPageStateFromContext();
  const eventNamesWithLocationCounts = pageState.filter.currentDateEventNamesWithLocationCounts;
  
</script>

<div class={`events-filter-component ${className}`}>
  <button class="close-button" on:click={onClose} aria-label="Close filter">×</button>
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
              on:click|stopPropagation={() => pageState.filter.toggleSelectedEventName(event.name)}
              class:selected-event={pageState.filter.selectedEventNames.includes(event.name)}
            >
              <span class="event-name-in-list">{event.name || 'Unnamed'}</span>
              <span class="event-count-in-list">({event.count})</span>
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
    position: relative; /* For positioning the close button */
  }
  .close-button {
    position: absolute;
    top: 2px;
    right: 5px;
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
    margin-bottom: 10px;
  }
  .filter-title {
    font-size: 0.9em;
    font-weight: bold;
    margin-top: 8px; /* Explicitly remove top margin */
    margin-bottom: 2px;
    text-align: center;
  }
  .event-list-scrollable-area {
    overflow-y: auto;
    max-height: 235px; /* Keep original height */
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .event-list-scrollable-area::-webkit-scrollbar {
    display: none;
  }
  .event-list-scrollable-area ul {
    list-style-type: none !important;
    padding-left: 0 !important;
    margin: 0;
  }
  .event-list-scrollable-area li.filter-item {
    padding: 0; /* Padding will be on the button for hover effect */
    margin: 0;
    /* border-bottom: 1px solid #eee; Moved to button, or keep on li if preferred */
  }

  .event-list-scrollable-area li.filter-item button {
    background: none;
    border: 0px solid transparent !important;
    font: inherit;
    color: inherit;
    text-align: left;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85em;
    padding: 4px 8px; /* Added horizontal padding */
    border-bottom: 1px solid #eee;
    cursor: pointer;
    margin: 0 -8px; /* Negative margin to extend hover background if padding is on button */
  }
   .event-list-scrollable-area li.filter-item:last-child button {
    border-bottom: none;
  }
  .event-list-scrollable-area li.filter-item button.selected-event {
    font-weight: bold;
    background-color: #e8f0fe; /* Light blue for selected, distinct from hover */
  }
  .event-list-scrollable-area li.filter-item button:hover {
    background-color: #f0f0f0;
  }
  .event-list-scrollable-area li.filter-item button.selected-event:hover {
    background-color: #dceaff; /* Slightly darker blue for selected hover */
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