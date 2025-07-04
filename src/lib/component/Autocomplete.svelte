<script module lang="ts">
  /** Give focus to the most-recently mounted autocomplete */
  export function giveFocusToAutocomplete(targetId: string) {
    window.dispatchEvent(
      new CustomEvent("focus-autocomplete", { detail: targetId })
    );
  }
</script>

<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { browser } from "$app/environment";
  import type { ClassValue } from "svelte/elements";

  export type AutocompleteItem = { name: string; id: number };

  let {
    id, // required cookie key
    class: className,
    fetchSuggestions,
    onSelect = (_v: AutocompleteItem) => {},
    onDismiss = () => {},
    placeholder = "Search…",
    maxVisible = 10,
    maxRecents = 8,
    selected = null,
    open = $bindable(false),
  } = $props<{
    id: string;
    class?: ClassValue;
    fetchSuggestions: (_q: string, _max: number) => Promise<AutocompleteItem[]>;
    onSelect?: (_v: AutocompleteItem | undefined) => void;
    onDismiss?: () => void;
    placeholder?: string;
    maxVisible?: number;
    maxRecents?: number;
    selected?: AutocompleteItem | null;
    open?: boolean;
  }>();

  let query = $state("");
  let suggestions: AutocompleteItem[] = $state([]);
  let hi = $state(-1); // highlighted index
  const listboxId = `ac-list-${id}`;

  let selectedItem: AutocompleteItem | null = $state(selected);
  $effect(() => {
    if (selected !== selectedItem) selectedItem = selected ?? null;
  });

  let editingSelected = $state(false);

  let showClear = $derived.by(() => !!query);

  let recents: AutocompleteItem[] = $state([]);

  let input!: HTMLInputElement;
  let root!: HTMLElement;

  const cookieName = (id: string) => `recents-${id}`;

  function readRecents(): AutocompleteItem[] {
    if (!browser) return [];
    const m = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${cookieName(id)}=([^;]+)`)
    );
    if (!m) return [];
    try {
      return JSON.parse(decodeURIComponent(m[1]));
    } catch {
      return [];
    }
  }

  function writeRecents(a: AutocompleteItem[]) {
    if (!browser) return;
    document.cookie =
      `${cookieName(id)}=` +
      encodeURIComponent(JSON.stringify(a.slice(0, maxRecents))) +
      ";path=/;max-age=" +
      60 * 60 * 24 * 365; // one year
  }

  function pushRecent(v: AutocompleteItem) {
    const a = recents.filter((x) => x.id !== v.id);
    a.unshift(v);
    recents = a;
    writeRecents(a);
  }

  function clearRecents() {
    recents = [];
    writeRecents([]);
  }

  async function loadSuggestionsNow(q: string) {
    suggestions = q ? await fetchSuggestions(q, maxVisible) : recents;
  }

  onMount(() => {
    recents = readRecents();

    function handler(e: Event) {
      const ev = e as CustomEvent<string>;
      if (ev.detail === id) input.focus();
    }

    window.addEventListener("focus-autocomplete", handler);
    return () => window.removeEventListener("focus-autocomplete", handler);
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    clearTimeout(timer);
    const q = query.trim();

    if (!q) {
      suggestions = recents; // show recents
      return;
    }

    timer = setTimeout(
      async () => (suggestions = await fetchSuggestions(q, maxVisible)),
      200
    );
  });
  onDestroy(() => clearTimeout(timer));

  /* reset highlight if list shrinks */
  $effect(() => {
    if (hi >= suggestions.length) hi = suggestions.length ? 0 : -1;
  });

  function handleClickOverTextField() {
    query = selectedItem?.name ?? "";
    editingSelected = true;
    open = true;
    loadSuggestionsNow(query);
    queueMicrotask(() => input.focus());
  }

  function choose(v: AutocompleteItem) {
    pushRecent(v);
    onSelect(v);
    selectedItem = v;
    editingSelected = false;
    query = "";
    hi = -1;
    open = false;
    queueMicrotask(() => input?.blur());
  }

  function clearSelection() {
    selectedItem = null;
    editingSelected = false;
    query = "";
    hi = -1;
  }

  const bold = (t: string, q: string) =>
    !t || !q
      ? (t ?? "")
      : t.replace(
          new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
          (m) => `<strong>${m}</strong>`
        );

  function key(e: KeyboardEvent) {
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
        } else if (!query.trim()) {
          clearSelection();
          if (selectedItem === null) {
            onSelect(null);
          }
          open = false;
          queueMicrotask(() => input.blur());
        }
        e.preventDefault();
        break;
      case "Escape":
        onDismiss();
        open = false;
        query = "";
        editingSelected = false;
        break;
      case "Tab":
        open = false;
        hi = -1;
        if (!selectedItem) query = "";
        break;
    }
  }

  function focusout(e: FocusEvent) {
    const next = e.relatedTarget as Node | null;
    if (!root.contains(next)) {
      open = false;
      hi = -1;
      if (!query.trim()) {
        selectedItem = null;
      }
      editingSelected = false;
    }
  }
  function focusin() {
    editingSelected = true;
    open = true;
  }

  $effect(() => {
    if (editingSelected && selectedItem) {
      query = selectedItem.name;
      queueMicrotask(() => input?.select());
    }
  });
</script>

<div
  class={["autocomplete", className]}
  bind:this={root}
  onfocusin={focusin}
  onfocusout={focusout}
>
  <!-- always-present input (for a11y) -->
  <div class="input-wrapper">
    <input
      bind:this={input}
      bind:value={query}
      class="autocomplete-input"
      placeholder={selectedItem ? "" : placeholder}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={listboxId}
      aria-activedescendant={hi >= 0 && suggestions[hi]
        ? `opt-${suggestions[hi].id}`
        : undefined}
      oninput={() => (open = true)}
      onkeydown={key}
      onfocus={() => {
        editingSelected = true;
        open = true;
      }}
    />
    {#if showClear && open}
      <button
        type="button"
        class="clear-btn"
        aria-label="Clear"
        onpointerdown={(e) => e.preventDefault()}
        onclick={() => {
          query = "";
        }}>×</button
      >
    {/if}
  </div>

  {#if !open && selectedItem}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="pill-container" onclick={handleClickOverTextField}>
      <button type="button" class="pill" onclick={handleClickOverTextField}>
        {selectedItem.name}
      </button>
      <span class="click-glue" onclick={handleClickOverTextField}></span>
    </div>
  {/if}

  {#if open && suggestions.length}
    <div class="dropdown" role="listbox" id={listboxId}>
      {#if !query.trim()}
        <div class="recents-header">
          <h4>Recently viewed</h4>
          <button
            class="clear-button"
            type="button"
            aria-label="Clear recently viewed"
            onclick={clearRecents}
          >
            Clear
          </button>
        </div>
      {/if}

      <ul class="option-list">
        {#each suggestions as s, i ("s-" + s.id)}
          <li>
            <button
              type="button"
              class={"option-item " + (hi === i ? "active" : "")}
              id={"opt-" + s.id}
              role="option"
              aria-selected={hi === i}
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
    padding-right: 2.1rem;
    box-sizing: border-box;
  }

  .clear-btn {
    position: absolute;
    top: 50%;
    right: 0.4rem;
    transform: translateY(-50%);
    border: none;
    background: none;
    font-size: 1.1rem;
    cursor: pointer;
    opacity: 0.6;
    line-height: 1;
  }
  .clear-btn:hover {
    opacity: 1;
  }

  .pill-container {
    position: absolute;
    inset: 0;
    padding: 5px;
    display: flex;
    align-items: center;
    z-index: var(--controls-layer);
    cursor: text;
  }
  .click-glue {
    flex: 1 1 auto;
    cursor: text;
  }
  .pill {
    max-width: calc(100% - 4px);
    padding: 0.3rem 0.5rem;
    border-radius: 6px;
    border: none;
    color: var(--pill-button-color);
    font-size: 0.875rem;
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    pointer-events: none;
  }

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
    margin-top: var(--dropdown-top-margin);
  }

  .recents-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0rem;
  }
  .recents-header h4 {
    font-size: 0.8rem;
    margin: 0.5rem 0.3rem;
  }

  .clear-button {
    font-size: 0.75rem;
    border: none;
    background: none;
    cursor: pointer;
  }

  ul {
    padding: 0;
    margin: 0;
  }
  li {
    list-style: none;
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
