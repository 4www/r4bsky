<script lang="ts" module>
	import type { WithElementRef } from "bits-ui";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";

	export const buttonVariants = tv({
		base: "ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
		variants: {
			variant: {
				default: "bg-card text-foreground border border-border hover:bg-muted hover:border-foreground/20 shadow-sm",
				primary: "bg-primary/10 text-foreground border border-border hover:bg-primary/20 hover:border-border shadow-sm",
				destructive: "text-foreground border border-border hover:bg-destructive/10 hover:border-destructive/30 shadow-sm",
				outline:
					"border border-border bg-background hover:bg-muted hover:border-foreground/20",
				secondary: "bg-muted text-foreground border border-transparent hover:bg-muted/80 hover:border-border",
				ghost: "hover:bg-muted hover:text-foreground",
				link: "text-foreground underline-offset-4 hover:underline hover:text-primary",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-9 rounded-md px-3",
				lg: "h-11 rounded-md px-8",
				icon: "h-10 w-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
	export type ButtonSize = VariantProps<typeof buttonVariants>["size"];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
		};
</script>

<script lang="ts">
	import { resolve } from "$app/paths";
	import { cn } from "$lib/utils";

	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		href = undefined,
		type = "button",
		children,
		...restProps
	}: ButtonProps = $props();

	const isExternalHref = (value: string) => {
		return /^(?:[a-z+.-]+:|\/\/)/i.test(value) || value.startsWith("mailto:") || value.startsWith("tel:") || value.startsWith("#");
	};

	const finalHref = $derived.by(() => {
		if (!href) return href;
		if (isExternalHref(href)) return href;
		return resolve(href);
	});
</script>

{#if href}
	<a
		bind:this={ref}
		class={cn(buttonVariants({ variant, size }), className)}
		href={finalHref}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
