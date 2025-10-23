<script>
  import Button from '../ui/Button.svelte'
  const props = $props()
  const linksVal = $derived(props.links || [])
  const currentVal = $derived(props.current ?? '/')
  let open = $state(false)
  function toggle() { open = !open }
  function close() { open = false }
</script>

<header>
  <div>
    <a href="#/">R4Bsky</a>
    <button onclick={toggle} aria-label="Menu">Menu</button>
  </div>
  {#if open}
    <nav>
      {#each linksVal as [href, title]}
        <a href={'#'+href} onclick={close} aria-current={currentVal===href? 'page': undefined}>{title}</a>
      {/each}
    </nav>
  {/if}
</header>
