<script lang="ts">
  function refreshPage() {
    window.location.reload();
  }
</script>

<div class="update-banner">
  <span>Update available</span>
  <button on:click={refreshPage}>Refresh</button>
</div>

<style>
  .update-banner {
    pointer-events: auto;
    background-color: rgb(255, 140, 0);
    border-radius: 5px;
    color: #000;
    padding: 0.6rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.2);
    font-family: sans-serif;
    z-index: 0.6;
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
