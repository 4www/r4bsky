<script lang="ts">
	import { clsx } from "clsx";
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		...restProps
	}: DropdownMenuPrimitive.ItemProps & {
		inset?: boolean;
	} = $props();
</script>

<DropdownMenuPrimitive.Item
	bind:ref
	class={clsx("dropdown-item", inset && "dropdown-item-inset", className)}
	{...restProps}
/>
