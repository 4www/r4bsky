<script lang="ts">
  import Link from '$lib/components/Link.svelte';
  import { locale, translate } from '$lib/i18n';

  const props = $props();
  const linksVal = $derived(props.links || []);
  const currentVal = $derived(props.current ?? '/');

  const t = (key, vars = {}) => translate($locale, key, vars);
</script>

<header>
  <nav class="pill-nav">
    <Link href="/" class:active={currentVal === '/'}>
      <strong>{t('nav.brand')}</strong>
    </Link>
    {#each linksVal as [href, title]}
      <Link href={href} class:active={currentVal === href}>
        {title}
      </Link>
    {/each}
  </nav>
</header>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 50;
    padding: var(--size-3);
  }

  .pill-nav {
    display: inline-flex;
    border-radius: var(--radius-round);
    border: var(--r4-border-size) solid var(--border);
    background: var(--background);
  }

  .pill-nav :global(a) {
    padding: var(--size-2) var(--size-3);
    transition: all 0.2s var(--ease-2);
  }

  .pill-nav :global(a:first-child) {
    border-radius: var(--radius-round) 0 0 var(--radius-round);
  }

  .pill-nav :global(a:last-child) {
    border-radius: 0 var(--radius-round) var(--radius-round) 0;
  }

  .pill-nav :global(a:hover),
  .pill-nav :global(a.active) {
    background: var(--foreground);
    color: var(--background);
  }
</style>
