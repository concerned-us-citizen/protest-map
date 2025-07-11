<script lang="ts">
  import type { PopulatedMarker, PopulatedTurnoutMarker } from "$lib/types";
  import { attributions } from "$lib/attributions";
  import { isHttpUrl } from "$lib/util/misc";
  import { pluralize } from "$lib/util/string";
  import { formatRangeTerse } from "../formatting";

  const { populatedMarker } = $props<{
    populatedMarker: PopulatedMarker;
  }>();

  const turnout = $state(
    populatedMarker.type === "turnout"
      ? (populatedMarker as PopulatedTurnoutMarker)
      : undefined
  );

  let marginDisplay = $derived.by(() => {
    if (!location) {
      return {
        show: false,
        absMarginPercent: 0,
        candidateName: "Unspecified",
        marginColor: "red",
      };
    }

    const margin = populatedMarker.pctDemLead;
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

  let coverageUrl = $derived.by(() => turnout?.coverageUrl);

  let turnoutDescription = $derived.by(() => {
    return turnout ? formatRangeTerse(turnout) : "";
  });
</script>

<div class="layout">
  <div class="top-row">
    {#if populatedMarker}
      <div class="image-container">
        <a href={populatedMarker.cityArticleUrl} target="_blank" rel="noopener">
          <img
            src={populatedMarker.cityThumbnailUrl
              ? populatedMarker.cityThumbnailUrl
              : "https://en.wikipedia.org/wiki/Springfield_(The_Simpsons)#/media/File:Springfield_(The_Simpsons).png"}
            alt={populatedMarker.cityName}
          />
        </a>
      </div>
      <div class="text-container">
        <a
          class="location-title"
          href={populatedMarker.cityArticleUrl}
          target="_blank"
          rel="noopener"><strong>{populatedMarker.cityName}</strong></a
        >
        {#if populatedMarker.link}
          <a
            class="event-title-link"
            href={populatedMarker.link}
            target="_blank"
            rel="noopener"
            ><div class="event-title">{populatedMarker.eventName}</div></a
          >
        {:else}
          <div class="event-title">{populatedMarker.eventName}</div>
        {/if}
      </div>
      {#if marginDisplay.show}
        <a
          href={attributions.nytimesData.resourceLink}
          target="_blank"
          rel="noopener"
          class="margin-link"
        >
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
        </a>
      {/if}
    {/if}
  </div>
  {#if turnout}
    <div class="turnout-container">
      <div class="turnout-description">
        Est. turnout: <b>{turnoutDescription}</b>
        {pluralize(turnout.low, "protester")}
      </div>

      {#if coverageUrl}
        <div class="coverage">
          {#if isHttpUrl(coverageUrl)}
            <a href={coverageUrl} target="_blank" rel="noopener">Coverage</a>
          {:else}
            Coverage: {coverageUrl}
          {/if}
        </div>
      {/if}
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
    min-width: 18em;
    gap: 0.5rem;
  }

  .top-row {
    display: flex;
    gap: 0.8em;
    align-items: center;
  }

  .turnout-container {
    background: var(--pill-button-background);
    border-radius: 5px;
    padding: 0.3rem;
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
  .text-container .location-title {
    font-weight: bold;
    color: #333;
    text-decoration: none;
    display: block;
    margin-bottom: 0.2em;
    font-size: 1.15em;
    position: relative;
    pointer-events: auto;
  }
  .text-container .location-title:hover {
    text-decoration: underline;
    color: #007bff;
  }
  .text-container a {
    pointer-events: auto;
    position: relative;
  }
  .text-container a:hover {
    text-decoration: underline;
  }
  .text-container .event-title-link {
    text-decoration: underline;
    color: inherit;
    display: block;
  }
  .text-container .event-title-link:hover .event-title {
    text-decoration: underline;
    color: #0056cc;
  }
  .text-container .event-title {
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
  a.margin-link {
    text-decoration: none;
    color: inherit;
  }

  .coverage {
    align-self: end;
  }
</style>
