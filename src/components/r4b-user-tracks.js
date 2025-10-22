import {listTracksByDid, getMyDid} from '../libs/r4-service.js'
import {parseTrackUrl} from '../libs/url-patterns.js'

const template = document.createElement('template')
template.innerHTML = `
  <section>
    <h3>My Tracks</h3>
    <ul id="list"></ul>
    <button id="more" hidden>Load more</button>
  </section>
`

export default class R4BUserTracks extends HTMLElement {
  connectedCallback() {
    this.replaceChildren(template.content.cloneNode(true))
    this.$list = this.querySelector('#list')
    this.$more = this.querySelector('#more')
    this.$more.addEventListener('click', () => this.loadMore())
    this.items = []
    this.cursor = undefined
    this.load()
  }

  async load() {
    try {
      const did = await getMyDid()
      const {tracks, cursor} = await listTracksByDid(did)
      this.cursor = cursor
      this.items = tracks
      this.render()
    } catch (e) {
      this.renderError(e)
    }
  }

  async loadMore() {
    if (!this.cursor) return
    const did = await getMyDid()
    const {tracks, cursor} = await listTracksByDid(did, {cursor: this.cursor})
    this.cursor = cursor
    this.items = [...this.items, ...tracks]
    this.render()
  }

  render() {
    this.$list.innerHTML = ''
    for (const t of this.items) {
      const meta = parseTrackUrl(t.url)
      if (!meta) continue
      const li = document.createElement('li')
      const a = document.createElement('a')
      a.href = meta.url
      a.textContent = t.title || meta.url
      a.target = '_blank'
      li.append(a)
      this.$list.append(li)
    }
    this.$more.hidden = !this.cursor
  }

  renderError(e) {
    const li = document.createElement('li')
    li.textContent = `Failed to load tracks: ${e?.message || e}`
    this.$list.replaceChildren(li)
    this.$more.hidden = true
  }
}

