<script module lang="ts">
  export function giveFocusToAutocomplete() {
    window.dispatchEvent(new Event("focus-autocomplete"));
  }
</script>

<script lang="ts">
  import { type Snippet, onDestroy, onMount } from "svelte";
  import type { ClassValue } from "svelte/elements";

  export type AutocompleteItem = { name: string; id: number };

  const {
    class: className,
    children,
    fetchSuggestions,
    addRecent,
    onSelect = (_v: AutocompleteItem) => {},
    onDismiss = () => {},
    placeholder = "Search…",
    maxVisible = 10,
    selected: selectedInit = null,
  } = $props<{
    class?: ClassValue;
    children: Snippet;
    fetchSuggestions: (_q: string, _max: number) => Promise<AutocompleteItem[]>;
    addRecent: (_v: AutocompleteItem) => void;
    onSelect?: (_v: AutocompleteItem) => void;
    onDismiss?: () => void;
    placeholder?: string;
    maxVisible?: number;
    selected?: AutocompleteItem | null;
  }>();

  let query = $state("");
  let suggestions: AutocompleteItem[] = $state([]);
  let open = $state(false);
  let hi = $state(-1);

  let selectedItem: AutocompleteItem | null = $state(selectedInit);
  let editingSelected = $state(false);

  let input!: HTMLInputElement;
  let rootElement!: HTMLElement;

  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    clearTimeout(timer);
    if (!query.trim()) {
      suggestions = [];
      return;
    }
    timer = setTimeout(
      async () => (suggestions = await fetchSuggestions(query, maxVisible)),
      200
    );
  });
  onDestroy(() => clearTimeout(timer));

  function choose(v: AutocompleteItem) {
    addRecent(v);
    onSelect(v);
    selectedItem = v;
    editingSelected = false;
    query = "";
    hi = -1;
    open = false;
  }

  function clearSelection() {
    selectedItem = null;
    editingSelected = false;
    query = "";
    hi = -1;
  }

  const bold = (text: string, q: string) =>
    !text || !q
      ? (text ?? "")
      : text.replace(
          new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
          (m) => `<strong>${m}</strong>`
        );

  function key(e: KeyboardEvent) {
    /* clear pill with Delete / Backspace */
    if (editingSelected && ["Delete", "Backspace"].includes(e.key)) {
      clearSelection();
      e.preventDefault();
      return;
    }

    if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) open = true;

    switch (e.key) {
      case "ArrowDown":
        if (suggestions.length) {
          hi = (hi + 1) % suggestions.length;
          e.preventDefault();
        }
        break;
      case "ArrowUp":
        if (suggestions.length) {
          hi = (hi - 1 + suggestions.length) % suggestions.length;
          e.preventDefault();
        }
        break;
      case "Enter":
        if (open && suggestions[hi]) {
          choose(suggestions[hi]);
          e.preventDefault();
        }
        break;
      case "Escape":
        onDismiss();
        break;
    }
  }

  function handleFocusOut(e: FocusEvent) {
    const next = e.relatedTarget as Node | null;
    if (!rootElement.contains(next)) {
      open = false;
      hi = -1;
      if (selectedItem && editingSelected) {
        editingSelected = false;
        query = "";
      }
    }
  }

  function handleFocusIn(_e: FocusEvent) {
    editingSelected = true;
    open = true;
  }

  /* auto-select text when we start editing the pill */
  $effect(() => {
    if (editingSelected && selectedItem) {
      query = selectedItem.name;
      queueMicrotask(() => input?.select());
    }
  });

  onMount(() => {
    function handleFocusEvent() {
      input.focus();
    }
    window.addEventListener("focus-autocomplete", handleFocusEvent);
    return () =>
      window.removeEventListener("focus-autocomplete", handleFocusEvent);
  });
</script>

<div
  class={["autocomplete", className]}
  bind:this={rootElement}
  onfocusin={handleFocusIn}
  onfocusout={handleFocusOut}
>
  {#if selectedItem && !editingSelected}
    <div class="pill-container">
      <button
        type="button"
        class="pill"
        onclick={() => {
          editingSelected = true;
          open = false;
          input.focus();
        }}
      >
        {selectedItem.name}
      </button>
    </div>
  {/if}

  <!-- the underlying input (always in the DOM for a11y) -->
  <input
    bind:this={input}
    bind:value={query}
    class="autocomplete-input"
    placeholder={selectedItem ? "" : placeholder}
    oninput={() => (open = true)}
    onkeydown={key}
    onfocus={() => (selectedItem ? (editingSelected = true) : null)}
  />

  {#if open}
    <div class="dropdown">
      {#if suggestions.length}
        <ul class="option-list">
          {#each suggestions as s, i ("s-" + s.id)}
            <li>
              <button
                type="button"
                class="option-item {hi === i ? 'active' : ''}"
                onmouseenter={() => (hi = i)}
                onmousedown={(e) => {
                  e.preventDefault();
                  choose(s);
                }}
              >
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html bold(s.name, query)}
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        {@render children()}
      {/if}
    </div>
  {/if}
</div>

<style>
  .autocomplete {
    position: relative;
    max-width: 20rem;
  }

  .autocomplete-input {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.9rem;
    width: 100%;
    box-sizing: border-box;
  }

  .pill-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 5px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: start;
  }
  .pill {
    max-width: calc(100% - 4px);
    padding: 0.3rem 0.5rem;
    border-radius: 6px;
    background: var(--accent-color);
    border: none;
    font-size: 0.85rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }

  /* suggestions */
  .dropdown {
    position: absolute;
    z-index: var(--overlay-controls-layer);
    top: 100%;
    left: 0;
    width: 70vw;
    max-width: 20rem;
    max-height: 15rem;
    overflow: auto;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-top: 0.25rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding-inline-start: 0;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  ul {
    padding-left: 0;
    padding-top: 0;
    margin-block-start: 0;
  }

  li {
    list-style: none;
    padding-left: 0;
    margin-top: 0;
  }
  .option-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem 0.3rem;
    background: none;
    border: none;
    cursor: pointer;
  }
  .option-item:hover,
  .option-item.active {
    background: #dbeafe;
  }
</style>
