<script lang="ts">
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import type { ClassValue } from "svelte/elements";
  import EventInfoPanel from "./EventInfoPanel.svelte";
  import Timeline from "./Timeline.svelte";
  import { formatAsInteger } from "$lib/util/number";
  import { countAndLabel } from "$lib/util/string";
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";

  const { class: className } = $props<{
    class?: ClassValue;
  }>();

  const pageState = getPageStateFromContext();
</script>

<div class={["timeline-and-eventinfo", className]}>
  {#if pageState.eventInfoVisible}
    <EventInfoPanel />
  {/if}
  <Timeline />
  <div class="date-range">
    <div class="date-range-value">
      {pageState.filter.formattedDateRangeStart}
    </div>
    {#if pageState.filter.isFiltering}
      <div class="matching-dates-count">
        {#if deviceInfo.isNarrow}
          {countAndLabel(pageState.filter.filteredDateCount, "matching day")}
          (of
          {formatAsInteger(pageState.filter.dateCount)})
        {:else}
          {countAndLabel(pageState.filter.filteredDateCount, "day")} with matching
          {pageState.filter.markerType}s (out of
          {formatAsInteger(pageState.filter.dateCount)})
        {/if}
      </div>
    {/if}
    <div class="date-range-value">
      {pageState.filter.formattedDateRangeEnd}
    </div>
  </div>
</div>

<style>
  .timeline-and-eventinfo {
    width: calc(100vw - 2 * var(--toolbar-margin));
    max-width: calc(600px - 2 * var(--toolbar-margin));
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.2em;
  }
  .date-range {
    display: flex;
    justify-content: space-between;
    font-size: 0.8em;
    text-align: baseline;
    color: #555;
    margin-bottom: 0.3em;
    margin-left: 1em;
    margin-right: 1em;
  }

  .date-range-value {
    padding: 0.1rem 0.5rem;
    background: var(--panel-background-color);
    border-radius: 0.3rem;
    overflow: hidden;
  }

  .attribution-link {
    font-size: 0.7rem;
    color: #555;
  }

  .matching-dates-count {
    background: var(--accent-color);
    overflow: hidden;
    border-radius: 0.3rem;
    padding: 0.1rem 0.5rem;
  }
</style>
