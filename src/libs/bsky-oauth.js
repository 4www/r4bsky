import { BrowserOAuthClient } from '@atproto/oauth-client-browser'
import { Agent } from '@atproto/api'

class BskyOAuthService {
	constructor() {
		this.client = null
		this.agent = null
		this.session = null
		this.initialized = false
	}

	async init(clientId) {
		if (this.initialized) return

		try {
			this.client = await BrowserOAuthClient.load({
				clientId: clientId,
				handleResolver: 'https://bsky.social', // Using default Bluesky resolver
			})

			this.initialized = true
			console.log('OAuth client initialized')
		} catch (error) {
			console.error('Failed to initialize OAuth client:', error)
			throw error
		}
	}

	/**
	 * Start the OAuth login flow
	 * This will redirect the user to their Bluesky instance for authentication
	 */
	async signIn(handle) {
		try {
			if (!this.initialized) {
				throw new Error('OAuth client not initialized')
			}

			// Start the OAuth flow - this will redirect the user
			await this.client.signIn(handle, {
				state: window.location.pathname, // Store current path to return to
				signal: new AbortController().signal,
			})

			return {
				success: true,
				error: null
			}
		} catch (error) {
			console.error('OAuth sign-in error:', error)
			return {
				success: false,
				error: {
					code: 'oauth-signin-failed',
					message: error.message || 'Failed to start OAuth flow'
				}
			}
		}
	}

	/**
	 * Handle the OAuth callback after user returns from Bluesky
	 */
	async handleCallback() {
		try {
			if (!this.initialized) {
				throw new Error('OAuth client not initialized')
			}

			// This is called automatically when the user returns from OAuth
			const params = new URLSearchParams(window.location.search)

			if (params.has('error')) {
				throw new Error(params.get('error_description') || 'OAuth callback error')
			}

			// The client handles the callback automatically
			// Try to restore the session
			const storedDid = localStorage.getItem('bsky-oauth-did')
			if (storedDid) {
				return await this.restoreSession(storedDid)
			}

			return {
				session: null,
				error: {
					code: 'no-session',
					message: 'No session found'
				}
			}
		} catch (error) {
			console.error('OAuth callback error:', error)
			return {
				session: null,
				error: {
					code: 'callback-failed',
					message: error.message
				}
			}
		}
	}

	/**
	 * Restore an existing OAuth session
	 */
	async restoreSession(did) {
		try {
			if (!this.initialized) {
				throw new Error('OAuth client not initialized')
			}

			const oauthSession = await this.client.restore(did)

			if (!oauthSession) {
				throw new Error('Session not found')
			}

			// Create an Agent instance with the OAuth session
			this.agent = new Agent(oauthSession)
			this.session = {
				did: oauthSession.did,
				handle: oauthSession.info?.handle || did,
			}

			// Store the DID for future restoration
			localStorage.setItem('bsky-oauth-did', did)

			return {
				session: this.session,
				error: null
			}
		} catch (error) {
			console.error('Session restore error:', error)
			localStorage.removeItem('bsky-oauth-did')
			return {
				session: null,
				error: {
					code: 'session-expired',
					message: 'Session expired'
				}
			}
		}
	}

	/**
	 * Post to Bluesky using the OAuth session
	 */
	async post(text) {
		try {
			if (!this.agent) {
				throw new Error('Not authenticated')
			}

			const result = await this.agent.post({
				text: text,
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

	/**
	 * Sign out and clear session
	 */
	async signOut() {
		try {
			if (this.session?.did) {
				await this.client.revoke(this.session.did)
			}
		} catch (error) {
			console.error('Revoke error:', error)
		}

		this.agent = null
		this.session = null
		localStorage.removeItem('bsky-oauth-did')
	}

	/**
	 * Get stored DID if exists
	 */
	getStoredDid() {
		return localStorage.getItem('bsky-oauth-did')
	}

	/**
	 * Check if authenticated
	 */
	isAuthenticated() {
		return !!this.agent && !!this.session
	}
}

export const bskyOAuth = new BskyOAuthService()
