import {createTrack} from '../libs/r4-service.js'
import BskyForm from './bsky-form.js'

const fieldsTemplate = document.createElement('template')
fieldsTemplate.innerHTML = `
  <slot name="fields">
    <fieldset>
      <legend><label for="url">Track URL</label></legend>
      <input name="url" type="url" required placeholder="https://youtube.com/watch?v=..." />
    </fieldset>
    <fieldset>
      <legend><label for="title">Title</label></legend>
      <input name="title" type="text" required placeholder="Artist - Song" />
    </fieldset>
    <fieldset>
      <legend><label for="description">Description (optional)</label></legend>
      <textarea name="description" placeholder="Add context..."></textarea>
    </fieldset>
  </slot>
`

export default class R4BTrackCreate extends BskyForm {
  submitText = 'Save Track'
  constructor() {
    super()
    this.fieldsTemplate = fieldsTemplate
  }

  async handleSubmit(event) {
    event.preventDefault()
    event.stopPropagation()
    this.disableForm()

    let error = null
    let data = null

    try {
      const {url, title, description} = this.state
      const res = await createTrack({url, title, description})
      if (res.error) throw res.error
      data = res
      this.resetForm()
    } catch (err) {
      error = err
      this.handleError(err)
    }

    this.enableForm()
    super.handleSubmit({error, data})
  }
}

