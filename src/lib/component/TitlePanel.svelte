<script lang="ts">
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import { countAndLabel } from "$lib/util/string";
  import PillButton from "./PillButton.svelte";
  import DatePicker from "./DatePicker.svelte";
  import { circledMarkerSvg, personSvg } from "$lib/icons";
  import { formatRangeTerse } from "./formatting";
  import { formatTerse } from "$lib/util/number";
  import Panel from "./Panel.svelte";
  import InlineSvg from "$lib/InlineSvg.svelte";

  const { title, class: className } = $props<{
    title: string;
    class: string;
  }>();

  const pageState = getPageStateFromContext();

  const showTurnout = $derived(pageState.filter.dateHasTurnout);
</script>

<Panel class={className}>
  <div class="content">
    <h1 class="title">{title}</h1>

    <div class="date-and-counts">
      <DatePicker class="date-picker" />
      <div class="count-buttons-container">
        <PillButton
          class="count-button"
          disabled={!showTurnout}
          title="Show protest locations"
          selected={pageState.filter.markerType === "event"}
          onClick={() => (pageState.filter.desiredMarkerType = "event")}
        >
          <div class="event-icon">
            <InlineSvg content={circledMarkerSvg} />
          </div>
          <div class="event-count">
            {#if pageState.filter.dateHasTurnout}
              {formatTerse(pageState.filter.eventCount)}
            {:else}
              {countAndLabel(pageState.filter.eventCount, "location")}
            {/if}
          </div>
        </PillButton>
        <PillButton
          class="count-button"
          disabled={!showTurnout}
          title={showTurnout
            ? "Show estimated turnout numbers"
            : "Turnout data unavailable"}
          selected={pageState.filter.markerType === "turnout"}
          onClick={() => (pageState.filter.desiredMarkerType = "turnout")}
        >
          <div class="event-icon">
            <InlineSvg content={personSvg} />
          </div>
          <div class="turnout-count">
            {#if showTurnout}
              {formatRangeTerse(pageState.filter.turnoutRange, false)}
            {:else}
              N/A
            {/if}
          </div>
        </PillButton>
      </div>
    </div>
  </div>
</Panel>

<style>
  .content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  .title {
    font-size: 1.1em;
    font-weight: 700;
    margin: 0;
    padding: 0;
    text-align: start;
  }

  .date-and-counts {
    font-size: 0.9rem;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0.05em;
    white-space: nowrap;
  }
  .count-buttons-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    flex-wrap: nowrap;
    gap: 0.5rem;
  }

  :global(.count-button) {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.3rem;
    flex-wrap: nowrap;
  }
  :global(.event-icon *) {
    width: 20px;
    height: 20px;
    display: block;
    color: var(--pill-button-color);
  }
</style>
