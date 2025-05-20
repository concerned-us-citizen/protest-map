<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  export let className = '';

  function handleBackgroundClick(event: MouseEvent) {
    // Dismiss only if the click is directly on the dimmed background, not on the content panel
    if (event.target === event.currentTarget) {
      // TODO seems wrong - should just have a handler
      dispatch('dismiss');
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class={`dimmed-background ${className}`} on:click={handleBackgroundClick}>
    <slot/>
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
    padding: 10px; /* Add some padding inside the content area */
    z-index: 9999; /* Ensure it's above all other content */
    pointer-events: auto; /* Allow pointer events on the background itself */
    box-sizing: border-box; /* Include padding in the element's total width */
  }
</style>