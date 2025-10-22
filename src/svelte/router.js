// Minimal store implementation compatible with Svelte subscriptions
function writable(initial) {
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
  }
}

function getPath() {
  const hash = location.hash.replace(/^#/, '')
  return hash || '/'
}

export const route = writable(getPath())

export function navigate(path) {
  if (!path.startsWith('/')) path = '/' + path
  location.hash = path
  route.set(path)
}

export function initRouter() {
  window.addEventListener('hashchange', () => route.set(getPath()))
}
