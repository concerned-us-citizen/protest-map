<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import '../app.css';
  import { DeviceInfo, deviceInfo } from '$lib/store/DeviceInfo.svelte';
 
  onMount(() => {
    if (browser) {
      document.addEventListener('dblclick', (event) => {
        if (event.target instanceof HTMLElement && event.target.closest('button')) {
          event.preventDefault();
        }
      }, { capture: true }); // Use capture to catch the event early

      const root = document.documentElement;

      // Keep code based breakpoints in sync with css
      root.style.setProperty('--bp-wide', `${DeviceInfo.wideBreakpoint}px`);
      root.style.setProperty('--bp-tall', `${DeviceInfo.tallBreakpoint}px`);

      if (deviceInfo.isTouchDevice) {
        document.body.classList.add('touch-device');
      }
    }
  });
</script>

<slot />