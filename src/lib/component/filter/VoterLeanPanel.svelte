<script lang="ts">
  import { markerColor } from "$lib/colors";
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import { circledMarkerSvg } from "$lib/icons";
  import type { VoterLean } from "$lib/types";
  import PillButton from "$lib/component/PillButton.svelte";
  import type { ClassValue } from "svelte/elements";
  import Panel from "../Panel.svelte";
  import { toTitleCase } from "$lib/util/string";
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";

  interface VoterLeanPanelOptions {
    class?: ClassValue;
  }

  const pageState = getPageStateFromContext();
  const { class: userClass, ...rest }: VoterLeanPanelOptions = $props();

  function formatLabel(voterLean: VoterLean) {
    const result = pageState.filter.filteredVoterLeanCounts[voterLean];
    let name = toTitleCase(voterLean);

    // Special case 'unavailable'
    if (deviceInfo.isNarrow && name === "Unavailable") {
      name = "N/A";
    }
    try {
      return `${name} ${result.toLocaleString()}`;
    } catch (err) {
      throw new Error(`Could not format voter lean count ${err}`);
    }
  }
  interface VoterLeanInfo {
    voterLean: VoterLean;
    label: string;
    class?: ClassValue;
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

<Panel
  title="Area Lean in 2024"
  class={["voter-lean-container", userClass]}
  {...rest}
>
  <div class="content">
    {#each voterLeans as { voterLean, label }, _i (voterLean)}
      <PillButton
        title={label}
        selected={pageState.filter.selectedVoterLeans.includes(voterLean)}
        onclick={() => pageState.filter.toggleVoterLean(voterLean)}
      >
        <div class="button-content">
          <span
            class={deviceInfo.isWide ? "large-icon" : "small-icon"}
            style="color: {colorForVoterLean(voterLean)}"
          >
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html circledMarkerSvg}
          </span>
          <span class="stat-label">{formatLabel(voterLean)}</span>
        </div>
      </PillButton>
    {/each}
  </div>
</Panel>

<style>
  .content {
    display: flex;
    justify-content: space-between;
    gap: 0.2rem;
    align-items: center;
  }

  .button-content {
    display: flex;
    flex-direction: row;
    align-items: center;
    font-size: 0.85rem;
    gap: 0.2rem;
  }
  :global(.large-icon *) {
    width: 30px;
    height: 30px;
    display: block;
  }
  :global(.small-icon *) {
    width: 20px;
    height: 20px;
    display: block;
  }
</style>
