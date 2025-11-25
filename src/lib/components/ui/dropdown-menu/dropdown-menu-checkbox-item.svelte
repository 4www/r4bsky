<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive, type WithoutChildrenOrChild } from "bits-ui";
	import Check from "@lucide/svelte/icons/check";
	import Minus from "@lucide/svelte/icons/minus";
	import { clsx } from "clsx";
	import type { Snippet } from "svelte";

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		class: className,
		children: childrenProp,
		...restProps
	}: WithoutChildrenOrChild<DropdownMenuPrimitive.CheckboxItemProps> & {
		children?: Snippet;
	} = $props();
</script>

<DropdownMenuPrimitive.CheckboxItem
	bind:ref
	bind:checked
	bind:indeterminate
	class={clsx("dropdown-item dropdown-item-inset", className)}
	{...restProps}
>
	{#snippet children({ checked, indeterminate })}
		<span class="dropdown-item-indicator">
			{#if indeterminate}
				<Minus size={16} />
			{:else if checked}
				<Check size={16} />
			{/if}
		</span>
		{@render childrenProp?.()}
	{/snippet}
</DropdownMenuPrimitive.CheckboxItem>
