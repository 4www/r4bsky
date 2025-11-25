<script lang="ts">
	import Avatar from './Avatar.svelte'
	import { Card, CardHeader, CardTitle, CardDescription } from './ui/card'
	import { Button } from './ui/button'
	import { cn, menuItemClass, menuTriggerClass } from '$lib/utils'
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
		class: extraClass = '',
		clickable = true,
		children,
	} = $props()

	const t = (key, vars = {}) => translate($locale, key, vars)

	const sizeMap = {
		sm: { avatar: 'md', title: 'text-xl', description: 'text-sm' },
		md: { avatar: 'lg', title: 'text-2xl', description: 'text-base' },
		lg: { avatar: 'xl', title: 'text-3xl', description: 'text-base' },
	}

	const sizes = sizeMap[size] || sizeMap.lg

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

<Card
	class={cn(
		'border border-border bg-card animate-in transition-colors shadow-sm hover:bg-muted/20 relative',
		extraClass,
	)}
>
	{#if hasBanner}
		<div
			class="absolute inset-0 bg-cover bg-center"
			style={`background-image: url(${profile.banner})`}
		></div>

	{/if}
	<CardHeader class={cn('p-2.5 relative')}>
		<div class="flex items-center justify-between gap-3">
			{#if clickable}
				                <Link
									href={`/@${handle}`}
									class="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0 flex-1"
								>
									<Avatar src={profile?.avatar} alt={profile?.displayName || handle} size={sizes.avatar} />
									<div class="min-w-0 flex-1">
										<CardTitle class={cn('flex items-center gap-2', sizes.title)}>
											<span
												class={cn(
													'inline-block px-1 py-0.5 rounded transition-colors bg-background',
													isActiveProfile ? 'bg-primary text-background' : '',
												)}
											>
												{profile?.displayName || handle}
											</span>
										</CardTitle>
										<CardDescription class={cn(sizes.description, 'mt-0')}>
											<span class="inline-block px-1 py-0.5 rounded bg-background">
												@{handle}
											</span>
										</CardDescription>
										{#if profile?.description && size === 'lg'}
											<p class="text-sm px-1 py-0.5 rounded bg-background text-muted-foreground mt-2 max-w-xl">
												{profile.description}
											</p>
										{/if}
									</div>
				</Link>
			{:else}
				<div class="flex items-center gap-3 min-w-0 flex-1">
					<Avatar src={profile?.avatar} alt={profile?.displayName || handle} size={sizes.avatar} />
					<div class="min-w-0 flex-1">
						<CardTitle class={cn('flex items-center gap-2', sizes.title)}>
							<span
								class={cn(
									'inline-block px-1 py-0.5 rounded transition-colors bg-background',
									isActiveProfile ? 'bg-primary text-background' : '',
								)}
							>
								{profile?.displayName || handle}
							</span>
						</CardTitle>
						<CardDescription class={cn(sizes.description, 'mt-0')}>
							<span class="inline-block px-1 py-0.5 rounded bg-background">
								@{handle}
							</span>
						</CardDescription>
						{#if profile?.description && size === 'lg'}
							<p class="text-sm px-1 py-0.5 rounded bg-background text-muted-foreground mt-2 max-w-xl">
								{profile.description}
							</p>
						{/if}
					</div>
				</div>
			{/if}

			<div class="flex gap-2 items-center shrink-0">
				{#if children}
					{@render children()}
				{/if}

				<div class="flex flex-col gap-1 ml-auto">
					<button
						bind:this={triggerRef}
						type="button"
						class={cn(menuTriggerClass(menuOpen), 'h-9 w-9')}
						onclick={toggleMenu}
						aria-haspopup="menu"
						aria-expanded={menuOpen}
						title={t('profile.actions')}
						aria-label={t('profile.actions')}
					>
						<MoreVertical class="h-4 w-4 text-current" />
					</button>
					<button
						type="button"
						class={cn(menuTriggerClass(false), 'h-9 w-9', loadingTracks && 'opacity-50 pointer-events-none')}
						onclick={playAll}
						disabled={loadingTracks || isActiveProfile}
						title={t('trackItem.play')}
						aria-label={t('trackItem.play')}
					>
						{#if loadingTracks}
							<Loader2 class="h-4 w-4 animate-spin text-current" />
						{:else}
							<PlayCircle class="h-4 w-4 text-current" />
						{/if}
					</button>
					{#if menuOpen}
						<div
							bind:this={menuRef}
							class="absolute right-0 z-40 mt-1.5 w-48 rounded-md border border-foreground bg-background text-foreground shadow-lg"
							role="menu"
						>
							<button
								type="button"
								class={cn(menuItemClass, loadingTracks && 'opacity-50 pointer-events-none')}
								onclick={() => {
									playAll();
									closeMenu();
								}}
								disabled={loadingTracks || isActiveProfile}
							>
								{#if loadingTracks}
									<Loader2 class="h-4 w-4 animate-spin" />
								{:else if isActiveProfile}
									<PlayCircle class="h-4 w-4" />
								{:else}
									<PlayCircle class="h-4 w-4" />
								{/if}
								{t('trackItem.play')}
							</button>
							{#if $session?.did}
								<button
									type="button"
									class={cn(menuItemClass, favoriteLoading && 'opacity-50 pointer-events-none')}
									onclick={toggleFavorite}
									disabled={favoriteLoading}
								>
									{#if favoriteLoading}
										<Loader2 class="h-4 w-4 animate-spin" />
									{:else if followUri}
										<Star class="h-4 w-4 fill-current" />
									{:else}
										<Star class="h-4 w-4" />
									{/if}
									{followUri ? 'Unfavorite' : 'Favorite'}
								</button>
							{/if}
							<a href={`/@${normalizedHandle}`} class={menuItemClass} onclick={closeMenu}>
								<Eye class="h-4 w-4" />
								{t('profile.viewProfile')}
							</a>
							<a
								href={`https://bsky.app/profile/${normalizedHandle}`}
								target="_blank"
								rel="noopener noreferrer"
								class={menuItemClass}
								onclick={closeMenu}
							>
								<ExternalLink class="h-4 w-4" />
								{t('profile.openInBluesky')}
							</a>
							<button type="button" class={menuItemClass} onclick={copyProfileUrl}>
								<Copy class="h-4 w-4" />
								{t('profile.copyLink')}
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</CardHeader>
</Card>
