<script lang="ts">
  export let currentDate: string;
  export let formatDate: (dateStr: string) => string;
  export let displayedEventNameCount: number; // Unique event names
  export let distinctLocationCount: number;
  export let allEventNames: string; // Comma-separated full list
</script>

<div class="compact-event-info">
  {#if distinctLocationCount > 0}
    <div class="info-line date-location-line">
      <strong class="date-text">Protests {formatDate(currentDate)}</strong>
      <span class="counts-text">
        {displayedEventNameCount > 0 ? displayedEventNameCount : 0} Event{displayedEventNameCount === 1 ? '' : 's'}, {distinctLocationCount} Location{distinctLocationCount === 1 ? '' : 's'}
      </span>
    </div>
    <div class="info-line event-names">
      <em class="event-names-summary-text">
        {(() => {
          const trimmedNames = allEventNames ? allEventNames.trim() : '';
          const lowerNames = trimmedNames.toLowerCase();
          if (displayedEventNameCount === 0 || !trimmedNames || lowerNames === "unnamed event" || lowerNames === "unnamed" || lowerNames === "no name") {
            return '\u00A0'; // Non-breaking space to maintain line height
          }
          return allEventNames;
        })()}
      </em>
    </div>
  {:else}
    <div class="info-line no-events-message">
      No named events for {formatDate(currentDate)}
    </div>
  {/if}
</div>

<style>
  .compact-event-info {
    font-size: 0.9em;
    padding: 0 5px; /* Minimal padding, adjust as needed */
  }

  .info-line {
    padding: 1px 0;
  }

  .date-location-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis; /* In case this line itself gets too long */
  }
  
  .counts-text {
    font-size: 0.9em;
    color: #555;
    margin-left: 8px;
    white-space: nowrap; /* Prevent this part from wrapping independently */
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