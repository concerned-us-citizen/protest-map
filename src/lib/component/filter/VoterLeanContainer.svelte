<script lang="ts">
  import { markerColor } from "$lib/colors";
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import { circledMarkerSvg } from "$lib/icons";
  import type { VoterLean } from "$lib/types";
  import PillButton from "$lib/component/PillButton.svelte";
  import type { ClassValue } from "svelte/elements";
  import { toTitleCase } from "$lib/util/string";
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";
  import Panel from "../Panel.svelte";
  import { formatAsInteger } from "$lib/util/number";

  const { class: className, ...rest } = $props<{
    class?: ClassValue;
  }>();

  const pageState = getPageStateFromContext();

  function formatName(voterLean: VoterLean) {
    let name = toTitleCase(voterLean);

    // Special case 'unavailable'
    if (deviceInfo.isNarrow && name === "Unavailable") {
      name = "N/A";
    }
    return name;
  }

  function formatCount(voterLean: VoterLean) {
    const result = pageState.filter.filteredVoterLeanCounts[voterLean];
    try {
      return `${name} ${formatAsInteger(result)}`;
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
  class={["voter-lean-container", className]}
  {...rest}
>
  <div class="leans">
    {#each voterLeans as { voterLean, label }, _i (voterLean)}
      <PillButton
        title={label}
        class="voter-lean-button"
        selected={pageState.filter.selectedVoterLeans.includes(voterLean)}
        onClick={() => pageState.filter.toggleVoterLean(voterLean)}
      >
        <div class="button-content">
          <div class="icon-and-label">
            <div
              class="small-icon"
              style="color: {colorForVoterLean(voterLean)}"
            >
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html circledMarkerSvg}
            </div>
            <div class="name-label">{formatName(voterLean)}</div>
          </div>
          <div class="count-label">{formatCount(voterLean)}</div>
        </div>
      </PillButton>
    {/each}
  </div>
</Panel>

<style>
  .leans {
    display: flex;
    justify-content: center;
    flex-direction: row;
    gap: 0.5rem;
    align-items: start;
    min-width: 0;
  }

  .button-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 0.85rem;
    gap: 0.2rem;
  }
  .icon-and-label {
    display: flex;
    flex-direction: row;
    justify-content: start;
    gap: 0.2rem;
    align-items: center;
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
