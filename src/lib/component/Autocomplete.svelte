<script lang="ts">
  import { onMount } from "svelte";

  export type AutocompleteItem = { name: string; id: number };

  const {
    fetchSuggestions,
    addRecent,
    onSelect = (_v: AutocompleteItem) => {},
    onDismiss = () => {},
    placeholder = "Search…",
    maxVisible = 10,
  } = $props<{
    fetchSuggestions: (_q: string, _max: number) => Promise<AutocompleteItem[]>;
    addRecent: (_v: AutocompleteItem) => void;
    onSelect?: (_v: AutocompleteItem) => void;
    onDismiss?: () => void;
    placeholder?: string;
    maxVisible?: number;
  }>();

  let query = $state("");
  let suggestions: AutocompleteItem[] = $state([]);
  let open = $state(false);
  let hi = $state(-1);
  let inputEl: HTMLInputElement;
  let popoverEl: HTMLElement;
  let containerEl: HTMLDivElement;

  onMount(() => queueMicrotask(() => inputEl?.focus()));

  async function showPopover() {
    const inputRect = inputEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    const scrollTop = window.scrollY;

    Object.assign(popoverEl.style, {
      position: "absolute",
      top: `${inputRect.bottom + scrollTop}px`,
      left: `${inputRect.left - containerRect.left}px`,
      minWidth: `${inputRect.width}px`,
      zIndex: "1000",
    });

    popoverEl.showPopover();
  }

  function hidePopover() {
    popoverEl.hidePopover();
  }

  $effect(() => {
    const length = suggestions.length;
    if (open && length > 0) {
      showPopover();
    } else {
      hidePopover();
    }
  });

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

  const choose = (v: AutocompleteItem) => {
    addRecent(v);
    onSelect(v);
    query = "";
    open = false;
  };

  const bold = (text: string, query: string) => {
    if (!text || !query) return text ?? "";
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exp = new RegExp(safe, "gi");
    const result = text.replace(exp, (m) => `<strong>${m}</strong>`);
    return result;
  };

  function key(e: KeyboardEvent) {
    if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) open = true;
    switch (e.key) {
      case "ArrowDown":
        hi = (hi + 1 + suggestions.length) % suggestions.length;
        e.preventDefault();
        break;
      case "ArrowUp":
        hi = (hi - 1 + suggestions.length) % suggestions.length;
        e.preventDefault();
        break;
      case "Enter":
        if (open && suggestions[hi]) {
          choose(suggestions[hi]);
          query = "";
          e.preventDefault();
        }
        break;
      case "Escape":
        onDismiss();
        query = "";
        break;
    }
  }
</script>

<div class="autocomplete" bind:this={containerEl}>
  <!-- svelte-ignore a11y_autofocus -->
  <input
    autofocus
    bind:this={inputEl}
    bind:value={query}
    class="autocomplete-input"
    {placeholder}
    oninput={() => (open = true)}
    onkeydown={key}
  />

  <ul class="popover option-list" bind:this={popoverEl} popover="manual">
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
</div>

<style>
  .autocomplete {
    display: flex;
    flex-direction: column;
    position: relative;
  }
  .autocomplete-input {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .popover {
    border: none;
    background: red;
  }
  .option-list {
    max-height: 15rem;
    overflow: auto;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-top: 0.25rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  ul {
    padding-inline-start: 0;
  }

  li {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .option-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    cursor: pointer;
  }
  .option-item:hover,
  .option-item.active {
    background: #dbeafe;
  }
</style>
