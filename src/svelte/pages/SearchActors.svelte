<script>
  import { searchActors } from '../../libs/r4-service.js'
  import { navigate } from '../router.js'
  let q = $state('')
  let results = $state([])
  let status = $state('')

  async function search(e) {
    e.preventDefault()
    status = 'Searching…'
    try {
      results = await searchActors(q, {limit: 25})
      status = ''
    } catch (err) {
      status = 'Error: ' + (err?.message || err)
    }
  }

  function authorHref(handle) {
    return `#/@${encodeURIComponent(handle)}`
  }
</script>

<h2>Search Actors</h2>
<form onsubmit={search}>
  <fieldset>
    <legend><label for="search-q">Search handles…</label></legend>
    <input id="search-q" name="q" type="search" bind:value={q} placeholder="Search handles…" />
  </fieldset>
  <fieldset>
    <button type="submit">Search</button>
  </fieldset>
</form>
{#if status}<div>{status}</div>{/if}
<ul>
  {#each results as a}
    <li>
      <a href={authorHref(a.handle)}>{a.handle}</a>
    </li>
  {/each}
  </ul>
