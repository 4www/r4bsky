<script>
  import { onMount } from 'svelte'
  import { route, navigate, initRouter } from './router.js'
  import Player from './components/Player.svelte'
  import { routes } from './routes.js'
  import { resolve } from './routing/match.js'
  export let userHandle = ''
  let current = '/'
  $: myPath = userHandle ? `/@${encodeURIComponent(userHandle)}` : '/'
  const links = [
    ['/', 'Home'],
    [myPath, 'My Tracks'],
    ['/search', 'Search'],
    ['/followers', 'Followers'],
    ['/following', 'Following'],
    ['/permissions', 'Permissions'],
  ]
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  onMount(() => {
    initRouter()
    const unsub = route.subscribe((r) => (current = r))
    return () => unsub()
  })
  function logout() { dispatch('logout') }
</script>

  <nav>
  {#each links as [href, title]}
    <a href={'#' + href} aria-current={current === href ? 'page' : undefined}>{title}</a>
  {/each}
  <span>Logged in as <strong>{userHandle}</strong></span>
  <button on:click={logout}>Logout</button>
  <hr />
  </nav>

  {#key current}
    {#await Promise.resolve(resolve(routes, current)) then m}
      {#if m}
        <svelte:component this={m.component} {...m.params}/>
      {:else}
        <div>Not found</div>
      {/if}
    {/await}
  {/key}

<svelte:component this={Player} />
