<script lang="ts">
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";

  const pageState = getPageStateFromContext();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class={["overlay", { dimmed: pageState.overlayModel.showingDialog }]}
  onclick={() => {
    pageState.overlayModel.closeAll();
  }}
></div>

<style>
  .overlay {
    position: absolute;
    inset: 0;
  }
  .dimmed {
    background-color: hsl(0 0% 0% / 0.32);
  }
</style>
