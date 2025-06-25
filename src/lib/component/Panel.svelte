<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ClassValue, HTMLAttributes } from "svelte/elements";

  interface PanelOptions extends HTMLAttributes<HTMLElement> {
    children: Snippet;
    class?: ClassValue;
    title?: string;
  }
  const { children, class: userClass, title, ...rest }: PanelOptions = $props();
</script>

<div class={["panel", "stretch", userClass]} {...rest}>
  {#if title}
    <div class="title">{title}</div>
    <div class="stretch">
      {@render children()}
    </div>
  {:else}
    {@render children()}
  {/if}
</div>

<style>
  .stretch {
    display: flex;
    flex-direction: column;
    justify-content: stretch;
  }

  .panel {
    gap: 0.3rem;
    --panel-border-radius: 0.4rem;
    --panel-padding-h: 0.5rem;
    --panel-padding-v: 0.5rem;
    border-radius: var(--panel-border-radius);
    padding: var(--panel-padding-v) var(--panel-padding-h);
    background-color: var(--panel-background-color);
    overflow: hidden;
  }

  .title {
    font-size: 0.8rem;
    align-self: center;
  }
</style>
