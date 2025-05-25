<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import '../app.css';
  import { deviceInfo } from '$lib/store/DeviceInfo.svelte';
 
  onMount(() => {
    if (browser) {
      document.addEventListener('dblclick', (event) => {
        if (event.target instanceof HTMLElement && event.target.closest('button')) {
          event.preventDefault();
        }
      }, { capture: true }); // Use capture to catch the event early

      if (deviceInfo.isTouchDevice) {
        document.body.classList.add('touch-device');
      }
    }
  });
</script>

<slot />