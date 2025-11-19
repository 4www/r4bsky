import {bskyOAuth} from './bsky-oauth'
import {parseTrackUrl} from './url-patterns'
import { Agent, AtUri } from '@atproto/api'

export const R4_COLLECTION = 'com.radio4000.track'
export const R4_FAVORITE_COLLECTION = 'com.radio4000.favorite'
export const R4_PROFILE_COLLECTION = 'com.radio4000.profile'

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
