<script lang="ts">
  import { slide } from "svelte/transition";
  import { getPageStateFromContext } from "./store/PageState.svelte";
  import FormattedText from "./FormattedText.svelte";

  const pageState = getPageStateFromContext();
</script>

<div class="container">
  <div class="header">Showing only protest locations:</div>
  <ul>
    {#each pageState.filter.filterDescriptions as filter}
      <li class="filter" transition:slide>
        <span class="bullet">•</span>
        <div class="text-block">
          <div class="title"><FormattedText text={filter.title} /></div>
        </div>
        <button
          class="link-button"
          onclick={filter.clearFunc}
          title={`Remove restriction '${filter.title}'`}
          aria-label={`Remove restriction '${filter.title}'`}
        >
          ✖️
        </button>
      </li>
    {/each}
  </ul>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    font-size: 0.8em;
    gap: 0.3em;
    --highlight-border-h: 0.3em;
    border-radius: var(--panel-border-radius);
    padding: var(--panel-padding-v)
      calc(var(--panel-padding-h) - var(--highlight-border-h));
    overflow: hidden;

    background-color: var(--accent-color);
  }

  ul {
    list-style: none;
    padding-left: 0;
    margin: 0;
  }

  .filter {
    display: flex;
    align-items: stretch;
    gap: 0.5em;
    margin-bottom: 0.5em;
  }

  .bullet {
    flex: 0 0 auto;
    font-size: 1em;
    line-height: 1;
    padding-top: 0.15em;
  }

  .text-block {
    flex: 1 1 auto;
    display: inline-block;
    line-height: 1.3;
  }

  .link-button {
    flex: 0 0 auto;
    align-self: center;
    font-size: 0.9em;
    background: none;
    border: none;
    cursor: pointer;
  }

  .header {
    font-weight: normal;
    margin-bottom: 0.3em;
  }

  .filter button {
    font-size: 0.9em;
    text-decoration: none;
  }
</style>
