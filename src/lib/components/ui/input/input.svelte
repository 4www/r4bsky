<script lang="ts">
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
	import type { WithElementRef } from "bits-ui";
	import { clsx } from "clsx";

	type InputType = Exclude<HTMLInputTypeAttribute, "file">;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, "type"> &
			({ type: "file"; files?: FileList } | { type?: InputType; files?: undefined })
	>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		...restProps
	}: Props = $props();

	const classes = $derived(clsx("input", className));
</script>

{#if type === "file"}
	<input bind:this={ref} class={classes} type="file" bind:files bind:value {...restProps} />
{:else}
	<input bind:this={ref} class={classes} {type} bind:value {...restProps} />
{/if}
