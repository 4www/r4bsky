# R4Bsky

A minimal version of Radio4000 for Bluesky. Share music tracks (YouTube, SoundCloud, Vimeo, etc.) on Bluesky with ease.

Built with vanilla Web Components following the Radio4000 components pattern.

## Features

- Login with your Bluesky account
- Post music tracks with URL, title, and description
- Session persistence (stays logged in)
- Clean, simple interface
- Support for all music platforms (YouTube, SoundCloud, Vimeo, Bandcamp, etc.)
- 100% test coverage on critical functionality

## Installation

```bash
npm install
```

## Development

### Local Development

```bash
npm run dev
```

Opens at `http://localhost:5173`

**Note**: OAuth requires a **publicly accessible** HTTPS URL. For local testing with OAuth, you must deploy to a public hosting service (see Deployment section below). For local development, you can test the UI and components, but OAuth login will only work when deployed.

## Testing

Run all tests:
```bash
npm test
```

Run tests with UI:
```bash
npm run test:ui
```

Run tests with coverage:
```bash
npm run test:coverage
```

The test suite includes:
- **BskyService tests**: Login, session management, posting
- **BskySignIn component tests**: Form validation, error handling, state management
- **BskyTrackPost component tests**: Track formatting, multi-platform URLs, error handling

All critical functionality has 90%+ test coverage.

## Authentication

### OAuth (Secure, No Passwords)

This app uses **OAuth authentication** - users never enter passwords in the app:
- Users only enter their Bluesky handle
- They're redirected to Bluesky to authorize
- No passwords stored or transmitted through the app
- Users can revoke access anytime from Bluesky settings

**Requirements**:
- HTTPS is required for OAuth
- For local development: Use Tailscale Serve (see Development section)
- For production: Deploy to GitHub Pages, Vercel, Netlify, etc.

**Setup**: See [OAUTH_SETUP.md](./OAUTH_SETUP.md) for detailed configuration.

## Usage

1. **Login**:
   - Enter your Bluesky handle (e.g., `yourname.bsky.social`)
   - Click "Sign in with Bluesky"
   - You'll be redirected to Bluesky to authorize the app
   - After authorizing, you'll be redirected back

2. **Post a Track**:
   - Add the track URL (YouTube, SoundCloud, Vimeo, etc.)
   - Add a title (e.g., "Artist - Song Name")
   - Optionally add a description
   - Click "Post to Bluesky"

3. Your track will be posted to your Bluesky feed!

## Architecture

### Web Components

Following the Radio4000 components pattern:

- **`<bsky-oauth-sign-in>`** - OAuth authentication form component
- **`<bsky-track-post>`** - Track posting form component
- **`BskyForm`** - Base form component with state management

### File Structure

```
src/
├── components/
│   ├── bsky-form.js              # Base form component
│   ├── bsky-oauth-sign-in.js     # OAuth login component
│   ├── bsky-oauth-sign-in.test.js # OAuth login tests
│   ├── bsky-track-post.js        # Track post component
│   └── bsky-track-post.test.js   # Track post tests
├── libs/
│   ├── bsky-oauth.js             # OAuth service wrapper
│   └── bsky-oauth.test.js        # OAuth service tests
└── style.css                     # Global styles
```

### OAuth Service API

```javascript
import {bskyOAuth} from './src/libs/bsky-oauth.js'

// Initialize OAuth (called automatically on load)
await bskyOAuth.init('https://yourdomain.com/client-metadata.json')

// Sign in (redirects to Bluesky)
await bskyOAuth.signIn('user.bsky.social')

// Restore session
const {session, error} = await bskyOAuth.restoreSession(did)

// Post track
const {data, error} = await bskyOAuth.post('Track Title\n\nDescription\n\nURL')

// Sign out
await bskyOAuth.signOut()

// Check auth status
const isAuth = bskyOAuth.isAuthenticated()
```

## Deployment

### GitHub Pages (Recommended)

1. Build the app:
```bash
npm run build
```

2. The `dist/` directory contains your built app

3. Deploy `dist/` to GitHub Pages

4. Update `public/client-metadata.json` with your GitHub Pages URL:
```json
{
  "client_id": "https://yourusername.github.io/r4bsky/client-metadata.json",
  "client_uri": "https://yourusername.github.io/r4bsky",
  "redirect_uris": ["https://yourusername.github.io/r4bsky"]
}
```

5. Rebuild and redeploy

### Other Options

- **Vercel**: `npm run build` then deploy `dist/`
- **Netlify**: `npm run build` then deploy `dist/`
- **Any static host with HTTPS**

After deployment, OAuth will work with your public HTTPS URL!

## Tech Stack

- Vanilla Web Components (no frameworks)
- [AT Protocol API](https://github.com/bluesky-social/atproto) for Bluesky integration
- Vite for development and bundling
- Vitest for testing with happy-dom
- Following Radio4000 component patterns

## Security Note

Your credentials are only sent to Bluesky's servers. This app doesn't store your password anywhere - it only stores the session token in your browser's localStorage to keep you logged in.

## License

MIT
