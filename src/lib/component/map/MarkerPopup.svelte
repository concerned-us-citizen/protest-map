<script lang="ts">
  import type { PopulatedMarker } from "$lib/types";
  import MarkerPopupItem from "./MarkerPopupItem.svelte";

  const { populatedMarkers } = $props<{
    populatedMarkers: PopulatedMarker[];
  }>();
</script>

<div class="items-container"></div>
{#each populatedMarkers as p, _i ("p-" + p.id)}
  <MarkerPopupItem populatedMarker={p} />
{/each}

<style>
  .items-container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    max-height: 60vh;
    gap: 1rem;
    overflow-y: scroll;
    pointer-events: auto;
  }
</style>
