<script lang="ts">
  import { fade } from 'svelte/transition';
  import DimmedBackgroundPanel from './DimmedBackgroundPanel.svelte';

  export let visible: boolean;
  export let onClose: () => void;
  export let onRestartTour: () => void; // Export a function prop

  const attributions = [
    {
      description: 'Location data',
      resourceName: 'We (the People) Dissent',
      resourceLink: 'https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/preview#gid=1269890748'
    },
    {
      description: 'Voting precinct margins',
      resourceName: 'The New York Times',
      resourceLink: 'https://github.com/nytimes/presidential-precinct-map-2024'
    },
    {
      description: 'App source',
      resourceName: 'US Protest Map',
      resourceLink: 'https://github.com/concerned-us-citizen/protest-map'
    },
    {
      description: 'Privacy-oriented analytics',
      resourceName: 'Goat Counter',
      resourceLink: 'https://www.goatcounter.com'
    },
    {
      description: 'Geocoding',
      resourceName: 'Nominatim',
      resourceLink: 'https://nominatim.openstreetmap.org'
    },
    {
      description: 'Protest icon',
      resourceName: 'Fission Strategy',
      resourceLink: 'https://thenounproject.com/icon/protest-15055/'
    }
  ];
</script>

{#if visible}
  <DimmedBackgroundPanel on:dismiss={onClose}>
    <div class="credits-panel">
      <button class="close-button dismiss-info-button" on:click={onClose} aria-label="Close info panel">×</button>
      <p class="toggle-attribution-container" style="font-weight: bold;">Credits</p>
      <div class="attribution-container" transition:fade>
        <p>A big shout out to these resources:</p>
        {#each attributions as attribution}
          <p class="attribution">
            <strong>{attribution.description}</strong><br>
            <a href={attribution.resourceLink} target="_blank">{attribution.resourceName}</a>
          </p>
        {/each}
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
    max-height: 95vh;
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

  .attribution-container {
    flex-grow: 1; /* Allow attribution container to grow */
    flex-shrink: 0; /* Prevent attribution container from shrinking */
    width: 100%; /* Allow it to take full width within the centered flex container */
    max-width: 100%; /* Ensure it doesn't exceed parent width */
    text-align: left; /* Keep text left-justified within the container */
  }
  .dismiss-info-button {
    position: absolute;
    top: 0px;
    right: 0px;
    background: none;
    border: none;
    font-size: 1.5em;
    line-height: 1;
    padding: 15px;
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

  p button {
    margin-top: 20px;
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
