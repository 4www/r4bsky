<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { clsx } from "clsx";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DialogPrimitive.OverlayProps = $props();
</script>

<DialogPrimitive.Overlay bind:ref class={clsx("dialog-overlay", className)} {...restProps} />
