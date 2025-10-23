<script>
  let open = $state(false)
  function toggle() { open = !open }
  function close() { open = false }
  const { label = 'Menu' } = $props()
</script>

<div>
  <button onclick={toggle} aria-haspopup="menu" aria-expanded={open}>{label}</button>
  {#if open}
    <div role="menu" tabindex="0" onclick={close}>
      <slot />
    </div>
  {/if}
</div>
