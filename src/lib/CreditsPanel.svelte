<script lang="ts">
  import { getPageStateFromContext } from './store/PageState.svelte';

  const { className } = $props();

  const pageState = getPageStateFromContext();

  const attributions = [
    {
      description: 'Location data',
      resourceName: 'We (the People) Dissent',
      resourceLink: 'https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/preview#gid=1269890748'
    },
    {
      description: 'Voting margins',
      resourceName: 'The New York Times',
      resourceLink: 'https://github.com/nytimes/presidential-precinct-map-2024'
    },
    {
      description: 'App source',
      resourceName: 'Protest Map',
      resourceLink: 'https://github.com/concerned-us-citizen/protest-map'
    },
    {
      description: 'Analytics',
      resourceName: 'Goat Counter',
      resourceLink: 'https://www.goatcounter.com'
    },
    {
      description: 'Map Display',
      resourceName: 'Leaflet',
      resourceLink: 'https://leafletjs.com'
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

<div class={`content ${className}`}>
  <p>Many thanks to the valuable efforts of these contributors:</p>
  <div class="attribution-container">
    {#each attributions as attribution}
      <div class="attribution">
        <div class="description">{attribution.description}</div>
        <a href={attribution.resourceLink} target="_blank">{attribution.resourceName}</a>
      </div>
    {/each}
  </div>
  <p class="last-updated">
    {pageState.eventStore.formattedUpdatedAt}
  </p>
</div>

<style>
  .content {
    width: 100%;
  }
  .attribution-container {
    columns: 2;
    column-gap: 1vw;
    width: 100%;
    overflow-y: auto;
  }
  .attribution {
    color: #555; /* Darker gray */
    text-align: start;
    padding-bottom: 1em;
    break-inside: avoid;
  }
  .attribution .description {
    font-weight: bold;
  }
  .attribution a {
    display: block;
    color: #337ab7;
    text-decoration: none;
    margin-top: 0.3em;
  }
  .attribution a:hover {
    text-decoration: underline;
  }
  .last-updated {
    text-align: center;
    font-size: 0.8em;
    color: #555;
    margin-top: 1em;
    margin-bottom: 0;
  }
</style>
