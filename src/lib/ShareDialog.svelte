<script lang="ts">
  import { Share2, ClipboardCheck, ClipboardCopy } from "@lucide/svelte";
  import Dialog from "./Dialog.svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { getPageStateFromContext } from "./model/PageState.svelte";
  import {
    getFilterParamOptions,
    getSearchParamsFromState,
  } from "./model/searchParamsToStateSync.svelte";
  import { slide } from "svelte/transition";
  import FormattedText from "./FormattedText.svelte";
  import { safeCopyToClipboard } from "./util/os";

  const pageState = getPageStateFromContext();

  let url = $derived.by(() => buildUrl());

  const filterOptions = getFilterParamOptions(pageState);

  let chosenParamNames = new SvelteSet<string>([
    ...filterOptions.map((opt) => opt.paramName),
  ]);

  let autoplay = $state(false);

  let selectedUrlType: "default" | "custom" = $state("custom");

  let copied = $state(false);

  function buildUrl() {
    let paramString = "";
    if (selectedUrlType === "custom") {
      paramString = getSearchParamsFromState(
        pageState,
        [...chosenParamNames],
        autoplay
      ).toString();
      if (paramString.length > 0) {
        paramString = `?${paramString}`;
      }
    }
    return `${window.location.origin}${paramString}`;
  }

  async function share(): Promise<void> {
    try {
      if (navigator.share) {
        const url = buildUrl();
        await navigator.share({ title: "Protest Map", url });
      } else {
        await copyToClipboard();
      }
    } catch (err) {
      console.error("Share failed", err);
    }
    dismiss();
  }

  async function copyToClipboard(): Promise<void> {
    const url = buildUrl();
    safeCopyToClipboard(url);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  const dismiss = () => {
    pageState.shareVisible = false;
  };
</script>

<Dialog {dismiss} title="Share a Map Link">
  <form class="form">
    <label>
      <input
        type="radio"
        name="mapType"
        value="default"
        bind:group={selectedUrlType}
      />
      US Map
    </label>

    <div class="customized-container">
      <label>
        <input
          type="radio"
          name="mapType"
          value="custom"
          bind:group={selectedUrlType}
        />
        Customized
      </label>
      {#if selectedUrlType === "custom"}
        <div class="custom-options" transition:slide>
          <label>
            <input
              type="checkbox"
              class="chk autoplay"
              bind:checked={autoplay}
            />
            Autoplay protests over time
          </label>
          <div class="filter-options-container">
            <p class="hint">Show only protest locations:</p>
            <div class="filter-options">
              {#each filterOptions as opt, _i (opt.paramName)}
                <div class="row">
                  <input
                    id={`chk-${opt.paramName}`}
                    type="checkbox"
                    class="chk"
                    checked={chosenParamNames.has(opt.paramName)}
                    onclick={() => {
                      const p = opt.paramName;
                      if (chosenParamNames.has(p)) {
                        chosenParamNames.delete(p);
                      } else {
                        chosenParamNames.add(p);
                      }
                    }}
                  />
                  <label for={`chk-${opt.paramName}`} class="label"
                    ><FormattedText text={opt.title} /></label
                  >
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>

    {#if pageState.debug}
      <div class="url-container">
        <p class="url">{url}</p>
      </div>
    {/if}

    <div class="actions">
      <button
        type="button"
        onclick={(e) => {
          e.preventDefault();
          copyToClipboard();
        }}
        class="copy-btn"
        aria-label="Copy link"
      >
        <ClipboardCopy size={18} />
        <span>Copy</span>
      </button>
      <button
        type="button"
        onclick={(e) => {
          e.preventDefault();
          share();
        }}
        class="share-btn"
        aria-label="Share link"
      >
        <Share2 size={18} />
        <span>Share</span>
      </button>
    </div>
  </form>

  {#if copied}
    <p class="copied" transition:slide>
      <ClipboardCheck size={14} /> Copied to clipboard!
    </p>
  {/if}
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    font-size: 1rem;
  }
  .custom-options {
    margin-left: 1.6rem;
    margin-top: 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .filter-options-container .hint {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .filter-options {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .row {
    display: flex;
    align-items: start;
    gap: 0.5rem;
  }
  .chk {
    margin-top: 0.15rem;
  }
  .label {
    flex: 1 1 auto;
  }
  .actions {
    display: flex;
    justify-content: end;
    align-items: center;
    gap: 0.5em;
    margin-top: 0.5rem;
  }
  .url-container {
    border: 1px solid grey;
    padding: 0.5rem;
    border-radius: 5px;
    display: flex;
    flex-direction: column;
    align-items: center;
    word-break: normal;
    overflow: hidden;
  }
  .url {
    font-size: 0.875rem;
    color: #6b7280;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-all;
    hyphens: auto;
  }
  .share-btn,
  .copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: #2563eb;
    color: #ffffff;
    border: none;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-weight: 500;
  }
  .share-btn:hover,
  .share-btn:focus {
    background: #1e4fd1;
  }
  .copy-btn {
    background: #16a34a;
  }
  .copy-btn:hover,
  .copy-btn:focus {
    background: #15803d;
  }
  .copied {
    align-self: center;
    margin-top: 0.75rem;
    margin-bottom: 0;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: #15803d;
    font-size: 0.875rem;
  }
</style>
