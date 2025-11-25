<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { clsx } from "clsx";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DropdownMenuPrimitive.SeparatorProps = $props();
</script>

<DropdownMenuPrimitive.Separator
	bind:ref
	class={clsx("dropdown-separator", className)}
	{...restProps}
/>
