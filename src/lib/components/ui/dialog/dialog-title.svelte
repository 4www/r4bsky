<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { clsx } from "clsx";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DialogPrimitive.TitleProps = $props();
</script>

<DialogPrimitive.Title bind:ref class={clsx("dialog-title", className)} {...restProps} />
