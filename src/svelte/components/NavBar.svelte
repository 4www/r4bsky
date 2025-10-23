<script>
  import Button from '../ui/Button.svelte'
  export let links = [] // [ [href, title], ... ]
  export let current = '/'
  let open = false
  function toggle() { open = !open }
  function close() { open = false }
</script>

<header class="border-b border-neutral-200">
  <div class="mx-auto max-w-3xl px-3 py-2 flex items-center justify-between">
    <a href="#/" class="font-semibold">R4Bsky</a>
    <div class="hidden gap-2 sm:flex">
      {#each links as [href, title]}
        <a href={'#'+href} aria-current={current===href? 'page': undefined} class="px-3 py-2 rounded-md text-sm hover:bg-neutral-100 {current===href? 'bg-neutral-100 font-medium':''}">{title}</a>
      {/each}
    </div>
    <div class="sm:hidden">
      <button class="p-2 rounded-md hover:bg-neutral-100" on:click={toggle} aria-label="Menu">☰</button>
    </div>
  </div>
  {#if open}
    <nav class="sm:hidden border-t border-neutral-200">
      <div class="px-3 py-2 flex flex-col">
        {#each links as [href, title]}
          <a href={'#'+href} on:click={close} aria-current={current===href? 'page': undefined} class="px-3 py-2 rounded-md text-sm hover:bg-neutral-100 {current===href? 'bg-neutral-100 font-medium':''}">{title}</a>
        {/each}
      </div>
    </nav>
  {/if}
</header>

