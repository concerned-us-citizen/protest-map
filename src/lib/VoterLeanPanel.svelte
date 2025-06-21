<script lang="ts">
  import { markerColor } from "$lib/colors";
  import { getPageStateFromContext } from "./store/PageState.svelte";
  import { circledMarkerSvg } from "$lib/icons";
  import type { EventMarkerInfoWithId, VoterLean } from "./types";

  interface Counts {
    trump: number;
    harris: number;
    unavailable: number;
  }

  interface VoterLeanInfo {
    voterLean: VoterLean;
    label: string;
  }

  function getCounts(events: EventMarkerInfoWithId[]): Counts {
    let trump = 0,
      harris = 0,
      unavailable = 0;

    for (const event of events) {
      const lead = event.pctDemLead;
      if (typeof lead !== "number" || lead === 0) {
        unavailable++;
      } else if (lead < 0) {
        trump++;
      } else if (lead > 0) {
        harris++;
      }
    }

    return { trump, harris, unavailable };
  }

  function formatLabel(voterLean: VoterLean) {
    return `${filteredCounts[voterLean].toLocaleString()}`;
  }

  function colorForVoterLean(voterLean: VoterLean) {
    switch (voterLean) {
      case "harris":
        return markerColor["blue"];
      case "trump":
        return markerColor["red"];
      case "unavailable":
        return markerColor["unavailable"];
      default:
        throw new Error(`Unexpected voterLean ${voterLean}`);
    }
  }

  const pageState = getPageStateFromContext();

  const totalCounts = $derived(getCounts(pageState.filter.currentDateEvents));
  const filteredCounts = $derived.by(() => {
    const isFiltering = pageState.filter.isFiltering;
    const filteredEvents = pageState.filter.filteredEvents;
    return isFiltering ? getCounts(filteredEvents) : totalCounts;
  });

  const voterLeans: VoterLeanInfo[] = [
    {
      voterLean: "trump",
      label: "Locations in precincts favoring Trump",
    },
    {
      voterLean: "harris",
      label: "Locations in precincts favoring Harris",
    },
    {
      voterLean: "unavailable",
      label: "Locations in precincts where no voting data is available",
    },
  ];
</script>

<div class="voter-lean-container">
  <div class="heading">2024 Lean</div>
  {#each voterLeans as { voterLean, label }}
    <button
      class="link-button"
      disabled={filteredCounts[voterLean] === 0}
      onclick={() => pageState.filter.toggleVoterLean(voterLean)}
    >
      <div class="stat" title={label}>
        <span class="icon" style="color: {colorForVoterLean(voterLean)}">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html circledMarkerSvg}
        </span>
        <span class="stat-label">{formatLabel(voterLean)}</span>
      </div>
    </button>
  {/each}
</div>

<style>
  .voter-lean-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    font-size: 0.85rem;
  }

  .voter-lean-container button {
    text-decoration: none;
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
    margin: -3px;
    padding: 3px;
    border-radius: 5px;
  }

  .stat:hover {
    background: lightgray;
  }

  :global(.icon *) {
    width: 20px;
    height: 20px;
    display: block;
  }
</style>
