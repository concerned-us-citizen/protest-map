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




  $effect(() => {
    const pageState = pageStateHolder.value;
    if (pageState) {
        const specifiedDateStr = new URLSearchParams(window.location.search).get('date');
        const specifiedDate = specifiedDateStr ? new Date(specifiedDateStr) : undefined;
        if (specifiedDate && pageState.eventModel.isValidDate(specifiedDate)) {
          pageState.filter.setCurrentDate(new Date(specifiedDate));
        } else {
            // If not specified, initialize currentDateIndex to be the date at or after the current system date
            // (or - 1 if no match) any time the eventModel's items change
          pageState.filter.currentDateIndex = pageState.eventModel
            .allDatesWithEventCounts.findIndex((dc) => isFutureDate(dc.date, true));
        }
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
  <title>Map of US Protests</title>
  <meta property="og:title" content={`An Interactive Map of US Protests by Date`} />
  <meta property="og:description" content={`An interactive map of US protests, browsable by date.`} />
</svelte:head>

{#if pageStateHolder.value}
  <PageContent/>
  {:else} 
  <LoadingSpinner size={32}/>
 {/if}