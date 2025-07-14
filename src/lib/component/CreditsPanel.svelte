<script lang="ts">
  import { attributions } from "../attributions";

  const { className } = $props();
</script>

<div class={`content ${className}`}>
  <p>
    This project is a solo <a
      href="https://github.com/concerned-us-citizen/protest-map">open source</a
    >
    effort.
    <a href="mailto:support@protestmap.info?subject=Feedback">Have feedback?</a>
  </p>
  <p>
    The map's data comes from the continuous hard work of the volunteers around <a
      href="https://thepeopledissent.substack.com">We (The People) Dissent</a
    >. You can view most the recent data ingestion stats
    <a href="/stats" target="_blank" rel="noopener">here</a>.
  </p>
  <p>Many thanks also to those responsible for these valuable resources:</p>
  <div class="attribution-container">
    {#each Object.values(attributions) as attribution, _i (attribution.resourceName)}
      <div class="attribution">
        <div class="description">{attribution.description}</div>
        <a href={attribution.resourceLink} target="_blank" rel="noopener"
          >{attribution.resourceName}</a
        >
      </div>
    {/each}
  </div>
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
    margin-top: 1rem;
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

  .attribution-container a {
    display: block;
    margin-top: 0.1rem;
  }
  a {
    color: #337ab7;
    text-decoration: none;
  }
  .attribution a:hover {
    text-decoration: underline;
  }
  .last-updated {
    display: flex;
    flex-direction: row;
    justify-content: center;
    font-size: 0.8rem;
    color: #555;
    margin-top: 0;
    margin-bottom: 0;
  }

  .data-source-links {
    display: flex;
    flex-direction: row;
    gap: 2rem;
    justify-content: center;
    padding: 0 0.5rem;
  }
</style>
