<script lang="ts">
  import { fade } from "svelte/transition";
  import {formatDateIndicatingFuture } from "./util/date";
  import { cubicInOut } from "svelte/easing";
  import { countAndLabel } from "./util/string";
  import { getPageStateFromContext } from "./store/PageState.svelte";

  export let className = '';

  const pageState = getPageStateFromContext();
</script>

<div class={`event-info ${className}`} transition:fade={{ duration: 300, easing: cubicInOut }}>
  {#if pageState.filter.currentDateEvents.length > 0}
    <div class="counts-line">
      <strong>
        <span class="date-display">{formatDateIndicatingFuture(pageState.filter.currentDate)} </span>
        <span class="stats-display">{countAndLabel(pageState.filter.currentDateEventNamesWithLocationCounts, "Event")}, {countAndLabel(pageState.filter.currentDateEvents, "Location")}</span>
      </strong>
    </div>
    <div class="event-names-summary-text">
      {
      pageState.filter.currentDateEventNamesWithLocationCounts
        .map(nc => nc.name)
        .join(", ")
      }
    </div>
  {:else}
    <div class="no-events-message">
      No named events
    </div>
  {/if}
</div>

<style>
  .event-info {
    font-size: 0.9em;
    padding: 0 5px; /* Minimal padding, adjust as needed */
    background-color: rgba(245, 245, 245, 0.8); /* Semi-transparent background */
    border-radius: 8px;
    padding: 8px; /* Match slider padding */
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1); /* Match slider shadow */
    font-size: 0.9em; /* Match slider font size */
    transition: opacity 0.3s ease-in-out; /* Fade transition */
    max-height: 40px; /* Constrain height to be similar to slider */
    overflow: hidden; /* Hide overflowing content */
    display: flex; /* Use flexbox for vertical centering */
    flex-direction: column;
    align-items: stretch;
    word-break: break-word; /* Allow long words to break */
  }
  /* Style for the event info panel */

  .counts-line {
    font-size: 0.9em;
    color: #555;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    /* Removed flexbox properties from here */
    align-items: center; /* Vertically align items */
  }

  .counts-line strong {
    display: flex; /* Add flexbox to strong tag */
    justify-content: space-between; /* Justify content within strong tag */
    width: 100%; /* Make strong tag take full width */
  }

  .event-names-summary-text {
    font-style: italic;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.4;
    color: #333;
  }

  .no-events-message {
    font-size: 0.95em;
    font-weight: bold;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>