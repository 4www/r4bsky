<script lang="ts">
	import { removeToast, type Toast } from '$lib/stores/toast.svelte'
	import { CircleCheck, CircleAlert, Info, X } from 'lucide-svelte'
	import { fly } from 'svelte/transition'

	interface Props {
		toast: Toast
	}

	let { toast }: Props = $props()

	const icons = {
		success: CircleCheck,
		error: CircleAlert,
		warning: CircleAlert,
		info: Info
	}

	const Icon = icons[toast.type]

	function handleDismiss() {
		removeToast(toast.id)
	}
</script>

<div
	role="alert"
	aria-live="polite"
	class="toast"
	data-type={toast.type}
	transition:fly={{ y: -20, duration: 300 }}
>
	<Icon size={20} />
	<p>{toast.message}</p>
	<button type="button" onclick={handleDismiss} aria-label="Dismiss notification">
		<X size={16} />
	</button>
</div>

<style>
	.toast {
		display: flex;
		align-items: flex-start;
		gap: var(--size-3);
		max-width: 24rem;
		padding: var(--size-3);
		border: var(--r4-border-size) solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-4);
		background: var(--background);
		font-weight: var(--font-weight-5);
	}

	.toast p {
		flex: 1;
	}

	.toast button {
		flex-shrink: 0;
		opacity: 0.7;
		transition: opacity 0.15s var(--ease-2);
		cursor: pointer;
	}

	.toast button:hover {
		opacity: 1;
	}
</style>
