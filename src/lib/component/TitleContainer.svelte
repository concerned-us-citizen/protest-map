<script lang="ts">
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import { formatDateIndicatingFuture } from "$lib/util/date";
  import { getShortcutPrefix } from "$lib/util/os";
  import { countAndLabel } from "$lib/util/string";
  import { ChevronRight } from "@lucide/svelte";
  import Panel from "./Panel.svelte";
  import PillButton from "./PillButton.svelte";

  interface TitleContainerProps {
    title: string;
  }

  const { title }: TitleContainerProps = $props();

  const pageState = getPageStateFromContext();
</script>

<Panel>
  <div class="content">
    <h1 class="title">{title}</h1>

    <div class="date-and-location-count">
      <b
        >{deviceInfo.isWide ? "On " : ""}{formatDateIndicatingFuture(
          pageState.filter.currentDate
        )}</b
      >
      {#if deviceInfo.isShort}
        protests
      {/if}
      <PillButton
        data-suppress-click-outside
        accented={pageState.filter.isFiltering}
        title={`${pageState.overlayModel.filterVisible ? "Hide" : "Show"} Filter (${getShortcutPrefix()}F)`}
        onclick={() => pageState.overlayModel.toggleFilterVisible()}
      >
        <div class="location-count-button">
          {countAndLabel(
            pageState.filter.currentDateFilteredEvents,
            "location"
          )}
          {pageState.filter.isFiltering && deviceInfo.isWide
            ? "(Filtered)"
            : ""}
          <ChevronRight size={16} />
        </div>
      </PillButton>
    </div>
  </div>
</Panel>

<style>
  .content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.2rem;
  }
  .title {
    font-size: 1.1em;
    font-weight: 700;
    margin: 0;
    padding: 0;
    text-align: start;
  }

  .date-and-location-count {
    font-size: 0.9rem;
    display: flex;
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.05em;
    white-space: nowrap;
  }

  .date-and-location-count b {
    font-size: 1rem;
  }

  /* Compact view on phones in landscape (same is isShort above)*/
  /* 
* Note we have to hardwire the max-width here, can't use css variables,
* and can't dynamically set the width from a TS variable unless
* we want to use svelte:head. Keep this BREAKPOINT in sync with DeviceInfo.svelte.
*/
  @media (max-height: 400px) {
    .date-and-location-count {
      justify-content: start;
      gap: 0.25em;
    }
  }

  .location-count-button {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding-right: 0; /* chevron icon provides 5 to the right */
    margin-right: -5px;
  }
</style>
