import {bskyOAuth} from './src/libs/bsky-oauth.js'
import BskyOAuthSignIn from './src/components/bsky-oauth-sign-in.js'
import BskyTrackPost from './src/components/bsky-track-post.js'

// Register custom elements
customElements.define('bsky-oauth-sign-in', BskyOAuthSignIn)
customElements.define('bsky-track-post', BskyTrackPost)

// DOM elements
const loginSection = document.getElementById('loginSection')
const postSection = document.getElementById('postSection')
const logoutBtn = document.getElementById('logoutBtn')
const statusDiv = document.getElementById('status')
const userHandleSpan = document.getElementById('userHandle')
const signInComponent = document.querySelector('bsky-oauth-sign-in')
const trackPostComponent = document.querySelector('bsky-track-post')

// Initialize OAuth client
initOAuth()

async function initOAuth() {
  try {
    // Get the client_id from the current origin
    const clientId = new URL('client-metadata.json', window.location.href).href
    await bskyOAuth.init(clientId)
    console.log('OAuth initialized with client_id:', clientId)

    // Check for OAuth callback
    await handleOAuthCallback()

    // Check for stored session
    await checkStoredSession()
  } catch (error) {
    console.error('OAuth initialization error:', error)
    showStatus('Failed to initialize OAuth. Please refresh the page.', 'error')
  }
}

// Listen for sign-in success
signInComponent.addEventListener('submit', (e) => {
  const {error} = e.detail

  if (error) {
    showStatus(`Login failed: ${error.message}`, 'error')
  }
  // Success case will trigger a redirect, so no need to handle here
})

async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search)

  // Check if this is an OAuth callback
  if (params.has('code') || params.has('error')) {
    if (params.has('error')) {
      const errorDesc = params.get('error_description') || params.get('error')
      showStatus(`OAuth error: ${errorDesc}`, 'error')
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    showStatus('Processing OAuth callback...', 'success')

    try {
      const result = await bskyOAuth.handleCallback()

      if (result.error) {
        throw result.error
      }

      if (result.session) {
        showLoggedIn(result.session.handle)
        showStatus('Logged in successfully!', 'success')
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    } catch (error) {
      console.error('OAuth callback error:', error)
      showStatus(`Login failed: ${error.message}`, 'error')
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }
}

// Listen for track post success
trackPostComponent.addEventListener('submit', (e) => {
  const {error, data} = e.detail

  if (error) {
    showStatus(`Failed to post: ${error.message}`, 'error')
  } else if (data) {
    showStatus('Track posted successfully!', 'success')
  }
})

// Logout handler
logoutBtn.addEventListener('click', async () => {
  await bskyOAuth.signOut()
  showLoggedOut()
  showStatus('Logged out successfully', 'success')
})

// Helper functions
async function checkStoredSession() {
  const storedDid = bskyOAuth.getStoredDid()

  if (storedDid) {
    try {
      const {session, error} = await bskyOAuth.restoreSession(storedDid)

      if (error) {
        throw error
      }

      if (session) {
        showLoggedIn(session.handle)
        showStatus('Session restored', 'success')
      }
    } catch (error) {
      console.error('Session restore error:', error)
      await bskyOAuth.signOut()
      showStatus('Session expired, please login again', 'error')
    }
  }
}

function showLoggedIn(handle) {
  loginSection.classList.add('hidden')
  postSection.classList.remove('hidden')
  userHandleSpan.textContent = handle
}

function showLoggedOut() {
  loginSection.classList.remove('hidden')
  postSection.classList.add('hidden')
}

function showStatus(message, type) {
  statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`

  // Auto-clear success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.innerHTML = ''
    }, 3000)
  }
}
