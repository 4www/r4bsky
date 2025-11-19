// Minimal player store for Svelte 5 app (no external store dependency)

interface Track {
  url: string
  title: string
  [key: string]: any
}

interface PlayerState {
  playlist: Track[]
  index: number
  playing: boolean
  context: any
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

export const player = createStore({ playlist: [], index: -1, playing: false, context: null, isShuffled: false })

export function setPlaylist(items: Track[], startIndex: number = 0, context: any = null): void {
  player.set({ playlist: items || [], index: startIndex ?? 0, playing: true, context, isShuffled: false })
}

export function play(tracks: Track[], startIndex: number = 0, context: any = null): void {
  if (!tracks?.length) return
  const index = Math.max(0, Math.min(startIndex ?? 0, tracks.length - 1))
  setPlaylist(tracks, index, context)
}

export function playIndex(idx: number): void {
  const s = player.get()
  if (!s.playlist?.length) return
  const i = Math.max(0, Math.min(idx, s.playlist.length - 1))
  player.set({ ...s, index: i, playing: true })
}

export function toggle(): void {
  const s = player.get()
  if (s.index < 0) return
  player.set({ ...s, playing: !s.playing })
}

export function next(): void {
  const s = player.get()
  if (!s.playlist?.length) return
  const i = (s.index + 1) % s.playlist.length
  player.set({ ...s, index: i, playing: true })
}

export function prev(): void {
  const s = player.get()
  if (!s.playlist?.length) return
  const i = (s.index - 1 + s.playlist.length) % s.playlist.length
  player.set({ ...s, index: i, playing: true })
}

export function toggleShuffle(): void {
  const s = player.get()
  if (!s.playlist?.length) return

  if (s.isShuffled) {
    const original = s.originalPlaylist ? [...s.originalPlaylist] : [...s.playlist]
    const current = s.playlist[s.index]
    const newIndex = original.findIndex((track) => track === current)
    player.set({
      ...s,
      playlist: original,
      originalPlaylist: undefined,
      isShuffled: false,
      index: newIndex >= 0 ? newIndex : Math.min(s.index, original.length - 1),
      playing: s.playing
    })
  } else {
    const original = [...s.playlist]
    const current = original[s.index]
    const remaining = original.filter((_, idx) => idx !== s.index)
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[remaining[i], remaining[j]] = [remaining[j], remaining[i]]
    }
    const before = remaining.slice(0, s.index)
    const after = remaining.slice(s.index)
    const shuffled = [...before, current, ...after]
    player.set({
      ...s,
      playlist: shuffled,
      originalPlaylist: original,
      isShuffled: true,
      index: s.index,
      playing: s.playing
    })
  }
}
