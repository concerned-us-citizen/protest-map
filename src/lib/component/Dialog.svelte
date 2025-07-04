<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";

  const {
    class: className,
    title,
    dismiss,
    children,
  } = $props<{
    class?: ClassValue;
    title?: string;
    dismiss?: () => void;
    children: Snippet;
  }>();

  function escKey(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      dismiss?.();
    }
  }
</script>

<div
  class={["dialog", className]}
  role="dialog"
  aria-modal="true"
  aria-labelledby={title ? "dialog-heading" : undefined}
  tabindex="-1"
  onkeydown={escKey}
>
  <header class="dialog-header">
    {#if title}
      <h2 id="dialog-heading">{title}</h2>
    {/if}
    <button
      type="button"
      class="close-btn"
      aria-label="Close dialog"
      onclick={dismiss}
    >
      ×
    </button>
  </header>

  {@render children()}
</div>

<style>
  .dialog {
    pointer-events: auto;
    width: min(20rem, 80vw);
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0 0 0 / 0.1);
    padding: 0.5rem 1rem 1rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    outline: none;
  }
  .dialog-header {
    display: flex;
    align-items: center;
  }
  h2 {
    flex: 1 1 auto;
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0.2em 0;
  }
  .close-btn {
    font-size: 1.25rem;
    line-height: 1;
    background: none;
    border: none;
    cursor: pointer;
    color: #2563eb;
    margin-right: -6px;
  }
</style>
