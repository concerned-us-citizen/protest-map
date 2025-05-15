<script lang="ts">
  import { fade } from "svelte/transition";
  import { formatDate, isFutureDate } from "./dateUtils";

  export let visible: boolean;
  export let displayedEventNameCount: number; // Unique event names
  export let currentDateString: string;
  export let distinctLocationCount: number;
  export let allEventNames: string; // Comma-separated full list
</script>

{#if visible}
<div class="event-info" transition:fade={{ duration: 200 }}>
  {#if distinctLocationCount > 0}
    <div class="counts-line">
      <strong>
        <span class="date-display">{formatDate(currentDateString)} {isFutureDate(currentDateString) ? '(future)' : ''} </span>
        <span class="stats-display">{displayedEventNameCount > 0 ? displayedEventNameCount : 0} Event{displayedEventNameCount === 1 ? '' : 's'}, {distinctLocationCount} Location{distinctLocationCount === 1 ? '' : 's'}</span>
      </strong>
    </div>
    <div class="event-names-summary-text">
      {(() => {
        const trimmedNames = allEventNames ? allEventNames.trim() : '';
        const lowerNames = trimmedNames.toLowerCase();
        if (displayedEventNameCount === 0 || !trimmedNames || lowerNames === "unnamed event" || lowerNames === "unnamed" || lowerNames === "no name") {
          return 'Unnamed event';
        }
        return allEventNames;
      })()}
    </div>
  {:else}
    <div class="no-events-message">
      No named events
    </div>
  {/if}
</div>
{/if}

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
    width: 300px;
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

  /* Date display on scrub (within the now conditionally visible container) */
  /* These rules might still be useful if we want to hide *only* the date text within the container */
  /* but the primary hiding is now on the container itself. Keeping for potential future use or refinement. */
@media (max-width: 768px) {

  /* Hide event info panel by default on mobile */
  .event-info {
    pointer-events: none; /* Disable pointer events when hidden */
  }
}
</style>