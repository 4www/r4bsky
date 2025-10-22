<script>
  import { onMount } from 'svelte'
  import { getMyDid, getFollowers, getFollows } from '../../libs/r4-service.js'
  let mode = 'followers' // or 'following'
  let items = []
  let cursor = undefined
  let error = ''

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
        error = 'Missing permission to read social graph. Visit Permissions to grant access.'
      }
    })
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
{#if error}
  <div>{error}</div>
{:else}
  <ul>
    {#each items as a}
      <li>
        <button on:click={() => (location.hash = `#/@${encodeURIComponent(a.handle || a.did)}`)}>
          {a.handle || a.displayName || a.did}
        </button>
      </li>
    {/each}
    {#if !items?.length}
      <li>None</li>
    {/if}
  </ul>
  {#if cursor}
    <button on:click={more}>Load more</button>
  {/if}
  {#if error?.includes('Missing permission')}
    <button on:click={() => (location.hash = '#/permissions')}>Permissions</button>
  {/if}
{/if}
