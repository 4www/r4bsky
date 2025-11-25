<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import type { WithElementRef } from "bits-ui";
	import { clsx } from "clsx";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div bind:this={ref} class={clsx("dialog-header", className)} {...restProps}>
	{@render children?.()}
</div>
