<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { crossfade } from 'svelte/transition';
  import { markerSvg } from './icons';
  import DimmedBackgroundPanel from './DimmedBackgroundPanel.svelte';
  import type { Component } from 'svelte';
  import InlineSvg from './InlineSvg.svelte';

  const dispatch = createEventDispatcher();

  export let steps: {
    title: string;
    description?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component?: Component<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props?: Record<string, any>;
  }[];
  export let className = '';

  export let currentStepIndex: number = 0;

  let panelElement: HTMLElement;

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
  });

  onDestroy(() => {
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

{#if currentStep}
  <DimmedBackgroundPanel className={className} on:dismiss={dismiss}>
    <div class="tour-panel" bind:this={panelElement}>
      <div class="panel-content" in:receive={{ key: currentStepIndex }} out:send={{ key: currentStepIndex }}>
        <div class="header">
          <div class="icon-container">
            <InlineSvg content={markerSvg}/>
          </div>
          <div class="title-container">
            <h1>{currentStep.title}</h1>
          </div>
        </div>
        {#if currentStep.component}
          <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
          <svelte:component this={currentStep.component} {...currentStep.props as Record<string, any>} />
        {:else}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <p class="description-text">{@html currentStep.description}</p>
        {/if}
        <div class="footer">
          <button class="link-button" on:click={dismiss}>Dismiss</button>
          <div class="progress-indicator">
            {#each steps as _, i}
              <div class="step-circle" class:active={i === currentStepIndex}></div>
            {/each}
          </div>
          <div class="navigation-buttons">
            <button class="link-button" on:click={previousStep} class:hidden={!showPrevious}>Prev</button>
            <button class="link-button" on:click={nextStep} class:disabled={!showNext}>Next</button>
          </div>
        </div>
      </div>
    </div>
  </DimmedBackgroundPanel>
{/if}

<style>
  .tour-panel {
    pointer-events: auto; /* Re-enable clicks for the panel */
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    padding: 20px;
    min-height: 400px;
    min-width: 500px;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    position: relative;
    max-height: 95vh;
  }

  @media (max-width: 600px) {
    .tour-panel {
      min-width: 82vw;
      min-height: 440px; /* Taller height for mobile */
    }
  }

  .panel-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    flex-grow: 1;
    overflow-y: auto;
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

  .title-container {
    flex-grow: 1;
  }

  .title-container h1 {
    font-size: 1.5em;
    font-weight: bold;
    margin: 5px 0 10px -10px;
  }

  @media (max-width: 600px) {
    .title-container h1 {
      font-size: 1.2em; /* Smaller font size for mobile */
    }
  }

  .description-text { /* New style for description */
    font-size: 1em;
    margin: 0 0 15px 0; /* Add some margin below description */
    flex-grow: 1;
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

  .navigation-buttons .disabled {
    color: lightgray;
    pointer-events: none;
    text-decoration: none;
  }

  .link-button {
    background: none;
    border: none;
    color: #007bff; /* Link color */
    cursor: pointer;
    padding: 0;
    font-size: 1em;
    text-decoration: none;
  }

  .link-button:hover {
    text-decoration: underline;
  }
</style>