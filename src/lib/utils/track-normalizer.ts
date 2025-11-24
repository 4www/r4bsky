/**
 * Track Normalizer Utility
 * Handles inconsistent field naming between camelCase and snake_case
 */

export interface RawTrack {
  uri?: string;
  cid?: string;
  rkey?: string;
  url?: string;
  title?: string;
  description?: string;
  discogsUrl?: string;
  discogs_url?: string;
  r4SupabaseId?: string;
  r4_supabase_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  authorDid?: string;
  author_did?: string;
  [key: string]: unknown;
}

export interface NormalizedTrack {
  uri: string;
  cid?: string;
  rkey?: string;
  url: string;
  title: string;
  description?: string;
  discogsUrl?: string;
  r4SupabaseId?: string;
  createdAt?: string;
  updatedAt?: string;
  authorDid?: string;
}

/**
 * Normalize track fields to consistent camelCase naming
 * Handles both camelCase and snake_case inputs
 */
export function normalizeTrack(track: RawTrack): NormalizedTrack {
  return {
    uri: track.uri || '',
    cid: track.cid,
    rkey: track.rkey,
    url: track.url || '',
    title: track.title || '',
    description: track.description,
    discogsUrl: track.discogsUrl ?? track.discogs_url,
    r4SupabaseId: track.r4SupabaseId ?? track.r4_supabase_id,
    createdAt: track.createdAt ?? track.created_at,
    updatedAt: track.updatedAt ?? track.updated_at,
    authorDid: track.authorDid ?? track.author_did,
  };
}

/**
 * Normalize an array of tracks
 */
export function normalizeTracks(tracks: RawTrack[]): NormalizedTrack[] {
  return tracks.map(normalizeTrack);
}

/**
 * Check if track has required fields
 */
export function isValidTrack(track: Partial<NormalizedTrack>): track is NormalizedTrack {
  return !!(track.uri && track.url && track.title);
}

/**
 * Filter out invalid tracks from an array
 */
export function filterValidTracks(tracks: Partial<NormalizedTrack>[]): NormalizedTrack[] {
  return tracks.filter(isValidTrack);
}
