<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  const dispatch = createEventDispatcher()
  const { open = true, onClose = null, title = '', children, footer } = $props()
  let visible = $state(open)
  $effect(() => { visible = open })
  function close() {
    visible = false
    if (typeof onClose === 'function') onClose()
    dispatch('close')
  }
  function onBackdrop(e) { if (e.target === e.currentTarget) close() }
  function onKey(e) { if (e.key === 'Escape') close() }
  onMount(() => { window.addEventListener('keydown', onKey) })
  onDestroy(() => { window.removeEventListener('keydown', onKey) })
</script>

{#if visible}
  <div role="dialog" aria-modal="true" tabindex="0" onclick={onBackdrop} onkeydown={onKey}>
    <div>
      {#if title}<header><h3>{title}</h3></header>{/if}
      <section>{@render children?.()}</section>
      <footer>{@render footer?.()}</footer>
    </div>
  </div>
{/if}
