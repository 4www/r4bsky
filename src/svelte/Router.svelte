<script>
  import { onMount } from 'svelte'
  import { route, navigate, initRouter } from './router.js'
  import Player from './components/Player.svelte'
  import { routes } from './routes.js'
  import { resolve } from './routing/match.js'
  import { session } from './state/session.js'
  import NavBar from './components/NavBar.svelte'
  let current = $state('/')
  const userHandle = $derived(($session && $session.handle) || '')
  const myPath = $derived(userHandle ? `/@${encodeURIComponent(userHandle)}` : '/')
  const links = $derived(() => {
    const authed = !!($session && $session.did)
    if (authed) {
      const arr = [
        ['/', 'Home'],
        ['/add', 'Add'],
        ['/search', 'Search'],
        ['/following', 'Following'],
        ['/followers', 'Followers'],
        ['/settings', 'Settings'],
      ]
      if (userHandle) arr.splice(2, 0, [myPath, `@${userHandle}`])
      return arr
    }
    return [
      ['/', 'Home'],
      ['/search', 'Search'],
      ['/settings', 'Settings'],
    ]
  })

  onMount(() => {
    initRouter()
    const unsub = route.subscribe((r) => (current = r))
    return () => unsub()
  })
</script>

  <NavBar {links} {current} />

  {#key current}
    {#await Promise.resolve(resolve(routes, current)) then m}
      {#if m}
        {@const Comp = m.component}
        <Comp {...m.props} {...m.params} />
      {:else}
        <div>Not found</div>
      {/if}
    {/await}
  {/key}

<Player />
