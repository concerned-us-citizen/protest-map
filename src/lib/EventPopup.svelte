<script lang="ts">
  import type { Nullable, ProtestEventAndLocation } from '$lib/types'; 
  import { attributions } from './attributions';

  interface Props {
    protestEventAndLocation: Nullable<ProtestEventAndLocation>;
  }

  const { protestEventAndLocation }: Props = $props();
  const { event, location } = protestEventAndLocation ?? { event: null, location: null };

  let marginDisplay = $derived.by(() => {
    if (!location) {
      return {
        show: false,
        absMarginPercent: 0,
        candidateName: "Unspecified",
        marginColor: "red"
      };
    }

    const margin = location.pct_dem_lead;
    if (typeof margin === 'number') {
      const absMarginPercent = Math.round(Math.abs(margin) * 100);
      const candidateName = margin > 0 ? 'Harris' : 'Trump';
      const marginColor = margin > 0 ? 'rgb(23, 78, 154)' : 'rgb(190, 40, 40)';
      
      return {
        show: true,
        absMarginPercent,
        candidateName,
        marginColor
      };
    }
    return { show: false };
  });
</script>

<div class="popup-layout">
  {#if location}
    <div class="popup-image-container">
      <a href="{location.pageUrl}" target="_blank">
        <img src="{location.image ? location.image : 'https://en.wikipedia.org/wiki/Springfield_(The_Simpsons)#/media/File:Springfield_(The_Simpsons).png'}" alt="{location.title}" />
      </a>
    </div>
    <div class="popup-text-container">
      <a class="location-title" href="{location.pageUrl}" target="_blank"><strong>{location.title}</strong></a>
      {#if event.link}
        <a class="event-title-link" href="{event.link}" target="_blank"><div class="event-title">{event.name}</div></a>
      {:else}
        <div class="event-title">{event.name}</div>
      {/if}
    </div>
    {#if marginDisplay.show}
      <a href="{attributions.nytimesData.resourceLink}" target="_blank" class="popup-margin-link">
        <div class="popup-margin-display" style="color: {marginDisplay.marginColor};">
          <div class="popup-margin-title">2024 Margin</div>
          <div class="popup-margin-value">+{marginDisplay.absMarginPercent}</div>
          <div class="popup-margin-candidate">{marginDisplay.candidateName}</div>
        </div>
      </a>
    {/if}
  {/if}
</div>

<style>
  :global(.leaflet-popup-content) {
    margin: .5em .6em !important;
    min-width: auto !important;
  }

  .popup-layout {
    display: flex;
    align-items: center;
    gap: .8em;
    min-width: 18em;
  }
  .popup-image-container {
    line-height: 0;
  }
  .popup-image-container img {
    width: 4.6em;
    height: 4.6em;
    object-fit: cover;
    border-radius: .5em;
  }
  .popup-text-container {
    flex-grow: 1;
  }
  .popup-text-container .location-title {
    font-weight: bold;
    color: #333;
    text-decoration: none;
    display: block;
    margin-bottom: .2em;
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
    margin-left: .6em;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .popup-margin-title {
    font-size: 0.65em;
    color: #666;
    margin-bottom: .1em;
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