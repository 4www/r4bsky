<script>
  let open = $state(false)
  function toggle() { open = !open }
  function close() { open = false }
  const { label = 'Menu', children } = $props()
</script>

<div>
  <button onclick={toggle} aria-haspopup="menu" aria-expanded={open} type="button">{label}</button>
  {#if open}
    <ul role="menu" tabindex="0" onclick={close} onkeydown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') close() }}>{@render children?.()}</ul>
  {/if}
</div>
