<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";

  const {
    children,
    class: className,
    title,
    ...rest
  } = $props<{
    children: Snippet;
    class?: ClassValue;
    title?: string;
  }>();
</script>

<div class={["panel", className]} {...rest}>
  {#if title}
    <div class="title">{title}</div>
  {/if}
  {@render children()}
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
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
    align-self: start;
  }
</style>
