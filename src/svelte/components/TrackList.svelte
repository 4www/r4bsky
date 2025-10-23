<script>
  import TrackListItem from './TrackListItem.svelte'
  export let items = [] // [{ uri, title, url, description }]
  export let editable = false
  export let context = null
  let message = ''
  function onRemove(e) {
    const uri = e?.detail?.uri
    if (!uri) return
    items = items.filter((t) => t.uri !== uri)
  }
</script>

{#if message}<div>{message}</div>{/if}
<ul>
  {#each items as t, i}
    <li>
      <svelte:component this={TrackListItem} item={t} index={i} items={items} context={context} editable={editable} on:remove={onRemove} />
    </li>
  {/each}
  {#if !items?.length}
    <li>No tracks</li>
  {/if}
</ul>
