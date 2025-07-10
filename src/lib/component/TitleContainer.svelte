<script lang="ts">
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import { getShortcutPrefix } from "$lib/util/os";
  import { countAndLabel } from "$lib/util/string";
  import { ChevronRight } from "@lucide/svelte";
  import PillButton from "./PillButton.svelte";
  import DatePicker from "./DatePicker.svelte";

  const { title, class: className } = $props<{
    title: string;
    class: string;
  }>();

  const pageState = getPageStateFromContext();
</script>

<div class={className}>
  <div class="content">
    <h1 class="title">{title}</h1>

    <div class="date-and-location-count">
      <DatePicker class="date-picker" />
      <PillButton
        accented={pageState.filter.isFiltering}
        title={`${pageState.filterVisible ? "Hide" : "Show"} Filter (${getShortcutPrefix()}F)`}
        onClick={() => pageState.toggleFilterVisible()}
      >
        <div class="location-count-button">
          {countAndLabel(
            pageState.filter.markerCount,
            pageState.filter.markerType === "event" ? "location" : "protester"
          )}
          {pageState.filter.isFiltering && deviceInfo.isWide
            ? "(Filtered)"
            : ""}
          <ChevronRight size={16} />
        </div>
      </PillButton>
    </div>
  </div>
</div>

<style>
  .content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
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

  .location-count-button {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding-right: 0; /* chevron icon provides 5 to the right */
    margin-right: -5px;
  }
</style>
