<script lang="ts">
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import { getShortcutPrefix } from "$lib/util/os";
  import { CirclePlay, CirclePause, Info, Share, Menu } from "@lucide/svelte";
  import type { ClassValue } from "svelte/elements";
  import PillButton from "./PillButton.svelte";
  import DrawerButton from "./DrawerButton.svelte";

  const { isDropdown, class: className } = $props<{
    isDropdown: boolean;
    class?: ClassValue;
  }>();

  const pageState = getPageStateFromContext();
</script>

<div class={["toolbar", className]}>
  {#if isDropdown}
    <div class="menu">
      <PillButton
        onClick={() => pageState.overlayModel.toggleToolbarVisible()}
        title={`Show Toolbar (${getShortcutPrefix()}M)`}
      >
        <Menu />
      </PillButton>
    </div>
  {/if}
  {#if !isDropdown || pageState.overlayModel.toolbarVisible}
    <div class={["toolbar-items", isDropdown ? "dropdown" : "horizontal"]}>
      <PillButton
        onClick={() => pageState.overlayModel.toggleShareVisible()}
        title={`Share a link to this page (${getShortcutPrefix()}S)`}
      >
        <Share />
      </PillButton>
      <PillButton
        onClick={() => {
          pageState.toggleAutoplay();
          pageState.overlayModel.toolbarVisible = false;
        }}
        title={pageState.autoplaying
          ? `Pause Animation (${getShortcutPrefix()}Space)`
          : `Play Animation (${getShortcutPrefix()}Space)`}
      >
        {#if pageState.autoplaying}
          <CirclePause />
        {:else}
          <CirclePlay />
        {/if}
      </PillButton>

      <DrawerButton />
      <PillButton
        onClick={() => pageState.overlayModel.toggleHelpVisible()}
        title={`Show Help (${getShortcutPrefix()}H)`}
      >
        <Info />
      </PillButton>
    </div>
  {/if}
</div>

<style>
  .toolbar {
    position: relative;
  }

  .menu {
    border-radius: 6px;
    overflow: hidden;
  }

  .toolbar-items {
    display: flex;
    flex-direction: row;
    border: none;
    gap: 0.3rem;
  }

  .toolbar-items.dropdown {
    position: absolute;
    top: calc(100% + 0.3rem);
    left: 0;
    flex-direction: column;
    align-items: end;
    z-index: var(--overlay-controls-layer);
    overflow: hidden;
    border-radius: 6px;
    gap: 0.3rem;
    background: white;
  }
</style>
