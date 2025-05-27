<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { crossfade } from 'svelte/transition';
  import { markerSvg } from './icons';
  import InlineSvg from './InlineSvg.svelte';
  import type { Nullable } from './types';

  const dispatch = createEventDispatcher();

   type Step = {
    title: string;
    description?: string;
    // Not great to avoid type checking here, but doing it properly is ugly at this point. 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props?: Record<string, any>;
  };

  interface Props {
    steps: Step[];
    className?: string;
  }

  const {
    steps,
    className = ''
  }: Props = $props();

  let currentStepIndex = $state(0);
  let currentStep = $derived(steps[currentStepIndex]);
  let Component = $derived(currentStep?.component);
  let showPrevious = $derived(currentStepIndex > 0);
  let showNext = $derived(currentStepIndex < steps.length - 1);

  let panelElement: Nullable<HTMLElement> = $state(null);
  $effect(() => {
      panelElement?.addEventListener('touchstart', handleTouchStart as EventListenerOrEventListenerObject);
      panelElement?.addEventListener('touchend', handleTouchEnd as EventListenerOrEventListenerObject);
      return () => {
        panelElement?.removeEventListener('touchstart', handleTouchStart as EventListenerOrEventListenerObject);
        panelElement?.removeEventListener('touchend', handleTouchEnd as EventListenerOrEventListenerObject);
      }
  });


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

  function handleBackgroundClick(event: MouseEvent) {
    // Dismiss only if the click is directly on the dimmed background, not on the content panel
    if (event.target === event.currentTarget) {
      // TODO seems wrong - should just have a handler
      dispatch('dismiss');
    }
  }

  // Crossfade transition for step content
  const [send, receive] = crossfade({
    duration: 300,         
    easing: quintOut,
  });
</script>

{#if currentStep}
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class={`dimmed-background ${className}`} onclick={handleBackgroundClick}>
    <div class="tour-panel" bind:this={panelElement} in:receive={{ key: currentStepIndex }} out:send={{ key: currentStepIndex }}>
      <div class="header">
        <div class="icon-container">
          <InlineSvg content={markerSvg}/>
        </div>
        <div class="title-container">
          <h1>{currentStep.title}</h1>
        </div>
      </div>
      <div class="vertical-scroll">
        {#if currentStep?.component}
          <Component {...(currentStep.props || {})} />
        {:else}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html currentStep.description}
        {/if}
      </div>
      <div class="footer">
        <button class="link-button" onclick={dismiss}>Dismiss</button>
        <div class="progress-indicator">
          {#each steps as _, i}
            <div class="step-circle" class:active={i === currentStepIndex}></div>
          {/each}
        </div>
        <div class="navigation-buttons">
          <button class="link-button" onclick={previousStep} class:hidden={!showPrevious}>Prev</button>
          <button class="link-button" onclick={nextStep} class:disabled={!showNext}>Next</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .dimmed-background {
    position: fixed;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    padding: var(--toolbar-margin); 
    pointer-events: auto; 
    box-sizing: border-box; 
    z-index: 1000;
  }

  .tour-panel {
    pointer-events: auto; /* Re-enable clicks for the panel */
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    padding: var(--toolbar-margin);
    width: min(20em, 100vw - 4 * var(--toolbar-margin));
    height: min(30em, calc(100vh - 4 * var(--toolbar-margin)));
    display: flex;
    flex-direction: column;
  }

  .vertical-scroll {
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: stretch;
  }

  .header {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: .5em;
  }

  .icon-container {
    height: 4em;
    width: auto;
    /* Adjust for svg internal whitespace TODO fix in svg */
    margin: -.7em;
  }

  .icon-container :global(svg) {
      width: 100%;
      height: 100%;
      color: rgb(23, 78, 154);
  }

  .title-container h1 {
    font-size: 1.5em;
    font-weight: bold;
    margin: 0;
  }

  @media (max-width: 600px) {
    .title-container h1 {
      font-size: 1.2em; /* Smaller font size for mobile */
    }
  }

  /* Has to be :global, since the p's are generated as inner html, 
    (not visible to svelte) */

  .vertical-scroll :global(p),
  .vertical-scroll :global(img) { 
    margin: 15px 0 0 0 !important; 
    text-align: left;
  }

  .footer {
    display: flex;
    flex-direction: row;
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
    background-color: #ccc;
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
    background-color: #007bff;
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
    color: #007bff; 
    cursor: pointer;
    padding: 0;
    font-size: 1em;
    text-decoration: none;
  }

  .link-button:hover {
    text-decoration: underline;
  }

  :global(.tour-image) {
    max-width: min(80vw, 20em);
  }
</style>