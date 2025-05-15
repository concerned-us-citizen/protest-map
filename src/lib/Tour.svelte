<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { crossfade } from 'svelte/transition';
  import { markerSvg } from './icons';

  const dispatch = createEventDispatcher();

  export let steps: { title: string; description: string; elementId?: string }[];
  export let currentStepIndex: number = 0;

  let panelElement: HTMLElement;
  let targetElement: HTMLElement | null = null;
  let arrowElement: SVGElement | null = null;
  let arrowDirection: 'left' | 'right' = 'right';

  $: currentStep = steps[currentStepIndex];
  $: showPrevious = currentStepIndex > 0;
  $: showNext = currentStepIndex < steps.length - 1;

  function dismiss() {
    dispatch('dismiss');
  }

  function nextStep() {
    if (showNext) {
      currentStepIndex++;
    }
  }

  function previousStep() {
    if (showPrevious) {
      currentStepIndex--;
    }
  }

  function positionArrow() {
    if (!panelElement || !targetElement || !arrowElement) return;

    const targetRect = targetElement.getBoundingClientRect();

    // Calculate space on left and right
    const spaceLeft = targetRect.left;
    const spaceRight = window.innerWidth - targetRect.right;

    // Determine arrow direction based on space
    if (spaceRight > spaceLeft) {
      arrowDirection = 'right';
      // Position arrow to the left of the target
      arrowElement.style.left = `${targetRect.left - 20}px`; // 20px margin
      arrowElement.style.top = `${targetRect.top + targetRect.height / 2 - arrowElement.getBoundingClientRect().height / 2}px`;
      arrowElement.style.transform = 'rotate(0deg)'; // Pointing right
    } else {
      arrowDirection = 'left';
      // Position arrow to the right of the target
      arrowElement.style.left = `${targetRect.right + 20}px`; // 20px margin
      arrowElement.style.top = `${targetRect.top + targetRect.height / 2 - arrowElement.getBoundingClientRect().height / 2}px`;
      arrowElement.style.transform = 'rotate(180deg)'; // Pointing left
    }

    arrowElement.style.display = 'block';
  }

  let touchStartX = 0;
  const swipeThreshold = 50; // Minimum distance for a swipe

  const handleTouchStart = (event: Event | TouchEvent) => {
    if ('touches' in event) {
      touchStartX = event.touches[0].clientX;
    }
  };

  const handleTouchEnd = (event: Event | TouchEvent) => {
    if ('changedTouches' in event) {
      const touchEndX = event.changedTouches[0].clientX;
      const diff = touchEndX - touchStartX;

      // Only handle swipes on smaller screens
      if (window.innerWidth <= 600) {
        if (diff > swipeThreshold && showPrevious) {
          previousStep();
        } else if (diff < -swipeThreshold && showNext) {
          nextStep();
        }
      }
    }
  };

  onMount(() => {
    // Add touch event listeners to the panel element
    if (panelElement) {
      panelElement.addEventListener('touchstart', handleTouchStart as EventListenerOrEventListenerObject);
      panelElement.addEventListener('touchend', handleTouchEnd as EventListenerOrEventListenerObject);
    }

    if (currentStep.elementId) {
      targetElement = document.getElementById(currentStep.elementId);
      if (targetElement) {
        positionArrow();
        window.addEventListener('resize', positionArrow);
        // Observe target element for position changes (e.g., due to layout shifts)
        const observer = new MutationObserver(positionArrow);
        observer.observe(targetElement, { attributes: true, childList: true, subtree: true });
        return () => {
          window.removeEventListener('resize', positionArrow);
          observer.disconnect();
          // Clean up touch event listeners
          if (panelElement) {
            panelElement.removeEventListener('touchstart', handleTouchStart as EventListenerOrEventListenerObject);
            panelElement.removeEventListener('touchend', handleTouchEnd as EventListenerOrEventListenerObject);
          }
        };
      } else {
        console.warn(`Element with id "${currentStep.elementId}" not found.`);
        if (arrowElement) arrowElement.style.display = 'none';
      }
    } else {
       if (arrowElement) arrowElement.style.display = 'none';
    }
  });

  // Update arrow position when currentStepIndex changes
  $: {
    if (currentStep && currentStep.elementId) {
      targetElement = document.getElementById(currentStep.elementId);
      if (targetElement) {
        positionArrow();
      } else {
        console.warn(`Element with id "${currentStep.elementId}" not found.`);
        if (arrowElement) arrowElement.style.display = 'none';
      }
    } else {
      if (arrowElement) arrowElement.style.display = 'none';
    }
  }

  onDestroy(() => {
    window.removeEventListener('resize', positionArrow);
    // Clean up touch event listeners
    if (panelElement) {
      panelElement.removeEventListener('touchstart', handleTouchStart as EventListenerOrEventListenerObject);
      panelElement.removeEventListener('touchend', handleTouchEnd as EventListenerOrEventListenerObject);
    }
  });

  // Crossfade transition for step content
  const [send, receive] = crossfade({
    duration: 300,
    easing: quintOut,
  });
</script>

<div class="tour-overlay">
  {#if currentStep}
    <div class="tour-panel" bind:this={panelElement}>
      <div class="panel-content" in:receive={{ key: currentStepIndex }} out:send={{ key: currentStepIndex }}>
        <div class="header">
          <div class="icon-container">
            {@html markerSvg}
          </div>
          <div class="title-container"> <!-- Renamed for clarity -->
            <h1>{currentStep.title}</h1>
          </div>
        </div>
        <p class="description-text">{@html currentStep.description}</p> <!-- Moved description outside header -->
        <div class="footer">
          <button class="link-button" on:click={dismiss}>Dismiss</button>
          <div class="progress-indicator">
            {#each steps as _, i}
              <div class="step-circle" class:active={i === currentStepIndex}></div>
            {/each}
          </div>
          <div class="navigation-buttons">
            <button class="link-button" on:click={previousStep} class:hidden={!showPrevious}>Previous</button>
            <button class="link-button" on:click={nextStep} class:hidden={!showNext}>Next</button>
          </div>
        </div>
      </div>
    </div>

    {#if currentStep.elementId}
      <svg class="arrow" bind:this={arrowElement} width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 0L20 10L10 20L10 10L0 10L10 0Z"/>
      </svg>
    {/if}
  {/if}
</div>

<style>
  .tour-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    opacity: 1; /* Make overlay fully opaque */
    background-color: rgba(0, 0, 0, 0.7); /* Use rgba for background color with desired opacity */
    justify-content: center;
    align-items: center;
    z-index: 9999; /* Ensure it's above all other content, including toolbar */
    pointer-events: none; /* Allow clicks to pass through overlay */
  }

  .tour-panel {
    pointer-events: auto; /* Re-enable clicks for the panel */
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    padding: 20px;
    width: 90%; /* Adjust width as needed */
    height: 300px;
    max-width: 500px; /* Max width */
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative; /* Needed for absolute positioning of arrow */
  }

  @media (max-width: 600px) {
    .tour-panel {
      height: 385px; /* Taller height for mobile */
    }
  }

  .panel-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .header {
    display: flex;
    align-items: flex-start;
    margin-bottom: -20px;
  }

  .icon-container {
    width: 80px; 
    height: auto;
    margin: -25px 10px 0px -15px;
    flex-shrink: 0;
  }

  .icon-container :global(svg) {
      width: 100%;
      height: 100%;
      color: rgb(23, 78, 154);
  }

  .title-container { /* Updated class name */
    flex-grow: 1;
  }

  .title-container h1 { /* Updated class name */
    font-size: 1.5em;
    font-weight: bold;
    margin: 0 0 10px -10px;
  }

  @media (max-width: 600px) {
    .title-container h1 {
      font-size: 1.2em; /* Smaller font size for mobile */
    }
  }

  .description-text { /* New style for description */
    font-size: 1em;
    margin: 0 0 15px 0; /* Add some margin below description */
    text-align: left;
  }

  /* Removed .title-description:last-child as description is moved */

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center; /* Center items vertically */
    margin-top: auto; /* Push footer to the bottom */
  }

  .progress-indicator {
    display: flex;
    gap: 8px; /* Space between circles */
    justify-content: center; /* Center circles horizontally */
    flex-grow: 1; /* Allow indicator to take available space */
  }

  @media (max-width: 600px) {
    .progress-indicator {
      gap: 5px; /* Smaller space between circles on mobile */
    }
  }

  .step-circle {
    width: 10px;
    height: 10px;
    background-color: #ccc; /* Default color */
    border-radius: 50%;
    transition: background-color 0.3s ease;
  }

  @media (max-width: 600px) {
    .step-circle {
      width: 8px; /* Smaller circle size on mobile */
      height: 8px;
    }
  }

  .step-circle.active {
    background-color: #007bff; /* Highlight color */
  }

  .navigation-buttons {
    display: flex;
    gap: 10px;
  }

  .navigation-buttons .hidden {
    visibility: hidden;
  }

  .link-button {
    background: none;
    border: none;
    color: #007bff; /* Link color */
    cursor: pointer;
    padding: 0;
    font-size: 1em;
    text-decoration: underline;
  }

  .link-button:hover {
    text-decoration: none;
  }

  .arrow {
    position: fixed;
    color: #ff0000; /* Bright color */
    z-index: 1001;
    pointer-events: none; /* Allow clicks to pass through arrow */
    display: none; /* Hidden by default, shown when elementId is present */
  }
</style>