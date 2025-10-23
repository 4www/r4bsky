<script>
  const all = $props()
  const { type = 'button', href = '', children, ...rest } = all
</script>

{#if href}
  <a href={href} {...rest}>{@render children?.()}</a>
{:else}
  <button type={type} {...rest}>{@render children?.()}</button>
{/if}
