import { BrowserOAuthClient, OAuthCallbackError } from '@atproto/oauth-client-browser'
import { Agent } from '@atproto/api'

class BskyOAuthService {
	constructor() {
		this.client = null
		this.agent = null
		this.session = null
		this.initialized = false
	}

	#canonicalRedirectUri() {
		try {
			const {origin, pathname} = window.location
			const path = pathname.endsWith('/') ? pathname : pathname + '/'
			return origin + path
		} catch {
			return undefined
		}
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

				const baseOpts = {
					state: window.location.pathname,
					signal: new AbortController().signal,
					prompt: 'consent',
					redirect_uri: this.#canonicalRedirectUri(),
				}

				// Try fine-grained permissions first; if AS rejects, fall back to base scope
				const withAuthz = {
					...baseOpts,
					authorization_details: [
						{ type: 'atproto_repo', actions: ['create','update','delete'], identifier: 'com.radio4000.track' },
						{ type: 'atproto_repo', actions: ['create','delete'], identifier: 'app.bsky.graph.follow' },
					],
				}

				try {
					await this.client.signIn(handle, withAuthz)
				} catch (e) {
					const msg = String(e?.message || e)
					if (msg.includes('invalid_request') || msg.includes('invalid_client_metadata') || msg.includes('invalid_scope')) {
						await this.client.signIn(handle, baseOpts)
					} else {
						throw e
					}
				}

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
	 * Request additional fine-grained permissions via re-consent.
	 */
	async requestScopes() {
		if (!this.initialized) throw new Error('OAuth client not initialized')
		const handle = this.session?.handle || this.session?.did
		if (!handle) throw new Error('No session')
			const baseOpts = {
				state: window.location.pathname,
				signal: new AbortController().signal,
				prompt: 'consent',
				redirect_uri: this.#canonicalRedirectUri(),
			}
			const withAuthz = {
				...baseOpts,
				authorization_details: [
					{ type: 'atproto_repo', actions: ['create','update','delete'], identifier: 'com.radio4000.track' },
					{ type: 'atproto_repo', actions: ['create','delete'], identifier: 'app.bsky.graph.follow' },
				],
			}
			try {
				return await this.client.signIn(handle, withAuthz)
			} catch (e) {
				const msg = String(e?.message || e)
				if (msg.includes('invalid_request') || msg.includes('invalid_client_metadata') || msg.includes('invalid_scope')) {
					return await this.client.signIn(handle, baseOpts)
				}
				throw e
			}
	}

	/** Resolve handle lazily and update session */
	async resolveHandle() {
		if (!this.session?.did) return this.session?.handle
		try {
			const publicAgent = new Agent({ service: 'https://api.bsky.app' })
			const profile = await publicAgent.getProfile({ actor: this.session.did })
			const handle = profile.data?.handle || this.session.handle
			if (handle && handle !== this.session.handle) {
				this.session = { ...this.session, handle }
			}
			return handle
		} catch {
			return this.session.handle
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

			const { session } = await this.client.initCallback(params, this.#canonicalRedirectUri())
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



		// Set initial handle from cache if available, else DID placeholder
		const cached = localStorage.getItem(`bsky-handle:${oauthSession.did}`)
		const initialHandle = cached || oauthSession.did
		this.session = { did: oauthSession.did, handle: initialHandle }
		localStorage.setItem('bsky-oauth-did', oauthSession.did)
	}

	/** Resolve handle lazily and update session */
	async resolveHandle() {
		if (!this.session?.did) return this.session?.handle
		const fetchHandle = async () => {
			// Use public agent to avoid DPoP handshake issues
			const publicAgent = new Agent({ service: 'https://api.bsky.app' })
			const profile = await publicAgent.getProfile({ actor: this.session.did })
			const handle = profile.data?.handle || this.session.handle
			if (handle && handle !== this.session.handle) {
				this.session = { ...this.session, handle }
				localStorage.setItem(`bsky-handle:${this.session.did}`, handle)
			}
			return handle
		}
		try {
			return await fetchHandle()
		} catch (_) {
			// Retry with small delay
			await new Promise((r) => setTimeout(r, 500))
			try {
				return await fetchHandle()
			} catch {
				return this.session.handle
			}
		}
	}
}

export const bskyOAuth = new BskyOAuthService()
