<script module lang="ts">
  export const regionNavigationDialogId = "region-navigation-dialog-id";
</script>

<script lang="ts">
  import { browser } from "$app/environment";

  import Autocomplete, {
    type AutocompleteItem,
  } from "$lib/component/Autocomplete.svelte";
  import Dialog from "$lib/component/Dialog.svelte";
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import type { ClassValue } from "svelte/elements";

  const { class: className } = $props<{
    class?: ClassValue;
  }>();

  const pageState = getPageStateFromContext();

  let dialog: Dialog;

  const MAX_RECENTS = 8;

  let autocompleteText = $state("");

  let recents = $derived.by(() => {
    if (!browser) return [];
    const m = document.cookie.match(/(?:^|;\s*)recentRegions=([^;]+)/);
    if (!m) return [];
    try {
      return JSON.parse(decodeURIComponent(m[1])) as AutocompleteItem[];
    } catch {
      return [];
    }
  });

  const writeRecents = (a: AutocompleteItem[]) => {
    if (!browser) return;
    document.cookie = `recentRegions=${encodeURIComponent(JSON.stringify(a.slice(0, MAX_RECENTS)))};path=/;max-age=${60 * 60 * 24 * 365}`;
  };

  const addRecent = (v: AutocompleteItem) => {
    const a = recents.filter((x: AutocompleteItem) => x.id !== v.id);
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
    pageState.mapModel.navigateTo(r, false);
    addRecent(v);
    dialog.dismiss();
  }
</script>

<Dialog
  bind:this={dialog}
  id={regionNavigationDialogId}
  class={["region-dialog", className]}
  title="Jump to Region"
  showDismissButton
  onClosing={() => {
    autocompleteText = "";
  }}
>
  <Autocomplete
    bind:query={autocompleteText}
    {fetchSuggestions}
    {addRecent}
    placeholder="Enter a state, city or ZIP…"
    maxVisible={20}
    onSelect={picked}
    onDismiss={() => {
      dialog.dismiss();
    }}
  />

  {#if recents.length}
    <div class="recents-block">
      <div class="recents-header">
        <h4>Recently viewed</h4>
        <button
          class="clear-button"
          type="button"
          aria-label="Clear recently viewed items"
          onclick={clearRecents}>Clear</button
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
</Dialog>

<style>
  :global(.region-dialog) {
    --dialog-y-translate: -30vh !important;
  }
  .recents-block {
    padding-top: 0.5rem;
  }
  .recents-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
    color: #666;
  }
  .recents-header h4 {
    margin: 0;
    padding: 0;
    font-weight: normal;
  }
  .clear-button {
    font-size: 0.9rem;
    color: #2563eb;
    background: none;
    border: none;
    cursor: pointer;
    margin-right: -5px;
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
