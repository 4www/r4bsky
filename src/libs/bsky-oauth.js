import { BrowserOAuthClient, OAuthCallbackError } from '@atproto/oauth-client-browser'
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

			// Process OAuth callback or restore existing session automatically
			// If there is an OAuth response in the URL, this will handle it and
			// return a session. Otherwise it will attempt to restore.
			try {
				const initResult = await this.client.init()
				if (initResult?.session) {
					await this.#hydrateFromOAuthSession(initResult.session)
				}
			} catch (err) {
				// If the user refreshed or navigated back to a callback URL,
				// the auth code may have already been consumed. In that case,
				// clean up the URL and allow a fresh sign-in.
				if (err instanceof OAuthCallbackError) {
					const params = this.client.readCallbackParams()
					if (params) {
						if (this.client.responseMode === 'fragment') {
							history.replaceState(null, '', location.pathname + location.search)
						} else {
							history.replaceState(null, '', location.pathname)
						}
					}
					console.warn('OAuth callback ignored (probably reused code). URL cleaned; please retry sign-in.')
				} else {
					throw err
				}
			}

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
				prompt: 'consent',
				// Request fine-grained permission to create feed posts
				authorization_details: [
					{
						type: 'atproto_repo',
						actions: ['create'],
						identifier: 'app.bsky.feed.post',
					},
				],
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

			// Only attempt callback handling if URL has OAuth params
			const params = this.client.readCallbackParams()
			if (!params) {
				return { session: null, error: null }
			}

			const { session } = await this.client.initCallback(params)
			await this.#hydrateFromOAuthSession(session)
			return { session: this.session, error: null }
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

			await this.#hydrateFromOAuthSession(oauthSession)

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
				text,
				createdAt: new Date().toISOString(),
			})

			return { data: result, error: null }
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

	/**
	 * Internal: hydrate agent + session from an OAuthSession
	 */
	async #hydrateFromOAuthSession(oauthSession) {
		// Provide a SessionManager-like object so Agent knows the DID
		this.agent = new Agent({
			fetchHandler: (url, init) => oauthSession.fetchHandler(url, init),
			did: oauthSession.did,
		})

		// Best-effort: try to fetch the profile to get the handle; fall back to did
		let handle = oauthSession.did
		try {
			const profile = await this.agent.getProfile({ actor: oauthSession.did })
			handle = profile.data?.handle || handle
		} catch (_) {
			// ignore, fallback to DID
		}

		this.session = { did: oauthSession.did, handle }
		localStorage.setItem('bsky-oauth-did', oauthSession.did)
	}
}

export const bskyOAuth = new BskyOAuthService()
