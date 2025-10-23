import TimelineTracks from './pages/TimelineTracks.svelte'
import Home from './pages/Home.svelte'
import AuthorTracks from './pages/AuthorTracks.svelte'
import SearchActors from './pages/SearchActors.svelte'
import Followers from './pages/Followers.svelte'
import Permissions from './pages/Permissions.svelte'
import TrackView from './pages/TrackView.svelte'
import TrackEdit from './pages/TrackEdit.svelte'
import { compile } from './routing/match.js'

export const routes = [
  { pattern: '/', component: Home },
  { pattern: '/search', component: SearchActors },
  { pattern: '/followers', component: Followers, props: { mode: 'followers' } },
  { pattern: '/following', component: Followers, props: { mode: 'following' } },
  { pattern: '/permissions', component: Permissions },
  { pattern: '/@:handle', component: AuthorTracks },
  { pattern: '/t/:repo/:rkey', component: TrackView },
  { pattern: '/t/:repo/:rkey/edit', component: TrackEdit },
].map((r) => ({ ...r, match: compile(r.pattern) }))
