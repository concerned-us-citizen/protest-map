<script lang="ts">
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import Panel from "../Panel.svelte";
  import EventNameContainer from "./EventNameContainer.svelte";
  import FilterIndicator from "./FilterIndicator.svelte";
  import VoterLeanContainer from "./VoterLeanContainer.svelte";

  const { class: className } = $props<{
    class: string;
  }>();

  const pageState = getPageStateFromContext();
</script>

<Panel class={className}>
  <VoterLeanContainer class="voter-lean" />

  <EventNameContainer />

  {#if pageState.filter.isFiltering}
    <FilterIndicator />
  {/if}
</Panel>

<style>
  :global(.voter-lean) {
    flex: 0 0 auto;
  }
</style>
