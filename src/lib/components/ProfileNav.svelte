<script lang="ts">
  import { page } from '$app/stores';
  import Link from '$lib/components/Link.svelte';
  import { cn } from '$lib/utils';
  import { locale, translate } from '$lib/i18n';
  import { Music, Users } from 'lucide-svelte';
  import { base } from '$app/paths';

  const { handle } = $props();
  const t = (key, vars = {}) => translate($locale, key, vars);

  const currentPath = $derived($page.url.pathname);
  const profilePath = `/@${handle}`;
  const followingPath = `/@${handle}/following`;

  const isTracksActive = $derived(currentPath === (base + profilePath) || currentPath === profilePath);
  const isFollowingActive = $derived(currentPath === (base + followingPath) || currentPath === followingPath);

  const linkClass = (active: boolean) => cn(
    'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
    active
      ? 'bg-primary text-primary-foreground shadow-md'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  );
</script>

<nav class="flex gap-2 mb-6 justify-center">
  <div class="inline-flex gap-2 p-1.5 rounded-full bg-muted/40 border border-muted">
    <Link href={profilePath} class={linkClass(isTracksActive)}>
      <Music class="h-4 w-4" />
      {t('profileNav.tracks')}
    </Link>
    <Link href={followingPath} class={linkClass(isFollowingActive)}>
      <Users class="h-4 w-4" />
      {t('profileNav.following')}
    </Link>
  </div>
</nav>
