<script lang="ts">
  import { getPageStateFromContext } from "./store/PageState.svelte";
  
  const pageState = getPageStateFromContext();

  function refreshPage() {
    window.location.reload();
  }
</script>

{#if pageState.updateAvailable}
  <div class="update-banner">
    <span>Update available</span>
    <button on:click={refreshPage}>Refresh</button>
  </div>
{/if}

<style>
  .update-banner {
    position: fixed;
    bottom: 0;
    width: 100%;
    background-color: rgb(255, 140, 0);
    color: #000;
    padding: .6rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.2);
    font-family: sans-serif;
    z-index: .6000;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .update-banner button {
    background-color: #000;
    color: #fff;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .update-banner button:hover {
    background-color: #333;
  }
</style>