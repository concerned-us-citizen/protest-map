<script lang="ts">
  import type { Snippet } from "svelte";

  type DialogProps = {
    title?: string;
    dismiss?: () => void;
    children: Snippet;
  };

  const { title, dismiss: dismissCb, children }: DialogProps = $props();

  function dismiss() {
    dismissCb?.();
  }

  function overlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) dismiss();
  }

  function escKey(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      dismiss();
    }
  }
</script>

<div class="overlay" role="presentation" onclick={overlayClick}>
  <div
    class="dialog"
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
</div>

<style>
  .overlay {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    inset: 0;
    background: rgba(0 0 0 / 0.3);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 1rem;
    z-index: 50;
  }
  .dialog {
    width: 100%;
    max-width: 26rem;
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
