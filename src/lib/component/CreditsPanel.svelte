<script lang="ts">
  import { attributions } from "../attributions";
  import { getPageStateFromContext } from "../model/PageState.svelte";

  const { className } = $props();

  const pageState = getPageStateFromContext();
</script>

<div class={`content ${className}`}>
  <p>Many thanks to the valuable efforts of these contributors:</p>
  <div class="attribution-container">
    {#each Object.values(attributions) as attribution, _i (attribution.resourceName)}
      <div class="attribution">
        <div class="description">{attribution.description}</div>
        <a href={attribution.resourceLink} target="_blank"
          >{attribution.resourceName}</a
        >
      </div>
    {/each}
  </div>
  <p class="last-updated">
    {pageState.eventModel.formattedUpdatedAt}
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
    padding-bottom: 0.8rem;
    break-inside: avoid;
  }
  .attribution .description {
    font-weight: bold;
  }
  .attribution a {
    display: block;
    color: #337ab7;
    text-decoration: none;
    margin-top: 0.1rem;
  }
  .attribution a:hover {
    text-decoration: underline;
  }
  .last-updated {
    text-align: center;
    font-size: 0.8rem;
    color: #555;
    margin-top: 1rem;
    margin-bottom: 0;
  }
</style>
