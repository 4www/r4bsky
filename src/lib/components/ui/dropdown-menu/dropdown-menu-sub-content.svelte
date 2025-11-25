<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { clsx } from "clsx";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DropdownMenuPrimitive.SubContentProps = $props();
</script>

<DropdownMenuPrimitive.SubContent
	bind:ref
	class={clsx("dropdown-content", className)}
	{...restProps}
/>
