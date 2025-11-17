<script lang="ts">
  import { parseTrackUrl } from '$lib/services/url-patterns';
  import { deleteTrackByUri } from '$lib/services/r4-service';
  import { setPlaylist } from '$lib/player/store';
  import { session } from '$lib/state/session';
  import { buildEditHash, buildViewHash } from '$lib/services/track-uri';
  import { createEventDispatcher } from 'svelte';
  import { Button, buttonVariants } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { Play, MoreVertical, Pencil, Trash2, ExternalLink } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import { resolve } from '$app/paths';
  import { goto } from '$app/navigation';
  import { locale, translate } from '$lib/i18n';

  const {
    item,
    index = 0,
    items = [],
    context = null,
    editable = false,
  } = $props();
  let message = $state('');
  const dispatch = createEventDispatcher();

  const t = (key, vars = {}) => translate($locale, key, vars);

  function play() {
    setPlaylist(items && items.length ? items : [item], items && items.length ? index : 0, context);
  }

  async function remove() {
    message = '';
    try {
      await deleteTrackByUri(item.uri);
      dispatch('remove', { uri: item.uri });
    } catch (e) {
      message = e?.message || String(e);
    }
  }

  function editHref() {
    const handle = $session?.handle;
    return buildEditHash(handle, item.uri);
  }

  const safeOpenUrl = $derived.by(() => {
    try {
      const m = parseTrackUrl(item?.url || '');
      return (m && m.url) || item?.url || '#';
    } catch {
      return '#';
    }
  });

  const authorHandle = $derived(context?.handle ?? item.authorHandle ?? null);

  function viewHref() {
    return buildViewHash(authorHandle, item.uri);
  }

  function openEdit() {
    const href = editHref();
    if (href) {
      goto(resolve(href));
    }
  }

  function openDetail(event?: Event) {
    event?.preventDefault?.();
    const href = viewHref();
    if (href) {
      goto(resolve(href));
    }
  }

  function openExternalUrl() {
    const url = safeOpenUrl;
    if (!url || url === '#') return;
    window.open(url, '_blank', 'noopener');
  }
</script>

<Card class="hover:shadow-md transition-shadow">
  <CardHeader class="pb-3">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <CardTitle class="text-lg">
          <a href={resolve(viewHref() || '/')} class="hover:text-primary transition-colors" onclick={openDetail}>
            {item.title || t('trackItem.untitled')}
          </a>
        </CardTitle>
        {#if authorHandle}
          <CardDescription class="mt-1">
            {t('trackItem.by', { handle: authorHandle })}
          </CardDescription>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        <Button size="sm" onclick={play}>
          <Play class="h-4 w-4 mr-1" />
          {t('trackItem.play')}
        </Button>

        {#if editable}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}
                <button
                  {...props}
                  class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), props.class)}
                >
                  <MoreVertical class="h-4 w-4" />
                  <span class="sr-only">{t('trackItem.actions')}</span>
                </button>
              {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Group>
                {#if editHref()}
                  <DropdownMenu.Item
                    on:select={(event) => {
                      event.preventDefault();
                      openEdit();
                    }}
                  >
                    <Pencil class="mr-2 h-4 w-4" />
                    {t('trackItem.edit')}
                  </DropdownMenu.Item>
                {/if}
                <DropdownMenu.Item
                  on:select={(event) => {
                    event.preventDefault();
                    openExternalUrl();
                  }}
                >
                  <ExternalLink class="mr-2 h-4 w-4" />
                  {t('trackItem.openUrl')}
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item
                  on:select={(event) => {
                    event.preventDefault();
                    remove();
                  }}
                  class="text-destructive focus:text-destructive"
                >
                  <Trash2 class="mr-2 h-4 w-4" />
                  {t('trackItem.delete')}
                </DropdownMenu.Item>
              </DropdownMenu.Group>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        {:else}
          <Button variant="ghost" size="icon" onclick={openExternalUrl} aria-label={t('trackItem.openExternal')}>
            <ExternalLink class="h-4 w-4" />
          </Button>
        {/if}
      </div>
    </div>
  </CardHeader>

  {#if item.description}
    <CardContent class="pt-0">
      <p class="text-sm text-muted-foreground whitespace-pre-wrap">
        {item.description}
      </p>
    </CardContent>
  {/if}

  {#if message}
    <CardContent class="pt-0">
      <div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
        {message}
      </div>
    </CardContent>
  {/if}
</Card>
