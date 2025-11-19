<script lang="ts">
  import { page } from '$app/stores';
  import Link from '$lib/components/Link.svelte';
  import { cn } from '$lib/utils';
  import { User, Palette, Shield, Languages } from 'lucide-svelte';
  import { locale, translate } from '$lib/i18n';

  const { children } = $props();
  const t = (key, vars = {}) => translate($locale, key, vars);

  const navItems = $derived([
    { href: '/settings/account', label: t('settings.nav.account'), icon: User },
    { href: '/settings/appearance', label: t('settings.nav.appearance'), icon: Palette },
    { href: '/settings/permissions', label: t('settings.nav.permissions'), icon: Shield },
    { href: '/settings/language', label: t('settings.nav.language'), icon: Languages },
  ]);

  const currentPath = $derived($page.url.pathname);
</script>

<div class="container max-w-6xl py-6">
  <div class="mb-6">
    <h1 class="text-3xl font-bold">{t('settings.title')}</h1>
    <p class="text-muted-foreground mt-1">{t('settings.description')}</p>
  </div>

  <div class="flex flex-col lg:flex-row gap-6">
    <!-- Settings Navigation -->
    <nav class="lg:w-48 shrink-0">
      <div class="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
        {#each navItems as item}
          {@const Icon = item.icon}
          {@const isActive = currentPath.startsWith(item.href)}
          <Link
            href={item.href}
            class={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap border-2",
              isActive
                ? "text-foreground border-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-transparent"
            )}
          >
            <Icon class="h-4 w-4" />
            {item.label}
          </Link>
        {/each}
      </div>
    </nav>

    <!-- Settings Content -->
    <div class="flex-1 min-w-0">
      {@render children()}
    </div>
  </div>
</div>
