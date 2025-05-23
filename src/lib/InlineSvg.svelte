<script lang="ts">
  let { content } = $props();
</script>

<!-- Render raw SVG HTML safely -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html content}