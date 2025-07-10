<script lang="ts">
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import type { ClassValue } from "svelte/elements";
  import EventInfoPanel from "./EventInfoPanel.svelte";
  import Timeline from "./Timeline.svelte";

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
</style>
