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

<Card class={cn("text-center", className)}>
	<CardHeader class="items-center text-center space-y-2">
		{#if Icon}
			<Icon class="h-10 w-10 text-muted-foreground" />
		{/if}
		<CardTitle>{title}</CardTitle>
		{#if description}
			<CardDescription>{description}</CardDescription>
		{/if}
	</CardHeader>
	{#if children}
		<CardContent class="text-sm text-muted-foreground">
			{@render children?.()}
		</CardContent>
	{/if}
	{#if actions}
		<CardFooter class="flex justify-center gap-2">
			{@render actions?.()}
		</CardFooter>
	{/if}
</Card>
