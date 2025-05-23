<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  let { children, className = '' } = $props();

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
<div class={`dimmed-background ${className}`} onclick={handleBackgroundClick}>
    {@render children()}
</div>

<style>
  .dimmed-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px; 
    z-index: 9999;
    pointer-events: auto; 
    box-sizing: border-box; 
  }
</style>