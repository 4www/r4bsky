<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { type WithElementRef } from "bits-ui";
	import { clsx } from "clsx";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props();
</script>

<span bind:this={ref} class={clsx("dropdown-shortcut", className)} {...restProps}>
	{@render children?.()}
</span>
