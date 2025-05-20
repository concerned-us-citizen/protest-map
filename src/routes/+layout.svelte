<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import '../app.css';
  import { tallBreakpoint, wideBreakpoint } from '$lib/store/viewportStore.svelte';

  onMount(() => {
    if (browser) {
      document.addEventListener('dblclick', (event) => {
        if (event.target instanceof HTMLElement && event.target.closest('button')) {
          event.preventDefault();
        }
      }, { capture: true }); // Use capture to catch the event early

      const root = document.documentElement;

      // Keep code based breakpoints in sync with css
      root.style.setProperty('--bp-wide', wideBreakpoint);
      root.style.setProperty('--bp-tall', tallBreakpoint);
    }
  });
</script>

<style>
  /* Global css variables*/
:root {
  --toolbar-margin: 0.9375em;
  --icon-size: 2.75em;
  --icon-button-icon-size: 1.75em;
  --panel-background-color: rgba(255, 255, 255, 0.95);
  --panel-border-radius: '1em';
  --panel-padding: '1em';
}
</style>

<slot />