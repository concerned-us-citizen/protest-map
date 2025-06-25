<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    children: Snippet;
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
    label?: string;
  }

  let {
    children,
    onClick,
    className = "",
    disabled = false,
    label,
  }: Props = $props();
</script>

<button
  class={`icon-button ${className}`}
  class:disabled
  onclick={() => !disabled && onClick && onClick()}
  title={label}
  aria-label={label}
  {disabled}
>
  {@render children()}
</button>

<style>
  .icon-button {
    width: var(--icon-button-size);
    height: var(--icon-button-size);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    border: none;
    border-radius: 0;
    background-color: var(--panel-background-color);
    padding: 0;
    box-shadow: none;
    cursor: pointer;
    font-size: 0.7rem;
  }
  /* :global here to avoid css-unused-selector warning, since the svg tag is embedded in the icon string */
  .icon-button :global(svg) {
    width: var(--icon-size);
    height: var(--icon-size);
  }
</style>
