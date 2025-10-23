import TimelineTracks from './pages/TimelineTracks.svelte'
import Home from './pages/Home.svelte'
import AuthorTracks from './pages/AuthorTracks.svelte'
import SearchActors from './pages/SearchActors.svelte'
import Followers from './pages/Followers.svelte'
import Settings from './pages/Settings.svelte'
import TrackCreate from './TrackCreate.svelte'
import TrackView from './pages/TrackView.svelte'
import TrackEdit from './pages/TrackEdit.svelte'
import { compile } from './routing/match.js'

export const routes = [
  { pattern: '/', component: Home },
  { pattern: '/timeline', component: TimelineTracks },
  { pattern: '/search', component: SearchActors },
  { pattern: '/add', component: TrackCreate },
  { pattern: '/followers', component: Followers, props: { mode: 'followers' } },
  { pattern: '/following', component: Followers, props: { mode: 'following' } },
  { pattern: '/settings', component: Settings },
  { pattern: '/@:handle/:rkey', component: TrackView },
  { pattern: '/@:handle', component: AuthorTracks },
  { pattern: '/@:handle/:rkey/edit', component: TrackEdit },
  { pattern: '/@:handle/:rkey', component: TrackView },
  { pattern: '/:repo/:rkey/edit', component: TrackEdit },
  { pattern: '/:repo/:rkey', component: TrackView },
].map((r) => ({ ...r, match: compile(r.pattern) }))
