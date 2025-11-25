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
  }

  let { items }: Props = $props();
</script>

<nav class="nav-tabs">
  {#each items as item (item.href)}
    <Link href={item.href} class={item.isActive ? 'active' : ''}>
      {#if item.icon}
        {@const Icon = item.icon}
        <Icon size={14} />
      {/if}
      <span>{item.label}</span>
    </Link>
  {/each}
</nav>

<style>
  .nav-tabs {
    display: inline-flex;
    overflow-x: auto;
    border-radius: var(--radius-round);
    border: var(--r4-border-size) solid var(--border);
    background: var(--background);
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
    color: var(--foreground);
  }

  .nav-tabs :global(a:hover),
  .nav-tabs :global(a.active) {
    background: var(--foreground);
    color: var(--background);
  }
</style>
