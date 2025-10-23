<script>
  import { onMount } from 'svelte'
  import { route, navigate, initRouter } from './router.js'
  import Player from './components/Player.svelte'
  import { routes } from './routes.js'
  import { resolve } from './routing/match.js'
  import { session } from './state/session.js'
  let current = '/'
  $: userHandle = $session.handle || ''
  $: myPath = userHandle ? `/@${encodeURIComponent(userHandle)}` : '/'
  let links = []
  $: links = (() => {
    const authed = !!$session?.did
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
  })()

  onMount(() => {
    initRouter()
    const unsub = route.subscribe((r) => (current = r))
    return () => unsub()
  })
</script>

  <nav>
  {#each links as [href, title]}
    <a href={'#' + href} aria-current={current === href ? 'page' : undefined}>{title}</a>
  {/each}
  <hr />
  </nav>

  {#key current}
    {#await Promise.resolve(resolve(routes, current)) then m}
      {#if m}
        <svelte:component this={m.component} {...m.props} {...m.params}/>
      {:else}
        <div>Not found</div>
      {/if}
    {/await}
  {/key}

<svelte:component this={Player} />
