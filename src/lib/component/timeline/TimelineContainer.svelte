<script lang="ts">
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";

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
    <div class="attribution-link">
      <i
        >{deviceInfo.isSmall ? "Data:" : "Data provided by"}
        <a
          href="https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/preview#gid=1269890748"
          target="_blank"
          title={pageState.eventModel.formattedUpdatedAt}
          >We (the People) Dissent</a
        ></i
      >
    </div>
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
    gap: 0.4em;
    z-index: var(--controls-layer);
  }
  .date-range {
    display: flex;
    justify-content: space-between;
    font-size: 0.8em;
    text-align: baseline;
    color: #555;
    margin-bottom: 0.4em;
    margin-left: 1em;
    margin-right: 1em;
  }
  .attribution-link {
    font-size: 0.7rem;
    color: #555;
  }
  .attribution-link a {
    text-decoration: none !important;
  }
  .attribution-link a:hover {
    text-decoration: underline;
  }
</style>
