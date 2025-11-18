# OAuth Setup Guide for the Radio4000 AT Protocol client

## Why OAuth?

OAuth provides a more secure authentication flow where:
- Users never enter their password in your app
- Users are redirected to their AT Protocol service (PDS) to authorize
- Your app receives a token, not the password
- Users can revoke access at any time from their PDS settings

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
  "client_name": "Radio4000 for AT Protocol",
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
- The redirect URI must match your app's URL exactly (path and trailing slash).
  - For GitHub Pages under a subpath, include both trailing slash variants.


### 3. Initialize OAuth in the app

The app initializes OAuth at startup and computes the proper client id based on environment (loopback vs HTTPS). No extra setup required beyond `public/client-metadata.json`.

### 4. Consent and permissions

Some servers support fine-grained repo scopes via `authorization_details`. When supported, the app requests:
- `com.radio4000.track` actions: create
- `app.bsky.graph.follow` actions: create, delete

If the server doesn’t support it, the app falls back to the default atproto scope automatically. You can re-consent at any time from the Permissions page.

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

// Post to AT Protocol
await bskyOAuth.post(text)

// Sign out
await bskyOAuth.signOut()

// Check if authenticated
bskyOAuth.isAuthenticated()
```

## Development vs Production

The app only uses OAuth authentication (no passwords).

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

### Option 3: Deploy to Vercel/Netlify/GitHub Pages

Easiest for testing - just push and deploy:

```bash
# Vercel
vercel

# Netlify
netlify deploy
```

## Common Issues

### invalid_grant: The redirect_uri parameter must match
- Ensure the path (and trailing slash) of the callback URL matches one in `redirect_uris`.
- The app passes the same canonical redirect URL for both authorization and callback.

### authorization_details invalid_request
- Your AS may not support RFC 9396 yet. The app will fall back to default scope automatically.

### DPoP "nonce" mismatch (401)
- Can occur on the first request after hydration; the app avoids eager profile fetch. You can ignore transient 401s in devtools.

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
- [AT Protocol OAuth Guide](https://docs.bsky.app/docs/advanced-guides/oauth-client)
- [@atproto/oauth-client-browser docs](https://www.npmjs.com/package/@atproto/oauth-client-browser)
