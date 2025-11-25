<script lang="ts">
  import { page } from '$app/stores';
  import { session } from '$lib/state/session';
  import NavTabs from '$lib/components/NavTabs.svelte';
  import { User, Palette, Languages, RefreshCw } from 'lucide-svelte';
  import { locale, translate } from '$lib/i18n';

  const { children } = $props();
  const t = (key, vars = {}) => translate($locale, key, vars);

  const currentPath = $derived($page.url.pathname);
  const isAuthenticated = $derived($session?.did);

  // Filter nav items based on authentication
  const navItems = $derived([
    { href: '/settings/account', label: t('settings.nav.account'), icon: User, isActive: currentPath.startsWith('/settings/account') },
    ...(isAuthenticated ? [
      { href: '/settings/appearance', label: t('settings.nav.appearance'), icon: Palette, isActive: currentPath.startsWith('/settings/appearance') },
      { href: '/settings/sync', label: t('settings.nav.sync'), icon: RefreshCw, isActive: currentPath.startsWith('/settings/sync') },
    ] : []),
    { href: '/settings/language', label: t('settings.nav.language'), icon: Languages, isActive: currentPath.startsWith('/settings/language') },
  ]);
</script>

<div class="settings-layout">
  <header>
    <h1>{t('settings.title')}</h1>
    <p>{t('settings.description')}</p>
  </header>

  <NavTabs items={navItems} />

  <div>
    {@render children()}
  </div>
</div>

<style>
  .settings-layout {
    display: grid;
    gap: var(--size-fluid-2);
    flex-direction: column;
    align-items: center;
    max-width: 56rem;
    margin-inline: auto;
  }
</style>
