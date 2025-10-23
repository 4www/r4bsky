<script>
  export let type = 'button'
  export let href = ''
</script>

{#if href}
  <a href={href}><slot /></a>
{:else}
  <button {type}><slot /></button>
{/if}
