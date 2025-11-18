<script lang="ts">
  import TrackEditDialogContent from '$lib/components/TrackEditDialogContent.svelte';
  import { Dialog } from '$lib/components/ui/dialog/index';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { session } from '$lib/state/session';
  import { locale, translate } from '$lib/i18n';

  const { data, handle = '', rkey = '', repo = '' } = $props();
  const normalizedHandle = $derived(handle ? handle.replace(/^@/, '') : '');
  const t = (key, vars = {}) => translate($locale, key, vars);

  function close() {
    const userHandle = normalizedHandle || $session?.handle || '';
    const back = userHandle ? `/@${encodeURIComponent(userHandle)}` : '/';
    goto(resolve(back));
  }
</script>

<Dialog title={t('editTrack.title')} onClose={close}>
  <TrackEditDialogContent
    handle={handle}
    {repo}
    {rkey}
    track={data?.track}
  />
</Dialog>
