R4Bsky (Svelte) – Radio4000 on Bluesky/atproto

Overview
- Login with Bluesky (OAuth) and manage a personal collection of music links stored on atproto as custom records (`com.radio4000.track`).
- Browse your saved tracks, search users, follow/unfollow, and see a timeline mix of followed users’ R4 tracks.

Run
- Dev: `npm run dev` (use HTTPS or loopback client id is handled automatically)
- Build: `npm run build` (deploy with `public/client-metadata.json` accessible via HTTPS)

OAuth
- client_id:
  - HTTPS: `https://your.domain/client-metadata.json`
  - HTTP loopback: uses loopback client id (no path) automatically.
- Fine-grained permissions (authorization_details when supported):
  - `com.radio4000.track` actions: create, update, delete (library records)
  - `app.bsky.graph.follow` actions: create, delete (follow/unfollow)
- Update `public/client-metadata.json` to set `authorization_details_types: ["atproto_repo"]` and correct `redirect_uris`.
  - Do not include `authorization_details_types` if your AS does not support it.
  - Ensure `redirect_uris` match your deployed path exactly (add both with and without trailing slash for GitHub Pages like `/r4bsky` and `/r4bsky/`).

Routes
- `/` timeline
- `/#/add` add a track
- `/#/@handle` author/my tracks
- `/#/search` search actors
- `/#/followers`, `/#/following` lists with pagination
- `/#/t/:repo/:rkey` view track; `/#/@:handle/:rkey/edit` edit track (modal)
- `/#/settings` manage permissions and session

Data Model
- Custom collection: `com.radio4000.track`
  - Fields: `url` (string), `title` (string), `description?` (string), `discogsUrl?` (string), `createdAt` (string ISO)

Key Files
- Auth: `src/libs/bsky-oauth.js`
- R4 Service: `src/libs/r4-service.js` (create/list tracks, search, follow, timeline)
- URL Parsing: `src/libs/url-patterns.js` (YouTube, SoundCloud, Vimeo, Bandcamp, files)
- Svelte UI:
  - App: `src/svelte/App.svelte`
  - Router: `src/svelte/Router.svelte` + `src/svelte/router.js`
  - Pages: `src/svelte/pages` (MyTracks, AuthorTracks, TimelineTracks, SearchActors)
  - Components: `src/svelte/components/FollowButton.svelte`

Testing
- Run: `npm test`
- Tests include URL parser and app components (unit-level). Add more as features grow.

Notes
- No styles are included in the Svelte templates.
- Tracks are only stored in `com.radio4000.track`; the app does not post to feed.
- The player auto-advances for files; embedded providers (YouTube/Vimeo/SoundCloud) autoplay.

Troubleshooting
- GitHub Pages callback: include both `/r4bsky` and `/r4bsky/` in `redirect_uris`.
- invalid_request on Permissions: your AS may not support authorization_details yet; the app falls back automatically.
- Missing scopes on Timeline/Followers: open Settings to re-consent.
