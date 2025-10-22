import {describe, it, expect} from 'vitest'
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

