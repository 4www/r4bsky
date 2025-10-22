import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the OAuth service used by the component
vi.mock('../libs/bsky-oauth.js', () => ({
	bskyOAuth: {
		post: vi.fn(),
		initialized: true,
	}
}))

// Import after mocking
const { default: BskyTrackPost } = await import('./bsky-track-post.js')
const { bskyOAuth } = await import('../libs/bsky-oauth.js')

describe('BskyTrackPost Component', () => {
	let component

	beforeEach(() => {
		// Define the custom element if not already defined
		if (!customElements.get('bsky-track-post')) {
			customElements.define('bsky-track-post', BskyTrackPost)
		}

		// Create and mount component
		component = document.createElement('bsky-track-post')
		document.body.appendChild(component)

		// Reset mocks
		vi.clearAllMocks()
	})

	afterEach(() => {
		document.body.removeChild(component)
	})

	it('should render form with url, title and description fields', () => {
		const urlInput = component.querySelector('input[name="url"]')
		const titleInput = component.querySelector('input[name="title"]')
		const descriptionTextarea = component.querySelector('textarea[name="description"]')
		const submitButton = component.querySelector('button[type="submit"]')

		expect(urlInput).toBeTruthy()
		expect(titleInput).toBeTruthy()
		expect(descriptionTextarea).toBeTruthy()
		expect(submitButton).toBeTruthy()
		expect(submitButton.textContent).toBe('Post to Bluesky')
	})

	it('should update state when inputs change', () => {
		const urlInput = component.querySelector('input[name="url"]')
		const titleInput = component.querySelector('input[name="title"]')
		const descriptionTextarea = component.querySelector('textarea[name="description"]')

		urlInput.value = 'https://youtube.com/watch?v=123'
		urlInput.dispatchEvent(new Event('input'))

		titleInput.value = 'Artist - Song Name'
		titleInput.dispatchEvent(new Event('input'))

		descriptionTextarea.value = 'Great track!'
		descriptionTextarea.dispatchEvent(new Event('input'))

		expect(component.state.url).toBe('https://youtube.com/watch?v=123')
		expect(component.state.title).toBe('Artist - Song Name')
		expect(component.state.description).toBe('Great track!')
	})

	it('should call bsky.post on form submit with formatted text', async () => {
	bskyOAuth.post.mockResolvedValue({
			data: { uri: 'at://test/post/123' },
			error: null
		})

		const form = component.querySelector('form')
		const urlInput = component.querySelector('input[name="url"]')
		const titleInput = component.querySelector('input[name="title"]')
		const descriptionTextarea = component.querySelector('textarea[name="description"]')

		urlInput.value = 'https://youtube.com/watch?v=123'
		urlInput.dispatchEvent(new Event('input'))

		titleInput.value = 'Artist - Song Name'
		titleInput.dispatchEvent(new Event('input'))

		descriptionTextarea.value = 'Great track!'
		descriptionTextarea.dispatchEvent(new Event('input'))

		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

		await new Promise(resolve => setTimeout(resolve, 0))

	expect(bskyOAuth.post).toHaveBeenCalledWith(
			'Artist - Song Name\n\nGreat track!\n\nhttps://youtube.com/watch?v=123'
		)
	})

	it('should format post without description if not provided', async () => {
	bskyOAuth.post.mockResolvedValue({
			data: { uri: 'at://test/post/123' },
			error: null
		})

		const form = component.querySelector('form')
		const urlInput = component.querySelector('input[name="url"]')
		const titleInput = component.querySelector('input[name="title"]')

		urlInput.value = 'https://youtube.com/watch?v=123'
		urlInput.dispatchEvent(new Event('input'))

		titleInput.value = 'Artist - Song Name'
		titleInput.dispatchEvent(new Event('input'))

		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

		await new Promise(resolve => setTimeout(resolve, 0))

	expect(bskyOAuth.post).toHaveBeenCalledWith(
			'Artist - Song Name\n\nhttps://youtube.com/watch?v=123'
		)
	})

	it('should emit submit event on successful post', async () => {
		const mockPostData = { uri: 'at://test/post/123', cid: 'cid123' }
	bskyOAuth.post.mockResolvedValue({
			data: mockPostData,
			error: null
		})

		let submitEventData = null
		component.addEventListener('submit', (e) => {
			submitEventData = e.detail
		})

		const form = component.querySelector('form')
		const urlInput = component.querySelector('input[name="url"]')
		const titleInput = component.querySelector('input[name="title"]')

		urlInput.value = 'https://youtube.com/watch?v=123'
		urlInput.dispatchEvent(new Event('input'))

		titleInput.value = 'Artist - Song Name'
		titleInput.dispatchEvent(new Event('input'))

		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

		await new Promise(resolve => setTimeout(resolve, 0))

		expect(submitEventData).toBeTruthy()
		expect(submitEventData.data).toEqual(mockPostData)
		expect(submitEventData.error).toBeNull()
	})

	it('should display error on failed post', async () => {
	bskyOAuth.post.mockResolvedValue({
			data: null,
			error: { code: 'post-failed', message: 'Failed to post' }
		})

		const form = component.querySelector('form')
		const urlInput = component.querySelector('input[name="url"]')
		const titleInput = component.querySelector('input[name="title"]')

		urlInput.value = 'https://youtube.com/watch?v=123'
		urlInput.dispatchEvent(new Event('input'))

		titleInput.value = 'Artist - Song Name'
		titleInput.dispatchEvent(new Event('input'))

		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

		await new Promise(resolve => setTimeout(resolve, 0))

		const errorOutput = component.querySelector('output')
		expect(errorOutput).toBeTruthy()
	})

	it('should reset form after successful post', async () => {
	bskyOAuth.post.mockResolvedValue({
			data: { uri: 'at://test/post/123' },
			error: null
		})

		const form = component.querySelector('form')
		const urlInput = component.querySelector('input[name="url"]')
		const titleInput = component.querySelector('input[name="title"]')
		const descriptionTextarea = component.querySelector('textarea[name="description"]')

		urlInput.value = 'https://youtube.com/watch?v=123'
		urlInput.dispatchEvent(new Event('input'))

		titleInput.value = 'Artist - Song Name'
		titleInput.dispatchEvent(new Event('input'))

		descriptionTextarea.value = 'Great track!'
		descriptionTextarea.dispatchEvent(new Event('input'))

		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

		await new Promise(resolve => setTimeout(resolve, 0))

		expect(urlInput.value).toBe('')
		expect(titleInput.value).toBe('')
		expect(descriptionTextarea.value).toBe('')
	})

	it('should disable form during submission', async () => {
	bskyOAuth.post.mockImplementation(() => {
			return new Promise(resolve => {
				setTimeout(() => {
					resolve({
						data: { uri: 'at://test/post/123' },
						error: null
					})
				}, 100)
			})
		})

		const form = component.querySelector('form')
		const urlInput = component.querySelector('input[name="url"]')
		const titleInput = component.querySelector('input[name="title"]')

		urlInput.value = 'https://youtube.com/watch?v=123'
		urlInput.dispatchEvent(new Event('input'))

		titleInput.value = 'Artist - Song Name'
		titleInput.dispatchEvent(new Event('input'))

		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

		// Check that form is disabled during submission
		expect(component.hasAttribute('loading')).toBe(true)

		// Wait for submission to complete
		await new Promise(resolve => setTimeout(resolve, 150))

		// Check that form is enabled after submission
		expect(component.hasAttribute('loading')).toBe(false)
	})

  it('should handle various music platform URLs', async () => {
    bskyOAuth.post.mockResolvedValue({
      data: { uri: 'at://test/post/123' },
      error: null
    })

		const musicPlatforms = [
			'https://youtube.com/watch?v=123',
			'https://soundcloud.com/artist/track',
			'https://vimeo.com/123456',
			'https://bandcamp.com/track/song',
			'https://spotify.com/track/123'
		]

		for (const url of musicPlatforms) {
			vi.clearAllMocks()

			const form = component.querySelector('form')
			const urlInput = component.querySelector('input[name="url"]')
			const titleInput = component.querySelector('input[name="title"]')

			urlInput.value = url
			urlInput.dispatchEvent(new Event('input'))

			titleInput.value = 'Test Track'
			titleInput.dispatchEvent(new Event('input'))

			form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

			await new Promise(resolve => setTimeout(resolve, 0))

   expect(bskyOAuth.post).toHaveBeenCalled()
   const calledWith = bskyOAuth.post.mock.calls[0][0]
			expect(calledWith).toContain(url)
		}
	})
})
