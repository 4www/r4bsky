<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { clsx } from "clsx";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DialogPrimitive.DescriptionProps = $props();
</script>

<DialogPrimitive.Description bind:ref class={clsx("dialog-description", className)} {...restProps} />
