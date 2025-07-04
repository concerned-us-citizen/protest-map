<script lang="ts">
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";
  import type { ClassValue } from "svelte/elements";
  import DatePicker from "./DatePicker.svelte";
  import MarkerTypePicker from "./MarkerTypePicker.svelte";
  import RegionNavigator from "./RegionNavigator.svelte";
  import Toolbar from "./Toolbar.svelte";

  const { class: className } = $props<{
    class?: ClassValue;
  }>();

  const tightClass = $derived(deviceInfo.isTouchDevice ? "tight" : "");
</script>

<div class={["app-bar", className, tightClass]}>
  <div class={["left-content", tightClass]}>
    <MarkerTypePicker class="marker-type-picker" />
    <RegionNavigator class="region-navigator" />
    <DatePicker class="date-picker" />
  </div>
  <div class={["right-content", tightClass]}>
    <Toolbar isDropdown={deviceInfo.isNarrow} />
  </div>
</div>

<style>
  .app-bar {
    padding: 0.3rem;
    background: white;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .app-bar.tight {
    padding: 0.1rem 0.5rem 0.3rem 0.5rem;
  }

  .tight {
    gap: 0.1rem;
  }

  .left-content,
  .right-content {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 0.5rem;
  }

  .left-content {
    flex: 1;
  }

  :global(.region-navigator) {
    flex: 1;
  }
  :global(.date-picker) {
    flex: 0 0 auto;
    min-width: 4.3rem;
  }
</style>
