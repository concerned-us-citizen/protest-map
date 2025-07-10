<script lang="ts">
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import EventNameContainer from "./EventNameContainer.svelte";
  import FilterIndicator from "./FilterIndicator.svelte";
  import VoterLeanContainer from "./VoterLeanContainer.svelte";
  import MarkerTypePicker from "./MarkerTypePicker.svelte";
  import Panel from "../Panel.svelte";

  const { class: className } = $props<{
    class: string;
  }>();

  const pageState = getPageStateFromContext();
</script>

<div class={["filter-container", className]}>
  {#if pageState.filter.dateHasTurnout}
    <Panel title="Presented Counts" class="marker-picker-container">
      <MarkerTypePicker />
    </Panel>
  {/if}

  <VoterLeanContainer class="voter-lean" />

  <EventNameContainer />

  {#if pageState.filter.isFiltering}
    <FilterIndicator />
  {/if}
</div>

<style>
  .filter-container {
    display: flex;
    flex-direction: column;
  }

  :global(.marker-picker-container),
  :global(.voter-lean) {
    flex: 0 0 auto;
  }
</style>
