<script lang="ts">
  import type { ClassValue } from "svelte/elements";

  const { size = 24, class: className } = $props<{
    size?: number;
    class?: ClassValue;
  }>();
</script>

<div class={["loader-wrapper", className]}>
  <div class="spinner" style="width: {size}px; height: {size}px;"></div>
  <div class="loading-text">Loading Protests...</div>
</div>

<style>
  .loader-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: var(--panel-background-color);
    border-radius: 0.3rem;
    overflow: hidden;
    padding: 1rem;
  }

  .spinner {
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  .loading-text {
    margin-top: 0.75rem;
    color: #aaa; /* light gray */
    font-size: 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
