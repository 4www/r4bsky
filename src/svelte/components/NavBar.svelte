<script>
  import Button from '../ui/Button.svelte'
  const { links = [], current = '/' } = $props()
  let open = false
  function toggle() { open = !open }
  function close() { open = false }
</script>

<header>
  <div>
    <a href="#/">R4Bsky</a>
    <button on:click={toggle} aria-label="Menu">Menu</button>
    <nav>
      {#each links as [href, title]}
        <a href={'#'+href} aria-current={current===href? 'page': undefined}>{title}</a>
      {/each}
    </nav>
  </div>
  {#if open}
    <nav>
      {#each links as [href, title]}
        <a href={'#'+href} on:click={close} aria-current={current===href? 'page': undefined}>{title}</a>
      {/each}
    </nav>
  {/if}
</header>
