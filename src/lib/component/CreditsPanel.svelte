<script lang="ts">
  import { attributions } from "../attributions";
  import { getPageStateFromContext } from "../model/PageState.svelte";

  const { className } = $props();

  const pageState = getPageStateFromContext();
</script>

<div class={`content ${className}`}>
  <p>
    This project is open source. To give feedback, you can either post
    <a href="https://github.com/concerned-us-citizen/protest-map"
      >an issue on GitHub</a
    >
    or
    <a href="mailto:support@protestmap.info?subject=Feedback"
      >send us an email</a
    >.
  </p>
  <p>
    The map owes much to the the data provided by <a
      href="https://thepeopledissent.substack.com">We (The People) Dissent</a
    >. Data Sources:
  </p>
  <p class="data-source-links">
    <a
      href="https://docs.google.com/spreadsheets/d/1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A/edit?gid=2111558793#gid=2111558793"
      >Event Data
    </a>
    <a
      href="https://docs.google.com/spreadsheets/d/1hQzNbsbupLqtijfQywpmZs6nKSNLmEbugaYl6HWbyvA/edit?gid=1716080084#gid=1716080084"
      >Turnout Data
    </a>
  </p>
  <p>Many thanks also to those responsible for these valuable resources:</p>
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
