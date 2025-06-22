<script lang="ts">
  import HistogramSlider from "./HistogramSlider.svelte";
  import { getPageStateFromContext } from "./store/PageState.svelte";

  const pageState = getPageStateFromContext();

  let selectedDateWithEventCount = $derived.by(() => {
    const allDatesWithEventCounts = pageState.filter.allDatesWithEventCounts;
    const currentDate = pageState.filter.currentDate;
    return (
      allDatesWithEventCounts.find((dc) => dc.date === currentDate) ?? null
    );
  });

  let isRepeatingChange = false;
  let currentRepeatDirection: "next" | "prev" | null = null;
  const INITIAL_REPEAT_DELAY = 400; // ms
  const REPEAT_INTERVAL = 80; // ms
  let repeatTimer: ReturnType<typeof setTimeout> | null = null;

  function startDateRepeat(direction: "next" | "prev") {
    // If already repeating in the same direction, do nothing.
    if (isRepeatingChange && currentRepeatDirection === direction) return;

    // Stop any existing repeat action.
    stopDateRepeat();

    isRepeatingChange = true;
    currentRepeatDirection = direction;

    // Schedule the first continuous change after INITIAL_REPEAT_DELAY.
    // The immediate first change will be handled by the on:click event.
    repeatTimer = setTimeout(() => {
      // Ensure we are still supposed to be repeating before the first programmatic change
      if (isRepeatingChange && currentRepeatDirection === direction) {
        continuousDateChange();
      }
    }, INITIAL_REPEAT_DELAY);
  }

  function stopDateRepeat() {
    if (repeatTimer) {
      clearTimeout(repeatTimer);
      repeatTimer = null;
    }
    isRepeatingChange = false;
    currentRepeatDirection = null;
  }

  function continuousDateChange() {
    if (!isRepeatingChange || !currentRepeatDirection) {
      stopDateRepeat();
      return;
    }
    if (currentRepeatDirection === "next") {
      pageState.filter.selectNextDate();
    } else if (currentRepeatDirection === "prev") {
      pageState.filter.selectPreviousDate();
    }
    repeatTimer = setTimeout(continuousDateChange, REPEAT_INTERVAL);
  }
</script>

<div class="timeline">
  <button
    class="nav-button prev"
    onclick={() => pageState.filter.selectPreviousDate()}
    onmousedown={() => startDateRepeat("prev")}
    onmouseup={stopDateRepeat}
    onmouseleave={stopDateRepeat}
    ontouchstart={() => startDateRepeat("prev")}
    ontouchend={stopDateRepeat}
    ontouchcancel={stopDateRepeat}
    aria-label="Previous Date">‹</button
  >
  <HistogramSlider
    className="slider"
    items={pageState.filter.allDatesWithEventCounts}
    selectedItem={selectedDateWithEventCount}
    onSelect={(dc) => pageState.filter.setCurrentDate(dc.date)}
    magnitudeFor={(item) => item.eventCount}
    firstShadedItemIndex={(items) =>
      items.findIndex((item) => item.date >= new Date())}
  />
  <button
    class="nav-button next"
    onclick={() => pageState.filter.selectNextDate()}
    onmousedown={() => startDateRepeat("next")}
    onmouseup={stopDateRepeat}
    onmouseleave={stopDateRepeat}
    ontouchstart={() => startDateRepeat("next")}
    ontouchend={stopDateRepeat}
    ontouchcancel={stopDateRepeat}
    aria-label="Next Date">›</button
  >
</div>

<style>
  .timeline {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: stretch;
    gap: 0.3em;
    padding: 0.3em 0;
    position: static;
    height: 3rem;
    transform: none;
    background-color: #f5f5f5f2;
    border-radius: 8px;
    box-shadow: 0 -2px 10px #0000001a;
    z-index: 1;
    pointer-events: auto;
  }

  /* slider stretches */
  .timeline > :global(:nth-child(2)) {
    flex: 1;
  }

  .timeline button {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    border: none;
    color: #555;
    font-size: 2em;
    font-weight: 700;
    padding: 0 0.4em;
    line-height: 1;
    height: auto;
    min-width: auto;
    border-radius: 0;
    cursor: pointer;
    outline: none;
    touch-action: manipulation;
  }
  /* Compact view on phones in landscape (same is isShort above)*/
  /* 
 * Note we have to hardwire the max-width here, can't use css variables,
 * and can't dynamically set the width from a TS variable unless
 * we want to use svelte:head. Keep this BREAKPOINT in sync with DeviceInfo.svelte.
 */
  @media (max-height: 400px) {
    .timeline {
      height: 2em;
    }
  }
</style>
