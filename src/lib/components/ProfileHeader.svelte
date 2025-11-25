<script lang="ts">
	import Avatar from './Avatar.svelte'
	import Link from '$lib/components/Link.svelte'
	import { PlayCircle, Loader2, MoreVertical, ExternalLink, Copy, Eye, Star } from 'lucide-svelte'
	import {
		resolveHandle,
		listTracksByDid,
		followActor,
		unfollowActor,
		findFollowUri,
		createR4Favorite,
		deleteR4Favorite,
	} from '$lib/services/r4-service'
	import { setPlaylist, player } from '$lib/player/store'
	import { onMount, onDestroy } from 'svelte'
	import { locale, translate } from '$lib/i18n'
	import { session } from '$lib/state/session'

	const {
		profile,
		handle,
		size = 'lg',
		clickable = true,
		children,
	} = $props()

	const t = (key, vars = {}) => translate($locale, key, vars)

	const sizeMap = {
		sm: 'md',
		md: 'lg',
		lg: 'xl',
	}

	const avatarSize = sizeMap[size] || sizeMap.lg

	let loadingTracks = $state(false)
	let playerState = $state(player.get())
	const unsubscribe = player.subscribe((value) => {
		playerState = value
	})
	onDestroy(() => unsubscribe?.())

	let menuOpen = $state(false)
	let menuRef = $state<HTMLElement | null>(null)
	let triggerRef = $state<HTMLElement | null>(null)

	const normalizedHandle = $derived(handle?.replace(/^@/, '') ?? '')
	const currentHandle = $derived.by(() => {
		const contextHandle = playerState?.context?.handle
		const trackHandle =
			playerState?.playlist?.[playerState.index]?.authorHandle ??
			playerState?.playlist?.[playerState.index]?.author_handle
		const raw = contextHandle || trackHandle || ''
		return raw?.replace?.(/^@/, '') ?? ''
	})
	const isActiveProfile = $derived.by(() =>
		normalizedHandle && currentHandle
			? normalizedHandle.toLowerCase() === currentHandle.toLowerCase()
			: false,
	)

	const hasBanner = $derived(!!profile?.banner)

	async function playAll(event?: Event) {
		event?.preventDefault()
		event?.stopPropagation()

		if (loadingTracks) return
		loadingTracks = true

		try {
			const did = await resolveHandle(handle)
			const { tracks } = await listTracksByDid(did)

			if (tracks.length > 0) {
				setPlaylist(tracks, 0, { type: 'profile', key: did, handle: normalizedHandle })
			}
		} catch (err) {
			console.error('Failed to load tracks:', err)
		} finally {
			loadingTracks = false
		}
	}

	function toggleMenu() {
		menuOpen = !menuOpen
	}

	function closeMenu() {
		menuOpen = false
	}

	function copyProfileUrl() {
		const url = window.location.origin + `/@${normalizedHandle}`
		navigator.clipboard.writeText(url)
		closeMenu()
	}

	// Favorite functionality
	let followUri = $state<string | null>(null)
	let favoriteLoading = $state(false)
	let profileDid = $state<string | null>(null)

	async function refreshFavoriteState() {
		if (!handle || !$session?.did) {
			followUri = null
			return
		}
		try {
			const did = await resolveHandle(handle)
			profileDid = did
			followUri = await findFollowUri(did)
		} catch (err) {
			console.error('Failed to load favorite state:', err)
		}
	}

	async function toggleFavorite() {
		if (!$session?.did || !profileDid) return
		favoriteLoading = true
		try {
			if (followUri) {
				await unfollowActor(followUri)
				await deleteR4Favorite(profileDid)
				followUri = null
			} else {
				const res = await followActor(profileDid)
				followUri = res?.uri || null
				await createR4Favorite(profileDid)
			}
			await refreshFavoriteState()
		} catch (err) {
			console.error('Failed to toggle favorite:', err)
		} finally {
			favoriteLoading = false
		}
		closeMenu()
	}

	$effect(() => {
		refreshFavoriteState()
	})

	onMount(() => {
		function handleClick(event: MouseEvent) {
			if (!menuOpen) return
			const target = event.target as Node
			if (menuRef && menuRef.contains(target)) return
			if (triggerRef && triggerRef.contains(target)) return
			menuOpen = false
		}
		function handleKey(event: KeyboardEvent) {
			if (event.key === 'Escape') menuOpen = false
		}
		window.addEventListener('click', handleClick)
		window.addEventListener('keydown', handleKey)
		return () => {
			window.removeEventListener('click', handleClick)
			window.removeEventListener('keydown', handleKey)
		}
	})
</script>

<article class="profile-header" class:has-banner={hasBanner}>
	{#if hasBanner}
		<div class="banner" style:background-image="url({profile.banner})"></div>
	{/if}

	<div class="profile-content">
		{#if clickable}
			<Link href={`/@${handle}`} class="profile-link">
				<Avatar src={profile?.avatar} alt={profile?.displayName || handle} size={avatarSize} />
				<div class="profile-info">
					<h2 class:active={isActiveProfile}>{profile?.displayName || handle}</h2>
					<p class="handle">@{handle}</p>
					{#if profile?.description && size === 'lg'}
						<p class="description">{profile.description}</p>
					{/if}
				</div>
			</Link>
		{:else}
			<div class="profile-link">
				<Avatar src={profile?.avatar} alt={profile?.displayName || handle} size={avatarSize} />
				<div class="profile-info">
					<h2 class:active={isActiveProfile}>{profile?.displayName || handle}</h2>
					<p class="handle">@{handle}</p>
					{#if profile?.description && size === 'lg'}
						<p class="description">{profile.description}</p>
					{/if}
				</div>
			</div>
		{/if}

		<div class="actions">
			{#if children}
				{@render children()}
			{/if}

			<div class="action-buttons">
				<button
					bind:this={triggerRef}
					type="button"
					class="menu-trigger"
					class:active={menuOpen}
					onclick={toggleMenu}
					aria-haspopup="menu"
					aria-expanded={menuOpen}
					title={t('profile.actions')}
					aria-label={t('profile.actions')}
				>
					<MoreVertical size={16} />
				</button>

				<button
					type="button"
					class="menu-trigger"
					onclick={playAll}
					disabled={loadingTracks || isActiveProfile}
					title={t('trackItem.play')}
					aria-label={t('trackItem.play')}
				>
					{#if loadingTracks}
						<Loader2 size={16} class="spin" />
					{:else}
						<PlayCircle size={16} />
					{/if}
				</button>

				{#if menuOpen}
					<div bind:this={menuRef} class="dropdown-content menu" role="menu">
						<button
							type="button"
							class="menu-item"
							onclick={() => { playAll(); closeMenu(); }}
							disabled={loadingTracks || isActiveProfile}
						>
							{#if loadingTracks}
								<Loader2 size={16} class="spin" />
							{:else}
								<PlayCircle size={16} />
							{/if}
							{t('trackItem.play')}
						</button>

						{#if $session?.did}
							<button
								type="button"
								class="menu-item"
								onclick={toggleFavorite}
								disabled={favoriteLoading}
							>
								{#if favoriteLoading}
									<Loader2 size={16} class="spin" />
								{:else if followUri}
									<Star size={16} fill="currentColor" />
								{:else}
									<Star size={16} />
								{/if}
								{followUri ? 'Unfavorite' : 'Favorite'}
							</button>
						{/if}

						<a href={`/@${normalizedHandle}`} class="menu-item" onclick={closeMenu}>
							<Eye size={16} />
							{t('profile.viewProfile')}
						</a>

						<a
							href={`https://bsky.app/profile/${normalizedHandle}`}
							target="_blank"
							rel="noopener noreferrer"
							class="menu-item"
							onclick={closeMenu}
						>
							<ExternalLink size={16} />
							{t('profile.openInBluesky')}
						</a>

						<button type="button" class="menu-item" onclick={copyProfileUrl}>
							<Copy size={16} />
							{t('profile.copyLink')}
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</article>

<style>
	.profile-header {
		position: relative;
		overflow: hidden;
	}

	.profile-header.has-banner {
		min-height: 80px;
	}

	.banner {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
		opacity: 0.3;
	}

	.profile-content {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--size-3);
		padding: var(--size-3);
	}

	.profile-link {
		display: flex;
		align-items: center;
		gap: var(--size-3);
		min-width: 0;
		flex: 1;
		text-decoration: none;
		color: inherit;
	}

	a.profile-link:hover {
		opacity: 0.8;
	}

	.profile-info {
		min-width: 0;
		flex: 1;
	}

	.profile-info h2 {
		display: inline-block;
		padding: var(--size-1);
		background: var(--background);
		border-radius: var(--radius-1);
	}

	.profile-info h2.active {
		background: var(--foreground);
		color: var(--background);
	}

	.handle {
		display: inline-block;
		padding: var(--size-1);
		margin-top: var(--size-1);
		background: var(--background);
		border-radius: var(--radius-1);
		color: var(--muted-foreground);
	}

	.description {
		margin-top: var(--size-2);
		padding: var(--size-1);
		background: var(--background);
		border-radius: var(--radius-1);
		color: var(--muted-foreground);
		max-width: 40ch;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: var(--size-2);
		flex-shrink: 0;
	}

	.action-buttons {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--size-1);
	}

	.menu {
		position: absolute;
		right: 0;
		top: 100%;
		margin-top: var(--size-1);
		width: 12rem;
	}

	.spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
