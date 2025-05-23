<script lang="ts">
  import InlineSvg from './InlineSvg.svelte';

  let { onClick, icon, className = '', disabled = false, label } = $props();
</script>

<button
  class={`icon-button ${className}`}
  class:disabled={disabled}
  onclick={() => !disabled && onClick()}
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
    background-color: var(--panel-background-color);
    padding: 0;
    box-shadow: none;
    cursor: pointer;
  }
  /* :global here to avoid css-unused-selector warning, since the svg tag is embedded in the icon string */
  .icon-button :global(svg) {
    width: var(--icon-size);
    height:  var(--icon-size);
  }

</style>