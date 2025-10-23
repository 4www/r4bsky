import { writable } from 'svelte/store'
import { bskyOAuth } from '../../libs/bsky-oauth.js'

function createSessionStore() {
  const { subscribe, set, update } = writable({ did: null, handle: null })

  function refresh() {
    const did = bskyOAuth.session?.did || null
    const handle = bskyOAuth.session?.handle || null
    set({ did, handle })
  }

  // initialize from current session
  refresh()

  return { subscribe, refresh, set }
}

export const session = createSessionStore()

