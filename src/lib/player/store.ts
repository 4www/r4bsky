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

export const player = createStore({ playlist: [], index: -1, playing: false, context: null })

export function setPlaylist(items: Track[], startIndex: number = 0, context: any = null): void {
  player.set({ playlist: items || [], index: startIndex ?? 0, playing: true, context })
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

export function shuffle(): void {
  const s = player.get()
  if (!s.playlist?.length) return

  // Fisher-Yates shuffle algorithm
  const shuffled = [...s.playlist]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // Reset to first track after shuffle
  player.set({ ...s, playlist: shuffled, index: 0, playing: true })
}
