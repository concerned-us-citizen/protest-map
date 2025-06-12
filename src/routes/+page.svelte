<script lang="ts">
  import { createPageStateInContext, PageState } from "$lib/store/PageState.svelte";
  import type { Nullable } from "$lib/types";
  import { onMount } from "svelte";
  import PageContent from "./PageContent.svelte";
  import LoadingSpinner from "$lib/LoadingSpinner.svelte";
  import { isFutureDate } from "$lib/util/date";

  let pageStateHolder = $state<{value: Nullable<PageState>}>({value: null});
  createPageStateInContext(pageStateHolder);

  onMount(async () => {
    pageStateHolder.value = await PageState.create();
  });



  // Initialize currentDateIndex to be the date at or after the current system date
  // (or - 1 if no match) any time the eventModel's items change
  $effect(() => {
    const pageState = pageStateHolder.value;
    if (pageState) {
        pageState.filter.currentDateIndex = pageState.eventModel.allDatesWithEventCounts.findIndex(
        (dc) => isFutureDate(dc.date, true)
      );
    }
  });

  // Clear selectedEventNames any time currentDateIndex changes.
  $effect(() => {  
    const pageState = pageStateHolder.value;
    if (pageState) {
      void pageState.filter.currentDateIndex;
      pageState.filter.clearSelectedEventNames();
    }
  });

</script>

<svelte:head>
  <title>US Protests Map</title>
  <meta property="og:title" content={`A Map of Protests`} />
  <meta property="og:description" content={`An interactive map of protests`} />
</svelte:head>

{#if pageStateHolder.value}
  <PageContent/>
  {:else} 
  <LoadingSpinner size={32}/>
 {/if}