import { BskyAgent, RichText, type AtpSessionData } from '@atproto/api'

interface LoginParams {
	identifier: string
	password: string
}

interface AuthResult {
	session: AtpSessionData | null
	error: {
		code: string
		message: string
	} | null
}

interface PostResult {
	data: any
	error: {
		code: string
		message: string
	} | null
}

class BskyService {
	agent: BskyAgent
	session: AtpSessionData | null

	constructor() {
		this.agent = new BskyAgent({
			service: 'https://bsky.social'
		})
		this.session = null
	}

	async login({identifier, password}: LoginParams): Promise<AuthResult> {
		try {
			await this.agent.login({
				identifier,
				password
			})

			this.session = this.agent.session ?? null
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
					message: (error as Error).message || 'Login failed'
				}
			}
		}
	}

	async resumeSession(session: AtpSessionData): Promise<AuthResult> {
		try {
			await this.agent.resumeSession(session)
			this.session = this.agent.session ?? null
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

	async post(text: string): Promise<PostResult> {
		try {
			// Create rich text with facets for URLs
			const rt = new RichText({ text })
			await rt.detectFacets(this.agent)

			// Post to the AT Protocol feed
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
					message: (error as Error).message || 'Failed to post'
				}
			}
		}
	}

	logout(): void {
		this.session = null
		localStorage.removeItem('bsky-session')
	}

	getStoredSession(): AtpSessionData | null {
		const storedSession = localStorage.getItem('bsky-session')
		return storedSession ? JSON.parse(storedSession) : null
	}

	isAuthenticated(): boolean {
		return !!this.session
	}
}

export const bsky = new BskyService()
export { BskyService }
