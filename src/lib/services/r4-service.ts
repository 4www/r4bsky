import {bskyOAuth} from './bsky-oauth'
import {parseTrackUrl} from './url-patterns'
import { Agent, AtUri } from '@atproto/api'
import { TID } from '@atproto/syntax'

export const R4_COLLECTION = 'com.radio4000.track'
export const R4_FAVORITE_COLLECTION = 'com.radio4000.favorite'
export const R4_PROFILE_COLLECTION = 'com.radio4000.profile'
export const R4_SYNC_COLLECTION = 'com.radio4000.sync'

interface RateLimitInfo {
	limit: number
	remaining: number
	reset: number // Unix timestamp
	policy: string
}

/**
 * Extract rate limit info from AT Protocol response headers
 */
function extractRateLimitInfo(error: any): RateLimitInfo | null {
	try {
		const headers = error?.headers || error?.response?.headers
		if (!headers) return null

		const limit = headers.get?.('ratelimit-limit') || headers['ratelimit-limit']
		const remaining = headers.get?.('ratelimit-remaining') || headers['ratelimit-remaining']
		const reset = headers.get?.('ratelimit-reset') || headers['ratelimit-reset']
		const policy = headers.get?.('ratelimit-policy') || headers['ratelimit-policy']

		if (limit !== undefined && remaining !== undefined && reset !== undefined) {
			return {
				limit: parseInt(limit),
				remaining: parseInt(remaining),
				reset: parseInt(reset),
				policy: policy || '',
			}
		}
	} catch (e) {
		// Ignore parsing errors
	}
	return null
}

/**
 * Format rate limit info as a human-readable message
 */
function formatRateLimitMessage(info: RateLimitInfo): string {
	const resetDate = new Date(info.reset * 1000)
	const now = new Date()
	const minutesUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / 1000 / 60)

	return `Rate limit exceeded (${info.remaining}/${info.limit} remaining). Resets in ${minutesUntilReset} minutes at ${resetDate.toLocaleTimeString()}.`
}

function favoriteRkey(subjectDid: string): string {
	return subjectDid.replace(/[^a-z0-9._-]/gi, '-').toLowerCase()
}

interface Track {
	uri: string
	cid?: string
	rkey?: string
	url: string
	title: string
	description?: string
	discogsUrl?: string
	discogs_url?: string
	r4SupabaseId?: string
	createdAt?: string
	created_at?: string
	authorDid?: string
}

interface CreateTrackParams {
	url: string
	title: string
	description?: string
	discogs_url?: string
	r4SupabaseId?: string
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

interface R4FavoriteRecord {
	uri: string
	cid?: string
	rkey?: string
	subject: string
	createdAt?: string
}

interface ListR4FavoriteOptions {
	cursor?: string
	limit?: number
}

interface ListR4FavoriteResult {
	favorites: R4FavoriteRecord[]
	cursor?: string
}

interface R4ProfileRecord {
	uri?: string
	cid?: string
	mode: 'light' | 'dark' | 'auto'
	lightBackground: string
	lightForeground: string
	lightAccent: string
	darkBackground: string
	darkForeground: string
	darkAccent: string
	createdAt?: string
	updatedAt?: string
}

interface R4SyncRecord {
	uri?: string
	cid?: string
	apiEndpoint: string
	apiKey: string
	channelSlug: string
	createdAt?: string
	updatedAt?: string
}

interface Radio4000Track {
	id: string
	url: string
	title: string
	description?: string | null
	discogs_url?: string | null
	created_at: string
	updated_at?: string
}

interface Radio4000Channel {
	id: string
	slug: string
	name: string
	description?: string | null
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

export async function createTrack({url, title, description, discogs_url, r4SupabaseId}: CreateTrackParams): Promise<any> {
  const agent = assertAgent()
  // Save to the custom collection only (no feed posting)
  const record = {
    $type: R4_COLLECTION,
    url,
    title,
    description: description || undefined,
    discogsUrl: discogs_url || undefined,
    r4SupabaseId: r4SupabaseId || undefined,
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

export async function listTracksByDid(did: string, {cursor, limit = 100}: ListTracksOptions = {}): Promise<ListTracksResult> {
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

async function listRecordsWithFallback(did: string, collection: string, {cursor, limit = 50, reverse = true}: {cursor?: string, limit?: number, reverse?: boolean} = {}): Promise<any> {
	let useAuth = false
	let my: Agent | undefined
	try {
		my = assertAgent()
		useAuth = (my.accountDid === did || my.did === did)
	} catch {}

	async function fetchWith(agent: Agent) {
		return agent.com.atproto.repo.listRecords({
			repo: did,
			collection,
			limit,
			cursor,
			reverse,
		})
	}

	let res: any
	try {
		res = await fetchWith(useAuth ? my! : getPublicAgent())
	} catch (e) {
		if (!useAuth) {
			try {
				const pds = await getPdsForDid(did)
				const remote = new Agent({ service: pds })
				res = await fetchWith(remote)
			} catch (e2) {
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

	return res
}

export async function listR4FavoritesByDid(did: string, {cursor, limit = 50}: ListR4FavoriteOptions = {}): Promise<ListR4FavoriteResult> {
	const res = await listRecordsWithFallback(did, R4_FAVORITE_COLLECTION, { cursor, limit, reverse: true })
	const records = (res.data?.records || []).map((r: any) => ({
		uri: r.uri,
		cid: r.cid,
		rkey: r.uri?.split('/').pop(),
		subject: r.value?.subject,
		createdAt: r.value?.createdAt || r.value?.created_at,
	})).filter((rec: R4FavoriteRecord) => typeof rec.subject === 'string' && rec.subject.startsWith('did:'))
	const seen = new Set<string>()
	const unique = records.filter((rec: R4FavoriteRecord) => {
		if (!rec.subject) return false
		if (seen.has(rec.subject)) return false
		seen.add(rec.subject)
		return true
	})
	return { favorites: unique, cursor: res.data?.cursor }
}

export async function createR4Favorite(subjectDid: string): Promise<any> {
	const agent = assertAgent()
	const repo = agent.accountDid!
	const rkey = favoriteRkey(subjectDid)
	const record = {
		$type: R4_FAVORITE_COLLECTION,
		subject: subjectDid,
		createdAt: new Date().toISOString(),
	}
	try {
		return await withDpopRetry(() => agent.com.atproto.repo.createRecord({
			repo,
			collection: R4_FAVORITE_COLLECTION,
			record,
			rkey,
		}))
	} catch (err) {
		const msg = String((err as Error)?.message || err)
		if (msg.includes('repo:com.radio4000.favorite')) {
			const scoped = new Error('Missing permission to store Radio4000 favorite data. Open Settings and re-consent to grant access.') as any
			scoped.code = 'scope-missing'
			throw scoped
		}
		if (msg.includes('Record already exists') || msg.includes('already exists')) {
			return await withDpopRetry(() => agent.com.atproto.repo.putRecord({
				repo,
				collection: R4_FAVORITE_COLLECTION,
				rkey,
				record,
			}))
		}
		throw err
	}
}

export async function findR4FavoriteUri(subjectDid: string): Promise<string | null> {
	const agent = assertAgent()
	const me = agent.accountDid!
	let cursor: string | undefined
	do {
		const res = await agent.com.atproto.repo.listRecords({
			repo: me,
			collection: R4_FAVORITE_COLLECTION,
			limit: 100,
			cursor,
			reverse: true,
		})
		const match = (res.data?.records || []).find((r: any) => r.value?.subject === subjectDid)
		if (match) return match.uri
		cursor = res.data?.cursor
	} while (cursor)
	return null
}

export async function deleteR4Favorite(subjectDid: string): Promise<void> {
	const agent = assertAgent()
	const repo = agent.accountDid!
	const rkey = favoriteRkey(subjectDid)
	try {
		await agent.com.atproto.repo.deleteRecord({
			repo,
			collection: R4_FAVORITE_COLLECTION,
			rkey,
		})
		return
	} catch (err) {
		const msg = String((err as Error)?.message || err)
		if (msg.includes('repo:com.radio4000.favorite')) {
			const scoped = new Error('Missing permission to update Radio4000 favorite data. Open Settings and re-consent to grant access.') as any
			scoped.code = 'scope-missing'
			throw scoped
		}
		if (!msg.includes('Record not found') && !msg.includes('could not locate record')) {
			throw err
		}
	}
	// Fallback for legacy records without deterministic keys
	const legacyUri = await findR4FavoriteUri(subjectDid)
	if (!legacyUri) return
	const at = new AtUri(legacyUri)
	await agent.com.atproto.repo.deleteRecord({
		repo: at.hostname,
		collection: at.collection || R4_FAVORITE_COLLECTION,
		rkey: at.rkey!,
	})
}

/**
 * Check if a user has any R4 tracks (com.radio4000.track records)
 * Returns true if at least one track exists, false otherwise
 */
export async function hasR4Records(did: string): Promise<boolean> {
  async function countFrom(agent: Agent): Promise<number | null> {
    try {
      const res = await agent.com.atproto.repo.listRecords({
        repo: did,
        collection: R4_COLLECTION,
        limit: 1,
      })
      return res.data?.records?.length || 0
    } catch {
      return null
    }
  }

  const agents: Agent[] = [getPublicAgent()]

  // Try the user's PDS directly in case the appview hasn't replicated the custom collection yet
  try {
    const pds = await getPdsForDid(did)
    agents.push(new Agent({ service: pds }))
  } catch {
    // Ignore PLC failures – we'll fall back to other strategies
  }

  // As a last resort, try with the authenticated agent (if available)
  try {
    agents.push(assertAgent())
  } catch {
    // Ignore if not authenticated
  }

  for (const agent of agents) {
    const count = await countFrom(agent)
    if (count === null) continue
    if (count > 0) return true
  }

  return false
}

export async function hasR4FavoriteRecord(followerDid: string, subjectDid: string): Promise<boolean> {
	const rkey = favoriteRkey(subjectDid)

	async function getFrom(agent: Agent): Promise<boolean | null> {
		try {
			await agent.com.atproto.repo.getRecord({
				repo: followerDid,
				collection: R4_FAVORITE_COLLECTION,
				rkey,
			})
			return true
		} catch (err) {
			const msg = String((err as Error)?.message || err)
			if (msg.includes('Record not found') || msg.includes('could not locate record')) {
				return false
			}
			return null
		}
	}

	async function legacyCheck(agent: Agent): Promise<boolean | null> {
		try {
			let cursor: string | undefined
			do {
				const res = await agent.com.atproto.repo.listRecords({
					repo: followerDid,
					collection: R4_FAVORITE_COLLECTION,
					limit: 100,
					cursor,
					reverse: true,
				})
				const records = res.data?.records || []
				if (records.some((r: any) => r.value?.subject === subjectDid)) return true
				cursor = res.data?.cursor
			} while (cursor)
			return false
		} catch {
			return null
		}
	}

	const agents: Agent[] = []
	try {
		const pds = await getPdsForDid(followerDid)
		agents.push(new Agent({ service: pds }))
	} catch {}
	agents.push(getPublicAgent())
	try {
		agents.push(assertAgent())
	} catch {}

	for (const agent of agents) {
		const res = await getFrom(agent)
		if (res === true) return true
	}

	for (const agent of agents) {
		const legacy = await legacyCheck(agent)
		if (legacy === true) return true
	}

	return false
}

// Social helpers
export async function searchActors(query: string, {limit = 25} = {}): Promise<Actor[]> {
  const agent = getPublicAgent()
  const res = await agent.searchActors({ q: query, limit })
  return res.data?.actors || []
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
    $type: collection,
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

export async function getProfile(actor: string): Promise<any> {
  try {
    const res = await getPublicAgent().app.bsky.actor.getProfile({ actor })
    return res.data || null
  } catch (e) {
    try {
      const auth = assertAgent()
      const res = await auth.app.bsky.actor.getProfile({ actor })
      return res.data || null
    } catch (_) {
      return null
    }
  }
}

export async function getProfiles(actors: string[]): Promise<Map<string, any>> {
	const map = new Map<string, any>()
	if (!actors.length) return map
	const unique = Array.from(new Set(actors.filter(Boolean)))
	const agent = getPublicAgent()
	// Batch in chunks of 25 to respect API limits
	const chunkSize = 25
	for (let i = 0; i < unique.length; i += chunkSize) {
		const batch = unique.slice(i, i + chunkSize)
		try {
			const res = await agent.app.bsky.actor.getProfiles({ actors: batch })
			const profiles = res.data?.profiles || []
			for (const profile of profiles) {
				map.set(profile.did, profile)
			}
		} catch (e) {
			for (const actor of batch) {
				try {
					const single = await agent.app.bsky.actor.getProfile({ actor })
					if (single?.data) map.set(actor, single.data)
				} catch {}
			}
		}
	}
	return map
}

// Profile theme operations
const PROFILE_RKEY = 'self'

export async function getR4Profile(did: string): Promise<R4ProfileRecord | null> {
	async function fetchWith(agent: Agent) {
		return agent.com.atproto.repo.getRecord({
			repo: did,
			collection: R4_PROFILE_COLLECTION,
			rkey: PROFILE_RKEY,
		})
	}

	// Try public agent first
	try {
		const res = await fetchWith(getPublicAgent())
		const value = res.data?.value
		if (!value) return null
		return {
			uri: res.data?.uri,
			cid: res.data?.cid,
			mode: value.mode || 'auto',
			lightBackground: value.lightBackground || '0 0% 100%',
			lightForeground: value.lightForeground || '240 10% 3.9%',
			lightAccent: value.lightAccent || '262 83% 58%',
			darkBackground: value.darkBackground || '240 10% 3.9%',
			darkForeground: value.darkForeground || '0 0% 98%',
			darkAccent: value.darkAccent || '262 83% 58%',
			createdAt: value.createdAt,
			updatedAt: value.updatedAt,
		}
	} catch (e) {
		// Try with PDS fallback (even for RecordNotFound)
		try {
			const pds = await getPdsForDid(did)
			const remote = new Agent({ service: pds })
			const res = await fetchWith(remote)
			const value = res.data?.value
			if (!value) return null
			return {
				uri: res.data?.uri,
				cid: res.data?.cid,
				mode: value.mode || 'auto',
				lightBackground: value.lightBackground || '0 0% 100%',
				lightForeground: value.lightForeground || '240 10% 3.9%',
				lightAccent: value.lightAccent || '262 83% 58%',
				darkBackground: value.darkBackground || '240 10% 3.9%',
				darkForeground: value.darkForeground || '0 0% 98%',
				darkAccent: value.darkAccent || '262 83% 58%',
				createdAt: value.createdAt,
				updatedAt: value.updatedAt,
			}
		} catch (e2) {
			// Try authenticated agent as last resort
			try {
				const auth = assertAgent()
				const res = await fetchWith(auth)
				const value = res.data?.value
				if (!value) return null
				return {
					uri: res.data?.uri,
					cid: res.data?.cid,
					mode: value.mode || 'auto',
					lightBackground: value.lightBackground || '0 0% 100%',
					lightForeground: value.lightForeground || '240 10% 3.9%',
					lightAccent: value.lightAccent || '262 83% 58%',
					darkBackground: value.darkBackground || '240 10% 3.9%',
					darkForeground: value.darkForeground || '0 0% 98%',
					darkAccent: value.darkAccent || '262 83% 58%',
					createdAt: value.createdAt,
					updatedAt: value.updatedAt,
				}
			} catch (e3) {
				const msg3 = String((e3 as Error)?.message || e3).toLowerCase()
				if (msg3.includes('record not found') || msg3.includes('could not locate record')) {
					return null
				}
				// Some other error - still return null to avoid breaking
				return null
			}
		}
	}
}

export async function setR4Profile(profile: Omit<R4ProfileRecord, 'uri' | 'cid' | 'createdAt' | 'updatedAt'>): Promise<any> {
	const agent = assertAgent()
	const repo = agent.accountDid!

	// Check if profile exists
	let existing: any = null
	try {
		const res = await agent.com.atproto.repo.getRecord({
			repo,
			collection: R4_PROFILE_COLLECTION,
			rkey: PROFILE_RKEY,
		})
		existing = res.data?.value
	} catch (err) {
		const msg = String((err as Error)?.message || err).toLowerCase()
		if (!msg.includes('record not found') && !msg.includes('could not locate record')) {
			// Some other error
			throw err
		}
	}

	const record = {
		$type: R4_PROFILE_COLLECTION,
		mode: profile.mode,
		lightBackground: profile.lightBackground,
		lightForeground: profile.lightForeground,
		lightAccent: profile.lightAccent,
		darkBackground: profile.darkBackground,
		darkForeground: profile.darkForeground,
		darkAccent: profile.darkAccent,
		createdAt: existing?.createdAt || new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	}

	try {
		// Use createRecord if no existing profile, putRecord if updating
		if (existing) {
			return await withDpopRetry(() => agent.com.atproto.repo.putRecord({
				repo,
				collection: R4_PROFILE_COLLECTION,
				rkey: PROFILE_RKEY,
				record,
			}))
		} else {
			return await withDpopRetry(() => agent.com.atproto.repo.createRecord({
				repo,
				collection: R4_PROFILE_COLLECTION,
				rkey: PROFILE_RKEY,
				record,
			}))
		}
	} catch (err) {
		const msg = String((err as Error)?.message || err)
		if (msg.includes('repo:com.radio4000.profile')) {
			const scoped = new Error('Missing permission to save profile settings. Open Settings and re-consent to grant access.') as any
			scoped.code = 'scope-missing'
			throw scoped
		}
		throw err
	}
}

// Radio4000 Sync functions
export async function getR4SyncConfig(): Promise<R4SyncRecord | null> {
	const agent = assertAgent()
	const did = agent.accountDid!
	try {
		const res = await withDpopRetry(() => agent.com.atproto.repo.listRecords({
			repo: did,
			collection: R4_SYNC_COLLECTION,
			limit: 1,
		}))
		if (res.data.records.length === 0) return null
		const record = res.data.records[0]
		return { uri: record.uri, cid: record.cid, ...record.value } as R4SyncRecord
	} catch (err) {
		console.error('Failed to get sync config:', err)
		return null
	}
}

export async function setR4SyncConfig(config: { apiEndpoint: string; apiKey: string; channelSlug: string }): Promise<void> {
	const agent = assertAgent()
	const did = agent.accountDid!
	const existing = await getR4SyncConfig()

	if (existing?.uri) {
		const at = new AtUri(existing.uri)
		const record = {
			$type: R4_SYNC_COLLECTION,
			...config,
			updatedAt: new Date().toISOString(),
		}
		await withDpopRetry(() => agent.com.atproto.repo.putRecord({
			repo: did,
			collection: R4_SYNC_COLLECTION,
			rkey: at.rkey!,
			record,
		}))
	} else {
		const record = {
			$type: R4_SYNC_COLLECTION,
			...config,
			createdAt: new Date().toISOString(),
		}
		await withDpopRetry(() => agent.com.atproto.repo.createRecord({
			repo: did,
			collection: R4_SYNC_COLLECTION,
			record,
		}))
	}
}

export async function fetchRadio4000Channel(apiEndpoint: string, apiKey: string, channelSlug: string): Promise<Radio4000Channel | null> {
	const url = `${apiEndpoint}/rest/v1/channels?slug=eq.${encodeURIComponent(channelSlug)}&select=id,slug,name,description`
	const res = await fetch(url, {
		headers: {
			'apikey': apiKey,
			'accept': 'application/json',
		},
	})
	if (!res.ok) throw new Error(`Failed to fetch channel: ${res.statusText}`)
	const data = await res.json()
	if (!Array.isArray(data) || data.length === 0) return null
	return data[0]
}

export async function fetchRadio4000Tracks(apiEndpoint: string, apiKey: string, channelSlug: string): Promise<Radio4000Track[]> {
	// First get the channel to get its ID
	const channel = await fetchRadio4000Channel(apiEndpoint, apiKey, channelSlug)
	if (!channel) throw new Error('Channel not found')

	// Now fetch tracks for this channel with proper ordering
	// Order by channel_track.created_at to preserve the order tracks were added to the channel
	const url = `${apiEndpoint}/rest/v1/channels?slug=eq.${encodeURIComponent(channelSlug)}&select=tracks:channel_track(created_at,track:tracks(id,url,title,description,discogs_url,created_at,updated_at))&tracks.order=created_at.asc`
	const res = await fetch(url, {
		headers: {
			'apikey': apiKey,
			'accept': 'application/json',
		},
	})
	if (!res.ok) throw new Error(`Failed to fetch tracks: ${res.statusText}`)
	const data = await res.json()
	if (!Array.isArray(data) || data.length === 0) return []

	const channelData = data[0]
	if (!channelData.tracks || !Array.isArray(channelData.tracks)) return []

	// Extract tracks from the nested structure
	// Tracks are already ordered by created_at ascending (oldest first)
	return channelData.tracks.map((item: any) => item.track).filter(Boolean)
}

export async function importRadio4000Tracks(
	apiEndpoint: string,
	apiKey: string,
	channelSlug: string,
	onProgress?: (current: number, total: number, skipped: number) => void,
	onError?: (error: string) => void
): Promise<{ imported: number; skipped: number }> {
	const agent = assertAgent()
	const myDid = agent.accountDid!

	// Get all radio4000 tracks (ordered chronologically)
	const r4Tracks = await fetchRadio4000Tracks(apiEndpoint, apiKey, channelSlug)

	// Get existing tracks to check for duplicates
	const existingTracks = await listAllTracksByDid(myDid)
	const existingUrls = new Set(existingTracks.map(t => t.url.toLowerCase().trim()))

	// Filter out duplicates
	const tracksToImport = r4Tracks.filter(track => {
		const normalizedUrl = track.url.toLowerCase().trim()
		return !existingUrls.has(normalizedUrl)
	})

	const skipped = r4Tracks.length - tracksToImport.length
	let imported = 0

	// Process in batches of 200 (AT Protocol limit per applyWrites call)
	const BATCH_SIZE = 200

	for (let i = 0; i < tracksToImport.length; i += BATCH_SIZE) {
		const batch = tracksToImport.slice(i, i + BATCH_SIZE)

		try {
			// Build create operations for this batch
			const writes = batch.map(track => {
				// Generate TID from original created_at to preserve chronological order
				const createdDate = new Date(track.created_at)
				const rkey = TID.fromTime(createdDate.getTime())

				return {
					$type: 'com.atproto.repo.applyWrites#create',
					collection: R4_COLLECTION,
					rkey: rkey.toString(),
					value: {
						$type: R4_COLLECTION,
						url: track.url,
						title: track.title,
						description: track.description || undefined,
						discogsUrl: track.discogs_url || undefined,
						r4SupabaseId: track.id, // Save Radio4000 Supabase ID
						createdAt: track.created_at, // Preserve original created timestamp
						updatedAt: track.updated_at, // Preserve original updated timestamp
					},
				}
			})

			// Execute batch create with retry logic
			await withRetry(() =>
				agent.com.atproto.repo.applyWrites({
					repo: myDid,
					writes,
				})
			)

			imported += batch.length
			if (onProgress) onProgress(skipped + Math.min(i + BATCH_SIZE, tracksToImport.length), r4Tracks.length, skipped)

			// Small delay between batches to be respectful
			if (i + BATCH_SIZE < tracksToImport.length) {
				await sleep(500)
			}
		} catch (err) {
			const errorMsg = `Failed to import batch ${Math.floor(i / BATCH_SIZE) + 1}: ${(err as Error).message}`
			console.error(errorMsg)
			if (onError) onError(errorMsg)

			// Try individual imports for this batch as fallback
			for (let j = 0; j < batch.length; j++) {
				const track = batch[j]
				try {
					// Generate TID from original created_at to preserve chronological order
					const createdDate = new Date(track.created_at)
					const rkey = TID.fromTime(createdDate.getTime())

					const record = {
						$type: R4_COLLECTION,
						url: track.url,
						title: track.title,
						description: track.description || undefined,
						discogsUrl: track.discogs_url || undefined,
						r4SupabaseId: track.id, // Save Radio4000 Supabase ID
						createdAt: track.created_at,
						updatedAt: track.updated_at,
					}

					await withRetry(async () => {
						return withDpopRetry(() => agent.com.atproto.repo.createRecord({
							repo: myDid,
							collection: R4_COLLECTION,
							rkey: rkey.toString(),
							record,
						}))
					})

					imported++
					if (onProgress) onProgress(skipped + i + j + 1, r4Tracks.length, skipped)
					await sleep(100)
				} catch (err2) {
					const fallbackError = `Failed to import "${track.title}": ${(err2 as Error).message}`
					console.error(fallbackError)
					if (onError) onError(fallbackError)
				}
			}
		}
	}

	return { imported, skipped }
}

// Helper to get all tracks (not exported, internal use)
async function listAllTracksByDid(did: string): Promise<Track[]> {
	const allTracks: Track[] = []
	let cursor: string | undefined

	do {
		const result = await listTracksByDid(did, { cursor, limit: 100 })
		allTracks.push(...result.tracks)
		cursor = result.cursor
	} while (cursor)

	return allTracks
}

// Helper to delay execution (avoid rate limits)
function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}

// Helper to retry with exponential backoff
async function withRetry<T>(
	fn: () => Promise<T>,
	maxRetries = 3,
	delayMs = 1000
): Promise<T> {
	let lastError: any
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn()
		} catch (err) {
			lastError = err
			const msg = String((err as Error)?.message || err)

			// Check if it's a rate limit error
			if (msg.includes('RateLimitExceeded') || msg.includes('Rate Limit')) {
				// Extract rate limit info from headers
				const rateLimitInfo = extractRateLimitInfo(err)

				if (rateLimitInfo) {
					// Enhance error with rate limit details
					const enhancedError = new Error(formatRateLimitMessage(rateLimitInfo)) as any
					enhancedError.rateLimitInfo = rateLimitInfo
					enhancedError.originalError = err
					lastError = enhancedError
				}

				const backoffDelay = delayMs * Math.pow(2, attempt)
				console.warn(`Rate limited, retrying in ${backoffDelay}ms (attempt ${attempt + 1}/${maxRetries})`)
				await sleep(backoffDelay)
				continue
			}

			// If not a rate limit error, throw immediately
			throw err
		}
	}
	throw lastError
}

// Delete all tracks for current user using batch operations
export async function deleteAllTracks(
	onProgress?: (current: number, total: number) => void,
	onError?: (error: string) => void
): Promise<number> {
	const agent = assertAgent()
	const myDid = agent.accountDid!

	// Get all tracks
	const tracks = await listAllTracksByDid(myDid)
	const total = tracks.length
	let deleted = 0

	// Process in batches of 200 (AT Protocol limit per applyWrites call)
	const BATCH_SIZE = 200

	for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
		const batch = tracks.slice(i, i + BATCH_SIZE)

		try {
			// Build delete operations for this batch
			const writes = batch.map(track => {
				const uri = new AtUri(track.uri)
				return {
					$type: 'com.atproto.repo.applyWrites#delete',
					collection: uri.collection,
					rkey: uri.rkey,
				}
			})

			// Execute batch delete with retry logic
			await withRetry(() =>
				agent.com.atproto.repo.applyWrites({
					repo: myDid,
					writes,
				})
			)

			deleted += batch.length
			if (onProgress) onProgress(Math.min(i + BATCH_SIZE, total), total)

			// Small delay between batches to be respectful
			if (i + BATCH_SIZE < tracks.length) {
				await sleep(500)
			}
		} catch (err) {
			const errorMsg = `Failed to delete batch ${Math.floor(i / BATCH_SIZE) + 1}: ${(err as Error).message}`
			console.error(errorMsg)
			if (onError) onError(errorMsg)

			// Try individual deletes for this batch as fallback
			for (let j = 0; j < batch.length; j++) {
				const track = batch[j]
				try {
					await withRetry(() => deleteTrackByUri(track.uri))
					deleted++
					if (onProgress) onProgress(i + j + 1, total)
					await sleep(100)
				} catch (err2) {
					const fallbackError = `Failed to delete "${track.title}": ${(err2 as Error).message}`
					console.error(fallbackError)
					if (onError) onError(fallbackError)
				}
			}
		}
	}

	return deleted
}
