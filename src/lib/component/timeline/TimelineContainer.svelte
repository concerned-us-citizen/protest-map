<script lang="ts">
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import type { ClassValue } from "svelte/elements";
  import EventInfoPanel from "./EventInfoPanel.svelte";
  import Timeline from "./Timeline.svelte";
  import { formatAsInteger } from "$lib/util/number";
  import { countAndLabel } from "$lib/util/string";

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
    <div>{pageState.filter.formattedDateRangeStart}</div>
    {#if pageState.filter.isFiltering}
      <div class="matching-dates-count">
        {countAndLabel(pageState.filter.filteredDateCount, "date")} (of
        {formatAsInteger(pageState.filter.dateCount)})
      </div>
    {/if}
    <div>{pageState.filter.formattedDateRangeEnd}</div>
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
