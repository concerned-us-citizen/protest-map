<script lang="ts">
  import { markerColor } from "$lib/colors";
  import { getPageStateFromContext } from "./store/PageState.svelte";
  import { circledMarkerSvg } from "$lib/icons";
  import type { EventMarkerInfoWithId } from "./types";

  type StatType = "red" | "blue" | "unavailable";

  interface Counts {
    red: number;
    blue: number;
    unavailable: number;
  }

  interface StatView {
    type: StatType;
    label: string;
  }
  function getCounts(events: EventMarkerInfoWithId[]): Counts {
    let red = 0,
      blue = 0,
      unavailable = 0;

    for (const event of events) {
      const lead = event.pctDemLead;
      if (typeof lead !== "number" || lead === 0) {
        unavailable++;
      } else if (lead < 0) {
        red++;
      } else if (lead > 0) {
        blue++;
      }
    }

    return { red, blue, unavailable };
  }

  function formatLabel(type: StatType) {
    const x = filteredCounts[type];
    const y = totalCounts[type];
    return pageState.filter.isFiltering
      ? `${x.toLocaleString()}/${y.toLocaleString()}`
      : `${y.toLocaleString()}`;
  }

  const pageState = getPageStateFromContext();

  const totalCounts = $derived(getCounts(pageState.filter.currentDateEvents));
  const filteredCounts = $derived.by(() => {
    const isFiltering = pageState.filter.isFiltering;
    const filteredEvents = pageState.filter.filteredEvents;
    return isFiltering ? getCounts(filteredEvents) : totalCounts;
  });

  const statViews: StatView[] = [
    {
      type: "red",
      label: "Locations in precincts favoring Trump",
    },
    {
      type: "blue",
      label: "Locations in precincts favoring Harris",
    },
    {
      type: "unavailable",
      label: "Locations in precincts where no voting data is available",
    },
  ];
</script>

<div class="stat-container">
  {#if !pageState.filter.isFiltering}
    <div class="heading">2024 Lean</div>
  {/if}
  {#each statViews as { type, label }}
    <div class="stat" title={label}>
      <span class="icon" style="color: {markerColor[type]}">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html circledMarkerSvg}
      </span>
      <span class="stat-label">{formatLabel(type)}</span>
    </div>
  {/each}
</div>

<style>
  .stat-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    font-size: 0.85rem;
  }

  .heading {
    flex: 0 1 auto;
    white-space: nowrap;
    margin-right: 0.5rem;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    white-space: nowrap;
    font-size: 0.9rem;
  }

  :global(.icon *) {
    width: 20px;
    height: 20px;
    display: block;
  }
</style>
