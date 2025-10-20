import {bskyOAuth} from '../libs/bsky-oauth.js'
import BskyForm from './bsky-form.js'

const fieldsTemplate = document.createElement('template')
fieldsTemplate.innerHTML = `
	<slot name="fields">
		<fieldset>
			<legend>
				<label for="url">Track URL</label>
			</legend>
			<input name="url" type="url" required placeholder="https://youtube.com/watch?v=..." title="Link to the media (youtube, soundcloud, vimeo, etc.)"/>
			<small>YouTube, SoundCloud, Vimeo, etc.</small>
		</fieldset>
		<fieldset>
			<legend>
				<label for="title">Track Title</label>
			</legend>
			<input name="title" type="text" required placeholder="Artist - Song Name"/>
		</fieldset>
		<fieldset>
			<legend>
				<label for="description">Description (optional)</label>
			</legend>
			<textarea name="description" placeholder="Add some context about this track..."></textarea>
		</fieldset>
	</slot>
`

export default class BskyTrackPost extends BskyForm {
	submitText = 'Post to Bluesky'

	constructor() {
		super()
		this.fieldsTemplate = fieldsTemplate
	}

	errors = {
		default: {
			message: 'Failed to post track. Please try again.',
		},
	}

	async handleSubmit(event) {
		event.preventDefault()
		event.stopPropagation()
		this.disableForm()

		let res = {}
		let error = null
		const {url, title, description} = this.state

		// Build the post text
		let postText = `${title}\n\n`
		if (description) {
			postText += `${description}\n\n`
		}
		postText += url

		try {
			res = await bskyOAuth.post(postText)

			if (res.error) {
				throw res.error
			}
		} catch (err) {
			error = err
			this.handleError(err)
		}

		this.enableForm()

		const {data} = res
		if (data) {
			this.resetForm()
		}

		super.handleSubmit({
			error,
			data,
		})
	}
}
