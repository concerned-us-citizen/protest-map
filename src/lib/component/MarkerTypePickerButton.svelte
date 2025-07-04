<script lang="ts">
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import type { MarkerType, TurnoutEstimate } from "$lib/types";
  import {
    ArrowDownToLine,
    ArrowUpToLine,
    Minus,
    UsersRound,
  } from "@lucide/svelte";
  import PillButton from "./PillButton.svelte";
  import { toTitleCase } from "$lib/util/string";
  import { markerSvg } from "$lib/icons";
  import InlineSvg from "$lib/InlineSvg.svelte";
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";

  const {
    terse = false,
    markerType,
    src,
    onClick: providedOnClick,
  } = $props<{
    terse?: boolean;
    markerType: MarkerType;
    src?: TurnoutEstimate;
    onClick?: () => void;
  }>();

  const pageState = getPageStateFromContext();

  let onClick = providedOnClick
    ? providedOnClick
    : () => {
        pageState.filter.markerType = markerType;
        if (src) {
          pageState.filter.turnoutEstimate = src;
        }
        pageState.overlayModel.markerTypePickerVisible = false;
      };

  const iconSize = "16px";

  const title = ``;
</script>

<PillButton {onClick} {title}>
  <div class="button-container">
    {#if !terse || deviceInfo.isWide}
      {#if markerType === "event"}
        <div class="event-icon">
          <InlineSvg content={markerSvg} />
        </div>
      {:else}
        <div class="turnout-icon">
          <UsersRound size={16} />
        </div>
      {/if}
    {/if}
    <div class="marker-type-name">
      {markerType === "event"
        ? terse
          ? "Protests"
          : "Count of Protest Locations"
        : terse
          ? "Turnout"
          : `${toTitleCase(src)} Estimated Protester Turnout`}
    </div>
    {#if markerType === "turnout"}
      <div class="count-source-icon">
        {#if src === "low"}
          <ArrowDownToLine size={iconSize} />
        {:else if src === "high"}
          <ArrowUpToLine size={iconSize} />
        {:else}
          <Minus size={iconSize} />
        {/if}
      </div>
    {/if}
  </div>
</PillButton>

<style>
  .button-container {
    display: flex;
    flex-direction: row;
    justify-content: start;
    align-items: center;
    gap: 0.5rem;
    padding: 0.1rem;
    height: 100%;
  }

  .marker-type-name {
    text-wrap: nowrap;
    font-weight: bold;
  }

  .event-icon {
    width: 32px;
    height: 32px;
    /* Adjust for svg internal whitespace TODO fix in svg */
    margin: -0.5em;
    color: var(--pill-button-color);
  }

  .count-source-icon {
    font-size: 0.5rem;
    height: 16px;
    margin-left: auto;
  }
</style>
