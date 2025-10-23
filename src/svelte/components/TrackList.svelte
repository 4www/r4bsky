<script>
  import TrackItem from './TrackItem.svelte'
  import { setPlaylist } from '../player/store.js'
  import { createEventDispatcher } from 'svelte'
  const { items: _items = [], editable = false, context = null } = $props()
  let items = $state(_items)
  $effect(() => { items = _items })
  let message = ''
  const dispatch = createEventDispatcher()
  function onRemove(e) {
    const uri = e?.detail?.uri
    if (!uri) return
    items = items.filter((t) => t.uri !== uri)
    dispatch('removed', { uri })
  }
</script>

{#if message}<div>{message}</div>{/if}
{#if items?.length}
  <div>
    <button onclick={() => setPlaylist(items, 0, context)}>Play all</button>
  </div>
{/if}
<ul>
  {#each items as t, i}
    <li>
      <TrackItem item={t} index={i} items={items} context={context} editable={editable} onremove={onRemove} />
    </li>
  {/each}
  {#if !items?.length}
    <li>No tracks</li>
  {/if}
</ul>
