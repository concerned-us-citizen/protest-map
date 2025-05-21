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

<slot />