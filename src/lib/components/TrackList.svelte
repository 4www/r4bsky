<script lang="ts">
  import TrackListItem from './TrackListItem.svelte';

  const { tracks = [], context = null, editable = false } = $props();

  function handleRemove(event) {
    const removedUri = event.detail?.uri;
    if (removedUri) {
      const idx = tracks.findIndex((t) => t.uri === removedUri);
      if (idx !== -1) tracks.splice(idx, 1);
    }
  }
</script>

{#if tracks && tracks.length > 0}
  <div class="space-y-4">
    {#each tracks as item, idx (item.uri || idx)}
      <TrackListItem
        {item}
        index={idx}
        items={tracks}
        {context}
        {editable}
        on:remove={handleRemove}
      />
    {/each}
  </div>
{:else}
  <div class="text-center py-12">
    <p class="text-muted-foreground">No tracks found</p>
  </div>
{/if}
