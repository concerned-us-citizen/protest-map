<script lang="ts" generics="T">
  import { browser } from '$app/environment';
  import { onDestroy, createEventDispatcher } from 'svelte';
  import type { Nullable } from './types';

  export let items: T[];
  export let selectedItem: Nullable<T>;
  export let magnitudeFor: (_item: T) => number;
  export let firstShadedItemIndex: (_items: T[]) => number;
  export let onSelect: (_item: T) =>  void;
  export let className = '';

  let maxMagnitude: number = 0;
  $: maxMagnitude = Math.max(0, ...items.map(magnitudeFor));

  let futureStartIndex = -1;
  let futureEndIndex = -1;
  let futureRectX = 0;
  let futureRectWidth = 0;

  $: if (items.length > 0) {
    futureStartIndex = firstShadedItemIndex(items);
    if (futureStartIndex !== -1) {
      futureEndIndex = items.length - 1;
      futureRectX = getBarX(futureStartIndex); // No gap offset
      // Calculate width: (number of future bars) * barWidth (no gap)
      futureRectWidth = (futureEndIndex - futureStartIndex + 1) * barWidth;
    } else {
      futureStartIndex = -1; // Reset if no future events found
    }
  } else {
    futureStartIndex = -1; // Reset if no data
  }

  const dispatch = createEventDispatcher<{ dragstart: void, dragend: void }>();


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

  $: if (items.length > 0 && actualSvgWrapperWidth > 0) {
    const minBarWidth = 1; // Define a minimum bar width (reduced to 1px)
    const idealBarWidth = actualSvgWrapperWidth / items.length; // No gap

    // Calculate barWidth: use ideal width if >= min, otherwise use min
    barWidth = Math.max(minBarWidth, idealBarWidth);
    // Ensure barWidth is at least 1px
    barWidth = Math.max(1, barWidth);

    // Calculate svgWidth based on the final barWidth
    svgWidth = items.length * barWidth; // No gap

  } else if (items.length === 1 && actualSvgWrapperWidth > 0) {
    barWidth = actualSvgWrapperWidth; // Single bar takes full width
    svgWidth = actualSvgWrapperWidth;
  } else {
    barWidth = 10; // Fallback if no data or width not determined
    svgWidth = 300; // Fallback SVG width
  }
  let svgElement: SVGSVGElement;
  let svgWrapperElement: HTMLDivElement; // For binding clientWidth
  let isDragging = false;

  const svgHeight = 36;
  let barWidth = 10;
  const maxBarHeight = 22;
  const bottomPadding = 0;
  const topPadding = 3;

  function getBarX(index: number): number {
    return index * barWidth;
  }

  function getBarHeight(locationCount: number): number {
    return Math.max(1, (locationCount / maxMagnitude) * maxBarHeight); // Ensure min height of 1 for visibility
  }

   // --- Drag logic placeholder ---
   function getIndexFromMouseEvent(event: MouseEvent): number | null {
    if (!svgElement) return null;
    const CTM = svgElement.getScreenCTM();
    if (!CTM) return null;
    
    const svgX = (event.clientX - CTM.e) / CTM.a;
    // Calculate index based on svgX and barWidth (no gap)
    const index = Math.floor(svgX / barWidth);
    if (index >= 0 && index < items.length) {
      return index;
    }
    return null;
  }

  function onMouseDown(event: MouseEvent) {
    if (!browser) return;
    isDragging = true;
    dispatch('dragstart');
    const index = getIndexFromMouseEvent(event);
    if (index !== null && items[index]) {
      onSelect(items[index]);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(event: MouseEvent) {
    if (!browser) return;
    if (!isDragging) return;
    const index = getIndexFromMouseEvent(event);
    if (index !== null && items[index]) {
      const itemHit = items[index];
      if (itemHit !== selectedItem) {
        onSelect(itemHit);
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

  function getIndexFromTouchEvent(event: TouchEvent): number | null {
    if (!svgElement || !event.touches || event.touches.length === 0) return null;
    const CTM = svgElement.getScreenCTM();
    if (!CTM) return null;

    const touch = event.touches[0];
    const svgX = (touch.clientX - CTM.e) / CTM.a;
    const index = Math.floor(svgX / barWidth); // No gap
    if (index >= 0 && index < items.length) {
      return index;
    }
    return null;
  }

  function onTouchStart(event: TouchEvent) {
    if (!browser) return;
    isDragging = true;
    dispatch('dragstart');
    const index = getIndexFromTouchEvent(event);
    if (index !== null && items[index]) {
      onSelect(items[index]);
    }
    window.addEventListener('touchmove', onTouchMove, { passive: false }); // Use passive: false to allow preventDefault
    window.addEventListener('touchend', onTouchEnd);
  }

  function onTouchMove(event: TouchEvent) {
    if (!browser) return;
    if (!isDragging) return;
    const index = getIndexFromTouchEvent(event);
    if (index !== null && items[index]) {
      const itemHit = items[index];
      if (itemHit !== selectedItem) {
        onSelect(itemHit);
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
    if (!browser) return;

    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
  });
</script>

<div class={`histogram-slider ${className}`}>
  <div class="svg-wrapper" 
  bind:clientWidth={actualSvgWrapperWidth} 
  bind:this={svgWrapperElement}
  style="--svg-height: {svgHeight}px">
    <!-- svelte-ignore a11y-interactive-supports-focus -->
    <svg
      bind:this={svgElement}
      width={svgWidth}
      height={svgHeight}
      on:mousedown={onMouseDown}
      on:touchstart={onTouchStart}
      role="slider"
      aria-valuemin="0"
      aria-valuemax={items.length -1}
      aria-valuenow={items.findIndex(d => d === selectedItem)}
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
      {#if items.length > 0}
        {#each items as item, i}
          {#if item === selectedItem}
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
            class:selected={item === selectedItem}
            x={getBarX(i)}
            y={svgHeight - getBarHeight(magnitudeFor(item)) - bottomPadding}
            width={barWidth}
            height={getBarHeight(magnitudeFor(item))}
            on:click={() => onSelect(item)}
            role="option"
            aria-selected={item === selectedItem}
            on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(item); }}
            />
        {/each}
      {/if}
    </svg>
  </div>
</div>

<style>

</style>