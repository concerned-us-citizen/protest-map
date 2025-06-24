<script lang="ts">
  import { markerColor } from "$lib/colors";
  import { getPageStateFromContext } from "./model/PageState.svelte";
  import { circledMarkerSvg } from "$lib/icons";
  import type { VoterLean } from "./types";

  interface VoterLeanInfo {
    voterLean: VoterLean;
    label: string;
  }

  function formatLabel(voterLean: VoterLean) {
    const result = pageState.filter.filteredVoterLeanCounts[voterLean];
    try {
      return `${result.toLocaleString()}`;
    } catch (err) {
      throw new Error(`Could not format voter lean count ${err}`);
    }
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
  <h4 class="heading">2024 Lean</h4>
  {#each voterLeans as { voterLean, label }}
    <button
      class="pill-button"
      onclick={() => pageState.filter.toggleVoterLean(voterLean)}
    >
      <div
        class="stat {pageState.filter.selectedVoterLeans.includes(voterLean)
          ? 'selected'
          : ''}"
        title={label}
      >
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

  .stat.selected {
    background: lightgray;
  }

  .heading {
    flex: 0 1 auto;
    white-space: nowrap;
    margin: 0;
    padding: 0;
    font-weight: normal;
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

  :global(.icon *) {
    width: 20px;
    height: 20px;
    display: block;
  }
</style>
