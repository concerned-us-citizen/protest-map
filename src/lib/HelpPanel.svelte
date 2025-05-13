<script lang="ts">
  import { fade, slide } from 'svelte/transition';
  export let visible: boolean;
  export let onClose: () => void;
  let showAttribution = false;
</script>

{#if visible}
  <div class="help-panel">
    <button class="close-button dismiss-info-button" on:click={onClose} aria-label="Close info panel">×</button>
    <p>
      This map shows recent and planned US protest locations over time.
    </p>
    <p>
      Locations are colored in shades of red or blue corresponding to the 2024 Trump or Harris voting margin for their surrounding precinct.
    </p>
    <p>
      Press play ({'▶'} in the toolbar at upper right) or the space bar to toggle animation.
    </p>
    <p>
      Choose dates manually with the event slider below, or use left and right arrow keys.
    </p>
    <p>
      Show locations for one or more specific events by toggling {'≡'} or pressing 'F'.
    </p>
    <p class="toggle-attribution-container">
      <button
        class="toggle-attribution-visibility link-button"
        on:click={() => (showAttribution = !showAttribution)}
        aria-label="Toggle Attribution"
      >
        Credits
      </button>
    </p>
    {#if showAttribution}
    <div class="attribution-container" transition:slide>
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
        Protest icon: <a href="https://thenounproject.com/icon/protest-15055/">Fission Strategy</a>
      </p>
    </div>
    {/if}
  </div>
{/if}

<style>
  /* Help Panel Styles */
  .help-panel {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 350px; /* Slightly wider */
    max-width: 90vw;
    background-color: rgba(255, 255, 255, 0.95);
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    padding: 30px 20px 10px 25px; /* Increased padding */
    z-index: 1020;
    font-family: sans-serif;
    font-size: 0.95em; /* Base font for info panel */
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .help-panel p {
    margin: 0 0 1.2em 0;
  }
  .help-panel p:last-child {
    margin-bottom: 0;
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
  .link-button {
    background: none;
    border: none;
    color: #337ab7;
    padding: 0;
    font: inherit;
    cursor: pointer;
    text-align: left;
  }
  .link-button:hover {
    text-decoration: underline;
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
</style>
