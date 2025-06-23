<script lang="ts" generics="T">
  import { browser } from "$app/environment";
  import { onDestroy } from "svelte";
  import type { Nullable } from "./types";
  import type { T } from "vitest/dist/chunks/environment.d.cL3nLXbE.js";

  interface Props {
    items: T[];
    filteredItems: T[];
    keyFor: (_item: T) => unknown;
    selectedItem: Nullable<T>;
    magnitudeFor: (_item: T) => number;
    firstShadedItemIndex: (_items: T[]) => number;
    onSelect: (_item: T) => void;
    className?: string;
  }

  const {
    items,
    filteredItems,
    selectedItem,
    keyFor,
    magnitudeFor,
    firstShadedItemIndex,
    onSelect,
    className = "",
  }: Props = $props();

  let maxMagnitude = $derived(Math.max(0, ...items.map(magnitudeFor)));

  const bottomPadding = 0;
  const topPadding = 3;

  let filteredItemMap = $derived.by(() => {
    const items: [unknown, T][] = filteredItems.map((item) => [
      keyFor(item),
      item,
    ]);
    return new Map<unknown, T>(items);
  });

  let svgWrapperElement: HTMLDivElement;
  let svgWrapperWidth = $state(300);
  let svgWrapperHeight = $state(40);

  let resizeObserver: ResizeObserver;

  $effect(() => {
    if (!browser || !svgWrapperElement) return;

    resizeObserver = new ResizeObserver(() => {
      // This will trigger recomputation
      svgWrapperWidth = svgWrapperElement.clientWidth;
      svgWrapperHeight = svgWrapperElement.clientHeight;
    });

    resizeObserver.observe(svgWrapperElement);

    return () => {
      resizeObserver.disconnect();
    };
  });

  let barWidth = $derived.by(() => {
    if (items.length > 0 && svgWrapperWidth > 0) {
      const minBarWidth = 1; // Define a minimum bar width
      const idealBarWidth = svgWrapperWidth / items.length; // No gap

      // Calculate barWidth: use ideal width if >= min, otherwise use min
      let result = Math.max(minBarWidth, idealBarWidth);
      // Ensure barWidth is at least 1px
      result = Math.max(1, result);
      return result;
    } else if (items.length === 1 && svgWrapperWidth > 0) {
      return svgWrapperWidth; // Single bar takes full width
    } else {
      return 10;
    }
  });

  let futureStartIndex = $state(-1);
  let futureEndIndex = $state(-1);
  let futureRectX = $state(0);
  let futureRectWidth = $state(0);

  $effect(() => {
    if (items.length > 0) {
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
  });

  let svgElement: SVGSVGElement;
  let isDragging = false;

  function getBarX(index: number): number {
    return index * barWidth;
  }

  function getBarHeight(locationCount: number): number {
    return Math.max(1, (locationCount / maxMagnitude) * svgWrapperHeight); // Ensure min height of 1 for visibility
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
    const index = getIndexFromMouseEvent(event);
    if (index !== null && items[index]) {
      onSelect(items[index]);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
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
    isDragging = false;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }

  function getIndexFromTouchEvent(event: TouchEvent): number | null {
    if (!svgElement || !event.touches || event.touches.length === 0)
      return null;
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
    const index = getIndexFromTouchEvent(event);
    if (index !== null && items[index]) {
      onSelect(items[index]);
    }
    window.addEventListener("touchmove", onTouchMove, { passive: false }); // Use passive: false to allow preventDefault
    window.addEventListener("touchend", onTouchEnd);
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
    isDragging = false;
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
  }

  onDestroy(() => {
    if (!browser) return;

    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
  });

  function isDisabled(item: T) {
    return filteredItemMap.get(keyFor(item)) === undefined;
  }
</script>

<div class={`histogram-slider ${className}`} bind:this={svgWrapperElement}>
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <svg
    bind:this={svgElement}
    onmousedown={onMouseDown}
    ontouchstart={onTouchStart}
    role="slider"
    aria-valuemin="0"
    aria-valuemax={items.length - 1}
    aria-valuenow={items.findIndex((d) => d === selectedItem)}
    aria-orientation="horizontal"
  >
    {#if futureStartIndex !== -1}
      <rect
        class="future-events-highlight"
        x={futureRectX}
        y={topPadding - 2}
        width={futureRectWidth}
        height={svgWrapperHeight - bottomPadding - topPadding + 4}
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
            height={svgWrapperHeight - bottomPadding - topPadding + 4}
          />
        {/if}
        <rect
          class={[
            "data-bar",
            {
              disabled: isDisabled(item),
              selected: item === selectedItem,
            },
          ]}
          x={getBarX(i)}
          y={svgWrapperHeight -
            getBarHeight(magnitudeFor(item)) -
            bottomPadding}
          width={barWidth}
          height={getBarHeight(magnitudeFor(item))}
          onclick={() => onSelect(item)}
          role="option"
          aria-selected={item === selectedItem}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") onSelect(item);
          }}
        />
      {/each}
    {/if}
  </svg>
</div>

<style>
  .histogram-slider {
    display: flex;
    align-items: stretch;
    justify-content: stretch;
  }
  .histogram-slider:active {
    cursor: grabbing;
  }

  svg {
    display: block; /* Remove extra space below SVG */
    width: 100%;
    height: 100%;
  }

  .selected-background-highlight {
    fill: var(--accent-color);
  }

  rect.data-bar {
    fill: #00008b; /* Dark blue for standard bars */
    transition: fill 0.2s ease-in-out;
  }

  rect.data-bar:hover {
    fill: #4169e1; /* RoyalBlue on hover */
  }

  rect.data-bar.selected {
    fill: #ffa500; /* Orange for selected bars */
  }

  rect.data-bar.disabled {
    fill: #949494; /* Gray for disabled (not in current filter) bars */
  }

  .future-events-highlight {
    fill: #a9a9a9; /* Medium gray */
    opacity: 0.5; /* Semi-transparent */
  }
</style>
