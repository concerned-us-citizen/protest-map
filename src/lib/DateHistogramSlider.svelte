<!-- svelte-ignore a11y-interactive-supports-focus -->
<script lang="ts">
  import { onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';

  const dispatch = createEventDispatcher<{ dragstart: void, dragend: void }>();

  export let histogramData: { date: string, locationCount: number }[] = [];
  export let currentDateString: string;
  export let systemTodayDate: string; // e.g., "YYYY-MM-DD"
  export let onDateSelect: (date: string) => void;
  export let onPrev: () => void; // For single click
  export let onNext: () => void; // For single click
  export let onStartRepeatPrev: () => void; 
  export let onStartRepeatNext: () => void; 
  export let onStopRepeat: () => void;

  let svgElement: SVGSVGElement;
  let svgWrapperElement: HTMLDivElement; // For binding clientWidth
  let isDragging = false;

  // Dimensions for the SVG and bars
  const svgHeight = 36;
  let barWidth = 10;
  const maxBarHeight = 22;
  const bottomPadding = 0;
  const topPadding = 3;

  let maxLocationCount = 1;

$: if (histogramData.length > 0) {
    maxLocationCount = Math.max(...histogramData.map(d => d.locationCount), 1);
  }

  // Function to calculate bar properties - will be more complex with dynamic SVG width
  function getBarX(index: number): number {
    return index * barWidth;
  }

  function getBarHeight(locationCount: number): number {
    return Math.max(1, (locationCount / maxLocationCount) * maxBarHeight); // Ensure min height of 1 for visibility
  }

  function handleBarClick(date: string) {
    onDateSelect(date);
  }

  // --- Drag logic placeholder ---
  function getIndexFromMouseEvent(event: MouseEvent): number | null {
    if (!svgElement) return null;
    const CTM = svgElement.getScreenCTM();
    if (!CTM) return null;
    
    const svgX = (event.clientX - CTM.e) / CTM.a;
    // Calculate index based on svgX and barWidth (no gap)
    const index = Math.floor(svgX / barWidth);
    if (index >= 0 && index < histogramData.length) {
      return index;
    }
    return null;
  }

  function onMouseDown(event: MouseEvent) {
    if (!browser) return;
    isDragging = true;
    dispatch('dragstart');
    const index = getIndexFromMouseEvent(event);
    if (index !== null && histogramData[index]) {
      onDateSelect(histogramData[index].date);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(event: MouseEvent) {
    if (!isDragging || !browser) return;
    const index = getIndexFromMouseEvent(event);
    if (index !== null && histogramData[index]) {
      const selectedDate = histogramData[index].date;
      if (selectedDate !== currentDateString) {
        onDateSelect(selectedDate);
      }
    }
  }

  function onMouseUp() {
    if (!browser) return;
    if (isDragging) {
      dispatch('dragend');
    }
    isDragging = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  // --- Touch logic ---
  function getIndexFromTouchEvent(event: TouchEvent): number | null {
    if (!svgElement || !event.touches || event.touches.length === 0) return null;
    const CTM = svgElement.getScreenCTM();
    if (!CTM) return null;

    const touch = event.touches[0];
    const svgX = (touch.clientX - CTM.e) / CTM.a;
    const index = Math.floor(svgX / barWidth); // No gap
    if (index >= 0 && index < histogramData.length) {
      return index;
    }
    return null;
  }

  function onTouchStart(event: TouchEvent) {
    if (!browser) return;
    isDragging = true;
    dispatch('dragstart');
    const index = getIndexFromTouchEvent(event);
    if (index !== null && histogramData[index]) {
      onDateSelect(histogramData[index].date);
    }
    window.addEventListener('touchmove', onTouchMove, { passive: false }); // Use passive: false to allow preventDefault
    window.addEventListener('touchend', onTouchEnd);
  }

  function onTouchMove(event: TouchEvent) {
    if (!isDragging || !browser) return;
    const index = getIndexFromTouchEvent(event);
    if (index !== null && histogramData[index]) {
      const selectedDate = histogramData[index].date;
      if (selectedDate !== currentDateString) {
        onDateSelect(selectedDate);
      }
    }
    event.preventDefault(); // Prevent default touch behavior like scrolling
  }

  function onTouchEnd() {
    if (!browser) return;
    if (isDragging) {
      dispatch('dragend');
    }
    isDragging = false;
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
  }

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    }
  });

  // Calculate barWidth based on available width
  let actualSvgWrapperWidth = 300; // Default, will be updated by bind:clientWidth
  
  $: if (browser && svgWrapperElement) { // Ensure element is available in browser
    actualSvgWrapperWidth = svgWrapperElement.clientWidth;
  }

  // Calculate barWidth based on available width
  let svgWidth = 300; // Default, will be calculated based on bars

  $: if (browser && svgWrapperElement) { // Ensure element is available in browser
    actualSvgWrapperWidth = svgWrapperElement.clientWidth;
  }

  $: if (histogramData.length > 0 && actualSvgWrapperWidth > 0) {
    const minBarWidth = 1; // Define a minimum bar width (reduced to 1px)
    const idealBarWidth = actualSvgWrapperWidth / histogramData.length; // No gap

    // Calculate barWidth: use ideal width if >= min, otherwise use min
    barWidth = Math.max(minBarWidth, idealBarWidth);
    // Ensure barWidth is at least 1px
    barWidth = Math.max(1, barWidth);

    // Calculate svgWidth based on the final barWidth
    svgWidth = histogramData.length * barWidth; // No gap

  } else if (histogramData.length === 1 && actualSvgWrapperWidth > 0) {
    barWidth = actualSvgWrapperWidth; // Single bar takes full width
    svgWidth = actualSvgWrapperWidth;
  } else {
    barWidth = 10; // Fallback if no data or width not determined
    svgWidth = 300; // Fallback SVG width
  }
// --- Future events rectangle logic ---
  let futureStartIndex = -1;
  let futureEndIndex = -1;
  let futureRectX = 0;
  let futureRectWidth = 0;

  $: if (histogramData.length > 0 && systemTodayDate) {
    futureStartIndex = histogramData.findIndex(item => item.date > systemTodayDate);
    if (futureStartIndex !== -1) {
      futureEndIndex = histogramData.length - 1;
      futureRectX = getBarX(futureStartIndex); // No gap offset
      // Calculate width: (number of future bars) * barWidth (no gap)
      futureRectWidth = (futureEndIndex - futureStartIndex + 1) * barWidth;
    } else {
      futureStartIndex = -1; // Reset if no future events found
    }
  } else {
    futureStartIndex = -1; // Reset if no data or systemTodayDate
  }

</script>

<div class="histogram-slider-container">
  <button
    class="nav-button prev"
    on:click={onPrev}
    on:mousedown={onStartRepeatPrev}
    on:mouseup={onStopRepeat}
    on:mouseleave={onStopRepeat}
    on:touchstart={onStartRepeatPrev}
    on:touchend={onStopRepeat}
    on:touchcancel={onStopRepeat}
    aria-label="Previous Date"
  >‹</button>
  <div class="svg-wrapper" 
  bind:clientWidth={actualSvgWrapperWidth} 
  bind:this={svgWrapperElement}
  style="--svg-height: {svgHeight}px">
    <svg
      bind:this={svgElement}
      width={svgWidth}
      height={svgHeight}
      on:mousedown={onMouseDown}
      on:touchstart={onTouchStart}
      role="slider"
      aria-valuemin="0"
      aria-valuemax={histogramData.length -1}
      aria-valuenow={histogramData.findIndex(d => d.date === currentDateString)}
      aria-orientation="horizontal"
    >
      {#if futureStartIndex !== -1}
        <rect
          class="future-events-highlight"
          x={futureRectX}
          y={topPadding - 2}
          width={futureRectWidth}
          height={svgHeight - bottomPadding - topPadding + 4}
        />
      {/if}
      {#if histogramData.length > 0}
        {#each histogramData as item, i (item.date)}
          {#if item.date === currentDateString}
            <rect
              class="selected-background-highlight"
              x={getBarX(i)}
              y={topPadding - 2}
              width={barWidth}
              height={svgHeight - bottomPadding - topPadding + 4}
            />
          {/if}
          <rect
            class="data-bar"
            class:selected={item.date === currentDateString}
            x={getBarX(i)}
            y={svgHeight - getBarHeight(item.locationCount) - bottomPadding}
            width={barWidth}
            height={getBarHeight(item.locationCount)}
            on:click={() => handleBarClick(item.date)}
            role="option"
            aria-selected={item.date === currentDateString}
            on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBarClick(item.date); }}
            />
        {/each}
      {/if}
    </svg>
  </div>
  <button
    class="nav-button next"
    on:click={onNext}
    on:mousedown={onStartRepeatNext}
    on:mouseup={onStopRepeat}
    on:mouseleave={onStopRepeat}
    on:touchstart={onStartRepeatNext}
    on:touchend={onStopRepeat}
    on:touchcancel={onStopRepeat}
    aria-label="Next Date"
  >›</button>
</div>

<style>
  .histogram-slider-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #f0f0f0; /* Light gray background */
    padding: 0;
    border-radius: 8px;
    user-select: none; /* Prevent text selection during drag */
    -webkit-touch-callout: none !important;
    -webkit-user-select: none !important;
  }
.future-events-highlight {
    fill: #A9A9A9; /* Medium gray */
    opacity: 0.5; /* Semi-transparent */
  }

  .svg-wrapper {
    flex-grow: 1;
    height: var(--svg-height);
    min-height: var(--svg-height);
    max-height: var(--svg-height);
    margin: 0 10px; /* Space between SVG and buttons */
    overflow-x: auto; /* Enable horizontal scrolling */
    overflow-y: hidden; /* Hide vertical overflow */
    cursor: grab;
  }
  .svg-wrapper:active {
    cursor: grabbing;
  }

  svg {
    display: block; /* Remove extra space below SVG */
  }
  
  .selected-background-highlight {
    fill: #FFD580; /* Light orange for selected background highlight */
  }

  rect.data-bar {
    fill: #00008B; /* Dark blue for standard bars */
    transition: fill 0.2s ease-in-out;
  }


  rect.data-bar:hover {
    fill: #4169E1; /* RoyalBlue on hover */
  }

  rect.data-bar.selected {
    fill: #FFA500; /* Orange for selected bars */
  }

  .nav-button {
    background-color: transparent; /* Remove background */
    border: none; /* Remove border */
    color: #555; /* Adjust color for visibility if needed */
    font-size: 2em; /* Make them a bit larger if they are just icons now */
    font-weight: bold;
    padding: 0 5px; /* Minimal padding */
    line-height: 1;
    height: auto; /* Let content define height */
    min-width: auto; /* Let content define width */
    border-radius: 0; /* No radius if it's just text/icon */
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none; /* Remove focus outline from buttons */
    touch-action: manipulation;
  }

  .nav-button:hover {
    color: #000; /* Darken on hover */
    /* background-color: transparent; Ensure no background on hover */
  }
</style>