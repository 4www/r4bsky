<script lang="ts">
  import { page } from '$app/stores';
  import NavTabs from '$lib/components/NavTabs.svelte';
  import { locale, translate } from '$lib/i18n';
  import { base } from '$app/paths';
  import { session } from '$lib/state/session';

  const { handle } = $props();
  const t = (key, vars = {}) => translate($locale, key, vars);

  const currentPath = $derived($page.url.pathname);
  const profilePath = `/@${handle}`;
  const followingPath = `/@${handle}/favorites`;
  const addPath = `/@${handle}/add`;

  const isTracksActive = $derived(currentPath === (base + profilePath) || currentPath === profilePath);
  const isFollowingActive = $derived(currentPath === (base + followingPath) || currentPath === followingPath);
  const isAddActive = $derived(currentPath === (base + addPath) || currentPath === addPath);

  const isOwnProfile = $derived($session?.handle === handle);

  const navItems = $derived([
    { href: profilePath, label: t('profileNav.tracks'), isActive: isTracksActive },
    { href: followingPath, label: t('profileNav.following'), isActive: isFollowingActive },
    ...(isOwnProfile ? [{ href: addPath, label: t('nav.links.add'), isActive: isAddActive }] : [])
  ]);
</script>

<div class="flex gap-2 mb-4 justify-center">
  <NavTabs items={navItems} variant="pills-muted" />
</div>
