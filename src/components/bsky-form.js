const template = document.createElement('template')
template.innerHTML = `
	<form>
		<slot name="fields"></slot>
		<slot name="submit">
			<fieldset>
				<button type="submit" name="submit">Submit</button>
			</fieldset>
		</slot>
	</form>
`

export default class BskyForm extends HTMLElement {
	static get observedAttributes() {
		return []
	}

	state = {}

	errors = {
		default: {
			message: 'Unhandled error',
			field: null,
		},
	}

	fieldsTemplate = null

	get submitText() {
		return this.getAttribute('submit-text') || 'Submit'
	}

	get fieldNames() {
		return Array.from(this.$fieldsets).reduce((acc, $fieldset) => {
			let fieldName = $fieldset.querySelector('[name]')?.getAttribute('name')
			if (fieldName) {
				return [...acc, fieldName]
			}
			return acc
		}, [])
	}

	attributeChangedCallback(attrName) {
		if (this.constructor.observedAttributes.indexOf(attrName) > -1) {
			this.init()
		}
	}

	connectedCallback() {
		this.init()
	}

	init() {
		this.replaceChildren(template.content.cloneNode(true))
		this.$form = this.querySelector('form')
		this.$form.addEventListener('submit', this.handleSubmit.bind(this))

		this.$fields = this.querySelector('slot[name="fields"]')
		if (this.fieldsTemplate) {
			const $newFieldsets = this.fieldsTemplate.content.cloneNode(true).querySelectorAll('slot[name="fields"] fieldset')
			if ($newFieldsets) {
				$newFieldsets.forEach(($newFieldset) => {
					this.$fields.append($newFieldset)
				})
			}
		}

		this.$fieldsets = this.querySelectorAll('fieldset')
		this.initialState = this.getInitialState()
		this.bindFieldsInput(this.$fieldsets)
	}

	getInitialState() {
		let state = {}
		const fieldNamesNoPrefill = ['submit', 'password']
		const fieldNamesPrefill = this.fieldNames.filter((name) => {
			return fieldNamesNoPrefill.indexOf(name) === -1
		})

		if (!fieldNamesPrefill) return state

		fieldNamesPrefill.forEach((fieldName) => {
			const fieldAttributeValue = this.getAttribute(fieldName)
			if (fieldAttributeValue) {
				state[fieldName] = fieldAttributeValue
			}
		})

		return state
	}

	bindFieldsInput($fieldsets) {
		if (!$fieldsets) return

		const fieldTypes = {
			input: 'input',
			textarea: 'input',
			button: null,
		}

		$fieldsets.forEach(($fieldset) => {
			Object.keys(fieldTypes).every((fieldType) => {
				const $field = $fieldset.querySelector(fieldType)
				const fieldEventType = fieldTypes[fieldType]

				if (!$field) return true

				const fieldName = $field.getAttribute('name')
				const $errorOutput = this.createFieldsetOutput($field)
				$fieldset.append($errorOutput)

				if (fieldEventType) {
					$field.addEventListener(fieldEventType, this.handleInput.bind(this))

					const initialFieldState = this.initialState[$field.name]
					if (initialFieldState) {
						$field.value = initialFieldState
						$field.dispatchEvent(new Event('input'))
					}
				}

				if (fieldName !== 'submit' && !$field.getAttribute('id')) {
					$field.setAttribute('id', fieldName)
				}

				if (fieldName === 'submit') {
					$field.setAttribute('role', 'primary')
					$field.innerText = this.submitText
				}

				return false
			})
		})
	}

	handleInput({target}) {
		const {name, value} = target
		this.state = {
			...this.state,
			[name]: value,
		}
	}

	createFieldsetOutput($el) {
		const $output = document.createElement('output')
		$output.setAttribute('for', $el.name)
		$output.value = ''
		return $output
	}

	async handleSubmit(submitData) {
		const {error, data} = submitData
		const submitEvent = new CustomEvent('submit', {
			bubbles: true,
			detail: {
				error,
				data,
			},
		})
		this.dispatchEvent(submitEvent)
	}

	handleError(error) {
		this.$form.querySelectorAll('output').forEach(($out) => {
			$out.innerHTML = ''
		})

		const {code = 'default'} = error
		const knownError = this.errors[error.code] || this.errors.default
		if (!error.code) {
			console.error(error)
		}
		const {message, field} = knownError

		let $out
		if (field) {
			$out = this.$form.querySelector(`output[for="${field}"]`)
		}
		if (!field || !$out) {
			$out = this.$form.querySelector(`output[for="submit"]`)
		}
		if ($out) {
			this.renderErrorOutput($out, {message, code})
		}
	}

	renderErrorOutput($out, {message, code}) {
		$out.style = 'color: var(--color-error, red);'

		const $message = document.createElement('span')
		$message.innerText = message

		$out.append($message)
	}

	disableForm() {
		this.$fieldsets.forEach(($fieldset) => {
			$fieldset.setAttribute('disabled', true)
		})
		this.setAttribute('loading', true)
	}

	enableForm() {
		this.$fieldsets.forEach(($fieldset) => {
			$fieldset.removeAttribute('disabled')
		})
		this.removeAttribute('loading')
	}

	resetForm() {
		if (this.$form) {
			this.$form.reset()
			this.state = {}
		}
	}
}
