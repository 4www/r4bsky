<script>
  import { AtUri } from '@atproto/api'
  import { parseTrackUrl } from '../../libs/url-patterns.js'
  import { setPlaylist } from '../player/store.js'
  export let repo
  export let rkey
  const item = $derived({ url: `at://${repo}/${rkey}`, title: rkey })
  function play() { setPlaylist([item], 0) }
</script>

<h2>Track</h2>
<div>
  <div>Repo: {repo}</div>
  <div>Key: {rkey}</div>
  <button on:click={play}>Play</button>
</div>
