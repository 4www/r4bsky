import {describe, it, expect, vi, beforeEach} from 'vitest'

vi.mock('../libs/r4-service.js', () => ({
  createTrack: vi.fn().mockResolvedValue({data: {uri: 'at://did/com.radio4000.track/123'}}),
}))

const {default: R4BTrackCreate} = await import('./r4b-track-create.js')

describe('R4BTrackCreate', () => {
  beforeEach(() => {
    if (!customElements.get('r4b-track-create')) {
      customElements.define('r4b-track-create', R4BTrackCreate)
    }
    document.body.innerHTML = ''
  })

  it('submits form and resets', async () => {
    const el = document.createElement('r4b-track-create')
    document.body.appendChild(el)
    const url = el.querySelector('input[name="url"]')
    const title = el.querySelector('input[name="title"]')
    url.value = 'https://youtu.be/abc'
    url.dispatchEvent(new Event('input'))
    title.value = 'Song'
    title.dispatchEvent(new Event('input'))
    el.querySelector('form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}))
    await new Promise((r) => setTimeout(r, 0))
    expect(url.value).toBe('')
    expect(title.value).toBe('')
  })
})

