import {bskyOAuth} from './bsky-oauth'
import {parseTrackUrl} from './url-patterns'
import { Agent, AtUri } from '@atproto/api'

export const R4_COLLECTION = 'com.radio4000.track'

interface Track {
	uri: string
	cid?: string
	rkey?: string
	url: string
	title: string
	description?: string
	discogsUrl?: string
	discogs_url?: string
	createdAt?: string
	created_at?: string
	authorDid?: string
}

interface CreateTrackParams {
	url: string
	title: string
	description?: string
	discogs_url?: string
}

interface ListTracksOptions {
	cursor?: string
	limit?: number
}

interface ListTracksResult {
	tracks: Track[]
	cursor?: string
}

interface Actor {
	did: string
	handle: string
	[key: string]: any
}

interface FollowersResult {
	followers: Actor[]
	cursor?: string
}

interface FollowsResult {
	follows: Actor[]
	cursor?: string
}

function assertAgent(): Agent {
  if (!bskyOAuth.agent) throw new Error('Not authenticated')
  return bskyOAuth.agent
}

async function withDpopRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    const msg = String((e as Error)?.message || e)
    if (msg.includes('use_dpop_nonce') || msg.includes('DPoP')) {
      // Retry once after nonce update
      try {
        return await fn()
      } catch (e2) {
        throw e2
      }
    }
    throw e
  }
}

let publicAgent: Agent | undefined
function getPublicAgent(): Agent {
  if (!publicAgent) publicAgent = new Agent({ service: 'https://api.bsky.app' })
  return publicAgent
}

// Resolve a DID to its PDS endpoint via PLC directory and cache it
const pdsCache = new Map<string, string>()
async function getPdsForDid(did: string): Promise<string> {
  if (pdsCache.has(did)) return pdsCache.get(did)!
  const url = `https://plc.directory/${encodeURIComponent(did)}`
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`Failed to resolve PDS for ${did}`)
  const doc = await res.json()
  const services = doc?.service || []
  const pds = services.find((s: any) => (s?.id === '#atproto_pds' || /atproto.*pds/i.test(s?.type)) && (s?.serviceEndpoint || s?.endpoint))
  const endpoint = pds?.serviceEndpoint || pds?.endpoint
  if (!endpoint) throw new Error(`No PDS endpoint in DID doc for ${did}`)
  pdsCache.set(did, endpoint)
  return endpoint
}

export async function getMyDid(): Promise<string> {
  const agent = assertAgent()
  return agent.did!
}

export async function resolveHandle(handle: string): Promise<string | undefined> {
  const agent = getPublicAgent()
  const res = await agent.resolveHandle({handle})
  return res.data?.did
}

export async function createTrack({url, title, description, discogs_url}: CreateTrackParams): Promise<any> {
  const agent = assertAgent()
  // Save to the custom collection only (no feed posting)
  const record = {
    url,
    title,
    description: description || undefined,
    discogsUrl: discogs_url || undefined,
    createdAt: new Date().toISOString(),
  }
  try {
    return await withDpopRetry(() => agent.com.atproto.repo.createRecord({
      repo: agent.accountDid!,
      collection: R4_COLLECTION,
      record,
    }))
  } catch (err) {
    const msg = String((err as Error)?.message || err)
    if (msg.includes('repo:com.radio4000.track?action=create')) {
      const e2 = new Error('Missing permission to save to library. Open Settings to re-consent. If on localhost, set a HTTPS client metadata URL and re-login.') as any
      e2.code = 'scope-missing'
      throw e2
    }
    throw err
  }
}

export async function listTracksByDid(did: string, {cursor, limit = 30}: ListTracksOptions = {}): Promise<ListTracksResult> {
  // Use authenticated agent for own repo; public appview for others
  let useAuth = false
  let my: Agent | undefined
  try {
    my = assertAgent()
    useAuth = (my.accountDid === did || my.did === did)
  } catch {}
  async function fetchWith(agent: Agent) {
    return agent.com.atproto.repo.listRecords({
      repo: did,
      collection: R4_COLLECTION,
      limit,
      cursor,
      reverse: true,
    })
  }
  let res: any
  try {
    res = await fetchWith(useAuth ? my! : getPublicAgent())
  } catch (e) {
    const msg = String((e as Error)?.message || e)
    // Fallback: try with authenticated agent if public appview returns 404/not found
    if (!useAuth) {
      // If appview fails, try direct PDS endpoint via PLC resolution
      try {
        const pds = await getPdsForDid(did)
        const remote = new Agent({ service: pds })
        res = await fetchWith(remote)
      } catch (e2) {
        // As a last resort, try the authenticated agent (may work if your PDS can proxy)
        try {
          res = await fetchWith(assertAgent())
        } catch (_) {
          throw e2
        }
      }
    } else {
      throw e
    }
  }
  const items = (res.data?.records || []).map((r: any) => ({uri: r.uri, cid: r.cid, rkey: r.uri?.split('/').pop(), ...r.value}))
  // Only keep items that have a parsable URL
  const tracks = items.filter((it: Track) => parseTrackUrl(it.url))
  // Ensure latest-first ordering (by createdAt, fallback to rkey/TID)
  tracks.sort((a: Track, b: Track) => {
    const ad = Date.parse(a.createdAt || a.created_at || '')
    const bd = Date.parse(b.createdAt || b.created_at || '')
    if (!Number.isNaN(ad) && !Number.isNaN(bd)) return bd - ad
    const ar = a.rkey || ''
    const br = b.rkey || ''
    return String(br).localeCompare(String(ar))
  })
  return {tracks, cursor: res.data?.cursor}
}

// Social helpers
export async function searchActors(query: string, {limit = 25} = {}): Promise<Actor[]> {
  const agent = getPublicAgent()
  const res = await agent.searchActors({ q: query, limit })
  return res.data?.actors || []
}

export async function getFollowers(did: string, {limit = 50, cursor}: {limit?: number, cursor?: string} = {}): Promise<FollowersResult> {
  const agent = getPublicAgent()
  try {
    const res = await agent.getFollowers({ actor: did, limit, cursor })
    return { followers: res.data?.followers || [], cursor: res.data?.cursor }
  } catch (e) {
    throw scopeError(e)
  }
}

export async function getFollows(did: string, {limit = 50, cursor}: {limit?: number, cursor?: string} = {}): Promise<FollowsResult> {
  const agent = getPublicAgent()
  try {
    const res = await agent.getFollows({ actor: did, limit, cursor })
    return { follows: res.data?.follows || [], cursor: res.data?.cursor }
  } catch (e) {
    throw scopeError(e)
  }
}

export async function followActor(subjectDid: string): Promise<any> {
  const agent = assertAgent()
  return agent.follow(subjectDid)
}

export async function unfollowActor(followUri: string): Promise<any> {
  const agent = assertAgent()
  return agent.deleteFollow(followUri)
}

// Find existing follow record for subjectDid, returns uri or null
export async function findFollowUri(subjectDid: string): Promise<string | null> {
  const agent = assertAgent()
  try {
    const rel = await agent.app.bsky.graph.getRelationships({
      actor: agent.accountDid!,
      others: [subjectDid],
    })
    const entry = rel.data?.relationships?.find((r: any) => r.did === subjectDid && typeof r.following === 'string')
    if (entry && typeof (entry as any).following === 'string') {
      return entry.following as string
    }
  } catch {
    // fall through to repo scan
  }
  const me = agent.accountDid!
  const res = await agent.com.atproto.repo.listRecords({
    repo: me,
    collection: 'app.bsky.graph.follow',
    limit: 100,
    reverse: true,
  })
  const rec = (res.data?.records || []).find((r: any) => r.value?.subject === subjectDid)
  return rec?.uri || null
}

function scopeError(e: any): Error {
  const msg = String((e as Error)?.message || e)
  if (msg.includes('ScopeMissingError') || msg.includes('Missing required scope')) {
    const err = new Error(msg) as any
    err.code = 'scope-missing'
    return err
  }
  return e
}

export async function deleteTrackByUri(uri: string): Promise<any> {
  const agent = assertAgent()
  const at = new AtUri(uri)
  const repo = at.hostname
  const collection = at.collection || R4_COLLECTION
  const rkey = at.rkey!
  return agent.com.atproto.repo.deleteRecord({
    repo,
    collection,
    rkey,
  })
}

export async function updateTrackByUri(uri: string, changes: Partial<Track>): Promise<any> {
  const agent = assertAgent()
  const at = new AtUri(uri)
  const repo = at.hostname
  const collection = at.collection || R4_COLLECTION
  const rkey = at.rkey!
  const existing = await withDpopRetry(() => agent.com.atproto.repo.getRecord({
    repo,
    collection,
    rkey,
  }))
  const record = existing.data?.value || {}
  const updated = {
    ...record,
    ...changes,
  }
  return withDpopRetry(() => agent.com.atproto.repo.putRecord({
    repo,
    collection,
    rkey,
    record: updated,
  }))
}

export async function getTrackByUri(uri: string): Promise<Track> {
  const at = new AtUri(uri)
  const repo = at.hostname
  const collection = at.collection || R4_COLLECTION
  const rkey = at.rkey!
  async function fetchWith(agent: Agent) {
    return agent.com.atproto.repo.getRecord({ repo, collection, rkey })
  }
  // Try public appview first
  try {
    const res = await withDpopRetry(() => fetchWith(getPublicAgent()))
    const value = res.data?.value || {}
    return { uri, ...value } as Track
  } catch (e) {
    // Fallbacks: direct PDS via PLC, then authenticated agent if available
    try {
      const pds = await getPdsForDid(repo)
      const remote = new Agent({ service: pds })
      const res = await withDpopRetry(() => fetchWith(remote))
      const value = res.data?.value || {}
      return { uri, ...value } as Track
    } catch (e2) {
      try {
        const auth = assertAgent()
        const res = await withDpopRetry(() => fetchWith(auth))
        const value = res.data?.value || {}
        return { uri, ...value } as Track
      } catch (_) {
        throw e2
      }
    }
  }
}

export async function getHandleByDid(did: string): Promise<string | null> {
  // Try public appview first
  try {
    const res = await getPublicAgent().app.bsky.actor.getProfile({ actor: did })
    return res.data?.handle || null
  } catch (e) {
    // Try authenticated agent as fallback
    try {
      const auth = assertAgent()
      const res = await auth.app.bsky.actor.getProfile({ actor: did })
      return res.data?.handle || null
    } catch (_) {
      return null
    }
  }
}
