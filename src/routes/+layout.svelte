<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import '../app.css';

  onMount(() => {
    if (browser) {
      document.addEventListener('dblclick', (event) => {
        if (event.target instanceof HTMLElement && event.target.closest('button')) {
          event.preventDefault();
        }
      }, { capture: true }); // Use capture to catch the event early
    }
  });
</script>

<slot />