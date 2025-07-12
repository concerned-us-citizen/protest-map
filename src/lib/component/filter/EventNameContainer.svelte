<script lang="ts">
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import PillButton from "$lib/component/PillButton.svelte";
  import { tick } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import Panel from "../Panel.svelte";
  import { formatAsInteger } from "$lib/util/number";
  import { formatRangeTerse } from "../formatting";
  import { type TurnoutRange } from "$lib/types";

  const { class: className } = $props<{
    class?: ClassValue;
  }>();

  const pageState = getPageStateFromContext();
  const eventNamesWithLocationCountsOrTurnoutRanges = $derived.by(() => {
    const counts = pageState.filter.filteredEventNamesWithLocationCounts;
    const turnoutRanges = pageState.filter.filteredEventNamesWithTurnoutRange;
    return pageState.filter.markerType === "event" ? counts : turnoutRanges;
  });

  const title = $derived.by(() => {
    const count = pageState.filter.filteredEventNamesWithLocationCounts.length;
    return count > 0
      ? `Protest Events That Day (total ${formatAsInteger(count)})`
      : "Protest Events";
  });

  let listEl: HTMLDivElement;
  $effect(() => {
    const update = async () => {
      // Runs every time selected event names changes
      void pageState.filter.filteredEventNamesWithLocationCounts;
      void pageState.filter.filteredEventNamesWithTurnoutRange;
      void pageState.filter.selectedEventNames;

      // Wait until Svelte has flushed DOM updates
      await tick();

      if (!listEl) return;

      // First selected pill in document order
      const firstSelected = listEl.querySelector<HTMLElement>(
        '[data-selected="true"]'
      );
      if (!firstSelected) return;

      // Scroll only if it is outside the viewport of the container
      const top = firstSelected.offsetTop;
      const bottom = top + firstSelected.offsetHeight;
      const viewTop = listEl.scrollTop;
      const viewBottom = viewTop + listEl.clientHeight;

      if (top < viewTop || bottom > viewBottom) {
        firstSelected.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    };
    update();
  });
</script>

<Panel class={["event-name-container", className]} {title}>
  <div class="content" role="list" bind:this={listEl}>
    {#if eventNamesWithLocationCountsOrTurnoutRanges.length > 0}
      {#each eventNamesWithLocationCountsOrTurnoutRanges as eventWithCountOrTurnoutRange (eventWithCountOrTurnoutRange.name)}
        {@const selected = pageState.filter.selectedEventNames.includes(
          eventWithCountOrTurnoutRange.name
        )}
        <PillButton
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            pageState.filter.toggleSelectedEventName(
              eventWithCountOrTurnoutRange.name
            );
          }}
          {selected}
        >
          <div class="button-content">
            <div class="event-name-in-list">
              {eventWithCountOrTurnoutRange.name || "Unnamed"}
            </div>
            <div class="event-count-in-list">
              {#if pageState.filter.markerType === "event"}
                {formatAsInteger(
                  (eventWithCountOrTurnoutRange as { count: number }).count
                )}
              {:else}
                {formatRangeTerse(
                  (
                    eventWithCountOrTurnoutRange as {
                      turnoutRange: TurnoutRange;
                    }
                  ).turnoutRange,
                  false
                )}
              {/if}
            </div>
          </div>
        </PillButton>
      {/each}
    {:else}
      <p class="no-events-message">No events scheduled for this date.</p>
    {/if}
  </div>
</Panel>

<style>
  /* Really should have a Container like a panel without the padding and rounded border */
  :global(.event-name-container) {
    padding: 0 !important;
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow-y: auto;
    /* TODO this should take title and slider heights into account */
    max-height: 40vh;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .content::-webkit-scrollbar {
    display: none;
  }
  .content {
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    gap: 0.3rem;
  }
  .button-content {
    display: flex;
    justify-content: space-between;
  }
  .no-events-message {
    font-size: 0.8em;
    color: #666;
    text-align: center;
    margin: 0;
    padding: 0.5em;
  }
  .event-name-in-list {
    text-align: start;
    overflow-wrap: anywhere;
  }
  .event-count-in-list {
    margin-left: 8px;
    font-size: 0.9em;
    color: #777;
    white-space: nowrap;
  }
</style>
