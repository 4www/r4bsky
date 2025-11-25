<script lang="ts">
	import { clsx } from "clsx";

	interface Props {
		class?: string
	}

	let { class: className }: Props = $props()
</script>

<div class={clsx("skeleton", className)} aria-hidden="true"></div>
