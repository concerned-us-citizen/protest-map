<script lang="ts">
  import type { ClassValue } from "svelte/elements";
  import PillButton from "./PillButton.svelte";

  function refreshPage() {
    window.location.reload();
  }

  const { class: className } = $props<{
    class?: ClassValue;
  }>();
</script>

<div class={["update-banner", className]}>
  <span>Update available</span>
  <PillButton onClick={refreshPage}>Refresh</PillButton>
</div>

<style>
  .update-banner {
    pointer-events: auto;
    background-color: rgb(255, 140, 0);
    border-radius: 8px;
    color: #000;
    padding: 0.6rem;
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
  }
</style>
