<script lang="ts">
	import type { WithElementRef } from "bits-ui";
	import type { HTMLAttributes } from "svelte/elements";
	import { clsx } from "clsx";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div bind:this={ref} class={clsx("card-content", className)} {...restProps}>
	{@render children?.()}
</div>
