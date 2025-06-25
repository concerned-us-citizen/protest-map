<script lang="ts">
  import IconButton from "$lib/component/IconButton.svelte";
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import { getShortcutPrefix } from "$lib/util/os";
  import {
    CirclePlay,
    CirclePause,
    Info,
    Search,
    Share,
    Menu,
  } from "@lucide/svelte";
  import type { ClassValue } from "svelte/elements";

  interface ToolbarOptions {
    class?: ClassValue;
  }

  const { class: optionsClass }: ToolbarOptions = $props();

  const pageState = getPageStateFromContext();
</script>

<div class={["toolbar-container", "hide-on-popup", optionsClass]}>
  <div class={["toolbar", { vertical: !deviceInfo.isShort }]}>
    {#if deviceInfo.isSmall}
      <div class="menu">
        <IconButton
          onClick={() => pageState.overlayModel.toggleMenuVisible()}
          label={`Show Toolbar (${getShortcutPrefix()}M)`}
        >
          <Menu />
        </IconButton>
      </div>
    {/if}
    {#if !deviceInfo.isSmall || pageState.overlayModel.menuVisible}
      <div class="toolbar-items">
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
      </div>
    {/if}
  </div>
</div>

<style>
  .toolbar-container {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
    pointer-events: none;
  }

  .toolbar {
    display: flex;
    flex-direction: column;
    align-items: end;
    z-index: var(--controls-layer);
  }

  .menu {
    border: 2px solid rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    pointer-events: auto;
  }
  .toolbar-items {
    display: flex;
    flex-direction: row;
    pointer-events: auto;
    border: 2px solid rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  .toolbar.vertical .toolbar-items {
    flex-direction: column;
    align-items: end;
  }

  .toolbar-items > :global(:not(:last-child)) {
    border-right: 1px solid #ccc;
  }

  .toolbar-items > :global(:last-child) {
    border-right: none;
  }

  .toolbar.vertical .toolbar-items > :global(:not(:last-child)) {
    border-bottom: 1px solid #ccc;
  }

  .toolbar.vertical .toolbar-items > :global(:last-child) {
    border-bottom: none;
  }

  .toolbar-item {
    pointer-events: auto;
  }
</style>
