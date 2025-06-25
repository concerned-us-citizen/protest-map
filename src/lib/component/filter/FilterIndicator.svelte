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
    <div class="content">
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
  .content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow: hidden;
  }
  ul {
    list-style: none;
    padding-left: 0;
    margin: 0;
  }

  li {
    display: flex;
    flex-direction: column;
    justify-content: stretch;
  }

  .filter {
    display: flex;
    align-items: stretch;
    gap: 0.5em;
    margin-bottom: 0.5em;
  }

  .pill-content {
    display: flex;
    align-items: start;
    justify-content: stretch;
  }

  .title {
    flex: 1 1 auto;
    min-width: 0;
    white-space: normal;
    text-align: left;
  }
</style>
