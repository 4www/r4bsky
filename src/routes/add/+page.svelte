<script lang="ts">
  import { createTrack } from '$lib/services/r4-service';
  import { fetchOEmbed } from '$lib/services/oembed';
  import { parseUrl as parseDiscogsUrl, fetchDiscogs, extractSuggestions } from '$lib/services/discogs';
  import TrackForm from '$lib/components/TrackForm.svelte';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { parseAtUri } from '$lib/services/track-uri';
  import { CheckCircle2 } from 'lucide-svelte';

  let savedUri = $state('');
  const savedAt = $derived(savedUri ? parseAtUri(savedUri) : null);

  async function onCreate({ url, title, description, discogs_url }) {
    let fullDescription = description;
    if (discogs_url) {
      try {
        const info = parseDiscogsUrl(discogs_url);
        if (info?.id && info?.type) {
          const data = await fetchDiscogs(info);
          const tags = extractSuggestions(data);
          if (tags?.length) fullDescription = [description, tags.map((t) => `#${t}`).join(' ')].join(' ').trim();
        }
      } catch (_) {}
    }
    const res = await createTrack({ url, title, description: fullDescription, discogs_url });
    savedUri = res?.data?.uri || res?.uri || '';
    return res;
  }
</script>

<div class="container max-w-2xl py-8">
  <Card>
    <CardHeader>
      <CardTitle>Add New Track</CardTitle>
      <CardDescription>
        Share a music track with your followers on Bluesky
      </CardDescription>
    </CardHeader>
    <CardContent>
      <TrackForm submitLabel="Publish Track" onSubmit={onCreate} />

      {#if savedAt}
        <div class="mt-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
          <div class="flex items-start gap-3">
            <CheckCircle2 class="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div class="flex-1">
              <h3 class="font-semibold text-green-900 dark:text-green-100">Track published successfully!</h3>
              <p class="text-sm text-green-700 dark:text-green-300 mt-1">
                <a
                  href={`#/${encodeURIComponent(savedAt.repo)}/${encodeURIComponent(savedAt.rkey)}`}
                  class="underline hover:no-underline"
                >
                  View your track
                </a>
              </p>
            </div>
          </div>
        </div>
      {/if}
    </CardContent>
  </Card>
</div>
