<script lang="ts">
  import IconButton from "$lib/component/IconButton.svelte";
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import { getShortcutPrefix } from "$lib/util/os";
  import {
    CirclePlay,
    CirclePause,
    Info,
    Undo2,
    Search,
    Share,
    Menu,
  } from "@lucide/svelte";
  import { cubicInOut } from "svelte/easing";
  import type { ClassValue } from "svelte/elements";
  import { fade } from "svelte/transition";

  interface ToolbarOptions {
    class?: ClassValue;
  }

  const { class: optionsClass }: ToolbarOptions = $props();

  const pageState = getPageStateFromContext();
</script>

<div class={["toolbar-container", "hide-on-popup", optionsClass]}>
  <div class="toolbar">
    {#if deviceInfo.isSmall}
      <IconButton
        onClick={() => pageState.overlayModel.toggleMenuVisible()}
        label={`Show Toolbar (${getShortcutPrefix()}M)`}
      >
        <Menu />
      </IconButton>
    {/if}
    {#if !deviceInfo.isSmall || pageState.overlayModel.menuVisible}
      <IconButton
        onClick={() => pageState.overlayModel.toggleNavigationVisible()}
        label={`Find a city, state, or ZIP code (${getShortcutPrefix()}F)`}
      >
        <Search />
      </IconButton>
      <IconButton
        onClick={() => pageState.overlayModel.toggleShareVisible()}
        label={`Share a link to this page (${getShortcutPrefix()}S)`}
      >
        <Share />
      </IconButton>
      <IconButton
        onClick={() => pageState.toggleAutoplay()}
        label={pageState.autoplaying
          ? `Pause Animation (${getShortcutPrefix()}Space)`
          : `Play Animation (${getShortcutPrefix()}Space)`}
      >
        {#if pageState.autoplaying}
          <CirclePause />
        {:else}
          <CirclePlay />
        {/if}
      </IconButton>
      <IconButton
        onClick={() => pageState.overlayModel.toggleHelpVisible()}
        label={`Show Help (${getShortcutPrefix()}H)`}
      >
        <Info />
      </IconButton>
    {/if}
  </div>

  {#if pageState.mapModel.canPopBounds}
    <div
      class="toolbar"
      transition:fade={{ duration: 300, easing: cubicInOut }}
    >
      <IconButton
        onClick={() => pageState.mapModel.popBounds()}
        label={"Zoom Back Out (${getShortcutPrefix()}R, +U, or +B)"}
      >
        <Undo2 />
      </IconButton>
    </div>
  {/if}
</div>

<style>
  .toolbar-container {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }

  .toolbar {
    display: flex;
    flex-direction: column;
    border: 2px solid rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    overflow: hidden;
    z-index: var(--controls-layer);
  }

  .toolbar > :global(:not(:last-child)) {
    border-bottom: 1px solid #ccc;
  }

  .toolbar > :global(:last-child) {
    border-bottom: none;
  }
</style>
