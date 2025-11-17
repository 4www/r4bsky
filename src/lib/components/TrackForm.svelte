<script lang="ts">
  import { fetchOEmbed } from '$lib/services/oembed';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';

  const props = $props();
  const initialProp = $derived(props.initial || { url: '', title: '', description: '', discogs_url: '' });
  const submitText = $derived(props.submitLabel || 'Save');
  const onSubmit = $derived(props.onSubmit || null);

  let url = $state('');
  let title = $state('');
  let description = $state('');
  let discogs_url = $state('');
  let status = $state('');
  let prefilled = $state(false);

  // Populate from initial when it arrives (edit case)
  $effect(() => {
    if (!prefilled && (initialProp.url || initialProp.title || initialProp.description || initialProp.discogs_url || initialProp.discogsUrl)) {
      url = initialProp.url || '';
      title = initialProp.title || '';
      description = initialProp.description || '';
      discogs_url = initialProp.discogs_url || initialProp.discogsUrl || '';
      prefilled = true;
    }
  });

  // Autofill title from oEmbed on create when URL present and title empty
  $effect(() => {
    if (url && !title) {
      (async () => {
        try {
          const data = await fetchOEmbed(url);
          if (data?.title && !title) title = data.title;
        } catch (_) {}
      })();
    }
  });

  async function submit(e) {
    e?.preventDefault?.();
    status = '';
    try {
      const res = await onSubmit?.({ url, title, description, discogs_url });
      return res;
    } catch (err) {
      status = err?.message || String(err);
    }
  }
</script>

<form onsubmit={submit} class="space-y-6">
  <div class="space-y-2">
    <Label for="url">Track URL</Label>
    <Input
      id="url"
      name="url"
      type="url"
      bind:value={url}
      placeholder="https://youtube.com/watch?v=..."
      required
    />
  </div>

  <div class="space-y-2">
    <Label for="title">Title</Label>
    <Input
      id="title"
      name="title"
      type="text"
      bind:value={title}
      placeholder="Track title"
      required
    />
  </div>

  <div class="space-y-2">
    <Label for="description">Description (optional)</Label>
    <Textarea
      id="description"
      name="description"
      bind:value={description}
      placeholder="Add a description..."
      rows={3}
    />
  </div>

  <div class="space-y-2">
    <Label for="discogs_url">Discogs URL (optional)</Label>
    <Input
      id="discogs_url"
      name="discogs_url"
      type="url"
      bind:value={discogs_url}
      placeholder="https://discogs.com/release/..."
    />
  </div>

  {#if status}
    <div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
      {status}
    </div>
  {/if}

  <Button type="submit" class="w-full">
    {submitText}
  </Button>
</form>
