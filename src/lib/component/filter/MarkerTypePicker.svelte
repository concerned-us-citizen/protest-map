<script lang="ts">
  import type { ClassValue } from "svelte/elements";
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import PillButton from "$lib/component/PillButton.svelte";
  import { markerSvg } from "$lib/icons";
  import InlineSvg from "$lib/InlineSvg.svelte";
  import {
    ArrowDownToLine,
    ArrowUpToLine,
    FoldVertical,
    UsersRound,
  } from "@lucide/svelte";

  const { class: className } = $props<{
    id?: string;
    class?: ClassValue;
  }>();

  const pageState = getPageStateFromContext();
</script>

<div class={["marker-type-picker", className]}>
  <div class="marker-type-container">
    <PillButton
      class="marker-type-button"
      title="Show protest locations"
      selected={pageState.filter.desiredMarkerType === "event"}
      onClick={() => (pageState.filter.desiredMarkerType = "event")}
    >
      <div class="event-icon">
        <InlineSvg content={markerSvg} />
      </div>
      <div class="marker-type-name">Protests</div>
    </PillButton>

    <PillButton
      class="marker-type-button"
      title="Show estimated turnout numbers"
      selected={pageState.filter.desiredMarkerType === "turnout"}
      onClick={() => (pageState.filter.desiredMarkerType = "turnout")}
    >
      <div class="turnout-icon">
        <UsersRound size={16} />
      </div>
      <div class="marker-type-name">Turnout</div>
    </PillButton>
  </div>

  {#if pageState.filter.markerType === "turnout"}
    <div class="estimate-container">
      <PillButton
        class="estimate-button"
        title="Show low estimates"
        selected={pageState.filter.turnoutEstimate === "low"}
        onClick={() => (pageState.filter.turnoutEstimate = "low")}
      >
        <div class="estimate-icon">
          <ArrowDownToLine size={16} />
        </div>
        <div class="estimate-name">Low</div>
      </PillButton>

      <PillButton
        class="estimate-button"
        title="Show average estimates"
        selected={pageState.filter.turnoutEstimate === "average"}
        onClick={() => (pageState.filter.turnoutEstimate = "average")}
      >
        <div class="estimate-icon">
          <FoldVertical size={16} />
        </div>
        <div class="estimate-name">Average</div>
      </PillButton>

      <PillButton
        class="estimate-button"
        title="Show high estimates"
        selected={pageState.filter.turnoutEstimate === "high"}
        onClick={() => (pageState.filter.turnoutEstimate = "high")}
      >
        <div class="turnout-icon">
          <ArrowUpToLine size={16} />
        </div>
        <div class="estimate-name">High</div>
      </PillButton>
    </div>
  {/if}
</div>

<style>
  .marker-type-picker {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }
  .marker-type-container,
  .estimate-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    flex-wrap: nowrap;
    gap: 0.5rem;
  }

  :global(.marker-type-button),
  :global(.estimate-button) {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: nowrap;
  }

  .event-icon {
    width: 32px;
    height: 32px;
    /* Adjust for svg internal whitespace TODO fix in svg */
    margin: -0.5em;
    color: var(--pill-button-color);
  }

  .turnout-group-label {
    font-size: 0.8rem;
  }
</style>
