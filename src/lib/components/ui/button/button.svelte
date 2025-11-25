<script lang="ts" module>
	import type { WithElementRef } from "bits-ui";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";

	export type ButtonVariant = "default" | "primary" | "destructive" | "outline" | "secondary" | "ghost" | "link";
	export type ButtonSize = "default" | "sm" | "lg" | "icon";

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
		};
</script>

<script lang="ts">
	import { resolve } from "$app/paths";
	import { clsx } from "clsx";

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

	const classes = $derived(clsx("btn", `btn-${variant}`, size !== "default" && `btn-${size}`, className));
</script>

{#if href}
	<a bind:this={ref} class={classes} href={finalHref} {...restProps}>
		{@render children?.()}
	</a>
{:else}
	<button bind:this={ref} class={classes} {type} {...restProps}>
		{@render children?.()}
	</button>
{/if}
