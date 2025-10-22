import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BskyAgent } from '@atproto/api'

// Mock the BskyAgent
vi.mock('@atproto/api', () => ({
	BskyAgent: vi.fn(() => ({
		login: vi.fn(),
		resumeSession: vi.fn(),
		post: vi.fn(),
		session: null
	})),
	RichText: vi.fn(({ text }) => ({
		text,
		facets: [],
		detectFacets: vi.fn()
	}))
}))

// Import after mocking
const { default: BskyService } = await import('./bsky.js')

describe('BskyService', () => {
	let service
	let mockAgent

	beforeEach(() => {
		// Clear localStorage
		localStorage.clear()

		// Create new service instance
		service = new BskyService()
		mockAgent = service.agent
	})

	describe('login', () => {
		it('should login successfully with valid credentials', async () => {
			const mockSession = {
				handle: 'test.bsky.social',
				did: 'did:plc:test123',
				accessJwt: 'token123'
			}

			mockAgent.login.mockResolvedValue(undefined)
			mockAgent.session = mockSession

			const result = await service.login({
				identifier: 'test.bsky.social',
				password: 'password123'
			})

			expect(mockAgent.login).toHaveBeenCalledWith({
				identifier: 'test.bsky.social',
				password: 'password123'
			})
			expect(result.session).toEqual(mockSession)
			expect(result.error).toBeNull()
		})

		it('should return error on invalid credentials', async () => {
			mockAgent.login.mockRejectedValue(new Error('Invalid credentials'))

			const result = await service.login({
				identifier: 'bad.bsky.social',
				password: 'wrongpassword'
			})

			expect(result.session).toBeNull()
			expect(result.error).toBeTruthy()
			expect(result.error.code).toBe('invalid-credentials')
		})

		it('should handle network errors', async () => {
			mockAgent.login.mockRejectedValue(new Error('Network error'))

			const result = await service.login({
				identifier: 'test.bsky.social',
				password: 'password123'
			})

			expect(result.session).toBeNull()
			expect(result.error).toBeTruthy()
			expect(result.error.message).toContain('Network error')
		})
	})

	describe('resumeSession', () => {
		it('should resume a valid session', async () => {
			const mockSession = {
				handle: 'test.bsky.social',
				did: 'did:plc:test123',
				accessJwt: 'token123'
			}

			mockAgent.resumeSession.mockResolvedValue(undefined)
			mockAgent.session = mockSession

			const result = await service.resumeSession(mockSession)

			expect(mockAgent.resumeSession).toHaveBeenCalledWith(mockSession)
			expect(result.session).toEqual(mockSession)
			expect(result.error).toBeNull()
		})

		it('should return error when session is expired', async () => {
			const expiredSession = {
				handle: 'test.bsky.social',
				did: 'did:plc:test123',
				accessJwt: 'expired_token'
			}

			mockAgent.resumeSession.mockRejectedValue(new Error('Session expired'))

			const result = await service.resumeSession(expiredSession)

			expect(result.session).toBeNull()
			expect(result.error).toBeTruthy()
			expect(result.error.code).toBe('session-expired')
		})
	})

	describe('post', () => {
		it('should post a track successfully', async () => {
			const mockPostResult = {
				uri: 'at://test/post/123',
				cid: 'cid123'
			}

			mockAgent.post.mockResolvedValue(mockPostResult)

			const result = await service.post('Artist - Song\n\nGreat track!\n\nhttps://youtube.com/watch?v=123')

			expect(mockAgent.post).toHaveBeenCalled()
			expect(result.data).toEqual(mockPostResult)
			expect(result.error).toBeNull()
		})

		it('should return error when post fails', async () => {
			mockAgent.post.mockRejectedValue(new Error('Post failed'))

			const result = await service.post('Test post')

			expect(result.data).toBeNull()
			expect(result.error).toBeTruthy()
			expect(result.error.code).toBe('post-failed')
		})

		it('should handle rate limiting errors', async () => {
			mockAgent.post.mockRejectedValue(new Error('Rate limited'))

			const result = await service.post('Test post')

			expect(result.data).toBeNull()
			expect(result.error).toBeTruthy()
		})
	})

	describe('logout', () => {
		it('should clear session and localStorage', () => {
			service.session = {
				handle: 'test.bsky.social',
				did: 'did:plc:test123'
			}
			localStorage.setItem('bsky-session', JSON.stringify(service.session))

			service.logout()

			expect(service.session).toBeNull()
			expect(localStorage.getItem('bsky-session')).toBeNull()
		})
	})

	describe('getStoredSession', () => {
		it('should return stored session from localStorage', () => {
			const mockSession = {
				handle: 'test.bsky.social',
				did: 'did:plc:test123'
			}
			localStorage.setItem('bsky-session', JSON.stringify(mockSession))

			const result = service.getStoredSession()

			expect(result).toEqual(mockSession)
		})

		it('should return null when no session is stored', () => {
			const result = service.getStoredSession()

			expect(result).toBeNull()
		})

		it('should handle corrupted localStorage data', () => {
			localStorage.setItem('bsky-session', 'invalid json')

			expect(() => service.getStoredSession()).toThrow()
		})
	})

	describe('isAuthenticated', () => {
		it('should return true when session exists', () => {
			service.session = {
				handle: 'test.bsky.social',
				did: 'did:plc:test123'
			}

			expect(service.isAuthenticated()).toBe(true)
		})

		it('should return false when no session exists', () => {
			service.session = null

			expect(service.isAuthenticated()).toBe(false)
		})
	})
})
