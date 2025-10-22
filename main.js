import {bskyOAuth} from './src/libs/bsky-oauth.js'
import { buildLoopbackClientId } from '@atproto/oauth-client-browser'
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
    // Compute client_id depending on environment
    // - HTTPS: use hosted client metadata URL
    // - HTTP (localhost/loopback): use loopback client id (no path allowed)
    const clientId = window.location.protocol === 'https:'
      ? new URL('client-metadata.json', window.location.href).href
      : buildLoopbackClientId(window.location)
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
  // The bskyOAuth.handleCallback() method will internally check for relevant URL parameters
  // and process the OAuth response. This function will be called on every page load
  // to ensure any pending OAuth callback is processed.
  // We also need to ensure that the URL is cleaned up after the callback, regardless of success or failure.

  try {
    const result = await bskyOAuth.handleCallback()

    if (result.error) {
      // If there's an OAuth error (e.g., user denied access), display it.
      showStatus(`OAuth error: ${result.error.message}`, "error")
    } else if (result.session) {
      // If a session is successfully established, log the user in.
      showLoggedIn(result.session.handle)
      showStatus("Logged in successfully!", "success")
    }
  } catch (error) {
    console.error("OAuth callback error:", error)
    showStatus(`Login failed: ${error.message}`, "error")
  } finally {
    // Always clean up the URL after attempting to handle the OAuth callback
    window.history.replaceState({}, document.title, window.location.pathname)
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
