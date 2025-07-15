<script lang="ts">
  import { quintOut } from "svelte/easing";
  import { crossfade } from "svelte/transition";
  import { markerSvg } from "$lib/icons";
  import InlineSvg from "$lib/InlineSvg.svelte";
  import type { ClassValue } from "svelte/elements";
  import Dialog from "../Dialog.svelte";

  type Step = {
    title: string;
    description?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props?: Record<string, any>;
  };

  const {
    steps,
    id,
    onDismiss,
    class: className,
  } = $props<{
    steps: Step[];
    id: string;
    onDismiss: () => void;
    class?: ClassValue;
  }>();

  let currentStepIndex = $state(0);
  let currentStep = $derived(steps[currentStepIndex]);
  let Component = $derived(currentStep?.component);
  let showPrevious = $derived(currentStepIndex > 0);
  let showNext = $derived(currentStepIndex < steps.length - 1);

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
    if ("touches" in event) {
      touchStartX = event.touches[0].clientX;
      event.preventDefault();
    }
  };

  const handleTouchEnd = (event: Event | TouchEvent) => {
    if ("changedTouches" in event) {
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
      event.preventDefault();
    }
  };

  // Crossfade transition for step content
  const [send, receive] = crossfade({
    duration: 300,
    easing: quintOut,
  });
</script>

<Dialog {id} {onDismiss}>
  {#if currentStep}
    <div
      class={["tour-panel", className]}
      in:receive={{ key: currentStepIndex }}
      out:send={{ key: currentStepIndex }}
    >
      <div
        class="swipe-panel vertical-scroll"
        ontouchstart={handleTouchStart}
        ontouchend={handleTouchEnd}
      >
        <div class="header">
          <div class="icon-container">
            <InlineSvg content={markerSvg} />
          </div>
          <div class="title-container">
            <h1>{currentStep.title}</h1>
          </div>
        </div>
        <div>
          {#if currentStep?.component}
            <Component {...currentStep.props || {}} />
          {:else}
            <!-- IMPORTANT - the descriptions here are generated entirely by this library, no user content -->
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html currentStep.description}
          {/if}
        </div>
      </div>
      <div class="footer">
        <button
          class="link-button"
          popovertarget={id}
          popovertargetaction="hide">Dismiss</button
        >
        <div class="progress-indicator">
          {#each steps as step, i (step.title)}
            <div
              class="step-circle"
              class:active={i === currentStepIndex}
            ></div>
          {/each}
        </div>
        <div class="navigation-buttons">
          <button
            class="link-button"
            onclick={previousStep}
            class:hidden={!showPrevious}>Prev</button
          >
          <button
            class="link-button"
            onclick={nextStep}
            class:disabled={!showNext}>Next</button
          >
        </div>
      </div>
    </div>
  {/if}
</Dialog>

<style>
  .tour-panel {
    max-width: min(20em, 100vw - 2 * var(--toolbar-margin));
    height: min(30em, calc(100vh - 2 * var(--toolbar-margin)));
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .swipe-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: stretch;
  }

  .vertical-scroll {
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    scrollbar-width: auto;
  }

  .header {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5em;
  }

  .icon-container {
    height: 4em;
    width: 4em;
    /* Adjust for svg internal whitespace TODO fix in svg */
    margin: -0.7em;
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
    text-decoration-color: currentColor;
  }

  :global(.tour-image) {
    max-width: min(80vw, 14em);
  }
</style>
