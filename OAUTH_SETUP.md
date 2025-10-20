# OAuth Setup Guide for R4Bsky

## Why OAuth?

OAuth provides a more secure authentication flow where:
- Users never enter their password in your app
- Users are redirected to their Bluesky instance to authorize
- Your app receives a token, not the password
- Users can revoke access at any time from their Bluesky settings

## Setup Requirements

### 1. Host Your App on HTTPS

OAuth requires your app to be publicly accessible over HTTPS. For development:

**Option A: Use a service like Vercel/Netlify**
- Deploy your app
- Get a https:// URL

**Option B: Use ngrok for local development**
```bash
npm run dev  # Start on localhost:5173
ngrok http 5173  # In another terminal
```

This gives you a temporary https:// URL like `https://abc123.ngrok.io`

### 2. Update Client Metadata

Edit `public/client-metadata.json` with your actual domain:

```json
{
  "client_id": "https://yourdomain.com/client-metadata.json",
  "client_name": "R4Bsky - Radio4000 for Bluesky",
  "client_uri": "https://yourdomain.com",
  "redirect_uris": [
    "https://yourdomain.com/oauth/callback"
  ],
  ...
}
```

**Important**:
- `client_id` must be the exact URL where this JSON file is hosted
- The file must be publicly accessible
- The redirect URI must match your app's URL

### 3. Initialize OAuth in Your App

Update `main.js` to use OAuth:

```javascript
import { bskyOAuth } from './src/libs/bsky-oauth.js'

// Initialize with your client_id (the URL to your client-metadata.json)
await bskyOAuth.init('https://yourdomain.com/client-metadata.json')
```

### 4. Update Sign-In Component

The sign-in component now only needs the user's handle:

```javascript
// User enters: alice.bsky.social
// App calls:
await bskyOAuth.signIn('alice.bsky.social')
// User is redirected to their Bluesky instance
// User authorizes the app
// User is redirected back with auth token
```

## Implementation Status

The OAuth service has been created at `src/libs/bsky-oauth.js` with the following methods:

### Available Methods

```javascript
// Initialize OAuth client
await bskyOAuth.init(clientId)

// Start OAuth flow (redirects user)
await bskyOAuth.signIn(handle)

// Handle callback after redirect
await bskyOAuth.handleCallback()

// Restore existing session
await bskyOAuth.restoreSession(did)

// Post to Bluesky
await bskyOAuth.post(text)

// Sign out
await bskyOAuth.signOut()

// Check if authenticated
bskyOAuth.isAuthenticated()
```

## Development vs Production

### Development (Password-Based - Current)

For quick local development without HTTPS:
- Uses `@atproto/api` directly
- Users enter handle + password/app-password
- Works on localhost
- Less secure (credentials in app)

### Production (OAuth - Recommended)

For deployed apps:
- Uses `@atproto/oauth-client-browser`
- Users only enter handle
- Redirects to Bluesky for auth
- Requires HTTPS
- More secure (no credentials in app)

## Migration Path

You can support both methods:

1. **Check if running on HTTPS**
   ```javascript
   const canUseOAuth = window.location.protocol === 'https:'
   ```

2. **Show appropriate sign-in method**
   ```html
   <bsky-sign-in-oauth v-if="canUseOAuth"></bsky-sign-in-oauth>
   <bsky-sign-in-password v-else></bsky-sign-in-password>
   ```

3. **Gradually migrate users**
   - Detect OAuth support
   - Prompt users to re-authenticate with OAuth
   - Keep password fallback for localhost development

## Testing OAuth Locally

### Option 1: ngrok (Easiest)

```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 5173

# Use the ngrok HTTPS URL in client-metadata.json
# Update redirect_uris to: ["https://abc123.ngrok.io/oauth/callback"]
```

### Option 2: Local HTTPS with mkcert

```bash
# Install mkcert
brew install mkcert  # macOS
# or apt install mkcert  # Linux

# Create local CA
mkcert -install

# Generate certificate
mkcert localhost 127.0.0.1 ::1

# Update vite.config.js
export default {
  server: {
    https: {
      key: './localhost-key.pem',
      cert: './localhost.pem'
    }
  }
}
```

### Option 3: Deploy to Vercel/Netlify

Easiest for testing - just push and deploy:

```bash
# Vercel
vercel

# Netlify
netlify deploy
```

## Common Issues

### "OAuth client not initialized"
- Make sure to call `await bskyOAuth.init(clientId)` before any other methods

### "Client metadata not found"
- Verify `public/client-metadata.json` is accessible at the `client_id` URL
- Check CORS settings if on a different domain

### "Redirect URI mismatch"
- Ensure redirect URIs in client metadata match your app's URL exactly
- Include the full path: `https://domain.com/oauth/callback`

### "DPoP validation failed"
- This is a security feature - make sure you're using the latest `@atproto/oauth-client-browser`
- Ensure cookies are enabled

## Next Steps

Once OAuth is working:

1. Remove password fields from UI
2. Update tests to mock OAuth flow
3. Add "Manage App Permissions" link to settings
4. Consider adding scope requests for specific permissions

## Resources

- [AT Protocol OAuth Spec](https://atproto.com/specs/oauth)
- [Bluesky OAuth Guide](https://docs.bsky.app/docs/advanced-guides/oauth-client)
- [@atproto/oauth-client-browser docs](https://www.npmjs.com/package/@atproto/oauth-client-browser)
