<script lang="ts">
	import { clsx } from "clsx";
	import { type WithElementRef } from "bits-ui";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		inset?: boolean;
	} = $props();
</script>

<div
	bind:this={ref}
	class={clsx("dropdown-label", inset && "dropdown-item-inset", className)}
	{...restProps}
>
	{@render children?.()}
</div>
