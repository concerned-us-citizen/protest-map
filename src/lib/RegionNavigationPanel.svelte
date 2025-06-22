<script lang="ts">
  import Autocomplete, { type AutocompleteItem } from "./Autocomplete.svelte";
  import { getPageStateFromContext } from "./store/PageState.svelte";

  const pageState = getPageStateFromContext();
  let recents = $state<AutocompleteItem[]>([]);

  const MAX_RECENTS = 8;
  const readRecents = () => {
    const m = document.cookie.match(/(?:^|;\s*)recentRegions=([^;]+)/);
    if (!m) return [];
    try {
      return JSON.parse(decodeURIComponent(m[1]));
    } catch {
      return [];
    }
  };

  const writeRecents = (a: AutocompleteItem[]) =>
    (document.cookie = `recentRegions=${encodeURIComponent(JSON.stringify(a.slice(0, MAX_RECENTS)))};path=/;max-age=${60 * 60 * 24 * 365}`);

  const addRecent = (v: AutocompleteItem) => {
    const a = readRecents().filter((x: AutocompleteItem) => x.id !== v.id);
    a.unshift(v);
    writeRecents(a);
    recents = a;
  };
  const clearRecents = () => {
    writeRecents([]);
    recents = [];
  };

  const fetchSuggestions = async (_q: string, _m: number) =>
    (await pageState.regionModel.search(_q, _m)) as AutocompleteItem[];

  async function picked(v: AutocompleteItem) {
    const r = await pageState.regionModel.getNamedRegionForId(v.id);
    if (!r) return;
    pageState.filter.namedRegion = r;
    pageState.mapModel.navigateTo(r, true);
    addRecent(v);
    dismiss();
  }

  const dismiss = () => {
    pageState.navigationVisible = false;
  };

  $effect(() => {
    recents = readRecents();
  });
</script>

<div
  class="panel-overlay"
  role="button"
  aria-label="Close dialog"
  tabindex="0"
  onclick={(e) => {
    if (e.target === e.currentTarget) dismiss();
  }}
  onkeydown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      pageState.navigationVisible = false;
    }
  }}
>
  <div class="panel-dialog">
    <div class="panel-header">
      <h2 class="panel-heading">Jump to Region</h2>
      <button class="close-button" type="button" onclick={dismiss}>X</button>
    </div>

    <Autocomplete
      {fetchSuggestions}
      {addRecent}
      placeholder="Enter a state, city or ZIP…"
      maxVisible={20}
      onSelect={picked}
      onDismiss={dismiss}
    />

    {#if recents.length}
      <div class="recents-block">
        <div class="recents-header">
          <span>Recently viewed</span>
          <button class="clear-button" type="button" onclick={clearRecents}
            >Clear</button
          >
        </div>
        <ul class="recents-list">
          {#each recents as r ("r-" + r.id)}
            <li>
              <button
                type="button"
                class="recents-item"
                onclick={() => picked(r)}
              >
                {r.name}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</div>

<style>
  .panel-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 1rem;
    z-index: 50;
  }
  .panel-dialog {
    width: 100%;
    max-width: 26rem;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    padding-left: 1rem;
    padding-right: 1rem;
    padding-bottom: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .panel-header {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .panel-heading {
    width: 100%;
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.3em;
    justify-content: space-between;
  }

  .close-button {
    font-size: 0.75rem;
    color: #2563eb;
    background: none;
    border: none;
    cursor: pointer;
  }
  .recents-block {
    padding-top: 0.5rem;
  }
  .recents-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: #666;
  }
  .clear-button {
    font-size: 0.75rem;
    color: #2563eb;
    background: none;
    border: none;
    cursor: pointer;
  }
  .clear-button:hover {
    text-decoration: underline;
  }
  .recents-list {
    margin: 0.25rem 0 0;
    padding: 0;
    list-style: none;
    max-height: 8rem;
    overflow: auto;
  }
  .recents-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.4rem 0.5rem;
    border: none;
    background: none;
    cursor: pointer;
  }
  .recents-item:hover {
    background: #f1f5ff;
  }
</style>
