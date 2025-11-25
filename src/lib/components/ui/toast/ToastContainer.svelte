<script lang="ts">
	import { getToasts } from '$lib/stores/toast.svelte'
	import Toast from './Toast.svelte'

	const toasts = $derived(getToasts())
</script>

<div class="toast-container" aria-live="polite" aria-atomic="false">
	{#each toasts as toast (toast.id)}
		<Toast {toast} />
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		top: var(--size-4);
		right: var(--size-4);
		z-index: 50;
		display: flex;
		flex-direction: column;
		gap: var(--size-2);
	}
</style>
