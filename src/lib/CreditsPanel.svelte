<script lang="ts">
  import { fade } from 'svelte/transition';
  import DimmedBackgroundPanel from './DimmedBackgroundPanel.svelte';

  export let visible: boolean;
  export let onClose: () => void;
  export let onRestartTour: () => void; // Export a function prop
</script>

{#if visible}
  <DimmedBackgroundPanel on:dismiss={onClose}>
    <div class="credits-panel">
      <button class="close-button dismiss-info-button" on:click={onClose} aria-label="Close info panel">×</button>
      <p class="toggle-attribution-container" style="font-weight: bold;">Credits</p>
      <div class="attribution-container" transition:fade>
        <p>A big shout out to the providers of these resources:</p>
        <p class="attribution">
          Location data: <a href="https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/preview#gid=1269890748" target="_blank">We (the People) Dissent</a>
        </p>
        <p class="attribution">
          Voting precinct margins: <a href="https://github.com/nytimes/presidential-precinct-map-2024" target="_blank">The New York Times</a>
        </p>
        <p class="attribution">
          App source: <a href="https://github.com/concerned-us-citizen/protest-map" target="_blank">US Protest Map</a>
        </p>
        <p class="attribution">
          Privacy-oriented analytics: <a href="https://www.goatcounter.com">Goat Counter</a>
        </p>
        <p class="attribution">
          Geocoding: <a href="https://nominatim.openstreetmap.org">Nominatim</a>
        </p>
        <p class="attribution">
          Protest icon: <a href="https://thenounproject.com/icon/protest-15055/">Fission Strategy</a>
        </p>
      </div>
      <p>
        <button class="link-button" on:click={onRestartTour}>Take tour again</button>
      </p>
    </div>
  </DimmedBackgroundPanel>
{/if}

<style>
  /* Credits Panel Styles */
  .credits-panel {
    /* Remove absolute positioning and transform centering */
    position: relative; /* Or remove position entirely if not needed for children */
    left: auto;
    top: auto;
    transform: none;

    /* Keep responsive sizing but adjust max-width/height if needed to match Tour feel */
    max-height: 66.66vh; /* Keep original max-height */

    /* Keep existing visual styles */
    background-color: rgba(255, 255, 255);
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    padding: 30px 20px 10px 25px;
    z-index: 1020; /* Keep z-index higher than overlay */
    font-family: sans-serif;
    font-size: 0.95em;
    line-height: 1.6;

    /* Modify flex properties for centering content blocks */
    display: flex;
    flex-direction: column;
    align-items: center; /* Center flex items (paragraphs, attribution container) horizontally */
    overflow-y: auto;
    pointer-events: auto; /* Ensure panel is clickable */
  }

  .link-button {
    background: none;
    border: none;
    color: #007bff; /* Link color */
    cursor: pointer;
    padding: 0;
    font-size: 1em;
    text-decoration: underline;
  }

  .link-button:hover {
    text-decoration: none;
  }

  .credits-panel p {
    margin: 0 0 1.2em 0;
    flex-shrink: 0; /* Prevent paragraphs from shrinking */
  }
  /* Center the button paragraph and add margin */
  .credits-panel p:last-child {
    margin-top: 20px; /* Add margin above the button */
    margin-bottom: 0;
    align-self: center; /* Ensure the last paragraph (button) is centered */
  }
  .attribution-container {
    flex-grow: 1; /* Allow attribution container to grow */
    flex-shrink: 0; /* Prevent attribution container from shrinking */
    width: 100%; /* Allow it to take full width within the centered flex container */
    max-width: 100%; /* Ensure it doesn't exceed parent width */
    text-align: left; /* Keep text left-justified within the container */
  }
  .dismiss-info-button { /* Combined with .close-button styles from EventsFilter */
    position: absolute;
    top: 5px; /* Adjusted to match EventsFilter */
    right: 7px; /* Adjusted to match EventsFilter */
    background: none;
    border: none;
    font-size: 1.5em; /* Matched from EventsFilter */
    line-height: 1;
    padding: 0; /* Matched from EventsFilter */
    cursor: pointer;
    color: #888;
  }
  .dismiss-info-button:hover {
    color: #333;
  }
  .toggle-attribution-container {
    align-self: center;
  }
  .attribution {
    color: #555; /* Darker gray */
    text-align: start;
    margin-bottom: 3px !important;
  }
  .attribution a {
    color: #337ab7;
    text-decoration: none;
  }
  .attribution a:hover {
    text-decoration: underline;
  }

  @media (max-width: 600px) {
    .credits-panel {
      /* Removed explicit width and max-width from media query */
      max-height: 85vh !important; /* Adjust max-height for smaller screens */
      padding: 20px 15px 10px 20px; /* Adjust padding for smaller screens */
      box-sizing: border-box; /* Include padding in element's total width and height */
      /* Remove fixed positioning and transform from media query */
      position: relative; /* Or remove */
      top: auto;
      left: auto;
      transform: none;
      margin: auto; /* Margin auto might help centering within flex container */
      overflow-y: auto;
    }
  }
</style>
