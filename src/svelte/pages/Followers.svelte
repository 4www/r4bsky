<script>
  import { onMount } from 'svelte'
  import { getMyDid, getFollowers, getFollows } from '../../libs/r4-service.js'
  const { mode = 'followers' } = $props() // or 'following'
  let items = $state([])
  let cursor = $state(undefined)
  let error = $state('')
  let loading = $state(true)

  async function load() {
    try {
      const did = await getMyDid()
      if (mode === 'followers') {
        const res = await getFollowers(did, { cursor })
        items = res.followers
        cursor = res.cursor
      } else {
        const res = await getFollows(did, { cursor })
        items = res.follows
        cursor = res.cursor
      }
    } catch (e) {
      error = e?.message || String(e)
    }
  }

  onMount(() => {
    load().catch((e) => {
      const msg = String(e?.message || e)
      if (msg.includes('Missing required scope')) {
        error = 'Missing permission to read social graph. Visit Settings to manage permissions.'
      }
    }).finally(() => { loading = false })
  })

  async function more() {
    if (!cursor) return
    const did = await getMyDid()
    if (mode === 'followers') {
      const res = await getFollowers(did, { cursor })
      items = [...items, ...(res.followers||[])]
      cursor = res.cursor
    } else {
      const res = await getFollows(did, { cursor })
      items = [...items, ...(res.follows||[])]
      cursor = res.cursor
    }
  }
</script>

<h2>{mode === 'followers' ? 'Followers' : 'Following'}</h2>
{#if loading}
  <div>Loading…</div>
{:else if error}
  <div>{error}</div>
{:else}
  <ul>
    {#each items as a}
      <li>
        <a href={`#/@${encodeURIComponent(a.handle || a.did)}`}>
          {a.handle || a.displayName || a.did}
        </a>
      </li>
    {/each}
    {#if !items?.length}
      <li>None</li>
    {/if}
  </ul>
  {#if cursor}
    <button onclick={more}>Load more</button>
  {/if}
  {#if error?.includes('Missing permission')}
    <button onclick={() => (location.hash = '#/settings')}>Open Settings</button>
  {/if}
{/if}
