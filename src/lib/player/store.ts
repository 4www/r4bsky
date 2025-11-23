// Player store for Svelte 5 app
// Now integrated with centralized tracks database

interface Track {
  url: string
  title: string
  [key: string]: any
}

interface PlayerContext {
  type: 'profile' | 'discogs' | 'author'
  key: string    // DID or resource ID
  handle?: string
}

interface PlayerState {
  // Reference to the source of tracks (DID for profile, or custom for discogs/etc)
  context: PlayerContext | null
  // For profile/author context, tracks come from centralized store
  // For discogs/custom context, tracks are stored here directly
  customPlaylist: Track[] | null
  index: number
  playing: boolean
  originalPlaylist?: Track[]
  isShuffled: boolean
}

type Subscriber = (value: PlayerState) => void

interface Store {
  subscribe(fn: Subscriber): () => void
  set(v: PlayerState): void
  update(fn: (value: PlayerState) => PlayerState): void
  get(): PlayerState
}

function createStore(initial: PlayerState): Store {
  let value = initial
  const subs = new Set<Subscriber>()
  return {
    subscribe(fn: Subscriber) {
      subs.add(fn)
      fn(value)
      return () => subs.delete(fn)
    },
    set(v: PlayerState) {
      value = v
      subs.forEach((fn) => fn(value))
    },
    update(fn: (value: PlayerState) => PlayerState) {
      value = fn(value)
      subs.forEach((s) => s(value))
    },
    get() {
      return value
    }
  }
}

export const player = createStore({
  context: null,
  customPlaylist: null,
  index: -1,
  playing: false,
  isShuffled: false
})

/**
 * Set playlist from tracks array
 * Always stores the provided items initially, then Player component can sync with centralized store
 */
export function setPlaylist(items: Track[], startIndex: number = 0, context: PlayerContext | null = null): void {
  player.set({
    context,
    customPlaylist: items || [],
    index: startIndex ?? 0,
    playing: true,
    isShuffled: false
  })
}

export function play(tracks: Track[], startIndex: number = 0, context: PlayerContext | null = null): void {
  if (!tracks?.length) return
  const index = Math.max(0, Math.min(startIndex ?? 0, tracks.length - 1))
  setPlaylist(tracks, index, context)
}

/**
 * Play a specific index in the current playlist
 * Note: playlist length is determined in the Player component based on context
 */
export function playIndex(idx: number): void {
  const s = player.get()
  player.set({ ...s, index: idx, playing: true })
}

export function toggle(): void {
  const s = player.get()
  if (s.index < 0) return
  player.set({ ...s, playing: !s.playing })
}

/**
 * Go to next track
 * The Player component will handle bounds checking
 */
export function next(): void {
  const s = player.get()
  player.set({ ...s, index: s.index + 1, playing: true })
}

/**
 * Go to previous track
 * The Player component will handle bounds checking
 */
export function prev(): void {
  const s = player.get()
  const newIndex = Math.max(0, s.index - 1)
  player.set({ ...s, index: newIndex, playing: true })
}

/**
 * Toggle shuffle mode
 * Shuffle is now handled in the Player component with live playlist
 */
export function toggleShuffle(): void {
  const s = player.get()
  player.set({ ...s, isShuffled: !s.isShuffled })
}
