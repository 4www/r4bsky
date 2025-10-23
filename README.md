# R4Bsky — Radio4000 for Bluesky/atproto (Svelte 5)

Radio4000 x Bluesky. Save your favorite music links (YouTube, SoundCloud, Vimeo, files) on atproto as custom records, play them in the app, browse timelines, and follow others.

Key features
- Bluesky OAuth login (no passwords) with robust fallback.
- Custom atproto collection `com.radio4000.track` for tracks.
- Player for direct files; embedded players for YouTube/Vimeo/SoundCloud; auto-next.
- Routes inspired by Radio4000: `/` timeline, `/#/@handle` author/my tracks, search, followers, following, track view/edit.
- Permissions re-consent flow (when server supports fine-grained scopes).

Quick start
```bash
npm install
npm run dev
# open http://127.0.0.1:5173
```

Build & preview
```bash
npm run build
npm run preview
```

Testing
```bash
npm test
```

Routing
- `/` — Timeline (followed users’ tracks)
- `/#/add` — Add a track
- `/#/@alice.bsky.social` — Author/My tracks
- `/#/search` — Search actors
- `/#/followers`, `/#/following` — Lists, with pagination
- `/#/t/:repo/:rkey` — Track view
- `/#/@:handle/:rkey/edit` — Track edit (modal route)
- `/#/settings` — Manage permissions (re-consent)

Architecture (modular)
- Svelte 5 components (no styles in templates):
  - Router: `src/svelte/Router.svelte`, routes: `src/svelte/routes.js`, matcher: `src/svelte/routing/match.js`
  - Player: `src/svelte/components/Player.svelte`, store: `src/svelte/player/store.js`
- Pages: `src/svelte/pages/…` (Timeline, Author, Followers/Following, Search, TrackView/Edit, Settings)
- Services:
  - OAuth/session: `src/libs/bsky-oauth.js`
  - R4 data and social: `src/libs/r4-service.js`
  - URL parsing/embeds: `src/libs/url-patterns.js`
  - oEmbed/Discogs helpers: `src/libs/oembed.js`, `src/libs/discogs.js`

OAuth setup (prod vs dev)
- Dev (loopback): handled automatically using loopback client id.
- Prod (HTTPS): expose `public/client-metadata.json` at a stable URL.
  - If deploying on GitHub Pages under `/r4bsky`, include both with and without trailing slash in `redirect_uris`.
  - The app passes a canonical `redirect_uri` (with trailing slash) for both authorization and callback handling to avoid mismatches.
  - Some servers don’t support `authorization_details` yet; the app falls back to default atproto scope.
 - Optional (force HTTPS client metadata in dev): set `VITE_CLIENT_ID` in your env to the full URL of a hosted `client-metadata.json` to request fine-grained scopes even when running locally.

Custom record (com.radio4000.track)
- Fields: `url` (string), `title` (string), optional `description`, optional `discogsUrl`, `createdAt` (ISO string).
- Create/List/Update/Delete implemented in `src/libs/r4-service.js` via atproto repo APIs.

Permissions & scopes
- Custom records only: `com.radio4000.track` (create, update, delete).
- Social (optional): `app.bsky.graph.follow` (create, delete) for follow/unfollow.
- No feed posting is attempted or requested.
- If reads or writes fail due to missing scope, you’ll see a clear message and an “Open Settings” button.

Troubleshooting
- Login redirect mismatch on GitHub Pages: ensure your `public/client-metadata.json` includes both `https://user.github.io/r4bsky` and `https://user.github.io/r4bsky/` in `redirect_uris`.
- DPoP nonce 401 seen in devtools: we avoid eager profile fetch on hydration; it’s harmless if seen intermittently.
- Scope errors on Timeline/Followers: open Settings and re-consent; if the server doesn’t support fine-grained scopes, it will fall back.

License
MIT
