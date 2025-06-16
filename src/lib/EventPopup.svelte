<script lang="ts">
  import type { PopulatedEvent } from "$lib/types";
  import { attributions } from "./attributions";

  interface Props {
    populatedEvent: PopulatedEvent;
  }

  const { populatedEvent }: Props = $props();

  const locationTitle = `${populatedEvent.city}, ${populatedEvent.state}`;

  let marginDisplay = $derived.by(() => {
    if (!location) {
      return {
        show: false,
        absMarginPercent: 0,
        candidateName: "Unspecified",
        marginColor: "red",
      };
    }

    const margin = populatedEvent.pctDemLead;
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

<div class="popup-layout">
  {#if populatedEvent}
    <div class="popup-image-container">
      <a href={populatedEvent.cityArticleUrl} target="_blank">
        <img
          src={populatedEvent.cityThumbnailUrl
            ? populatedEvent.cityThumbnailUrl
            : "https://en.wikipedia.org/wiki/Springfield_(The_Simpsons)#/media/File:Springfield_(The_Simpsons).png"}
          alt={locationTitle}
        />
      </a>
    </div>
    <div class="popup-text-container">
      <a
        class="location-title"
        href={populatedEvent.cityArticleUrl}
        target="_blank"><strong>{locationTitle}</strong></a
      >
      {#if populatedEvent.link}
        <a class="event-title-link" href={populatedEvent.link} target="_blank"
          ><div class="event-title">{populatedEvent.name}</div></a
        >
      {:else}
        <div class="event-title">{populatedEvent.name}</div>
      {/if}
    </div>
    {#if marginDisplay.show}
      <a
        href={attributions.nytimesData.resourceLink}
        target="_blank"
        class="popup-margin-link"
      >
        <div
          class="popup-margin-display"
          style="color: {marginDisplay.marginColor};"
        >
          <div class="popup-margin-title">2024 Margin</div>
          <div class="popup-margin-value">
            +{marginDisplay.absMarginPercent}
          </div>
          <div class="popup-margin-candidate">
            {marginDisplay.candidateName}
          </div>
        </div>
      </a>
    {/if}
  {/if}
</div>

<style>
  :global(.maplibregl-popup-content) {
    padding: 0.5em 0.6em !important;
    min-width: auto !important;
    border-radius: 10px !important;
  }

  .popup-layout {
    display: flex;
    align-items: center;
    gap: 0.8em;
    min-width: 18em;
  }
  .popup-image-container {
    line-height: 0;
  }
  .popup-image-container img {
    width: 4.6em;
    height: 4.6em;
    object-fit: cover;
    border-radius: 0.5em;
  }
  .popup-text-container {
    flex-grow: 1;
  }
  .popup-text-container .location-title {
    font-weight: bold;
    color: #333;
    text-decoration: none;
    display: block;
    margin-bottom: 0.2em;
    font-size: 1.15em;
    position: relative;
    z-index: 10;
    pointer-events: auto;
  }
  .popup-text-container .location-title:hover {
    text-decoration: underline;
    color: #007bff;
  }
  .popup-text-container a {
    pointer-events: auto;
    position: relative;
    z-index: 10;
  }
  .popup-text-container a:hover {
    text-decoration: underline;
  }
  .popup-text-container .event-title-link {
    text-decoration: underline;
    color: inherit;
    display: block;
  }
  .popup-text-container .event-title-link:hover .event-title {
    text-decoration: underline;
    color: #0056cc;
  }
  .popup-text-container .event-title {
    font-size: 1.05em;
    color: #555;
    display: block;
  }
  .popup-margin-display {
    text-align: right;
    min-width: 3em;
    margin-left: 0.6em;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .popup-margin-title {
    font-size: 0.65em;
    color: #666;
    margin-bottom: 0.1em;
    text-align: right;
  }
  .popup-margin-display .popup-margin-value {
    font-size: 2.4em;
    font-weight: bold;
    line-height: 1;
  }
  .popup-margin-display .popup-margin-candidate {
    font-size: 0.9em;
    line-height: 1;
  }
  a.popup-margin-link {
    text-decoration: none;
    color: inherit;
  }
</style>
