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

  <nav>
    <NavTabs items={navItems} />
  </nav>

  <div>
    {@render children()}
  </div>
</div>

<style>
  .settings-layout {
    max-width: 56rem;
    margin-inline: auto;
    padding: var(--size-fluid-3);
  }

  .settings-layout > header {
    margin-bottom: var(--size-fluid-3);
  }

  .settings-layout > header h1 {
    font-size: var(--font-size-fluid-2);
    font-weight: var(--font-weight-7);
  }

  .settings-layout > header p {
    color: var(--muted-foreground);
    margin-top: var(--size-1);
  }

  .settings-layout > nav {
    display: flex;
    justify-content: center;
    margin-bottom: var(--size-fluid-3);
  }
</style>
