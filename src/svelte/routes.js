import MyTracks from './pages/MyTracks.svelte'
import TimelineTracks from './pages/TimelineTracks.svelte'
import AuthorTracks from './pages/AuthorTracks.svelte'
import SearchActors from './pages/SearchActors.svelte'
import Followers from './pages/Followers.svelte'
import Permissions from './pages/Permissions.svelte'
import TrackView from './pages/TrackView.svelte'
import TrackEdit from './pages/TrackEdit.svelte'
import { compile } from './routing/match.js'

export const routes = [
  { pattern: '/', component: TimelineTracks },
  { pattern: '/my', component: MyTracks },
  { pattern: '/search', component: SearchActors },
  { pattern: '/followers', component: Followers },
  { pattern: '/following', component: Followers },
  { pattern: '/permissions', component: Permissions },
  { pattern: '/@:handle', component: AuthorTracks },
  { pattern: '/t/:repo/:rkey', component: TrackView },
  { pattern: '/t/:repo/:rkey/edit', component: TrackEdit },
].map((r) => ({ ...r, match: compile(r.pattern) }))

