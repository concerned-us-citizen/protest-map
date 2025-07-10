<script lang="ts">
  import PillButton from "./PillButton.svelte";
  import {
    CirclePause,
    CirclePlay,
    Info,
    Menu,
    Search,
    Share,
    ArrowRightToLine,
    ArrowUpToLine,
  } from "@lucide/svelte";
  import { getShortcutPrefix } from "$lib/util/os";
  import { protestMapTourId } from "./dialog/ProtestMapTour.svelte";
  import { regionNavigationDialogId } from "./dialog/RegionNavigationDialog.svelte";
  import { shareDialogId } from "./dialog/ShareDialog.svelte";
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import { fade, slide } from "svelte/transition";
  import { quintOut } from "svelte/easing";

  const {
    orientation = "vertical",
    class: className,
    ...rest
  } = $props<{
    orientation?: "vertical" | "horizontal";
    cookieId?: string;
    class?: string;
  }>();

  const pageState = getPageStateFromContext();
</script>

<div class={["toolbar", orientation, className]} {...rest}>
  <PillButton
    white
    class="menu-button"
    title={`${pageState.toolbarVisible ? "Hide" : "Show"} menu (${getShortcutPrefix()}M)`}
    onClick={() => pageState.toggleToolbarVisible()}
  >
    <div transition:fade>
      {#if pageState.toolbarVisible}
        {#if orientation === "vertical"}
          <ArrowUpToLine size="24" />
        {:else}
          <ArrowRightToLine size="24" />
        {/if}
      {:else}
        <Menu size="24" />
      {/if}
    </div>
  </PillButton>
  {#if pageState.toolbarVisible}
    <div
      class="content"
      transition:slide={{
        duration: 300,
        easing: quintOut,
        axis: orientation === "vertical" ? "y" : "x",
      }}
    >
      <PillButton
        white
        popoverTarget={regionNavigationDialogId}
        title={`Find a city, state, or ZIP code (${getShortcutPrefix()}R)`}
      >
        <Search />
      </PillButton>
      <PillButton
        white
        popoverTarget={shareDialogId}
        title={`Share a link to this page (${getShortcutPrefix()}S)`}
      >
        <Share />
      </PillButton>
      <PillButton
        white
        onClick={() => {
          pageState.toggleAutoplay();
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

      <PillButton
        white
        popoverTarget={protestMapTourId}
        title={`Show Help (${getShortcutPrefix()}H)`}
      >
        <Info />
      </PillButton>
    </div>
  {/if}
</div>

<style>
  .toolbar,
  .toolbar .content {
    display: flex;
    gap: 0.5rem;
    flex-wrap: nowrap;
  }

  .toolbar {
    align-items: start;
    overflow: hidden;
  }

  .toolbar.horizontal {
    flex-direction: row-reverse;
  }
  .toolbar.vertical,
  .toolbar.vertical .content {
    flex-direction: column;
  }

  :global(svg) {
    vertical-align: middle;
  }
</style>
