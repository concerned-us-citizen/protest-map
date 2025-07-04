<script lang="ts">
  import Autocomplete, {
    type AutocompleteItem,
  } from "$lib/component/Autocomplete.svelte";
  import { deviceInfo } from "$lib/model/DeviceInfo.svelte";
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";
  import type { ClassValue } from "svelte/elements";

  const { onDismiss, class: className } = $props<{
    onDismiss?: () => void;
    class?: ClassValue;
  }>();

  const pageState = getPageStateFromContext();

  const fetchSuggestions = async (q: string, m: number) =>
    (await pageState.regionModel.search(q, m)) as AutocompleteItem[];

  async function picked(v: AutocompleteItem | undefined) {
    if (!v) {
      pageState.filter.namedRegion = undefined;
      pageState.mapModel.navigateToUS();
      return;
    }

    const r = await pageState.regionModel.getNamedRegionForId(v.id);
    if (!r) return;
    pageState.filter.namedRegion = r;
    pageState.mapModel.navigateTo(r, false);
    onDismiss?.();
  }
</script>

<Autocomplete
  id="region-name"
  bind:open={pageState.overlayModel.autocompleteVisible}
  class={className}
  {fetchSuggestions}
  placeholder={deviceInfo.isNarrow
    ? "City, state, or ZIP…"
    : "Enter a city, state, or ZIP…"}
  maxVisible={20}
  selected={pageState.filter.namedRegion}
  onSelect={picked}
  {onDismiss}
/>
