// Minimal player store for Svelte 5 app (no external store dependency)
function createStore(initial) {
  let value = initial
  const subs = new Set()
  return {
    subscribe(fn) {
      subs.add(fn)
      fn(value)
      return () => subs.delete(fn)
    },
    set(v) {
      value = v
      subs.forEach((fn) => fn(value))
    },
    update(fn) {
      value = fn(value)
      subs.forEach((s) => s(value))
    },
    get() {
      return value
    }
  }
}

export const player = createStore({ playlist: [], index: -1, playing: false, context: null })

export function setPlaylist(items, startIndex = 0, context = null) {
  player.set({ playlist: items || [], index: startIndex ?? 0, playing: true, context })
}

export function playIndex(idx) {
  const s = player.get()
  if (!s.playlist?.length) return
  const i = Math.max(0, Math.min(idx, s.playlist.length - 1))
  player.set({ ...s, index: i, playing: true })
}

export function toggle() {
  const s = player.get()
  if (s.index < 0) return
  player.set({ ...s, playing: !s.playing })
}

export function next() {
  const s = player.get()
  if (!s.playlist?.length) return
  const i = (s.index + 1) % s.playlist.length
  player.set({ ...s, index: i, playing: true })
}

export function prev() {
  const s = player.get()
  if (!s.playlist?.length) return
  const i = (s.index - 1 + s.playlist.length) % s.playlist.length
  player.set({ ...s, index: i, playing: true })
}
