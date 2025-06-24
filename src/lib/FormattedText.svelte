<script lang="ts">
  import { decodeMarkdownChars } from "./util/string";

  interface FormattedTextProps {
    text: string;
  }

  const { text }: FormattedTextProps = $props();

  let formattedHtml = $derived.by(() => {
    let result = text;
    result = result.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    result = result.replace(/\*(.*?)\*/g, "<em>$1</em>");
    result = decodeMarkdownChars(result);
    return result;
  });
</script>

<div class="formatted-text">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html formattedHtml}
</div>
