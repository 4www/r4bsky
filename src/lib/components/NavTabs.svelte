<script lang="ts">
  import Link from '$lib/components/Link.svelte';
  import type { ComponentType } from 'svelte';

  interface NavItem {
    href: string;
    label: string;
    icon?: ComponentType;
    isActive: boolean;
  }

  interface Props {
    items: NavItem[];
    variant?: 'pills' | 'pills-muted' | 'sidebar';
  }

  let { items, variant = 'pills' }: Props = $props();
</script>

<nav class="nav-tabs" data-variant={variant}>
  {#each items as item (item.href)}
    <Link href={item.href} class={item.isActive ? 'active' : ''}>
      {#if item.icon}
        {@const Icon = item.icon}
        <Icon size={variant === 'sidebar' ? 16 : 14} />
      {/if}
      <span>{item.label}</span>
    </Link>
  {/each}
</nav>

<style>
  .nav-tabs {
    display: inline-flex;
    overflow-x: auto;
  }

  .nav-tabs[data-variant="pills"],
  .nav-tabs[data-variant="pills-muted"] {
    border-radius: var(--radius-round);
    border: var(--r4-border-size) solid var(--border);
    background: var(--background);
  }

  .nav-tabs[data-variant="sidebar"] {
    flex-direction: column;
    overflow-x: visible;
  }

  .nav-tabs :global(a) {
    display: flex;
    align-items: center;
    gap: var(--size-2);
    padding: var(--size-2) var(--size-3);
    font-size: var(--font-size-1);
    font-weight: var(--font-weight-5);
    white-space: nowrap;
    transition: all 0.2s var(--ease-2);
  }

  .nav-tabs[data-variant="sidebar"] :global(a) {
    border-radius: var(--radius-2);
  }

  .nav-tabs :global(a:hover),
  .nav-tabs :global(a.active) {
    background: var(--foreground);
    color: var(--background);
  }
</style>
