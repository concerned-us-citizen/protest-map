<script lang="ts">
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import type { ClassValue } from "svelte/elements";
  import MarkerTypePickerButton from "./MarkerTypePickerButton.svelte";

  const { class: className } = $props<{
    class?: ClassValue;
  }>();

  const pageState = getPageStateFromContext();
</script>

<div class={["picker", className]}>
  <MarkerTypePickerButton
    terse={true}
    markerType={pageState.filter.markerType}
    src={pageState.filter.turnoutEstimate}
    onClick={() => pageState.overlayModel.toggleMarkerTypePickerVisible()}
  />
  {#if pageState.overlayModel.markerTypePickerVisible}
    <div class="dropdown">
      <MarkerTypePickerButton markerType="event" />
      <MarkerTypePickerButton markerType="turnout" src="high" />
      <MarkerTypePickerButton markerType="turnout" src="average" />
      <MarkerTypePickerButton markerType="turnout" src="low" />
    </div>
  {/if}
</div>

<style>
  .picker {
    position: relative;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 0.3rem);
    left: 0;
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 0.5rem;
    z-index: var(--overlay-controls-layer);
    overflow: hidden;
    border-radius: 6px;
    gap: 0.3rem;
    background: white;
    padding: 0.3rem;
    margin-left: 0.3rem;
  }
</style>
