<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";

  let {
    title = "",
    onClick,
    onFocus,
    onBlur,
    class: className,
    white = false,
    accented = false,
    selected = false,
    disabled = false,
    large = false,
    popoverTarget,
    button = $bindable(),
    children,
    ...restProps
  } = $props<{
    title?: string;
    onClick?: (_e: MouseEvent) => void;
    onFocus?: (_e: KeyboardEvent) => void;
    onBlur?: (_e: KeyboardEvent) => void;
    class?: ClassValue;
    white?: boolean;
    accented?: boolean;
    selected?: boolean;
    disabled?: boolean;
    large?: boolean;
    popoverTarget?: string;
    button?: HTMLButtonElement;
    children: Snippet;
  }>();
</script>

<button
  {title}
  bind:this={button}
  type="button"
  {disabled}
  data-selected={selected}
  onclick={(e) => onClick && onClick(e)}
  onfocus={(e) => onFocus && onFocus(e)}
  onblur={(e) => onBlur && onBlur(e)}
  aria-pressed={selected}
  aria-label={title}
  popovertarget={popoverTarget}
  class={[{ pill: true, accented, selected, large, white }, className]}
  {...restProps}
>
  {@render children()}
</button>

<style>
  .pill {
    background-color: var(--pill-button-background);
    color: var(--pill-button-color);
    padding: 0.3rem 0.4rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background-color 0.15s ease-in-out;
  }

  .pill.large {
    padding: 0.6rem 0.6rem;
  }

  .pill:hover {
    background-color: var(--pill-button-hover-background);
  }

  .pill.selected {
    background-color: var(--pill-button-selected-background);
    color: black;
  }

  .pill.selected:hover {
    background-color: var(--pill-button-selected-hover-background);
  }

  .pill.white {
    --pill-button-background: white;
  }

  .pill.accented {
    --pill-button-background: #ffd580;
    --pill-button-hover-background: #ffcc66;
    --pill-button-color: #7a4e00;
    --pill-button-selected-background: #f4bc51;
    --pill-button-selected-hover-background: #dca53c;
  }
</style>
