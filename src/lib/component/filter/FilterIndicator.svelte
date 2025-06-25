<script lang="ts">
  import { slide } from "svelte/transition";
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import FormattedText from "$lib/component/FormattedText.svelte";
  import PillButton from "$lib/component/PillButton.svelte";
  import Panel from "$lib/component/Panel.svelte";

  const pageState = getPageStateFromContext();
</script>

<div transition:slide>
  <Panel title="Filtering, Showing Protests:">
    <div class="content" transition:slide>
      <ul>
        {#each pageState.filter.filterDescriptions as filter, _i (filter.title)}
          <li class="filter" transition:slide>
            <PillButton
              accented
              onclick={filter.clearFunc}
              title={`Remove filter '${filter.title}'`}
              aria-label={`Remove filter '${filter.title}'`}
            >
              <div class="pill-content">
                <div class="title"><FormattedText text={filter.title} /></div>
                <div class="x">✖️</div>
              </div>
            </PillButton>
          </li>
        {/each}
      </ul>
    </div>
  </Panel>
</div>

<style>
  ul {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    align-items: stretch;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    padding: 0;
    margin: 0;
  }

  .filter {
    display: flex;
    align-items: stretch;
    gap: 0.5em;
  }

  .pill-content {
    display: flex;
    gap: 0.2rem;
    align-items: start;
    justify-content: stretch;
  }

  .title {
    flex: 1 1 auto;
    min-width: 0;
    white-space: normal;
    text-align: left;
  }

  .x {
    margin-top: -5px;
    margin-bottom: -2px;
    padding-top: 2px;
  }
</style>
