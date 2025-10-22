<script>
  import { onMount } from 'svelte'
  import { route, navigate, initRouter } from './router.js'
  import MyTracks from './pages/MyTracks.svelte'
  import AuthorTracks from './pages/AuthorTracks.svelte'
  import SearchActors from './pages/SearchActors.svelte'
  import TimelineTracks from './pages/TimelineTracks.svelte'
  import Followers from './pages/Followers.svelte'
  import Player from './components/Player.svelte'
  import Permissions from './pages/Permissions.svelte'
  export let userHandle = ''
  let current = '/'
  const links = [
    ['/', 'Home'],
    ['/my', 'My Tracks'],
    ['/author', 'Author'],
    ['/timeline', 'Timeline'],
    ['/search', 'Search'],
    ['/followers', 'Followers'],
    ['/following', 'Following'],
    ['/permissions', 'Permissions'],
  ]
  onMount(() => {
    initRouter()
    const unsub = route.subscribe((r) => (current = r))
    return () => unsub()
  })
  function logout() { dispatchEvent(new CustomEvent('logout')) }
</script>

  <nav>
  {#each links as [href, title]}
    <a href={'#' + href} aria-current={current === href ? 'page' : undefined}>{title}</a>
  {/each}
  <span>Logged in as <strong>{userHandle}</strong></span>
  <button on:click={logout}>Logout</button>
  <hr />
  </nav>

{#if current === '/'}
  <MyTracks />
{:else if current === '/my'}
  <MyTracks />
{:else if current === '/author'}
  <AuthorTracks />
{:else if current === '/timeline'}
  <TimelineTracks />
{:else if current === '/search'}
  <SearchActors />
{:else if current === '/followers'}
  <Followers mode="followers" />
{:else if current === '/following'}
  <Followers mode="following" />
{:else if current === '/permissions'}
  <Permissions />
{:else}
  <div>Not found</div>
{/if}

<svelte:component this={Player} />
