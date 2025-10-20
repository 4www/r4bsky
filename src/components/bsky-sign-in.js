import {bsky} from '../libs/bsky.js'
import BskyForm from './bsky-form.js'

const fieldsTemplate = document.createElement('template')
fieldsTemplate.innerHTML = `
	<slot name="fields">
		<fieldset>
			<legend>
				<label for="handle">Handle or Email</label>
			</legend>
			<input name="handle" type="text" autocomplete="username" required placeholder="your-handle.bsky.social"/>
		</fieldset>
		<fieldset>
			<legend>
				<label for="password">Password or App Password</label>
			</legend>
			<input name="password" type="password" autocomplete="current-password" required placeholder="App password"/>
			<small>For security, use an <a href="https://bsky.app/settings/app-passwords" target="_blank">app password</a></small>
		</fieldset>
	</slot>
`

export default class BskySignIn extends BskyForm {
	submitText = 'Sign in'

	constructor() {
		super()
		this.fieldsTemplate = fieldsTemplate
	}

	errors = {
		default: {
			message: 'Login failed. Please check your credentials.',
		},
		'invalid-credentials': {
			field: 'handle',
			message: 'Invalid handle or password',
		},
	}

	async handleSubmit(event) {
		event.preventDefault()
		event.stopPropagation()
		this.disableForm()

		let res = {}
		let error = null

		try {
			res = await bsky.login({
				identifier: this.state.handle,
				password: this.state.password,
			})

			if (res.error) {
				throw res.error
			}

			// Store session in localStorage
			if (res.session) {
				localStorage.setItem('bsky-session', JSON.stringify(res.session))
			}

		} catch (err) {
			error = err
			this.handleError(err)
		}

		this.enableForm()

		const {session} = res
		if (session) {
			this.resetForm()
		}

		super.handleSubmit({
			error,
			data: session,
		})
	}
}
