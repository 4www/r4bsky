<script lang="ts">
  import { onMount } from 'svelte';
  import { timelineTracks, isScopeMissing } from '$lib/services/r4-service';
  import { setPlaylist } from '$lib/player/store';
  import TrackList from '$lib/components/TrackList.svelte';
  import { Button } from '$lib/components/ui/button';
  import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { PlayCircle, AlertCircle, Loader2, Music4 } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { locale, translate } from '$lib/i18n';

  let items = $state([]);
  let error = $state('');
  let loading = $state(true);
  const context = { type: 'timeline', key: 'following' };
  const t = (key, vars = {}) => translate($locale, key, vars);

  async function loadTimeline() {
    loading = true;
    error = '';
    try {
      items = await timelineTracks({ limitPerActor: 5 });
    } catch (e) {
      if (isScopeMissing(e)) error = t('timeline.errorMissingScope');
      else error = (e as Error)?.message || String(e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadTimeline();
  });

  function playAll(fromIdx: number) {
    setPlaylist(items, fromIdx);
  }
</script>

<div class="container max-w-4xl py-8 space-y-6">
  <Card>
    <CardHeader class="gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <CardTitle class="text-3xl">{t('timeline.title')}</CardTitle>
        <CardDescription>
          {t('timeline.description')}
        </CardDescription>
      </div>
      {#if items.length > 0}
        <Button onclick={() => playAll(0)}>
          <PlayCircle class="mr-2 h-4 w-4" />
          {t('timeline.playAll')}
        </Button>
      {/if}
    </CardHeader>
  </Card>

  {#if loading}
    <StateCard
      icon={Loader2}
      title={t('timeline.loadingTitle')}
      description={t('timeline.loadingDescription')}
      class="border-dashed"
    />
  {:else if error}
    <StateCard
      icon={AlertCircle}
      title={t('timeline.errorTitle')}
      description={error}
    >
      {#snippet actions()}
        <Button variant="outline" onclick={loadTimeline}>
          {t('buttons.tryAgain')}
        </Button>
        <Button variant="ghost" onclick={() => goto(resolve('/settings'))}>
          {t('buttons.openSettings')}
        </Button>
      {/snippet}
    </StateCard>
  {:else if items.length === 0}
    <StateCard
      icon={Music4}
      title={t('timeline.emptyTitle')}
      description={t('timeline.emptyDescription')}
    >
      {#snippet actions()}
        <Button variant="outline" onclick={() => goto(resolve('/search'))}>
          {t('timeline.findPeople')}
        </Button>
      {/snippet}
    </StateCard>
  {:else}
    <TrackList
      tracks={items}
      {context}
      onremoved={(e) => { items = items.filter((t) => t.uri !== e.detail.uri); }}
    />
  {/if}
</div>
