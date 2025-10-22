import {describe, it, expect, vi, beforeEach} from 'vitest'

vi.mock('../libs/r4-service.js', () => ({
  getMyDid: vi.fn().mockResolvedValue('did:example:me'),
  listTracksByDid: vi.fn().mockResolvedValue({
    tracks: [
      {url: 'https://youtu.be/abc', title: 'A'},
      {url: 'https://soundcloud.com/x/y', title: 'B'},
    ],
    cursor: null,
  }),
}))

const {default: R4BUserTracks} = await import('./r4b-user-tracks.js')

describe('R4BUserTracks', () => {
  beforeEach(() => {
    if (!customElements.get('r4b-user-tracks')) {
      customElements.define('r4b-user-tracks', R4BUserTracks)
    }
    document.body.innerHTML = ''
  })

  it('renders user tracks', async () => {
    const el = document.createElement('r4b-user-tracks')
    document.body.appendChild(el)
    await new Promise((r) => setTimeout(r, 0))
    const items = el.querySelectorAll('li a')
    expect(items.length).toBe(2)
    expect(items[0].textContent).toContain('A')
  })
})

