<script lang="ts">
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import { slide } from "svelte/transition";
  import EventPanel from "./EventPanel.svelte";
  import FilterIndicator from "./FilterIndicator.svelte";
  import VoterLeanPanel from "./VoterLeanPanel.svelte";

  const pageState = getPageStateFromContext();
</script>

<div class="filter-container" transition:slide>
  <VoterLeanPanel />

  <EventPanel />

  {#if pageState.filter.isFiltering}
    <FilterIndicator />
  {/if}
</div>

<style>
  .filter-container {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
</style>
