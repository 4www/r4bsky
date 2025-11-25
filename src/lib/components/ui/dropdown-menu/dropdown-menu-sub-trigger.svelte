<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";
	import { clsx } from "clsx";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		children,
		...restProps
	}: DropdownMenuPrimitive.SubTriggerProps & {
		inset?: boolean;
	} = $props();
</script>

<DropdownMenuPrimitive.SubTrigger
	bind:ref
	class={clsx("dropdown-item", inset && "dropdown-item-inset", className)}
	{...restProps}
>
	{@render children?.()}
	<ChevronRight size={16} style="margin-left: auto;" />
</DropdownMenuPrimitive.SubTrigger>
