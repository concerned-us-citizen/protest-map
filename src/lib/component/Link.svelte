<script lang="ts">
  import { isHttpUrl } from "$lib/util/misc";
  import type { Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";

  const {
    title,
    href,
    class: className,
    children,
    ...rest
  } = $props<{
    title?: string;
    href: string;
    class?: ClassValue;
    children?: Snippet;
  }>();
</script>

{#if isHttpUrl(href)}
  <a
    class={["link", className]}
    {href}
    target="_blank"
    rel="noopener"
    {...rest}
  >
    {#if children}
      {@render children()}
    {:else if title}
      {title}
    {:else}
      {href}
    {/if}
  </a>
{:else}
  <div class={className} {...rest}>
    {#if children}
      {@render children()}
    {:else if title}
      {title}
    {:else}
      {href}
    {/if}
  </div>
{/if}

<style>
  .link:hover {
    text-decoration: underline;
    color: #007bff;
    pointer-events: auto;
  }
</style>
