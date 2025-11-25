<script lang="ts">
	import type { ComponentType, Snippet } from "svelte";
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle,
	} from "./card";
	import { clsx } from "clsx";

	type IconComponent = ComponentType<{ size?: number }>;

	let {
		title = "",
		description = "",
		icon: Icon = null,
		loading = false,
		children,
		actions,
		class: className,
	}: {
		title: string;
		description?: string;
		icon?: IconComponent | null;
		loading?: boolean;
		children?: Snippet;
		actions?: Snippet;
		class?: string;
	} = $props();
</script>

<Card class={clsx("state-card", loading && "state-card-loading", className)}>
	<CardHeader>
		{#if Icon}
			<div class="state-card-icon" class:loading>
				<Icon size={32} />
			</div>
		{/if}
		<CardTitle>{title}</CardTitle>
		{#if description}
			<CardDescription>{description}</CardDescription>
		{/if}
	</CardHeader>
	{#if children}
		<CardContent>
			{@render children?.()}
		</CardContent>
	{/if}
	{#if actions}
		<CardFooter class="state-card-actions">
			{@render actions?.()}
		</CardFooter>
	{/if}
</Card>

<style>
	:global(.state-card) {
		text-align: center;
		max-width: 28rem;
		margin-inline: auto;
	}

	:global(.state-card-loading) {
		border: none;
		background: transparent;
	}

	.state-card-icon {
		margin-inline: auto;
		padding: var(--size-3);
		border-radius: var(--radius-round);
		background: var(--muted);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.state-card-icon.loading :global(svg) {
		animation: var(--animation-spin);
	}

	:global(.state-card-actions) {
		justify-content: center;
		gap: var(--size-3);
	}
</style>
