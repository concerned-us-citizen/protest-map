<script lang="ts">
  import { type Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";

  let dialogEl: HTMLDivElement;

  const {
    class: className,
    topAligned = false,
    title,
    showDismissButton = false,
    onDismiss,
    onClosing,
    children,
    id,
  } = $props<{
    class?: ClassValue;
    topAligned?: boolean;
    title?: string;
    showDismissButton?: boolean;
    onDismiss?: () => void;
    onClosing?: () => void;
    children: Snippet;
    id: string;
  }>();

  function handleToggle(event: ToggleEvent) {
    if (event.newState === "closed") {
      onDismiss?.();
    }
  }

  function handleBeforeToggle(event: ToggleEvent) {
    if (event.newState === "closed") {
      onClosing?.();
    }
  }

  export function dismiss() {
    dialogEl.hidePopover();
  }
</script>

<div
  {id}
  bind:this={dialogEl}
  class={["dialog", className, topAligned ? "top-aligned" : ""]}
  role="dialog"
  aria-modal="true"
  aria-labelledby={title ? "dialog-heading" : undefined}
  tabindex="-1"
  ontoggle={handleToggle}
  onbeforetoggle={handleBeforeToggle}
  popover
>
  <div class="dialog-content">
    {#if title || showDismissButton}
      <header class="dialog-header">
        {#if title}
          <h2 id="dialog-heading">{title}</h2>
        {/if}
        {#if showDismissButton}
          <button
            type="button"
            class="close-btn"
            aria-label="Close dialog"
            popovertarget={id}
            popovertargetaction="hide"
          >
            ×
          </button>
        {/if}
      </header>
    {/if}

    {@render children()}
  </div>
</div>

<style>
  .dialog {
    pointer-events: auto;
    width: min(20rem, 80vw);
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0 0 0 / 0.1);
    padding: 0.5rem 1rem 1rem 1rem;
    outline: none;
  }

  .dialog-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
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

  .dialog[popover] {
    margin: 0;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -60%);
    border: none;
    opacity: 0;
    transition:
      opacity 0.3s ease,
      transform 0.3s ease,
      overlay 0.3s allow-discrete,
      display 0.3s allow-discrete;

    &:popover-open {
      opacity: 1;
      transform: translate(-50%, -50%);

      @starting-style {
        opacity: 0;
        transform: translate(-50%, -60%);
      }
    }
  }

  .dialog:global(.top-aligned)[popover] {
    margin-top: 1rem;
    top: 0px;
    transform: translateX(-50%) translateY(-2rem);

    &:popover-open {
      opacity: 1;
      transform: translateX(-50%) translateY(0);

      @starting-style {
        opacity: 0;
        transform: translate(-50%, -2rem);
      }
    }
  }

  .dialog::backdrop {
    background: rgba(0, 0, 0, 0);
    transition:
      background 0.3s ease,
      overlay 0.3s allow-discrete,
      display 0.3s allow-discrete;
  }

  .dialog:popover-open::backdrop {
    background: rgba(0, 0, 0, 0.5);

    @starting-style {
      background: rgba(0, 0, 0, 0);
    }
  }

  .dialog {
    touch-action: auto;
  }
</style>
