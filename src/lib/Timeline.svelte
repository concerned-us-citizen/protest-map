<script lang="ts">
  import HistogramSlider from "./HistogramSlider.svelte";
  import { getPageStateFromContext } from "./store/PageState.svelte";
  import type { Nullable } from "./types";

  const pageState = getPageStateFromContext();

  let selectedDateWithEventCount: Nullable<{ date: Date, eventCount: number }> = null;
  $: selectedDateWithEventCount = pageState.eventStore.allDatesWithEventCounts.find(dc => dc.date === pageState.filter.currentDate) ?? null;

  let isRepeatingChange = false;
  let currentRepeatDirection: 'next' | 'prev' | null = null;
  const INITIAL_REPEAT_DELAY = 400; // ms
  const REPEAT_INTERVAL = 80;    // ms
  let repeatTimer: ReturnType<typeof setTimeout> | null = null;

  function startDateRepeat(direction: 'next' | 'prev') {
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
    if (currentRepeatDirection === 'next') {
      pageState.filter.selectNextDate();
    } else if (currentRepeatDirection === 'prev') {
      pageState.filter.selectPreviousDate();
    }
    repeatTimer = setTimeout(continuousDateChange, REPEAT_INTERVAL);
  }
</script>

<div class="timeline">
  <button
    class="nav-button prev"
    on:click={() => pageState.filter.selectPreviousDate()}
    on:mousedown={() => startDateRepeat('prev')}
    on:mouseup={stopDateRepeat}
    on:mouseleave={stopDateRepeat}
    on:touchstart={() => startDateRepeat('prev')}
    on:touchend={stopDateRepeat}
    on:touchcancel={stopDateRepeat}
    aria-label="Previous Date"
  >‹</button>
  <HistogramSlider
    items={pageState.eventStore.allDatesWithEventCounts}
    selectedItem={selectedDateWithEventCount}
    onSelect={dc => pageState.filter.currentDate = dc.date}
    magnitudeFor={item => item.eventCount}
    firstShadedItemIndex={items => items.findIndex(item => item.date >= new Date())}
    />
    <button
      class="nav-button next"
      on:click={() => pageState.filter.selectNextDate()}
      on:mousedown={() => startDateRepeat('next')}
      on:mouseup={stopDateRepeat}
      on:mouseleave={stopDateRepeat}
      on:touchstart={() => startDateRepeat('next')}
      on:touchend={stopDateRepeat}
      on:touchcancel={stopDateRepeat}
      aria-label="Next Date"
    >›</button>
</div>

<style>

</style>