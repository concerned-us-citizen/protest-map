<script lang="ts">
  import { safelyAddMarkdownAndLinkify } from "$lib/util/sanitize";

  interface FormattedTextProps {
    text: string;
  }
  const { text }: FormattedTextProps = $props();
</script>

<div class="formatted-text">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html safelyAddMarkdownAndLinkify(text)}
</div>
