<script lang="ts">
  import Link from '$lib/components/Link.svelte';
  import { cn } from '$lib/utils';
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
    class?: string;
  }

  let { items, variant = 'pills', class: className }: Props = $props();

  // Container styles based on variant
  const containerClass = $derived(cn(
    'inline-flex gap-1.5 overflow-x-auto',
    variant === 'pills' && 'rounded-full bg-background/95 backdrop-blur-xl border-2 border-border',
    variant === 'pills-muted' && 'rounded-full bg-muted/40 border border-muted',
    variant === 'sidebar' && 'flex-col gap-2 overflow-x-visible',
    className
  ));

  // Link styles based on variant
  const linkClass = (active: boolean) => cn(
    'flex items-center gap-1 text-sm font-medium transition-all duration-200 border-2',
    variant === 'pills' && 'gap-1.5 px-3 py-2 rounded-full',
    variant === 'pills-muted' && 'gap-1.5 px-3 py-1.5 rounded-full',
    variant === 'sidebar' && 'px-3 py-2 rounded-md whitespace-nowrap',
    active
      ? 'text-background bg-foreground border-foreground shadow-sm'
      : 'text-foreground border-transparent hover:border-foreground hover:text-foreground hover:bg-transparent',
    variant === 'sidebar' && !active && 'hover:bg-muted/50'
  );

  const iconClass = $derived(cn(
    variant === 'pills' || variant === 'pills-muted' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  ));
</script>

<nav class={containerClass}>
  {#each items as item (item.href)}
    <Link href={item.href} class={linkClass(item.isActive)}>
      {#if item.icon}
        {@const Icon = item.icon}
        <Icon class={iconClass} />
      {/if}
      <span>{item.label}</span>
    </Link>
  {/each}
</nav>
