import {describe, it, expect, beforeEach, vi} from 'vitest'
import BskyOAuthSignIn from './bsky-oauth-sign-in.js'
import {bskyOAuth} from '../libs/bsky-oauth.js'

// Mock the OAuth service
vi.mock('../libs/bsky-oauth.js', () => ({
	bskyOAuth: {
		initialized: true,
		signIn: vi.fn(),
		init: vi.fn(),
	},
}))

describe('BskyOAuthSignIn', () => {
	let element

	beforeEach(() => {
		// Clear mocks
		vi.clearAllMocks()

		// Create fresh element
		if (!customElements.get('bsky-oauth-sign-in-test')) {
			customElements.define('bsky-oauth-sign-in-test', BskyOAuthSignIn)
		}
		element = document.createElement('bsky-oauth-sign-in-test')
		document.body.appendChild(element)
	})

	it('should render a form with handle input', () => {
		const input = element.querySelector('input[name="handle"]')
		expect(input).toBeTruthy()
		expect(input.type).toBe('text')
		expect(input.required).toBe(true)
	})

	it('should have correct submit button text', () => {
		const button = element.querySelector('button[type="submit"]')
		expect(button.textContent).toBe('Sign in with Bluesky')
	})

	it('should call OAuth signIn when form is submitted', async () => {
		bskyOAuth.signIn.mockResolvedValue({success: true, error: null})

		const input = element.querySelector('input[name="handle"]')
		const form = element.querySelector('form')

		// Set handle value
		input.value = 'test.bsky.social'
		input.dispatchEvent(new Event('input'))

		// Submit form
		const submitEvent = new Event('submit', {bubbles: true, cancelable: true})
		form.dispatchEvent(submitEvent)

		// Wait for async operations
		await new Promise(resolve => setTimeout(resolve, 0))

		expect(bskyOAuth.signIn).toHaveBeenCalledWith('test.bsky.social')
	})

	it('should handle OAuth errors', async () => {
		const error = {
			code: 'oauth-signin-failed',
			message: 'Failed to start OAuth flow',
		}
		bskyOAuth.signIn.mockResolvedValue({success: false, error})

		const input = element.querySelector('input[name="handle"]')
		const form = element.querySelector('form')

		input.value = 'test.bsky.social'
		input.dispatchEvent(new Event('input'))

		form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}))

		await new Promise(resolve => setTimeout(resolve, 0))

		// Check error is displayed
		const output = element.querySelector('output')
		expect(output.textContent).toContain('Failed to start OAuth flow')
	})

	it('should handle uninitialized OAuth client', async () => {
		bskyOAuth.initialized = false

		const input = element.querySelector('input[name="handle"]')
		const form = element.querySelector('form')

		input.value = 'test.bsky.social'
		input.dispatchEvent(new Event('input'))

		form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}))

		await new Promise(resolve => setTimeout(resolve, 0))

		// Should show initialization error
		const output = element.querySelector('output')
		expect(output.textContent).toContain('OAuth client not initialized')
	})
})
