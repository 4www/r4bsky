import { BskyAgent, RichText } from '@atproto/api'

class BskyService {
	constructor() {
		this.agent = new BskyAgent({
			service: 'https://bsky.social'
		})
		this.session = null
	}

	async login({identifier, password}) {
		try {
			await this.agent.login({
				identifier,
				password
			})

			this.session = this.agent.session
			return {
				session: this.session,
				error: null
			}
		} catch (error) {
			console.error('Login error:', error)
			return {
				session: null,
				error: {
					code: 'invalid-credentials',
					message: error.message || 'Login failed'
				}
			}
		}
	}

	async resumeSession(session) {
		try {
			await this.agent.resumeSession(session)
			this.session = this.agent.session
			return {
				session: this.session,
				error: null
			}
		} catch (error) {
			console.error('Resume session error:', error)
			return {
				session: null,
				error: {
					code: 'session-expired',
					message: 'Session expired'
				}
			}
		}
	}

	async post(text) {
		try {
			// Create rich text with facets for URLs
			const rt = new RichText({ text })
			await rt.detectFacets(this.agent)

			// Post to Bluesky
			const result = await this.agent.post({
				text: rt.text,
				facets: rt.facets,
				createdAt: new Date().toISOString()
			})

			return {
				data: result,
				error: null
			}
		} catch (error) {
			console.error('Post error:', error)
			return {
				data: null,
				error: {
					code: 'post-failed',
					message: error.message || 'Failed to post'
				}
			}
		}
	}

	logout() {
		this.session = null
		localStorage.removeItem('bsky-session')
	}

	getStoredSession() {
		const storedSession = localStorage.getItem('bsky-session')
		return storedSession ? JSON.parse(storedSession) : null
	}

	isAuthenticated() {
		return !!this.session
	}
}

export const bsky = new BskyService()
