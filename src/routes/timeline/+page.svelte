<script lang="ts">
  import { onMount } from 'svelte'
  import { timelineTracks, isScopeMissing } from '$lib/services/r4-service'
  import { setPlaylist } from '$lib/player/store'
  import TrackList from '$lib/components/TrackList.svelte'
  let items = $state([])
  let error = $state('')
  let loading = $state(true)
  const context = { type: 'timeline', key: 'following' }
  onMount(async () => {
    try {
      items = await timelineTracks({limitPerActor: 5})
    } catch (e) {
      error = e?.message || String(e)
      if (isScopeMissing(e)) error = 'Missing permission to read followings. Visit Settings to manage permissions.'
    } finally {
      loading = false
    }
  })
  function playAll(fromIdx) { setPlaylist(items, fromIdx) }
</script>

<h2>Timeline</h2>
{#if loading}
  <div>Loading…</div>
{:else if error}
  <div>Failed to load: {error} <button onclick={() => (location.hash = '#/settings')}>Open Settings</button></div>
{:else}
  <TrackList {items} {context} onremoved={(e) => { items = items.filter((t) => t.uri !== e.detail.uri) }} />
{/if}
