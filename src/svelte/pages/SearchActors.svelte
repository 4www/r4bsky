<script>
  import { searchActors } from '../../libs/r4-service.js'
  import { navigate } from '../router.js'
  let q = ''
  let results = []
  let status = ''

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

  function openAuthor(handle) {
    location.hash = `#/author?handle=${encodeURIComponent(handle)}`
  }
</script>

<h2>Search Actors</h2>
<form on:submit={search}>
  <input type="search" bind:value={q} placeholder="Search handles…" />
  <button type="submit">Search</button>
</form>
{#if status}<div>{status}</div>{/if}
<ul>
  {#each results as a}
    <li>
      <button on:click={() => openAuthor(a.handle)}>{a.handle}</button>
    </li>
  {/each}
  </ul>
