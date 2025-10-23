<script>
  import { onMount } from 'svelte'
  import { timelineTracks, isScopeMissing } from '../../libs/r4-service.js'
  import { setPlaylist } from '../player/store.js'
  import TrackList from '../components/TrackList.svelte'
  let items = []
  let error = ''
  onMount(async () => {
    try {
      items = await timelineTracks({limitPerActor: 5})
    } catch (e) {
      error = e?.message || String(e)
      if (isScopeMissing(e)) error = 'Missing permission to read followings. Visit Settings to manage permissions.'
    }
  })
  function playAll(fromIdx) { setPlaylist(items, fromIdx) }
</script>

<h2>Timeline</h2>
{#if error}
  <div>Failed to load: {error} <button on:click={() => (location.hash = '#/settings')}>Open Settings</button></div>
{:else}
  <svelte:component this={TrackList} {items} />
{/if}
