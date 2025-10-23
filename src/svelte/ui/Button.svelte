<script>
  const { type = 'button', href = '' } = $props()
</script>

{#if href}
  <a href={href}><slot /></a>
{:else}
  <button {type}><slot /></button>
{/if}
