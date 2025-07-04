<script lang="ts">
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import { onMount } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import SveltyPicker, {
    parseDate,
    formatDate as sveltyFormatDate,
  } from "svelty-picker";
  import { en } from "svelty-picker/i18n";
  import PillButton from "./PillButton.svelte";
  import { Calendar } from "@lucide/svelte";
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";
  import { formatDate } from "$lib/util/date";

  const { class: className } = $props<{
    class?: ClassValue;
  }>();

  const pageState = getPageStateFromContext();

  let wrapperEl: HTMLElement;
  let inputEl: HTMLInputElement | null;

  const disableDate = (date: Date) => !pageState.filter.inCurrentFilter(date);
  const dateFormat = "yyyy/mm/dd";
  let isOpen = $state(false);

  onMount(() => {
    inputEl = wrapperEl.querySelector<HTMLInputElement>("input.inner-input");

    const checkPopupPresence = () => {
      const open = !!wrapperEl.querySelector(".sdt-calendar-wrap");
      if (open !== isOpen) {
        isOpen = open; // reactive update
      }
    };

    // run once immediately (in case the popup is already there)
    checkPopupPresence();

    const observer = new MutationObserver(checkPopupPresence);
    observer.observe(wrapperEl, { childList: true, subtree: true });

    return () => observer.disconnect();
  });
</script>

<!-- the oncontextmenu here is to suppress native popups on the input -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={wrapperEl}
  class={["wrapper", className]}
  oncontextmenu={(e) => e.preventDefault()}
>
  <SveltyPicker
    mode="date"
    startDate={pageState.filter.dateRange?.start}
    endDate={pageState.filter.dateRange?.end}
    disableDatesFn={disableDate}
    format={dateFormat}
    inputClasses="inner-input"
    clearToggle={false}
    clearBtn={false}
    manualInput={false}
    bind:value={
      () => {
        return pageState.filter.date
          ? sveltyFormatDate(pageState.filter.date, dateFormat, en, "standard")
          : null;
      },
      (v) => {
        pageState.filter.setDate(
          v ? parseDate(v, dateFormat, en, "standard") : undefined
        );
      }
    }
  />
  <PillButton
    class="calendar-icon-button"
    onClick={() => {
      if (isOpen) {
        inputEl?.blur();
      } else {
        inputEl?.focus();
      }
    }}
  >
    <div class="date-container">
      {#if deviceInfo.isWide}
        <Calendar />
      {/if}

      <h4>
        {formatDate(
          pageState.filter.date,
          deviceInfo.isWide ? "long" : "medium"
        )}
      </h4>
    </div>
  </PillButton>
</div>

<style>
  .wrapper {
    position: relative;
    display: flex;
    align-items: stretch;
    justify-content: stretch;
  }

  :global(.sdt-component-wrap) {
    position: absolute !important;
    bottom: 0;
    z-index: calc(var(--controls-layer) - 1);
  }

  :global(.inner-input) {
    opacity: 0.01;
    pointer-events: none;
    height: 100%;
    width: 10px;
    cursor: pointer;
  }

  .date-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.1rem;
    height: max-content;
  }

  h4 {
    margin: 0;
  }

  :global(.calendar-icon-button) {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 100%;
    pointer-events: auto;
    z-index: var(--controls-layer);
  }

  :global(.calendar-icon-button) :global(svg) {
    pointer-events: auto;
  }
</style>
