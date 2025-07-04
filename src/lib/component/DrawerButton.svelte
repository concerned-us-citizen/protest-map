<script>
  import { getShortcutPrefix } from "$lib/util/os";
  import { Settings2 } from "@lucide/svelte";
  import PillButton from "./PillButton.svelte";
  import { getPageStateFromContext } from "$lib/model/PageState.svelte";

  const pageState = getPageStateFromContext();
</script>

<PillButton
  title={`${pageState.overlayModel.drawerVisible ? "Hide" : "Show"} Drawer (${getShortcutPrefix()}D)`}
  onClick={() => pageState.overlayModel.toggleDrawerVisible()}
>
  <Settings2 />
</PillButton>
