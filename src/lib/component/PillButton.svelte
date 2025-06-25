<script lang="ts">
  import type { Snippet } from "svelte";
  import { type HTMLAttributes } from "svelte/elements";

  export interface PillButtonProps extends HTMLAttributes<HTMLButtonElement> {
    accented?: boolean;
    selected?: boolean;
    children: Snippet;
  }

  const {
    accented = false,
    selected = false,
    children,
    ...restProps
  }: PillButtonProps = $props();
</script>

<button
  type="button"
  aria-pressed={selected}
  class={{ pill: true, accented, selected }}
  {...restProps}
>
  {@render children()}
</button>

<style>
  .pill {
    --pill-button-background: #f3f4f6; /* gray-100 */
    --pill-button-hover-background: #e5e7eb; /* gray-200 */
    --pill-button-color: #374151; /* gray-700 */
    --pill-button-selected-background: #dceafe; /* gray-300 */
    --pill-button-selected-hover-background: #dceafe; /* gray-400 */

    background-color: var(--pill-button-background);
    color: var(--pill-button-color);
    padding: 0.3rem 0.4rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background-color 0.15s ease-in-out;
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

  .pill.accented {
    --pill-button-background: #ffd580;
    --pill-button-hover-background: #ffcc66;
    --pill-button-color: #7a4e00;
    --pill-button-selected-background: #f4bc51;
    --pill-button-selected-hover-background: #dca53c;
  }
</style>
