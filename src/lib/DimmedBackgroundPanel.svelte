<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  function handleBackgroundClick(event: MouseEvent) {
    // Dismiss only if the click is directly on the dimmed background, not on the content panel
    if (event.target === event.currentTarget) {
      dispatch('dismiss');
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="dimmed-background" on:click={handleBackgroundClick}>
  <div class="centered-content">
    <slot></slot>
  </div>
</div>

<style>
  .dimmed-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent black for dimming */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999; /* Ensure it's above all other content */
    pointer-events: auto; /* Allow pointer events on the background itself */
    padding: 0 5px; /* Add 5px horizontal padding to ensure margin on small screens */
    box-sizing: border-box; /* Include padding in the element's total width */
  }

  .centered-content {
    max-width: 800px; /* Restrict the maximum width of the content panel */
    margin: 0 auto; /* Center the block horizontally within the flex container */
    padding: 20px; /* Add some padding inside the content area */
    /* Removed background-color: white; - slotted content should provide its own background */
    border-radius: 8px; /* Optional: add rounded corners */
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Optional: add a subtle shadow */
    pointer-events: auto; /* Allow pointer events on the content inside */
    box-sizing: border-box; /* Include padding and border in the element's total width and height */
  }
</style>