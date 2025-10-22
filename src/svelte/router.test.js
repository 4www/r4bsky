import {describe, it, expect, vi} from 'vitest'

// Mock svelte/store for tests
vi.mock('svelte/store', () => ({
  writable: (initial) => {
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
  },
}))

import {route, navigate} from './router.js'

describe('router', () => {
  it('navigates and updates route store', async () => {
    let current
    const unsub = route.subscribe((v) => (current = v))
    navigate('/my')
    expect(current).toBe('/my')
    unsub()
  })
})
