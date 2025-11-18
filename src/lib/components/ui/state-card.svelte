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
	import { cn } from "$lib/utils";

	type IconComponent = ComponentType<{ class?: string }>;

	let {
		title = "",
		description = "",
		icon: Icon = null,
		children,
		actions,
		class: className,
	}: {
		title: string;
		description?: string;
		icon?: IconComponent | null;
		children?: Snippet;
		actions?: Snippet;
		class?: string;
	} = $props();
</script>

<Card class={cn("text-center max-w-md mx-auto", className)}>
	<CardHeader class="items-center text-center space-y-4 pb-6">
		{#if Icon}
			<div class="rounded-full bg-muted p-4">
				<Icon class="h-8 w-8 text-muted-foreground" />
			</div>
		{/if}
		<div class="space-y-2">
			<CardTitle class="text-xl">{title}</CardTitle>
			{#if description}
				<CardDescription class="text-base">{description}</CardDescription>
			{/if}
		</div>
	</CardHeader>
	{#if children}
		<CardContent class="text-sm text-muted-foreground pb-6">
			{@render children?.()}
		</CardContent>
	{/if}
	{#if actions}
		<CardFooter class="flex justify-center gap-3 pt-0">
			{@render actions?.()}
		</CardFooter>
	{/if}
</Card>
