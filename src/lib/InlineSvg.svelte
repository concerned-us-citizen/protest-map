<script lang="ts">
  export let content: string;
</script>

<!-- Render raw SVG HTML safely -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html content}