<script lang="ts">
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import { countAndLabel } from "$lib/util/string";
  import { Settings2 } from "@lucide/svelte";
  import Panel from "./Panel.svelte";
  import PillButton from "./PillButton.svelte";

  let { class: className = "" } = $props();

  const pageState = getPageStateFromContext();

  const countDescription = $derived.by(() => {
    let countStr: string;
    if (pageState.filter.markerType === "event") {
      countStr = countAndLabel(pageState.filter.filteredCount, "location");
    } else {
      countStr = countAndLabel(pageState.filter.filteredCount, "protester");
    }

    return `${countStr}, ${countAndLabel(pageState.filter.filteredEventCount, "event")}`;
  });
</script>

<Panel class={["content", className]}>
  <div class="counts">
    {countDescription}
  </div>

  {#if pageState.filter.isFiltering}
    <div class="filter-buttons">
      <PillButton
        class="open-drawer-button"
        onClick={() => {
          pageState.overlayModel.drawerVisible = true;
        }}
      >
        <div class="edit-filter-button">
          <Settings2 size="16px" />
          <div>Edit Filter</div>
        </div>
      </PillButton>
      <PillButton
        class="show-all-button"
        onClick={() => {
          pageState.filter.clearAllFilters();
          pageState.mapModel.navigateToUS();
        }}
      >
        View All US Protests
      </PillButton>
    </div>
  {/if}
</Panel>

<style>
  .edit-filter-button {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.3rem;
  }

  .counts {
    font-weight: bold;
  }

  :global(.content) {
    width: max-content;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem !important;
  }
  .filter-buttons {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    flex-wrap: nowrap;
    gap: 0.5rem;
  }

  :global(.show-all-button),
  :global(.open-drawer-button) {
    pointer-events: auto;
  }
</style>
