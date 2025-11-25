<script lang="ts">
	import type { WithElementRef, WithoutChildren } from "bits-ui";
	import type { HTMLTextareaAttributes } from "svelte/elements";
	import { clsx } from "clsx";

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		...restProps
	}: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> = $props();
</script>

<textarea bind:this={ref} class={clsx("textarea", className)} bind:value {...restProps}></textarea>
