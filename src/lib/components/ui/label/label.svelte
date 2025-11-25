<script lang="ts">
	import { Label as LabelPrimitive } from "bits-ui";
	import { clsx } from "clsx";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: LabelPrimitive.RootProps = $props();
</script>

<LabelPrimitive.Root bind:ref class={clsx("label", className)} {...restProps} />
