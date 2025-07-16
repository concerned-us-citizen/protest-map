<script lang="ts">
  import type { PopulatedMarker, PopulatedTurnoutMarker } from "$lib/types";
  import { attributions } from "$lib/attributions";
  import { countAndLabel, pluralize } from "$lib/util/string";
  import { formatRangeTerse } from "../formatting";
  import Link from "../Link.svelte";
  import { isHttpUrl } from "$lib/util/misc";
  import { fallBackCityThumbnailUrl } from "$lib/images";
  import FormattedText from "../FormattedText.svelte";

  const { populatedMarkers } = $props<{
    populatedMarkers: PopulatedMarker[];
  }>();

  let firstMarker = $derived(populatedMarkers[0]);

  const markersAreTurnouts = $derived(firstMarker.type === "turnout");
  const multipleMarkers = $derived(populatedMarkers.length > 1);

  let marginDisplay = $derived.by(() => {
    if (!location) {
      return {
        show: false,
        absMarginPercent: 0,
        candidateName: "Unspecified",
        marginColor: "red",
      };
    }

    const margin = firstMarker.pctDemLead;
    if (typeof margin === "number") {
      const absMarginPercent = Math.round(Math.abs(margin) * 100);
      const candidateName = margin > 0 ? "Harris" : "Trump";
      const marginColor = margin > 0 ? "rgb(23, 78, 154)" : "rgb(190, 40, 40)";

      return {
        show: true,
        absMarginPercent,
        candidateName,
        marginColor,
      };
    }
    return { show: false };
  });
</script>

<div class="layout">
  <div class="top-row">
    {#if firstMarker}
      <div class="image-container">
        <Link href={firstMarker.cityArticleUrl}>
          <img
            src={firstMarker.cityThumbnailUrl
              ? firstMarker.cityThumbnailUrl
              : fallBackCityThumbnailUrl}
            alt={firstMarker.cityName}
          />
        </Link>
      </div>
      <div class="text-container">
        <Link class="location-title" href={firstMarker.cityArticleUrl}>
          <strong>{firstMarker.cityName}</strong>
        </Link>
        <div class="event-names">
          {#if !multipleMarkers}
            <Link href={firstMarker.link}>{firstMarker.eventName}</Link>
          {/if}
        </div>
      </div>
      {#if marginDisplay.show}
        <Link href={attributions.nytimesData.resourceLink} class="margin-link">
          <div
            class="margin-display"
            style="color: {marginDisplay.marginColor};"
          >
            <div class="margin-title">2024 Margin</div>
            <div class="margin-value">
              +{marginDisplay.absMarginPercent}
            </div>
            <div class="margin-candidate">
              {marginDisplay.candidateName}
            </div>
          </div>
        </Link>
      {/if}
    {/if}
  </div>
  {#if multipleMarkers || markersAreTurnouts}
    <div class="multiple-or-turnout-container">
      {#each populatedMarkers as populatedMarker (populatedMarker.id)}
        <div class="multiple-or-turnout">
          {#if multipleMarkers}
            <Link href={populatedMarker.link}>
              {populatedMarker.eventName}
            </Link>
          {/if}
          {#if markersAreTurnouts}
            {@const turnout = populatedMarker as PopulatedTurnoutMarker}
            <div class="turnout-stats">
              <div class="turnout-description">
                Est. turnout: <b>{formatRangeTerse(populatedMarker)}</b>
                {pluralize(turnout.low, "protester")}
              </div>

              {#if isHttpUrl(turnout.coverageUrl)}
                <Link class="coverage" href={turnout.coverageUrl}>Coverage</Link
                >
              {:else if typeof turnout.coverageUrl === "string" && turnout.coverageUrl.length > 0}
                Coverage: <FormattedText text={turnout.coverageUrl} />
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  :global(.maplibregl-popup-content) {
    padding: 0.5em 0.6em !important;
    min-width: auto !important;
    border-radius: 10px !important;
  }

  .layout {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    max-height: 60vh;
    overflow-y: scroll;
    scrollbar-width: none;
    min-width: 18em;
    pointer-events: auto;
  }

  .top-row {
    display: flex;
    gap: 0.8em;
    align-items: center;
  }

  .event-count {
    font-weight: bold;
    align-self: center;
    margin-bottom: -0.3rem;
  }

  .multiple-or-turnout-container {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .multiple-or-turnout {
    background: var(--pill-button-background);
    border-radius: 5px;
    padding: 0.3rem;
    display: flex;
    flex-direction: column;
  }

  .turnout-stats {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .image-container {
    line-height: 0;
  }
  .image-container img {
    width: 4.6em;
    height: 4.6em;
    object-fit: cover;
    border-radius: 0.5em;
  }
  .text-container {
    flex-grow: 1;
  }
  .text-container :global(.location-title) {
    font-weight: bold;
    color: #333;
    text-decoration: none;
    display: block;
    margin-bottom: 0.2em;
    font-size: 1.15em;
    position: relative;
    pointer-events: auto;
  }
  .text-container :global(.event-title) {
    font-size: 1.05em;
    color: #555;
    display: block;
  }
  .margin-display {
    text-align: right;
    min-width: 3em;
    margin-left: 0.6em;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .margin-title {
    font-size: 0.65em;
    color: #666;
    margin-bottom: 0.1em;
    text-align: right;
  }
  .margin-display .margin-value {
    font-size: 2.4em;
    font-weight: bold;
    line-height: 1;
  }
  .margin-display .margin-candidate {
    font-size: 0.9em;
    line-height: 1;
  }
  :global(a.margin-link) {
    text-decoration: none;
    color: inherit;
  }

  :global(.coverage) {
    align-self: end;
  }
</style>
