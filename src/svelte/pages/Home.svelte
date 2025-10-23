<script>
  import MyTracks from './MyTracks.svelte'
  import { bskyOAuth } from '../../libs/bsky-oauth.js'
  $: handle = bskyOAuth.session?.handle || bskyOAuth.session?.did || ''
</script>

<MyTracks />

