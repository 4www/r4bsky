<script>
  let open = false
  function toggle() { open = !open }
  function close() { open = false }
  const { label = 'Menu' } = $props()
</script>

<div>
  <button on:click={toggle} aria-haspopup="menu" aria-expanded={open}>{label}</button>
  {#if open}
    <div role="menu" on:click={close}>
      <slot />
    </div>
  {/if}
</div>

