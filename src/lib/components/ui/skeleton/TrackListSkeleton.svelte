<script lang="ts">
	import Skeleton from './Skeleton.svelte'

	interface Props {
		count?: number
	}

	let { count = 5 }: Props = $props()

	const items = Array.from({ length: count }, (_, i) => i)
</script>

<div class="track-list-skeleton" aria-label="Loading tracks...">
	{#each items as item (item)}
		<div class="track-skeleton">
			<Skeleton style="height: 1.25rem; width: 75%;" />
			<Skeleton style="height: 1rem; width: 100%;" />
			<Skeleton style="height: 1rem; width: 66%;" />
			<div class="actions">
				<Skeleton style="height: 2rem; width: 5rem;" />
				<Skeleton style="height: 2rem; width: 5rem;" />
			</div>
		</div>
	{/each}
</div>

<style>
	.track-list-skeleton {
		display: flex;
		flex-direction: column;
		gap: var(--size-3);
	}

	.track-skeleton {
		display: flex;
		flex-direction: column;
		gap: var(--size-3);
		padding: var(--size-3);
		border: var(--r4-border-size) solid var(--border);
		border-radius: var(--radius);
	}

	.actions {
		display: flex;
		gap: var(--size-2);
		padding-block-start: var(--size-2);
	}
</style>
