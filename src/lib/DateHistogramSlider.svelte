<!-- svelte-ignore a11y-interactive-supports-focus -->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  export let histogramData: { date: string, locationCount: number }[] = [];
  export let currentDate: string;
  export let systemTodayDate: string; // e.g., "YYYY-MM-DD"
  // export let allDates: string[];
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
  const barGap = 2;
  let barWidth = 10;
  const maxBarHeight = 22;
  const bottomPadding = 3;
  const topPadding = 3;

  let maxLocationCount = 1;

  $: if (histogramData.length > 0) {
    maxLocationCount = Math.max(...histogramData.map(d => d.locationCount), 1);
  }

  // Function to calculate bar properties - will be more complex with dynamic SVG width
  function getBarX(index: number): number {
    return index * (barWidth + barGap);
  }

  function getBarHeight(locationCount: number): number {
    return Math.max(1, (locationCount / maxLocationCount) * maxBarHeight); // Ensure min height of 1 for visibility
  }

  function handleBarClick(date: string) { // Removed event parameter
    onDateSelect(date);
    // No explicit blur or focus change here anymore
  }

  // --- Drag logic placeholder ---
  function getIndexFromMouseEvent(event: MouseEvent): number | null {
    if (!svgElement) return null;
    const CTM = svgElement.getScreenCTM();
    if (!CTM) return null;
    
    const svgX = (event.clientX - CTM.e) / CTM.a;
    // Calculate index based on svgX, barWidth, and barGap
    const index = Math.floor(svgX / (barWidth + barGap));
    if (index >= 0 && index < histogramData.length) {
      return index;
    }
    return null;
  }

  function onMouseDown(event: MouseEvent) {
    if (!browser) return;
    isDragging = true;
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
      if (selectedDate !== currentDate) {
        onDateSelect(selectedDate);
      }
    }
  }

  function onMouseUp() {
    if (!browser) return;
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
    const index = Math.floor(svgX / (barWidth + barGap));
    if (index >= 0 && index < histogramData.length) {
      return index;
    }
    return null;
  }

  function onTouchStart(event: TouchEvent) {
    if (!browser) return;
    isDragging = true;
    const index = getIndexFromTouchEvent(event);
    if (index !== null && histogramData[index]) {
      onDateSelect(histogramData[index].date);
    }
    window.addEventListener('touchmove', onTouchMove, { passive: false }); // Use passive: false to allow preventDefault
    window.addEventListener('touchend', onTouchEnd);
    event.preventDefault(); // Prevent default touch behavior like scrolling
  }

  function onTouchMove(event: TouchEvent) {
    if (!isDragging || !browser) return;
    const index = getIndexFromTouchEvent(event);
    if (index !== null && histogramData[index]) {
      const selectedDate = histogramData[index].date;
      if (selectedDate !== currentDate) {
        onDateSelect(selectedDate);
      }
    }
    event.preventDefault(); // Prevent default touch behavior like scrolling
  }

  function onTouchEnd() {
    if (!browser) return;
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

  $: if (histogramData.length > 0 && actualSvgWrapperWidth > 0) {
    const totalGapWidth = Math.max(0, (histogramData.length - 1) * barGap);
    barWidth = Math.max(1, (actualSvgWrapperWidth - totalGapWidth) / histogramData.length);
  } else if (histogramData.length === 1 && actualSvgWrapperWidth > 0) {
    barWidth = actualSvgWrapperWidth; // Single bar takes full width
  } else {
    barWidth = 10; // Fallback if no data or width not determined
  }

</script>

<div class="histogram-slider-container">
  <button
    class="nav-button prev"
    on:click={onPrev}
    on:mousedown={onStartRepeatPrev}
    on:mouseup={onStopRepeat}
    on:mouseleave={onStopRepeat}
    aria-label="Previous Date"
  >‹</button>
  <div class="svg-wrapper" bind:clientWidth={actualSvgWrapperWidth} bind:this={svgWrapperElement}>
    <svg
      bind:this={svgElement}
      width="100%"
      height={svgHeight}
      on:mousedown={onMouseDown}
      on:touchstart={onTouchStart}
      role="slider"
      aria-valuemin="0"
      aria-valuemax={histogramData.length -1}
      aria-valuenow={histogramData.findIndex(d => d.date === currentDate)}
      aria-orientation="horizontal"
    >
      {#if histogramData.length > 0}
        {#each histogramData as item, i (item.date)}
          {#if item.date === currentDate}
            <rect
              class="selected-background-highlight"
              x={getBarX(i) - barGap / 2}
              y={topPadding - 2}
              width={barWidth + barGap}
              height={svgHeight - bottomPadding - topPadding + 4}
            />
          {/if}
          <rect
            class="data-bar"
            class:selected={item.date === currentDate}
            class:future={systemTodayDate && item.date > systemTodayDate}
            x={getBarX(i)}
            y={svgHeight - getBarHeight(item.locationCount) - bottomPadding}
            width={barWidth}
            height={getBarHeight(item.locationCount)}
            on:click={() => handleBarClick(item.date)}
            role="option"
            aria-selected={item.date === currentDate}
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
    aria-label="Next Date"
  >›</button>
</div>

<style>
  .histogram-slider-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #f0f0f0; /* Light gray background */
    padding: 5px 10px 5px 10px;
    border-radius: 8px;
    user-select: none; /* Prevent text selection during drag */
  }

  .svg-wrapper {
    flex-grow: 1;
    margin: 0 10px; /* Space between SVG and buttons */
    overflow: hidden; /* Ensure SVG doesn't overflow its designated space */
    cursor: grab;
  }
  .svg-wrapper:active {
    cursor: grabbing;
  }

  svg {
    display: block; /* Remove extra space below SVG */
  }
  
  .selected-background-highlight {
    fill: #d6eaff; /* More saturated light blue for better visibility */
  }

  rect.data-bar {
    fill: #a0c0e0; /* Default bar color (light blue) */
    transition: fill 0.2s ease-in-out;
  }

  rect.data-bar.future {
    fill: #c0d0e0; /* Slightly dimmer/desaturated blue for future dates */
  }

  rect.data-bar.future.selected {
    fill: #508abd; /* A different shade for selected future date if needed, or let .selected override */
  }

  rect.data-bar:hover {
    fill: #70a0d0; /* Darker blue on hover */
  }

  rect.data-bar.selected {
    fill: #337ab7; /* Even darker blue for selected */
  }

  rect.data-bar:focus, rect.data-bar.selected:focus {
    /* Reverted: No specific focus style here now */
    /* outline: none; */
    /* stroke: #005fcc; */
    /* stroke-width: 1.5px; */
    /* stroke-dasharray: 2,2; */
  }

  /* Reverted: No specific focus style here now */
  rect.data-bar.selected:focus {
    /* outline: none; */
    /* stroke: #004c9e; */
    /* stroke-width: 1.5px; */
    /* stroke-dasharray: none; */
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
  }

  .nav-button:focus {
    /* Optional: Add a custom focus style if needed for accessibility,
       e.g., a subtle box-shadow or background change if outline is removed.
       For now, just removing default outline. */
  }

  .nav-button:hover {
    color: #000; /* Darken on hover */
    /* background-color: transparent; Ensure no background on hover */
  }
</style>