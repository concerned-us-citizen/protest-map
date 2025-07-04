<script lang="ts">
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import type { Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";

  const {
    open = false,
    class: className,
    children,
    leftGapPx = 5,
  } = $props<{
    class?: ClassValue;
    open: boolean;
    children: Snippet;
    leftGap?: number;
  }>();

  function gapFly(node: HTMLElement, opts = {}) {
    return fly(node, {
      x: -(node.offsetWidth + leftGapPx),
      easing: cubicOut,
      ...opts,
    });
  }
</script>

{#if open}
  <div
    class={["drawer", className]}
    style={`left:${leftGapPx}px`}
    in:gapFly={{ duration: 300 }}
    out:gapFly={{ duration: 250 }}
  >
    {@render children()}
  </div>
{/if}

<style>
  .drawer {
    position: absolute;
    display: flex;
    flex-direction: column;
    background: var(--panel-background-color);
    border-radius: 5px;
    max-width: min(90vw, 20rem);
    overflow: hidden;
  }
</style>
