<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { clsx } from "clsx";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		...restProps
	}: DropdownMenuPrimitive.GroupHeadingProps & {
		inset?: boolean;
	} = $props();
</script>

<DropdownMenuPrimitive.GroupHeading
	bind:ref
	class={clsx("dropdown-label", inset && "dropdown-item-inset", className)}
	{...restProps}
/>
