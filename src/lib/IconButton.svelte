<script lang="ts">
  import InlineSvg from './InlineSvg.svelte';
  export let onClick: () => void;
  export let icon: string; 
  export let className = '';
  export let disabled = false;
  export let label: string; // used for both title and aria-label
</script>

<button
  class={`icon-button ${className}`}
  class:disabled={disabled}
  on:click={() => !disabled && onClick()}
  title={label}
  aria-label={label}
  {disabled}
>
  <InlineSvg content={icon} />
</button>

<style>
  .icon-button {
    width: var(--icon-button-size);
    height: var(--icon-button-size);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;  
    border: none;
    border-radius: 0;
    padding: 0;
    box-shadow: none;
    cursor: pointer;
  }
  /* :global here to avoid css-unused-selector warning, since the svg tag is embedded in the icon string */
  .icon-button :global(svg) {
    width: var(--icon-button-icon-size);
    height:  var(--icon-button-icon-size);
  }

</style>