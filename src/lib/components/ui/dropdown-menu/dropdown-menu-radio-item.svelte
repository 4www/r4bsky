<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive, type WithoutChild } from "bits-ui";
	import Circle from "@lucide/svelte/icons/circle";
	import { clsx } from "clsx";

	let {
		ref = $bindable(null),
		class: className,
		children: childrenProp,
		...restProps
	}: WithoutChild<DropdownMenuPrimitive.RadioItemProps> = $props();
</script>

<DropdownMenuPrimitive.RadioItem
	bind:ref
	class={clsx("dropdown-item dropdown-item-inset", className)}
	{...restProps}
>
	{#snippet children({ checked })}
		<span class="dropdown-item-indicator">
			{#if checked}
				<Circle size={8} style="fill: currentColor;" />
			{/if}
		</span>
		{@render childrenProp?.({ checked })}
	{/snippet}
</DropdownMenuPrimitive.RadioItem>
