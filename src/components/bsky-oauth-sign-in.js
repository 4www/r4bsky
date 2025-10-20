import {bskyOAuth} from '../libs/bsky-oauth.js'
import BskyForm from './bsky-form.js'

const fieldsTemplate = document.createElement('template')
fieldsTemplate.innerHTML = `
	<slot name="fields">
		<fieldset>
			<legend>
				<label for="handle">Bluesky Handle</label>
			</legend>
			<input name="handle" type="text" autocomplete="username" required placeholder="your-handle.bsky.social"/>
			<small>Enter your Bluesky handle. You'll be redirected to authorize this app.</small>
		</fieldset>
	</slot>
`

export default class BskyOAuthSignIn extends BskyForm {
	submitText = 'Sign in with Bluesky'

	constructor() {
		super()
		this.fieldsTemplate = fieldsTemplate
	}

	errors = {
		default: {
			message: 'OAuth sign-in failed. Please try again.',
		},
		'oauth-not-initialized': {
			field: 'handle',
			message: 'OAuth client not initialized. Please refresh the page.',
		},
		'oauth-signin-failed': {
			field: 'handle',
			message: 'Failed to start OAuth flow. Please check your handle and try again.',
		},
	}

	async handleSubmit(event) {
		event.preventDefault()
		event.stopPropagation()
		this.disableForm()

		let error = null
		let success = false

		try {
			// Check if OAuth is initialized
			if (!bskyOAuth.initialized) {
				throw {
					code: 'oauth-not-initialized',
					message: 'OAuth client not initialized'
				}
			}

			// Start OAuth flow - this will redirect the user
			const result = await bskyOAuth.signIn(this.state.handle)

			if (result.error) {
				throw result.error
			}

			success = result.success

			// If we get here without redirect, something went wrong
			if (!success) {
				throw {
					code: 'oauth-signin-failed',
					message: 'OAuth flow did not start'
				}
			}

		} catch (err) {
			error = err
			this.handleError(err)
			this.enableForm()
		}

		// Note: If OAuth succeeds, the user will be redirected
		// and this code won't execute. Only executes on error.
		super.handleSubmit({
			error,
			data: null,
		})
	}
}
