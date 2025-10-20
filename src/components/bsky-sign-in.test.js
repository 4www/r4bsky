import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the bsky service
vi.mock('../libs/bsky.js', () => ({
	bsky: {
		login: vi.fn(),
		logout: vi.fn(),
		resumeSession: vi.fn(),
		post: vi.fn(),
		getStoredSession: vi.fn(),
		isAuthenticated: vi.fn()
	}
}))

// Import after mocking
const { default: BskySignIn } = await import('./bsky-sign-in.js')
const { bsky } = await import('../libs/bsky.js')

describe('BskySignIn Component', () => {
	let component

	beforeEach(() => {
		// Define the custom element if not already defined
		if (!customElements.get('bsky-sign-in')) {
			customElements.define('bsky-sign-in', BskySignIn)
		}

		// Create and mount component
		component = document.createElement('bsky-sign-in')
		document.body.appendChild(component)

		// Reset mocks
		vi.clearAllMocks()
	})

	afterEach(() => {
		document.body.removeChild(component)
	})

	it('should render form with handle and password fields', () => {
		const handleInput = component.querySelector('input[name="handle"]')
		const passwordInput = component.querySelector('input[name="password"]')
		const submitButton = component.querySelector('button[type="submit"]')

		expect(handleInput).toBeTruthy()
		expect(passwordInput).toBeTruthy()
		expect(submitButton).toBeTruthy()
		expect(submitButton.textContent).toBe('Sign in')
	})

	it('should update state when inputs change', () => {
		const handleInput = component.querySelector('input[name="handle"]')
		const passwordInput = component.querySelector('input[name="password"]')

		handleInput.value = 'test.bsky.social'
		handleInput.dispatchEvent(new Event('input'))

		passwordInput.value = 'password123'
		passwordInput.dispatchEvent(new Event('input'))

		expect(component.state.handle).toBe('test.bsky.social')
		expect(component.state.password).toBe('password123')
	})

	it('should call bsky.login on form submit', async () => {
		bsky.login.mockResolvedValue({
			session: { handle: 'test.bsky.social' },
			error: null
		})

		const form = component.querySelector('form')
		const handleInput = component.querySelector('input[name="handle"]')
		const passwordInput = component.querySelector('input[name="password"]')

		handleInput.value = 'test.bsky.social'
		handleInput.dispatchEvent(new Event('input'))

		passwordInput.value = 'password123'
		passwordInput.dispatchEvent(new Event('input'))

		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

		// Wait for async operations
		await new Promise(resolve => setTimeout(resolve, 0))

		expect(bsky.login).toHaveBeenCalledWith({
			identifier: 'test.bsky.social',
			password: 'password123'
		})
	})

	it('should emit submit event on successful login', async () => {
		const mockSession = { handle: 'test.bsky.social' }
		bsky.login.mockResolvedValue({
			session: mockSession,
			error: null
		})

		let submitEventData = null
		component.addEventListener('submit', (e) => {
			submitEventData = e.detail
		})

		const form = component.querySelector('form')
		const handleInput = component.querySelector('input[name="handle"]')
		const passwordInput = component.querySelector('input[name="password"]')

		handleInput.value = 'test.bsky.social'
		handleInput.dispatchEvent(new Event('input'))

		passwordInput.value = 'password123'
		passwordInput.dispatchEvent(new Event('input'))

		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

		await new Promise(resolve => setTimeout(resolve, 0))

		expect(submitEventData).toBeTruthy()
		expect(submitEventData.data).toEqual(mockSession)
		expect(submitEventData.error).toBeNull()
	})

	it('should display error on failed login', async () => {
		bsky.login.mockResolvedValue({
			session: null,
			error: { code: 'invalid-credentials', message: 'Invalid credentials' }
		})

		const form = component.querySelector('form')
		const handleInput = component.querySelector('input[name="handle"]')
		const passwordInput = component.querySelector('input[name="password"]')

		handleInput.value = 'bad.bsky.social'
		handleInput.dispatchEvent(new Event('input'))

		passwordInput.value = 'wrongpassword'
		passwordInput.dispatchEvent(new Event('input'))

		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

		await new Promise(resolve => setTimeout(resolve, 0))

		const errorOutput = component.querySelector('output')
		expect(errorOutput).toBeTruthy()
	})

	it('should disable form during submission', async () => {
		bsky.login.mockImplementation(() => {
			return new Promise(resolve => {
				setTimeout(() => {
					resolve({
						session: { handle: 'test.bsky.social' },
						error: null
					})
				}, 100)
			})
		})

		const form = component.querySelector('form')
		const handleInput = component.querySelector('input[name="handle"]')
		const passwordInput = component.querySelector('input[name="password"]')

		handleInput.value = 'test.bsky.social'
		handleInput.dispatchEvent(new Event('input'))

		passwordInput.value = 'password123'
		passwordInput.dispatchEvent(new Event('input'))

		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

		// Check that form is disabled during submission
		expect(component.hasAttribute('loading')).toBe(true)

		// Wait for submission to complete
		await new Promise(resolve => setTimeout(resolve, 150))

		// Check that form is enabled after submission
		expect(component.hasAttribute('loading')).toBe(false)
	})

	it('should store session in localStorage on successful login', async () => {
		const mockSession = {
			handle: 'test.bsky.social',
			did: 'did:plc:test123'
		}

		bsky.login.mockResolvedValue({
			session: mockSession,
			error: null
		})

		const form = component.querySelector('form')
		const handleInput = component.querySelector('input[name="handle"]')
		const passwordInput = component.querySelector('input[name="password"]')

		handleInput.value = 'test.bsky.social'
		handleInput.dispatchEvent(new Event('input'))

		passwordInput.value = 'password123'
		passwordInput.dispatchEvent(new Event('input'))

		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

		await new Promise(resolve => setTimeout(resolve, 0))

		const storedSession = localStorage.getItem('bsky-session')
		expect(storedSession).toBeTruthy()
		expect(JSON.parse(storedSession)).toEqual(mockSession)
	})

	it('should reset form after successful login', async () => {
		bsky.login.mockResolvedValue({
			session: { handle: 'test.bsky.social' },
			error: null
		})

		const form = component.querySelector('form')
		const handleInput = component.querySelector('input[name="handle"]')
		const passwordInput = component.querySelector('input[name="password"]')

		handleInput.value = 'test.bsky.social'
		handleInput.dispatchEvent(new Event('input'))

		passwordInput.value = 'password123'
		passwordInput.dispatchEvent(new Event('input'))

		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

		await new Promise(resolve => setTimeout(resolve, 0))

		expect(handleInput.value).toBe('')
		expect(passwordInput.value).toBe('')
	})
})
