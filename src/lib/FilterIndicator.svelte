<script lang="ts">
  import { slide } from "svelte/transition";
  import { getPageStateFromContext } from "./store/PageState.svelte";

  const pageState = getPageStateFromContext();
</script>

<div class="container">
  <div class="header">Showing only protest locations:</div>
  {#each pageState.filter.filterDescriptions as filter}
    <div class="filter" transition:slide>
      <div class="title">{filter.title}</div>
      <button
        class="link-button"
        onclick={filter.clearFunc}
        title={`Remove restriction '${filter.title}'`}
        aria-label={`Remove restriction '${filter.title}'`}
      >
        ✖️
      </button>
    </div>
  {/each}
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

  .filter {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .header {
    font-weight: bold;
  }

  .filter button {
    font-size: 0.9em;
    text-decoration: none;
  }
</style>
