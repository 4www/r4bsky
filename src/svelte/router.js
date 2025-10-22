import { writable } from 'svelte/store'

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

