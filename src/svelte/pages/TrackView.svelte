<script>
  import { parseTrackUrl } from '../../libs/url-patterns.js'
  import { setPlaylist } from '../player/store.js'
  const { repo, rkey } = $props()
  const item = $derived({ url: `at://${repo}/${rkey}`, title: rkey })
  function play() { setPlaylist([item], 0) }
</script>

<h2>Track</h2>
<div>
  <div>Repo: {repo}</div>
  <div>Key: {rkey}</div>
  <button on:click={play}>Play</button>
</div>
